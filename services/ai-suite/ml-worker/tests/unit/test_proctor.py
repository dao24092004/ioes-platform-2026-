"""Kiểm thử phát hiện mất tập trung (FR-AI-006).

MediaPipe bị thay bằng hàm giả ở mọi test: nạp mô hình thật mất ~2.7s, cần tải
3.8MB từ Internet, và muốn kiểm tra "nhìn sang phải" thì phải có ảnh webcam
thật — cả ba điều đó đều không thuộc về một bộ test đơn vị. Thay vào đó, phần
suy luận được tách thành hàm thuần (:func:`head_pose_degrees`,
:func:`iris_offset`, :func:`classify_gaze`, :func:`attention_score`) và kiểm
thử bằng landmark dựng tay, nơi câu trả lời đúng biết trước.

Test không import ``ml_worker.main``: router được gắn vào một app rời để bộ
test này không phụ thuộc vào thứ tự đăng ký router của service.
"""

from __future__ import annotations

import base64
import io
import math
from typing import Any

import numpy as np
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image

from ml_worker.api.proctor import router as proctor_router
from ml_worker.services import proctor as P

# --------------------------------------------------------------------------- #
# Đồ dùng chung
# --------------------------------------------------------------------------- #


def _jpeg_base64(
    width: int = 320, height: int = 240, colour: tuple[int, int, int] = (18, 18, 18)
) -> str:
    """Ảnh JPEG tổng hợp, không có khuôn mặt nào."""
    buffer = io.BytesIO()
    Image.new("RGB", (width, height), colour).save(buffer, format="JPEG")
    return base64.b64encode(buffer.getvalue()).decode()


def _face_points(
    *,
    eye_width: float = 30.0,
    eye_height: float = 9.0,
    iris_dx: float = 0.0,
    iris_dy: float = 0.0,
    centre: tuple[float, float] = (320.0, 240.0),
    count: int = P.NUM_LANDMARKS_WITH_IRIS,
) -> np.ndarray:
    """Dựng một bộ landmark pixel chỉ đủ dùng cho hai mắt.

    ``eye_height / eye_width`` chính là EAR mong đợi, còn ``iris_dx``/``iris_dy``
    là độ lệch mống mắt tính theo nửa hốc mắt — nên mọi khẳng định trong test
    đều đối chiếu được với một con số tính tay.
    """
    cx, cy = centre
    points = np.tile(np.array([cx, cy, 0.0]), (count, 1))
    half_w, half_h = eye_width / 2.0, eye_height / 2.0

    eyes = (
        (cx - 60.0, P.RIGHT_EYE_EAR, P.RIGHT_EYE_LIDS, P.RIGHT_IRIS_CENTER),
        (cx + 60.0, P.LEFT_EYE_EAR, P.LEFT_EYE_LIDS, P.LEFT_IRIS_CENTER),
    )
    for ex, ear_idx, lid_idx, iris_idx in eyes:
        p1, p2, p3, p4, p5, p6 = ear_idx
        points[p1] = (ex - half_w, cy, 0.0)  # khoé phía mép trái ảnh
        points[p4] = (ex + half_w, cy, 0.0)  # khoé phía mép phải ảnh
        points[p2] = (ex - half_w / 2.0, cy - half_h, 0.0)
        points[p6] = (ex - half_w / 2.0, cy + half_h, 0.0)
        points[p3] = (ex + half_w / 2.0, cy - half_h, 0.0)
        points[p5] = (ex + half_w / 2.0, cy + half_h, 0.0)
        points[lid_idx[0]] = (ex, cy - half_h, 0.0)
        points[lid_idx[1]] = (ex, cy + half_h, 0.0)
        if iris_idx < count:
            points[iris_idx] = (ex + iris_dx * half_w, cy + iris_dy * half_h, 0.0)
    return points


def _rotation(yaw_deg: float = 0.0, pitch_deg: float = 0.0, roll_deg: float = 0.0) -> np.ndarray:
    """Ma trận 4x4 theo đúng thứ tự Rz·Ry·Rx mà head_pose_degrees phân rã."""
    y, p, r = map(math.radians, (yaw_deg, pitch_deg, roll_deg))
    rx = np.array([[1, 0, 0], [0, math.cos(p), -math.sin(p)], [0, math.sin(p), math.cos(p)]])
    ry = np.array([[math.cos(y), 0, math.sin(y)], [0, 1, 0], [-math.sin(y), 0, math.cos(y)]])
    rz = np.array([[math.cos(r), -math.sin(r), 0], [math.sin(r), math.cos(r), 0], [0, 0, 1]])
    matrix = np.eye(4)
    matrix[:3, :3] = rz @ ry @ rx
    return matrix


def _metrics(**overrides: float) -> P.FaceMetrics:
    base: dict[str, float] = {
        "yaw_deg": 0.0,
        "pitch_deg": 0.0,
        "roll_deg": 0.0,
        "gaze_x": 0.0,
        "gaze_y": 0.0,
        "ear": 0.30,
        "off_frame_ratio": 0.0,
    }
    base.update(overrides)
    return P.FaceMetrics(**base)  # type: ignore[arg-type]


class _StubResult:
    """Đóng vai kết quả trả về của ``FaceLandmarker.detect``."""

    def __init__(self, faces: list[np.ndarray], matrices: list[np.ndarray] | None = None) -> None:
        self.face_landmarks = [[_StubLandmark(*row[:3]) for row in face] for face in faces]
        self.facial_transformation_matrixes = matrices or []


class _StubLandmark:
    """MediaPipe trả landmark đã chuẩn hoá [0,1]; stub giữ nguyên quy ước đó."""

    __slots__ = ("x", "y", "z")

    def __init__(self, x: float, y: float, z: float) -> None:
        self.x, self.y, self.z = x, y, z


def _stub_detect(
    monkeypatch: pytest.MonkeyPatch,
    faces: list[np.ndarray],
    matrices: list[np.ndarray] | None = None,
    frame_size: tuple[int, int] = (320, 240),
) -> None:
    """Thay ``_detect`` bằng hàm trả landmark dựng sẵn (đã chuẩn hoá lại)."""
    width, height = frame_size
    normalised = [face / np.array([width, height, width]) for face in faces]

    def fake(_frame: Any) -> _StubResult:
        return _StubResult(normalised, matrices)

    monkeypatch.setattr(P, "_detect", fake)


@pytest.fixture
def client() -> TestClient:
    app = FastAPI()
    app.include_router(proctor_router)
    return TestClient(app)


def _request_body(frame: str) -> dict[str, Any]:
    return {
        "attemptId": "11111111-2222-3333-4444-555555555555",
        "capturedAt": "2026-09-21T10:00:00.000Z",
        "frameBase64": frame,
        "sequenceId": 12,
    }


# --------------------------------------------------------------------------- #
# Giải mã khung hình
# --------------------------------------------------------------------------- #


def test_decode_frame_returns_rgb_array() -> None:
    frame = P.decode_frame(_jpeg_base64(64, 48))

    assert frame.shape == (48, 64, 3)
    assert frame.dtype == np.uint8


def test_decode_frame_accepts_data_uri_prefix() -> None:
    """Trình duyệt sinh chuỗi kèm tiền tố; cắt bỏ chứ không được từ chối."""
    raw = _jpeg_base64(64, 48)

    with_prefix = P.decode_frame(f"data:image/jpeg;base64,{raw}")

    assert np.array_equal(with_prefix, P.decode_frame(raw))


def test_decode_frame_rejects_invalid_base64() -> None:
    with pytest.raises(P.FrameDecodeError):
        P.decode_frame("khong-phai-base64-!!!")


def test_decode_frame_rejects_bytes_that_are_not_an_image() -> None:
    with pytest.raises(P.FrameDecodeError):
        P.decode_frame(base64.b64encode(b"day chi la van ban thuong").decode())


def test_decode_frame_rejects_empty_payload() -> None:
    with pytest.raises(P.FrameDecodeError):
        P.decode_frame("data:image/jpeg;base64,")


def test_decode_frame_rejects_oversized_payload(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(P, "MAX_FRAME_BYTES", 64)

    with pytest.raises(P.FrameDecodeError):
        P.decode_frame(_jpeg_base64(320, 240))


def test_decode_frame_downscales_long_edge() -> None:
    """Ảnh to hơn không cho lưới chính xác hơn, chỉ chậm hơn."""
    frame = P.decode_frame(_jpeg_base64(1600, 1200))

    assert max(frame.shape[:2]) == P.MAX_FRAME_PX


# --------------------------------------------------------------------------- #
# Tư thế đầu
# --------------------------------------------------------------------------- #


def test_head_pose_of_identity_matrix_is_frontal() -> None:
    yaw, pitch, roll = P.head_pose_degrees(np.eye(4))

    assert (round(yaw), round(pitch), round(roll)) == (0, 0, 0)


@pytest.mark.parametrize("yaw_deg", [-40.0, -15.0, 15.0, 40.0])
def test_head_pose_recovers_yaw(yaw_deg: float) -> None:
    """Dấu là phần quan trọng: dương = đầu quay về mép phải của ảnh."""
    yaw, pitch, _roll = P.head_pose_degrees(_rotation(yaw_deg=yaw_deg))

    assert yaw == pytest.approx(yaw_deg, abs=0.01)
    assert pitch == pytest.approx(0.0, abs=0.01)


@pytest.mark.parametrize("pitch_deg", [-25.0, 25.0])
def test_head_pose_recovers_pitch(pitch_deg: float) -> None:
    """Dương = cúi xuống."""
    yaw, pitch, _roll = P.head_pose_degrees(_rotation(pitch_deg=pitch_deg))

    assert pitch == pytest.approx(pitch_deg, abs=0.01)
    assert yaw == pytest.approx(0.0, abs=0.01)


def test_head_pose_recovers_roll() -> None:
    _yaw, _pitch, roll = P.head_pose_degrees(_rotation(roll_deg=18.0))

    assert roll == pytest.approx(18.0, abs=0.01)


# --------------------------------------------------------------------------- #
# EAR và mống mắt
# --------------------------------------------------------------------------- #


def test_eye_aspect_ratio_matches_hand_computed_value() -> None:
    assert P.eye_aspect_ratio(_face_points(eye_width=30.0, eye_height=9.0)) == pytest.approx(0.30)


def test_eye_aspect_ratio_drops_when_eyes_close() -> None:
    closed = P.eye_aspect_ratio(_face_points(eye_width=30.0, eye_height=3.0))

    assert closed == pytest.approx(0.10)
    assert closed < P.EAR_CLOSED


def test_iris_offset_is_zero_when_centred() -> None:
    dx, dy = P.iris_offset(_face_points())

    assert (dx, dy) == pytest.approx((0.0, 0.0))


@pytest.mark.parametrize("iris_dx", [-0.8, -0.4, 0.4, 0.8])
def test_iris_offset_follows_horizontal_shift(iris_dx: float) -> None:
    dx, _dy = P.iris_offset(_face_points(iris_dx=iris_dx))

    assert dx == pytest.approx(iris_dx)


def test_iris_offset_is_clamped_to_unit_range() -> None:
    dx, dy = P.iris_offset(_face_points(iris_dx=5.0, iris_dy=-5.0))

    assert (dx, dy) == pytest.approx((1.0, -1.0))


def test_iris_offset_is_neutral_without_iris_landmarks() -> None:
    """Mô hình chỉ trả 468 điểm thì không có thông tin mống mắt, không được đoán."""
    mesh_only = _face_points(iris_dx=0.9, count=P.NUM_MESH_LANDMARKS)

    assert P.iris_offset(mesh_only) == (0.0, 0.0)


def test_off_frame_ratio_counts_landmarks_outside_the_image() -> None:
    points = _face_points(centre=(-500.0, 240.0))

    assert P.off_frame_ratio(points, 640, 480) > P.OUT_OF_FRAME_RATIO


def test_build_metrics_discards_vertical_gaze_when_eyes_are_closed() -> None:
    """Khe mí ~0 thì tỉ lệ dọc là rác; thà bỏ còn hơn tin bừa."""
    points = _face_points(eye_width=30.0, eye_height=3.0, iris_dy=0.9)

    metrics = P.build_metrics(points, np.eye(4), 640, 480)

    assert metrics.ear < P.EAR_CLOSED
    assert metrics.gaze_y == 0.0


# --------------------------------------------------------------------------- #
# Phân loại hướng nhìn
# --------------------------------------------------------------------------- #


def test_classify_gaze_centre() -> None:
    assert P.classify_gaze(_metrics(yaw_deg=5.0, pitch_deg=4.0)) == "CENTER"


def test_classify_gaze_right_from_head_turn() -> None:
    assert P.classify_gaze(_metrics(yaw_deg=30.0)) == "RIGHT"


def test_classify_gaze_left_from_head_turn() -> None:
    assert P.classify_gaze(_metrics(yaw_deg=-30.0)) == "LEFT"


def test_classify_gaze_right_from_iris_alone() -> None:
    """Giữ nguyên đầu, chỉ liếc sang tài liệu bên cạnh — vẫn phải bắt được."""
    assert P.classify_gaze(_metrics(yaw_deg=0.0, gaze_x=0.9)) == "RIGHT"


def test_classify_gaze_down() -> None:
    assert P.classify_gaze(_metrics(pitch_deg=25.0)) == "DOWN"


def test_classify_gaze_up() -> None:
    assert P.classify_gaze(_metrics(pitch_deg=-25.0)) == "UP"


def test_classify_gaze_out_of_frame_when_head_turns_far() -> None:
    assert P.classify_gaze(_metrics(yaw_deg=70.0)) == "OUT_OF_FRAME"


def test_classify_gaze_out_of_frame_when_face_leaves_the_image() -> None:
    assert P.classify_gaze(_metrics(off_frame_ratio=0.5)) == "OUT_OF_FRAME"


def test_classify_gaze_cancels_head_turn_against_opposite_glance() -> None:
    """Quay đầu 24° rồi liếc ngược lại gần hết cỡ thì mắt vẫn ở trên màn hình."""
    assert P.classify_gaze(_metrics(yaw_deg=24.0, gaze_x=-0.9)) == "CENTER"


# --------------------------------------------------------------------------- #
# Điểm tập trung
# --------------------------------------------------------------------------- #


def test_attention_score_is_high_for_a_focused_face() -> None:
    score = P.attention_score(_metrics(ear=0.30), "CENTER", face_count=1)

    assert score == 100


def test_attention_score_falls_below_warning_threshold_when_head_turns_away() -> None:
    """BR-011 dùng mốc 60; đầu quay 35° phải kéo điểm xuống dưới mốc đó."""
    score = P.attention_score(_metrics(yaw_deg=35.0, gaze_x=0.5, ear=0.30), "RIGHT", face_count=1)

    assert score < 60


def test_attention_score_drops_when_eyes_are_closed() -> None:
    open_eyes = P.attention_score(_metrics(ear=0.30), "CENTER", face_count=1)
    shut_eyes = P.attention_score(_metrics(ear=0.05), "CENTER", face_count=1)

    assert shut_eyes == open_eyes - 25  # đúng trọng số WEIGHT_EYE


def test_attention_score_penalises_a_second_face() -> None:
    alone = P.attention_score(_metrics(), "CENTER", face_count=1)
    crowded = P.attention_score(_metrics(), "CENTER", face_count=2)

    assert crowded == round(alone * P.MULTI_FACE_FACTOR)
    assert crowded < 60


def test_attention_score_is_capped_when_gaze_leaves_the_frame() -> None:
    """Phải nằm dưới mốc gắn cờ 40 của BR-011 kể cả khi các chỉ số khác đẹp."""
    score = P.attention_score(_metrics(ear=0.30), "OUT_OF_FRAME", face_count=1)

    assert score <= P.OUT_OF_FRAME_SCORE_CAP < 40


@pytest.mark.parametrize("yaw", [-720.0, -45.0, 0.0, 45.0, 720.0])
@pytest.mark.parametrize("pitch", [-720.0, 0.0, 720.0])
@pytest.mark.parametrize("ear", [-1.0, 0.0, 0.3, 9.0])
@pytest.mark.parametrize("gaze_x", [-5.0, 0.0, 5.0])
def test_attention_score_always_stays_within_range(
    yaw: float, pitch: float, ear: float, gaze_x: float
) -> None:
    """Hợp đồng ghi 0–100; số liệu vô lý cũng không được làm vỡ khoảng đó."""
    metrics = _metrics(yaw_deg=yaw, pitch_deg=pitch, ear=ear, gaze_x=gaze_x)

    for faces in (1, 2):
        for gaze in ("CENTER", "OUT_OF_FRAME"):
            score = P.attention_score(metrics, gaze, face_count=faces)  # type: ignore[arg-type]
            assert 0 <= score <= 100
            assert isinstance(score, int)


# --------------------------------------------------------------------------- #
# Loại vi phạm
# --------------------------------------------------------------------------- #


def test_resolve_violation_no_face() -> None:
    assert P.resolve_violation(0, "OUT_OF_FRAME") == "NO_FACE"


def test_resolve_violation_multiple_faces_outranks_gaze() -> None:
    assert P.resolve_violation(2, "OUT_OF_FRAME") == "MULTIPLE_FACES"


def test_resolve_violation_off_screen() -> None:
    assert P.resolve_violation(1, "OUT_OF_FRAME") == "OFF_SCREEN"


@pytest.mark.parametrize("gaze", ["CENTER", "LEFT", "RIGHT", "UP", "DOWN"])
def test_resolve_violation_leaves_low_attention_to_exam_suite(gaze: str) -> None:
    """ml-worker không bao giờ tự sinh LOW_ATTENTION — đó là việc của BR-011."""
    assert P.resolve_violation(1, gaze) is None  # type: ignore[arg-type]


# --------------------------------------------------------------------------- #
# analyze_frame + route
# --------------------------------------------------------------------------- #


def test_analyze_frame_reports_no_face_on_a_blank_image(monkeypatch: pytest.MonkeyPatch) -> None:
    _stub_detect(monkeypatch, faces=[])

    result = P.analyze_frame(_jpeg_base64())

    assert result.face_detected is False
    assert result.face_count == 0
    assert result.attention_score == 0
    assert result.violation_type == "NO_FACE"
    assert result.gaze_direction == "OUT_OF_FRAME"


def test_analyze_frame_reports_a_focused_face(monkeypatch: pytest.MonkeyPatch) -> None:
    _stub_detect(monkeypatch, faces=[_face_points()], matrices=[_rotation()])

    result = P.analyze_frame(_jpeg_base64())

    assert result.face_detected is True
    assert result.face_count == 1
    assert result.gaze_direction == "CENTER"
    assert result.violation_type is None
    assert result.attention_score >= 90


def test_analyze_frame_flags_a_second_person(monkeypatch: pytest.MonkeyPatch) -> None:
    _stub_detect(
        monkeypatch,
        faces=[_face_points(), _face_points(centre=(120.0, 200.0))],
        matrices=[_rotation(), _rotation()],
    )

    result = P.analyze_frame(_jpeg_base64())

    assert result.face_count == 2
    assert result.violation_type == "MULTIPLE_FACES"


def test_analyze_frame_flags_off_screen_gaze(monkeypatch: pytest.MonkeyPatch) -> None:
    _stub_detect(monkeypatch, faces=[_face_points()], matrices=[_rotation(yaw_deg=60.0)])

    result = P.analyze_frame(_jpeg_base64())

    assert result.gaze_direction == "OUT_OF_FRAME"
    assert result.violation_type == "OFF_SCREEN"
    assert result.attention_score <= P.OUT_OF_FRAME_SCORE_CAP


def test_analyze_frame_survives_a_model_without_transformation_matrix(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Thiếu ma trận tư thế thì coi đầu nhìn thẳng, không được ném lỗi."""
    _stub_detect(monkeypatch, faces=[_face_points()], matrices=[])

    result = P.analyze_frame(_jpeg_base64())

    assert result.face_detected is True
    assert result.gaze_direction == "CENTER"


def test_endpoint_returns_no_face_for_a_synthetic_frame(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    _stub_detect(monkeypatch, faces=[])

    response = client.post("/internal/ai/proctor/analyze", json=_request_body(_jpeg_base64()))

    assert response.status_code == 200
    assert response.json() == {
        "faceDetected": False,
        "faceCount": 0,
        "attentionScore": 0,
        "gazeDirection": "OUT_OF_FRAME",
        "violationType": "NO_FACE",
    }


def test_endpoint_accepts_a_data_uri_prefix(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    _stub_detect(monkeypatch, faces=[_face_points()], matrices=[_rotation()])

    response = client.post(
        "/internal/ai/proctor/analyze",
        json=_request_body(f"data:image/jpeg;base64,{_jpeg_base64()}"),
    )

    assert response.status_code == 200
    assert response.json()["faceDetected"] is True


def test_endpoint_returns_400_for_invalid_base64(client: TestClient) -> None:
    response = client.post("/internal/ai/proctor/analyze", json=_request_body("!!!khong-base64!!!"))

    assert response.status_code == 400


def test_endpoint_returns_400_for_bytes_that_are_not_an_image(client: TestClient) -> None:
    payload = base64.b64encode(b"khong phai anh").decode()

    response = client.post("/internal/ai/proctor/analyze", json=_request_body(payload))

    assert response.status_code == 400


def test_endpoint_rejects_an_empty_frame_field(client: TestClient) -> None:
    response = client.post("/internal/ai/proctor/analyze", json=_request_body(""))

    assert response.status_code == 422


def test_endpoint_rejects_a_missing_captured_at(client: TestClient) -> None:
    body = _request_body(_jpeg_base64())
    del body["capturedAt"]

    assert client.post("/internal/ai/proctor/analyze", json=body).status_code == 422


def test_endpoint_returns_503_when_the_model_is_missing(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Thiếu mô hình là lỗi vận hành — thà 503 còn hơn trả điểm bịa."""

    def explode(_frame: Any) -> None:
        raise P.FaceLandmarkerUnavailableError("thiếu face_landmarker.task")

    monkeypatch.setattr(P, "_detect", explode)

    response = client.post("/internal/ai/proctor/analyze", json=_request_body(_jpeg_base64()))

    assert response.status_code == 503
    assert "face_landmarker.task" in response.json()["detail"]


def test_endpoint_keeps_the_camel_case_wire_contract(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """exam-suite đọc đúng năm khoá này; thừa hay thiếu đều là hỏng hợp đồng."""
    _stub_detect(monkeypatch, faces=[_face_points()], matrices=[_rotation()])

    body = client.post("/internal/ai/proctor/analyze", json=_request_body(_jpeg_base64())).json()

    assert set(body) == {
        "faceDetected",
        "faceCount",
        "attentionScore",
        "gazeDirection",
        "violationType",
    }
