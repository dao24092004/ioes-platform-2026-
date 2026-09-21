"""Đẩy việc đồng bộ nặng ra khỏi vòng lặp sự kiện.

Vì sao phải có tệp này
----------------------
Tầng dịch vụ của ml-worker viết đồng bộ hết: LangChain ``.invoke()`` gọi mạng
bằng ``httpx.Client`` đồng bộ, ``sentence-transformers`` chạy suy luận trên CPU,
``pymilvus`` dùng gRPC chặn luồng. Bản thân điều đó không sai — nhưng một route
khai ``async def`` rồi gọi thẳng những hàm ấy thì **cả tiến trình đứng im**:
uvicorn chỉ có một vòng lặp sự kiện, và mọi kết nối đang mở nằm chung trên đó.

Đo thật trên máy dev (một lượt ``POST /v1/learning-path/generate``, 96 giây):
``GET /health`` không trả về gì trong suốt 90 giây, curl đứt ở mốc timeout 10
giây, năm lần liên tiếp. Đây không phải chuyện chậm — nó là **mất dịch vụ**.
Nặng nhất là FR-AI-006: exam-suite bắn một khung hình webcam mỗi giây cho mỗi
thí sinh sang ``/internal/ai/proctor/analyze``; một người học bấm sinh lộ trình
là cả phòng thi mất giám sát hơn một phút.

Vì sao không dùng ``ainvoke`` của LangChain
------------------------------------------
``ChatOpenAI.ainvoke`` thật sự bất đồng bộ (nó dùng ``AsyncOpenAI``), nhưng chỉ
mình nó thôi thì không đủ:

- ``HuggingFaceEmbeddings`` không có bản async thật — ``aembed_query`` mặc định
  chỉ là ``run_in_executor`` bọc lại bản đồng bộ, và phần nặng là suy luận
  PyTorch trên CPU chứ không phải I/O.
- ``langchain_milvus`` cũng vậy: pymilvus là gRPC đồng bộ.
- Chuyển sang async phải viết lại cả năm agent của ``services/learning_path``,
  ``services/rag``, ``services/questions`` thành async — và đổi luôn chữ ký mà
  439 test đơn vị đang gọi trực tiếp.

Nên ranh giới đặt ở **tầng route**: giữ tầng dịch vụ đồng bộ, đẩy nguyên cụm
việc sang luồng khác. Đúng cách ``api/proctor.py`` đã làm cho MediaPipe từ đầu.

Hai mức, dùng cho hai loại việc
-------------------------------
``def`` trần (FastAPI tự đẩy sang threadpool mặc định)
    Việc ngắn, có trần thời gian rõ: một khung hình proctor (~10ms), một lượt
    nhúng danh mục khoá học. Threadpool mặc định của Starlette có 40 chỗ, thừa
    sức cho nhịp 1 khung/giây/thí sinh.

``await run_heavy(...)`` (tệp này)
    Việc **dài và không đoán được** — một lượt sinh lộ trình mất 96 giây và giữ
    luôn một luồng suốt thời gian đó. Thả tự do thì 40 lượt sinh song song ăn
    sạch threadpool và proctoring lại chết đúng như cũ, chỉ chậm hơn một nhịp.
    Nên nhóm việc nặng có **hạn ngạch luồng riêng** (``CapacityLimiter``), tách
    hẳn khỏi 40 chỗ mặc định: dù có bao nhiêu lượt sinh lộ trình xếp hàng,
    proctoring và ``/health`` vẫn còn nguyên threadpool của mình.

Xếp hàng chứ không nuốt vô hạn
------------------------------
Quá hạn ngạch thì request **chờ ở dạng coroutine**, không chiếm luồng nào. Chờ
quá ``llm_queue_timeout_seconds`` thì trả 503 kèm ``Retry-After`` thay vì treo
đến khi gateway tự đứt: phía gọi biết sớm là hệ thống quá tải thì còn thử lại
được, chứ một kết nối chết ở giây thứ 91 thì không nói lên điều gì.
"""

from __future__ import annotations

import asyncio
from collections.abc import Callable
from functools import partial
from typing import Any, TypeVar
from weakref import WeakKeyDictionary

import anyio
from anyio import to_thread
from ioes_common import get_logger

from ml_worker.core.config import get_settings

logger = get_logger(__name__)

T = TypeVar("T")


class ServiceOverloadedError(RuntimeError):
    """Hết chỗ cho việc nặng và hàng chờ cũng đã quá hạn.

    ``main.py`` dịch thành HTTP 503 kèm ``Retry-After``. Cố ý là một lớp riêng
    chứ không phải ``HTTPException``: tầng ``core/`` không nên biết gì về HTTP,
    và tách ra thì test được mà không cần dựng client.
    """


# CapacityLimiter/Semaphore của anyio gắn với backend async đang chạy, dựng ở
# thời điểm import (chưa có vòng lặp) sẽ hỏng. Nên dựng lười và nhớ theo từng
# vòng lặp — TestClient tạo vòng lặp riêng cho mỗi client, dùng chung một thực
# thể giữa các vòng lặp là lỗi rất khó lần ra.
_gates: WeakKeyDictionary[Any, tuple[anyio.Semaphore, anyio.CapacityLimiter]] = WeakKeyDictionary()


def _gate() -> tuple[anyio.Semaphore, anyio.CapacityLimiter]:
    """Cặp (cửa vào, hạn ngạch luồng) của vòng lặp sự kiện hiện tại.

    Hai đối tượng chứ không một: ``Semaphore`` chặn ở tầng coroutine để đếm
    được thời gian chờ và bỏ cuộc đúng hạn, còn ``CapacityLimiter`` là thứ
    ``to_thread.run_sync`` nhận để **không tiêu vào 40 chỗ của threadpool mặc
    định**. Cùng kích thước nên vòng trong không bao giờ phải chờ thêm.
    """
    loop = asyncio.get_running_loop()
    gate = _gates.get(loop)
    if gate is None:
        slots = max(1, get_settings().llm_max_concurrency)
        gate = (anyio.Semaphore(slots), anyio.CapacityLimiter(slots))
        _gates[loop] = gate
        logger.info("heavy_gate_created", slots=slots)
    return gate


async def run_heavy(func: Callable[..., T], /, *args: Any, **kwargs: Any) -> T:
    """Chạy một hàm đồng bộ nặng ở luồng khác, có giới hạn số lượt song song.

    Ném ``ServiceOverloadedError`` khi phải xếp hàng quá lâu.

    Không đặt ``abandon_on_cancel=True``: phía gọi đứt kết nối thì luồng vẫn
    đang gọi mô hình, buông sớm sẽ trả chỗ trong khi luồng chưa rảnh — đếm sai
    đúng vào lúc hệ thống đang căng nhất.
    """
    slots, limiter = _gate()
    timeout = get_settings().llm_queue_timeout_seconds

    try:
        with anyio.fail_after(timeout):
            await slots.acquire()
    except TimeoutError as exc:
        logger.warning(
            "heavy_queue_timeout", waited_seconds=timeout, name=getattr(func, "__name__", "?")
        )
        raise ServiceOverloadedError(
            f"Máy chủ đang xử lý tối đa {limiter.total_tokens:g} yêu cầu nặng cùng lúc "
            f"và hàng chờ đã quá {timeout:g} giây. Thử lại sau."
        ) from exc

    try:
        return await to_thread.run_sync(partial(func, *args, **kwargs), limiter=limiter)
    finally:
        slots.release()
