"""Phát hiện mất tập trung bằng MediaPipe Face Mesh (FR-AI-006).

Vì sao là MediaPipe Face Landmarker chứ không phải ``mediapipe.solutions.face_mesh``
quen thuộc: từ bản 0.10.30 trở đi gói wheel đã bỏ hẳn nhánh *legacy solutions*,
chỉ còn Tasks API. Bản cuối còn ``solutions`` là 0.10.21, nhưng nó ghim
``protobuf<5`` trong khi pymilvus, opentelemetry-proto và googleapis-common-protos
của service này đều đòi ``protobuf>=5`` — hạ protobuf xuống là làm chết tầng RAG.
Tasks API dùng đúng mô hình Face Mesh đó (478 landmark: 468 lưới mặt + 10 mống
mắt) nên kết quả không khác, chỉ là nạp mô hình từ file ``.task`` rời.

Mô hình nạp **một lần cho cả tiến trình** qua ``lru_cache``; nạp mất ~2.7s nên
tuyệt đối không nạp theo từng request. ``FaceLandmarker`` ở chế độ IMAGE không
được tài liệu bảo đảm an toàn đa luồng, mà FastAPI chạy handler đồng bộ trong
threadpool, nên mọi lời gọi ``detect`` đi qua một ``threading.Lock``. Một khung
hình 640px mất ~9ms trên CPU, nhịp gửi là 1 khung/giây/thí sinh, nên hàng đợi
do khoá này tạo ra không đáng kể.
"""

from __future__ import annotations

import base64
import binascii
import math
import os
import threading
from dataclasses import dataclass
from functools import lru_cache
from io import BytesIO
from pathlib import Path
from typing import TYPE_CHECKING, Any

import numpy as np
from ioes_common import get_logger
from PIL import Image, UnidentifiedImageError

from ml_worker.schemas.proctor import FrameAnalysisResponse, GazeDirection, ViolationType

if TYPE_CHECKING:  # pragma: no cover - chỉ phục vụ mypy
    from numpy.typing import NDArray

logger = get_logger(__name__)

# --------------------------------------------------------------------------- #
# Cấu hình. Để ở module-level đọc từ os.getenv thay vì nhét vào core/config.py:
# các tham số này là hằng số hiệu chỉnh của riêng thuật toán, đổi khi tinh chỉnh
# tại chỗ, không phải cấu hình hạ tầng.
# --------------------------------------------------------------------------- #

_SERVICE_ROOT = Path(__file__).resolve().parents[3]

# Gói mô hình Face Mesh. Mặc định nằm trong .cache/ (đã .gitignore) để không
# đẩy 3.8MB nhị phân vào git. Thiếu file thì tải một lần từ PROCTOR_MODEL_URL.
MODEL_PATH = Path(
    os.getenv(
        "PROCTOR_MODEL_PATH", str(_SERVICE_ROOT / ".cache" / "mediapipe" / "face_landmarker.task")
    )
)
MODEL_URL = os.getenv(
    "PROCTOR_MODEL_URL",
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
)

# Đếm đến 2 là đủ kết luận "nhiều hơn một người"; mỗi khuôn mặt thêm vào là
# thêm một lượt chạy lưới 478 điểm, không đáng để đếm chính xác đám đông.
MAX_FACES = int(os.getenv("PROCTOR_MAX_FACES", "2"))
MIN_FACE_CONFIDENCE = float(os.getenv("PROCTOR_MIN_FACE_CONFIDENCE", "0.5"))

# Ảnh webcam thường 640x480; thu nhỏ cạnh dài về ngưỡng này trước khi suy luận.
# Ảnh to hơn không làm lưới chính xác hơn nhưng làm chậm thấy rõ.
MAX_FRAME_PX = int(os.getenv("PROCTOR_MAX_FRAME_PX", "640"))
# Chặn payload quá khổ trước khi giải mã, tránh một khung hình hỏng nuốt RAM.
MAX_FRAME_BYTES = int(os.getenv("PROCTOR_MAX_FRAME_BYTES", "5000000"))

# Ngưỡng phân loại hướng nhìn, tính bằng độ trên trục hiệu dụng (đầu + mắt).
GAZE_CENTER_YAW_DEG = float(os.getenv("PROCTOR_YAW_CENTER_DEG", "20"))
GAZE_CENTER_PITCH_DEG = float(os.getenv("PROCTOR_PITCH_CENTER_DEG", "15"))
GAZE_OUT_YAW_DEG = float(os.getenv("PROCTOR_YAW_OUT_DEG", "45"))
GAZE_OUT_PITCH_DEG = float(os.getenv("PROCTOR_PITCH_OUT_DEG", "35"))

# Quy đổi độ lệch mống mắt (đơn vị: nửa bề rộng hốc mắt) sang "độ" để cộng
# thẳng vào góc đầu. Liếc hết cỡ mà đầu không quay tương đương ~25° ngang.
GAZE_DEG_PER_UNIT_H = float(os.getenv("PROCTOR_GAZE_DEG_H", "25"))
GAZE_DEG_PER_UNIT_V = float(os.getenv("PROCTOR_GAZE_DEG_V", "18"))

# Tỉ lệ landmark nằm ngoài mép ảnh để coi là mặt đã ra khỏi khung.
OUT_OF_FRAME_RATIO = float(os.getenv("PROCTOR_OUT_OF_FRAME_RATIO", "0.15"))

# EAR (eye aspect ratio): mắt mở bình thường ~0.28–0.35, nhắm hẳn <0.15.
EAR_CLOSED = float(os.getenv("PROCTOR_EAR_CLOSED", "0.15"))
EAR_OPEN = float(os.getenv("PROCTOR_EAR_OPEN", "0.25"))

# Trọng số của công thức điểm tập trung — giải thích trong attention_score().
WEIGHT_HEAD = float(os.getenv("PROCTOR_W_HEAD", "0.40"))
WEIGHT_GAZE = float(os.getenv("PROCTOR_W_GAZE", "0.35"))
WEIGHT_EYE = float(os.getenv("PROCTOR_W_EYE", "0.25"))

# Có người thứ hai trong khung thì điểm của người chính cũng không còn tin được.
MULTI_FACE_FACTOR = float(os.getenv("PROCTOR_MULTI_FACE_FACTOR", "0.5"))
# Nhìn hẳn ra ngoài khung thì trần điểm phải nằm dưới ngưỡng gắn cờ 40 của BR-011.
OUT_OF_FRAME_SCORE_CAP = int(os.getenv("PROCTOR_OUT_OF_FRAME_CAP", "35"))

# --------------------------------------------------------------------------- #
# Chỉ số landmark của Face Mesh. "RIGHT"/"LEFT" ở đây là mắt phải/trái của
# *người trong ảnh*; với ảnh không soi gương thì mắt phải nằm ở nửa trái ảnh.
# --------------------------------------------------------------------------- #

NUM_MESH_LANDMARKS = 468
NUM_LANDMARKS_WITH_IRIS = 478

RIGHT_EYE_EAR = (33, 160, 158, 133, 153, 144)  # p1..p6 theo thứ tự công thức EAR
LEFT_EYE_EAR = (362, 385, 387, 263, 373, 380)

# Hai khoé mắt, xếp theo chiều tăng của trục x trong ảnh.
RIGHT_EYE_CORNERS = (33, 133)
LEFT_EYE_CORNERS = (362, 263)
# Mí trên / mí dưới ở giữa hốc mắt.
RIGHT_EYE_LIDS = (159, 145)
LEFT_EYE_LIDS = (386, 374)
# Tâm mống mắt (chỉ có khi mô hình trả đủ 478 điểm).
RIGHT_IRIS_CENTER = 468
LEFT_IRIS_CENTER = 473


class FrameDecodeError(ValueError):
    """Chuỗi base64 rỗng, sai định dạng, quá khổ hoặc không phải ảnh.

    Thông điệp của mọi ngoại lệ trong module này viết bằng tiếng Anh thuần ASCII
    theo quy ước chung của hợp đồng (chuỗi cho người dùng mới dùng tiếng Việt).
    Chúng đi thẳng vào log và vào ``detail`` trả cho exam-suite; có dấu tiếng Việt
    là console Windows mã cp1252 ném UnicodeEncodeError, biến một lỗi 400 lành
    thành 500.
    """


class FaceLandmarkerUnavailableError(RuntimeError):
    """Không nạp được gói mô hình MediaPipe."""


@dataclass(frozen=True)
class FaceMetrics:
    """Các đại lượng đo được trên một khuôn mặt, đã chuẩn hoá.

    Tách hẳn khỏi MediaPipe để phần suy luận (hướng nhìn, điểm số) kiểm thử
    được bằng số liệu dựng tay, không cần chạy mô hình.
    """

    yaw_deg: float
    """Đầu quay ngang. Dương = quay về phía mép phải của ảnh."""

    pitch_deg: float
    """Đầu gật dọc. Dương = cúi xuống."""

    roll_deg: float
    """Đầu nghiêng trong mặt phẳng ảnh. Hiện chỉ ghi log, không vào điểm."""

    gaze_x: float
    """Mống mắt lệch ngang, đơn vị nửa bề rộng hốc mắt. Dương = lệch sang phải ảnh."""

    gaze_y: float
    """Mống mắt lệch dọc, đơn vị nửa chiều cao khe mắt. Dương = nhìn xuống."""

    ear: float
    """Eye aspect ratio trung bình hai mắt."""

    off_frame_ratio: float
    """Tỉ lệ landmark rơi ra ngoài mép ảnh."""


# --------------------------------------------------------------------------- #
# Giải mã khung hình
# --------------------------------------------------------------------------- #


def decode_frame(frame_base64: str) -> NDArray[np.uint8]:
    """Đổi chuỗi base64 thành mảng RGB.

    Trình duyệt sinh chuỗi kèm tiền tố ``data:image/jpeg;base64,`` nên phải cắt
    bỏ trước khi giải mã. Dùng Pillow (đã là dependency sẵn có) thay vì cv2:
    mediapipe kéo theo ``opencv-contrib-python``, cài thêm ``opencv-python-headless``
    sẽ có hai bản phân phối cùng chiếm tên ``cv2``.

    Mọi lỗi đều quy về :class:`FrameDecodeError` để tầng API trả HTTP 400 —
    khung hình hỏng là lỗi dữ liệu đầu vào, không phải lỗi service.
    """
    payload = frame_base64.strip()
    if payload.startswith("data:"):
        _, _, payload = payload.partition(",")
        payload = payload.strip()
    if not payload:
        raise FrameDecodeError("frameBase64 is empty")

    try:
        raw = base64.b64decode(payload, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise FrameDecodeError("frameBase64 is not valid base64") from exc

    if not raw:
        raise FrameDecodeError("frameBase64 decoded to 0 bytes")
    if len(raw) > MAX_FRAME_BYTES:
        raise FrameDecodeError(f"frame is {len(raw)} bytes, over the {MAX_FRAME_BYTES} byte limit")

    try:
        opened = Image.open(BytesIO(raw))
        # load() ép Pillow đọc hết pixel ngay tại đây; để lười thì ảnh cụt chỉ
        # nổ ở tận numpy, lúc đó đã ra khỏi khối try và thành lỗi 500.
        opened.load()
        image = opened.convert("RGB")
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise FrameDecodeError("frameBase64 does not decode to a readable image") from exc

    longest = max(image.size)
    if longest > MAX_FRAME_PX:
        scale = MAX_FRAME_PX / longest
        image = image.resize(
            (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
            Image.Resampling.BILINEAR,
        )

    return np.ascontiguousarray(np.asarray(image, dtype=np.uint8))


# --------------------------------------------------------------------------- #
# Suy ra các đại lượng từ landmark — hàm thuần, kiểm thử được bằng số dựng tay
# --------------------------------------------------------------------------- #


def head_pose_degrees(matrix: NDArray[np.float64] | Any) -> tuple[float, float, float]:
    """Tách yaw / pitch / roll từ ma trận biến đổi khuôn mặt của MediaPipe.

    MediaPipe trả ma trận 4x4 đưa mô hình mặt chuẩn về hệ toạ độ camera
    (x sang phải, y lên trên, z hướng về phía người xem), nên mặt nhìn thẳng
    cho khối xoay ≈ ma trận đơn vị. Phân rã theo thứ tự Rz·Ry·Rx:

        pitch = atan2(R21, R22)
        yaw   = atan2(-R20, hypot(R21, R22))
        roll  = atan2(R10, R00)

    Dấu đã kiểm chứng bằng thực nghiệm (bóp méo phối cảnh một ảnh chân dung rồi
    so với vị trí chóp mũi giữa hai mép mặt): **yaw dương = đầu quay về mép phải
    của ảnh**, **pitch dương = cúi xuống**.

    Dùng ma trận thay vì ước lượng hình học kiểu "mũi lệch bao nhiêu so với hai
    mắt" vì ma trận là tư thế 3D thật do mô hình khớp ra, không bị bẹt đi khi
    khuôn mặt ở xa hay lệch tâm khung hình.
    """
    rotation = np.asarray(matrix, dtype=float)[:3, :3]
    pitch = math.degrees(math.atan2(rotation[2, 1], rotation[2, 2]))
    yaw = math.degrees(math.atan2(-rotation[2, 0], math.hypot(rotation[2, 1], rotation[2, 2])))
    roll = math.degrees(math.atan2(rotation[1, 0], rotation[0, 0]))
    return yaw, pitch, roll


def _ear_one_eye(points: NDArray[np.float64], idx: tuple[int, ...]) -> float:
    """EAR của một mắt theo công thức Soukupová–Čech (2016).

    EAR = (|p2-p6| + |p3-p5|) / (2·|p1-p4|): hai khoảng cách dọc chia cho khoảng
    cách ngang, nên bất biến với việc mặt ở gần hay xa camera.
    """
    p1, p2, p3, p4, p5, p6 = (points[i] for i in idx)
    horizontal = float(np.linalg.norm(p1 - p4))
    if horizontal <= 0:
        return 0.0
    vertical = float(np.linalg.norm(p2 - p6)) + float(np.linalg.norm(p3 - p5))
    return vertical / (2.0 * horizontal)


def eye_aspect_ratio(points: NDArray[np.float64]) -> float:
    """EAR trung bình hai mắt. Mắt mở ~0.28–0.35, nhắm hẳn <0.15."""
    return (_ear_one_eye(points, RIGHT_EYE_EAR) + _ear_one_eye(points, LEFT_EYE_EAR)) / 2.0


def iris_offset(points: NDArray[np.float64]) -> tuple[float, float]:
    """Độ lệch mống mắt so với tâm hốc mắt, lấy trung bình hai mắt.

    Ngang: chia cho **nửa** khoảng cách hai khoé mắt, nên ±1 nghĩa là mống mắt
    chạm khoé. Dọc: chia cho nửa khe mí trên–mí dưới.

    Đây là tín hiệu bổ sung không thay thế được cho tư thế đầu: thí sinh liếc
    sang tài liệu bên cạnh mà giữ nguyên đầu thì yaw không đổi, chỉ mống mắt
    lệch. Ngược lại khi mắt gần nhắm, tỉ lệ dọc trở thành rác (mẫu số ~0) nên
    :func:`build_metrics` sẽ ép ``gaze_y`` về 0 trong trường hợp đó.

    Mô hình trả thiếu 10 điểm mống mắt (chỉ 468) thì trả (0, 0) — coi như không
    có thông tin, để tư thế đầu quyết định.
    """
    if len(points) < NUM_LANDMARKS_WITH_IRIS:
        return 0.0, 0.0

    offsets_x: list[float] = []
    offsets_y: list[float] = []
    for corners, lids, iris in (
        (RIGHT_EYE_CORNERS, RIGHT_EYE_LIDS, RIGHT_IRIS_CENTER),
        (LEFT_EYE_CORNERS, LEFT_EYE_LIDS, LEFT_IRIS_CENTER),
    ):
        left_corner, right_corner = points[corners[0]], points[corners[1]]
        upper_lid, lower_lid = points[lids[0]], points[lids[1]]
        center = points[iris]

        half_width = abs(float(right_corner[0] - left_corner[0])) / 2.0
        if half_width > 0:
            eye_center_x = float(left_corner[0] + right_corner[0]) / 2.0
            offsets_x.append((float(center[0]) - eye_center_x) / half_width)

        half_height = abs(float(lower_lid[1] - upper_lid[1])) / 2.0
        if half_height > 0:
            eye_center_y = float(upper_lid[1] + lower_lid[1]) / 2.0
            offsets_y.append((float(center[1]) - eye_center_y) / half_height)

    dx = float(np.clip(np.mean(offsets_x), -1.0, 1.0)) if offsets_x else 0.0
    dy = float(np.clip(np.mean(offsets_y), -1.0, 1.0)) if offsets_y else 0.0
    return dx, dy


def off_frame_ratio(points: NDArray[np.float64], width: int, height: int) -> float:
    """Tỉ lệ landmark nằm ngoài mép ảnh.

    MediaPipe vẫn ngoại suy toạ độ âm hoặc vượt quá cạnh ảnh khi khuôn mặt bị
    cắt, nên đây là cách rẻ nhất để biết người thi đã dịch ra khỏi khung — tình
    huống mà góc đầu một mình không nói lên được.
    """
    if len(points) == 0:
        return 1.0
    xs, ys = points[:, 0], points[:, 1]
    outside = (xs < 0) | (xs > width) | (ys < 0) | (ys > height)
    return float(np.count_nonzero(outside)) / float(len(points))


def build_metrics(
    points: NDArray[np.float64],
    matrix: NDArray[np.float64] | Any | None,
    width: int,
    height: int,
) -> FaceMetrics:
    """Gom toàn bộ đại lượng đo được của một khuôn mặt.

    ``points`` là toạ độ **pixel** (N, 2 hoặc 3). Bắt buộc là pixel chứ không
    phải toạ độ chuẩn hoá [0,1]: x chia cho bề rộng còn y chia cho chiều cao,
    nên trên ảnh 640x480 một khoảng cách dọc và một khoảng cách ngang bằng nhau
    lại ra hai con số khác nhau — EAR tính trên toạ độ chuẩn hoá sẽ sai lệch
    đúng bằng tỉ lệ khung hình.
    """
    yaw, pitch, roll = head_pose_degrees(matrix) if matrix is not None else (0.0, 0.0, 0.0)
    ear = eye_aspect_ratio(points)
    gaze_x, gaze_y = iris_offset(points)
    if ear < EAR_CLOSED:
        # Mắt gần nhắm: khe mí ~0 nên tỉ lệ dọc vô nghĩa, bỏ đi thay vì tin bừa.
        gaze_y = 0.0
    return FaceMetrics(
        yaw_deg=yaw,
        pitch_deg=pitch,
        roll_deg=roll,
        gaze_x=gaze_x,
        gaze_y=gaze_y,
        ear=ear,
        off_frame_ratio=off_frame_ratio(points, width, height),
    )


def classify_gaze(metrics: FaceMetrics) -> GazeDirection:
    """Quy hướng nhìn về một trong sáu nhãn của hợp đồng.

    Góc đầu và độ lệch mống mắt được cộng vào **một trục hiệu dụng** tính bằng
    độ, vì hai tín hiệu này bù nhau: quay đầu 30° rồi liếc ngược lại 25° thì
    thực tế vẫn đang nhìn màn hình.

        yaw_eff   = yaw   + gaze_x · GAZE_DEG_PER_UNIT_H
        pitch_eff = pitch + gaze_y · GAZE_DEG_PER_UNIT_V

    Thứ tự xét: mặt lọt ra ngoài mép ảnh → lệch quá ngưỡng OUT → trục nào lệch
    nhiều hơn thì trục đó đặt tên → còn lại là CENTER. Trục ngang được ưu tiên
    khi hai bên bằng nhau vì tài liệu gian lận hay đặt cạnh máy chứ ít khi ngay
    dưới màn hình.
    """
    if metrics.off_frame_ratio > OUT_OF_FRAME_RATIO:
        return "OUT_OF_FRAME"

    yaw_eff = metrics.yaw_deg + metrics.gaze_x * GAZE_DEG_PER_UNIT_H
    pitch_eff = metrics.pitch_deg + metrics.gaze_y * GAZE_DEG_PER_UNIT_V

    if abs(yaw_eff) > GAZE_OUT_YAW_DEG or abs(pitch_eff) > GAZE_OUT_PITCH_DEG:
        return "OUT_OF_FRAME"

    if abs(yaw_eff) >= abs(pitch_eff):
        if abs(yaw_eff) > GAZE_CENTER_YAW_DEG:
            return "RIGHT" if yaw_eff > 0 else "LEFT"
        if abs(pitch_eff) > GAZE_CENTER_PITCH_DEG:
            return "DOWN" if pitch_eff > 0 else "UP"
        return "CENTER"

    if abs(pitch_eff) > GAZE_CENTER_PITCH_DEG:
        return "DOWN" if pitch_eff > 0 else "UP"
    if abs(yaw_eff) > GAZE_CENTER_YAW_DEG:
        return "RIGHT" if yaw_eff > 0 else "LEFT"
    return "CENTER"


def attention_score(metrics: FaceMetrics, gaze: GazeDirection, face_count: int) -> int:
    """Điểm tập trung 0–100 của một khung hình.

    Công thức::

        head  = clamp(1 − max(|yaw| / 45°, |pitch| / 35°))
        gaze  = clamp(1 − max(|gaze_x|, |gaze_y|))
        eye   = clamp((EAR − 0.15) / (0.25 − 0.15))

        score = 100 · (0.40·head + 0.35·gaze + 0.25·eye)
        nếu face_count > 1:        score ·= 0.50
        nếu gaze == OUT_OF_FRAME:  score  = min(score, 35)

    Vì sao từng số hạng có mặt:

    * ``head`` (0.40) — tư thế đầu là bằng chứng mạnh nhất và ổn định nhất cho
      việc rời mắt khỏi màn hình; nó còn đo được cả khi mắt nhắm hờ hay ảnh mờ.
      Lấy ``max`` chứ không lấy trung bình hai trục: quay ngang 45° là mất tập
      trung hoàn toàn, không được phép bị pha loãng bởi pitch đang đẹp.
    * ``gaze`` (0.35) — độ lệch mống mắt bắt đúng kiểu gian lận mà tư thế đầu
      bỏ sót: giữ nguyên đầu, chỉ liếc sang tài liệu. Trọng số thấp hơn ``head``
      vì tín hiệu này nhiễu hơn (phụ thuộc độ phân giải vùng mắt) và mất hẳn
      khi mô hình chỉ trả 468 điểm.
    * ``eye`` (0.25) — EAR thấp nghĩa là mắt nhắm: ngủ gật, hoặc cúi đọc tài
      liệu với mí sụp xuống. Trọng số nhỏ nhất vì chớp mắt bình thường cũng kéo
      EAR xuống trong một khung hình, và đây là chỉ số dễ báo động nhầm nhất.

    Hai phép chỉnh cuối cùng là phạt chứ không phải số hạng cộng thêm:

    * Nhiều hơn một khuôn mặt thì điểm của người chính không còn ý nghĩa nữa —
      nhân 0.50 để khung hình đẹp nhất cũng chỉ còn 50, tức luôn nằm dưới mốc
      cảnh báo 60 nhưng vẫn trên mốc gắn cờ 40: bản thân việc có người thứ hai
      đã được báo riêng qua ``violationType = MULTIPLE_FACES``.
    * Nhìn hẳn ra ngoài khung thì trần điểm 35 kéo kết quả xuống dưới ngưỡng
      gắn cờ 40 của BR-011, để exam-suite không bỏ sót trường hợp mà ``head``
      và ``gaze`` đã bão hoà.

    Lưu ý ranh giới trách nhiệm: hàm này **không** suy ra ``LOW_ATTENTION``.
    Ngưỡng 60/40 nằm ở ``violation-counter.service.ts`` của exam-suite, nơi duy
    nhất có trạng thái theo thời gian của cả lượt thi.
    """
    head_term = 1.0 - max(
        abs(metrics.yaw_deg) / GAZE_OUT_YAW_DEG,
        abs(metrics.pitch_deg) / GAZE_OUT_PITCH_DEG,
    )
    gaze_term = 1.0 - max(abs(metrics.gaze_x), abs(metrics.gaze_y))
    eye_term = (metrics.ear - EAR_CLOSED) / (EAR_OPEN - EAR_CLOSED)

    raw = (
        WEIGHT_HEAD * _clamp01(head_term)
        + WEIGHT_GAZE * _clamp01(gaze_term)
        + WEIGHT_EYE * _clamp01(eye_term)
    )
    score = raw * 100.0
    if face_count > 1:
        score *= MULTI_FACE_FACTOR
    if gaze == "OUT_OF_FRAME":
        score = min(score, float(OUT_OF_FRAME_SCORE_CAP))
    return round(min(100.0, max(0.0, score)))


def resolve_violation(face_count: int, gaze: GazeDirection) -> ViolationType | None:
    """Chỉ ba loại vi phạm nhìn thấy ngay trên một khung hình.

    Thứ tự ưu tiên: không có mặt → nhiều mặt → nhìn ra ngoài khung. ``None``
    nghĩa là khung hình này không tự nó là vi phạm; exam-suite vẫn có thể sinh
    ``LOW_ATTENTION`` từ ``attentionScore`` theo BR-011.
    """
    if face_count == 0:
        return "NO_FACE"
    if face_count > 1:
        return "MULTIPLE_FACES"
    if gaze == "OUT_OF_FRAME":
        return "OFF_SCREEN"
    return None


def _clamp01(value: float) -> float:
    return min(1.0, max(0.0, value))


# --------------------------------------------------------------------------- #
# MediaPipe
# --------------------------------------------------------------------------- #

_detect_lock = threading.Lock()


def _ensure_model_file() -> Path:
    """Bảo đảm có file ``.task`` trên đĩa, tải về nếu thiếu.

    Không đóng gói 3.8MB nhị phân vào git; tải một lần vào ``.cache/`` rồi dùng
    lại mãi. Môi trường đóng (không ra Internet) thì đặt sẵn file và trỏ
    ``PROCTOR_MODEL_PATH`` vào đó, hoặc để ``PROCTOR_MODEL_URL`` rỗng để báo lỗi
    rõ ràng thay vì treo ở bước tải.
    """
    if MODEL_PATH.exists():
        return MODEL_PATH
    if not MODEL_URL:
        raise FaceLandmarkerUnavailableError(
            f"MediaPipe model missing at {MODEL_PATH} and PROCTOR_MODEL_URL is empty"
        )

    import httpx

    logger.info("proctor_model_downloading", url=MODEL_URL, path=str(MODEL_PATH))
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    try:
        response = httpx.get(MODEL_URL, timeout=120.0, follow_redirects=True)
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise FaceLandmarkerUnavailableError(f"cannot download MediaPipe model: {exc}") from exc

    # Ghi ra file tạm rồi đổi tên: tránh để lại file cụt khi tiến trình chết giữa chừng.
    tmp = MODEL_PATH.with_suffix(".task.part")
    tmp.write_bytes(response.content)
    tmp.replace(MODEL_PATH)
    logger.info("proctor_model_downloaded", bytes=len(response.content))
    return MODEL_PATH


@lru_cache(maxsize=1)
def get_face_landmarker() -> Any:
    """Nạp Face Landmarker một lần cho cả tiến trình.

    Nạp mất ~2.7s (khởi tạo XNNPACK delegate), nên ``lru_cache`` giữ đúng một
    thực thể. ``RunningMode.IMAGE`` chứ không phải VIDEO/LIVE_STREAM: mỗi
    request là một khung hình rời, không có dòng thời gian liên tục để mô hình
    bám vết — VIDEO đòi timestamp tăng đơn điệu, mà các lượt thi song song gửi
    xen kẽ nhau sẽ phá vỡ điều kiện đó.
    """
    from mediapipe.tasks import python as mp_python
    from mediapipe.tasks.python import vision

    model_path = _ensure_model_file()
    options = vision.FaceLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=str(model_path)),
        running_mode=vision.RunningMode.IMAGE,
        num_faces=MAX_FACES,
        min_face_detection_confidence=MIN_FACE_CONFIDENCE,
        min_face_presence_confidence=MIN_FACE_CONFIDENCE,
        min_tracking_confidence=MIN_FACE_CONFIDENCE,
        output_face_blendshapes=False,
        # Cần ma trận này để lấy yaw/pitch; bật lên gần như không tốn thêm thời gian.
        output_facial_transformation_matrixes=True,
    )
    landmarker = vision.FaceLandmarker.create_from_options(options)
    logger.info("proctor_model_loaded", model=str(model_path), max_faces=MAX_FACES)
    return landmarker


def _detect(frame: NDArray[np.uint8]) -> Any:
    """Chạy suy luận dưới khoá — xem docstring đầu module về lý do."""
    import mediapipe as mp

    image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame)
    landmarker = get_face_landmarker()
    with _detect_lock:
        return landmarker.detect(image)


def _to_pixel_array(landmarks: Any, width: int, height: int) -> NDArray[np.float64]:
    """Đổi landmark chuẩn hoá của MediaPipe sang toạ độ pixel (N, 3)."""
    return np.array(
        [(lm.x * width, lm.y * height, lm.z * width) for lm in landmarks],
        dtype=float,
    )


# --------------------------------------------------------------------------- #
# Điểm vào
# --------------------------------------------------------------------------- #


def analyze_frame(frame_base64: str) -> FrameAnalysisResponse:
    """Phân tích một khung hình và trả đúng ``FrameAnalysisResponse``.

    Không có mặt nào thì trả điểm 0 kèm ``NO_FACE`` — 0 là số đo thật ("không
    quan sát được gì"), không phải giá trị mặc định cho có. Khi có nhiều mặt,
    mọi chỉ số hình học lấy theo khuôn mặt đầu tiên (mặt mà MediaPipe xếp hạng
    cao nhất), còn việc có người thứ hai đã được phản ánh qua ``faceCount``,
    ``violationType`` và hệ số phạt trong điểm.
    """
    frame = decode_frame(frame_base64)
    height, width = frame.shape[0], frame.shape[1]

    result = _detect(frame)
    faces = list(getattr(result, "face_landmarks", None) or [])
    face_count = len(faces)

    if face_count == 0:
        return FrameAnalysisResponse(
            face_detected=False,
            face_count=0,
            attention_score=0,
            gaze_direction="OUT_OF_FRAME",
            violation_type="NO_FACE",
        )

    matrices = list(getattr(result, "facial_transformation_matrixes", None) or [])
    matrix = matrices[0] if matrices else None

    points = _to_pixel_array(faces[0], width, height)
    metrics = build_metrics(points, matrix, width, height)
    gaze = classify_gaze(metrics)

    return FrameAnalysisResponse(
        face_detected=True,
        face_count=face_count,
        attention_score=attention_score(metrics, gaze, face_count),
        gaze_direction=gaze,
        violation_type=resolve_violation(face_count, gaze),
    )
