"""Sinh câu hỏi từ học liệu đã nạp.

Khác chuỗi hỏi đáp ở mức độ nghiêm ngặt. Câu trả lời sai thì người đọc gạt đi;
câu hỏi sai được lưu vào ngân hàng đề rồi **đem chấm điểm**, nên sai lan sang
điểm số của nhiều người. Vì vậy ở đây dựng năm tầng chặn thay vì một cờ
``grounded``:

1. Ngữ cảnh là nguồn duy nhất. ``topic`` chỉ dùng để truy xuất, KHÔNG bao giờ
   vào lời nhắc sinh — câu "sinh câu hỏi về X" cho phép mô hình rút từ kiến
   thức nền của nó thay vì từ tài liệu.
2. Cổng lọc lạc đề. Bốn tầng còn lại chặn *bịa* chứ không chặn *sai chủ đề*:
   truy xuất luôn trả về thứ gì đó nên bộ sinh vẫn soạn được đề hợp lệ từ tài
   liệu chẳng liên quan. Xem ``_covers_topic``.
3. Bắt trích nguồn. Mỗi câu phải khai lấy từ khối ``[n]`` nào; khai sai hoặc
   ngoài khoảng thì loại. Kiểm bằng mã, không phải tin lời mô hình.
4. Đối chiếu. Hỏi lại mô hình một câu đóng, chỉ đưa đúng đoạn nó khai, xem đoạn
   đó có thật sự chống lưng đáp án không.
5. ``count`` là trần chứ không phải chỉ tiêu. Học liệu đủ 3 câu thì trả 3. Ép
   cho đủ N chính là cách chắc chắn nhất để mô hình bắt đầu bịa: hết dữ liệu
   thật, nó vẫn phải nộp đủ bài.

Tầng 4 tốn thêm một lượt gọi mô hình mỗi câu. Đắt, nhưng rẻ hơn một câu sai
nằm trong ngân hàng đề.

Cả hai tầng 2 và 4 đều tìm ra khi chạy thật, không phải khi viết test — xem
docstring của ``_covers_topic`` và ``_verify``.
"""

from __future__ import annotations

import time
from typing import cast

from ioes_common import get_logger
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate

from ml_worker.schemas.questions import (
    DraftQuestion,
    DraftQuestionList,
    GeneratedOption,
    GeneratedQuestion,
    GenerateQuestionsRequest,
    GenerateQuestionsResponse,
    QuestionType,
)
from ml_worker.schemas.rag import TokenUsage
from ml_worker.services.llm import active_model_name, get_chat_model

# Dùng lại tầng truy xuất của chuỗi hỏi đáp thay vì viết bản song song — cùng
# corpus, cùng ngưỡng, cùng cách mở rộng truy vấn. Hai tên có gạch dưới là
# nội bộ của gói ml_worker.services, không phơi ra ngoài service.
from ml_worker.services.rag import _to_sources, retrieve

logger = get_logger(__name__)

# Sinh câu hỏi phải lặp lại được: cùng học liệu, cùng tham số thì ra cùng bộ
# câu. Ở mức mặc định 0,7 giảng viên bấm hai lần ra hai bộ khác nhau, không
# đối chiếu được cái nào tốt hơn.
GENERATION_TEMPERATURE = 0.2
# Đối chiếu là câu hỏi đóng CO/KHONG, không cần sáng tạo.
VERIFICATION_TEMPERATURE = 0.0

_LANGUAGE_NAMES = {"vi": "tiếng Việt", "en": "tiếng Anh"}

_TYPE_RULES = {
    QuestionType.MULTIPLE_CHOICE: (
        "Mỗi câu có đúng 4 phương án trong `options`, trong đó ĐÚNG MỘT phương án "
        "đặt `is_correct` bằng true. Ba phương án sai phải hợp lý, không được là "
        "đáp án hiển nhiên vô nghĩa. Để trống `answer_text`."
    ),
    QuestionType.MULTIPLE_SELECT: (
        "Mỗi câu có 4 đến 6 phương án trong `options`, trong đó ÍT NHẤT HAI phương "
        "án đặt `is_correct` bằng true. Để trống `answer_text`."
    ),
    QuestionType.TRUE_FALSE: (
        "Mỗi câu có đúng 2 phương án trong `options`: một phương án `Đúng` và một "
        "phương án `Sai`, đúng một trong hai có `is_correct` bằng true. "
        "Để trống `answer_text`."
    ),
    QuestionType.SHORT_ANSWER: (
        "Để trống `options`. Đặt đáp án ngắn gọn vào `answer_text`."
    ),
    QuestionType.ESSAY: (
        "Để trống `options` và `answer_text`. Đặt tiêu chí chấm vào `explanation`."
    ),
}

_SYSTEM_PROMPT = """Bạn soạn câu hỏi kiểm tra cho hệ thống học trực tuyến IOES.

Quy tắc bắt buộc:
- CHỈ soạn câu hỏi mà đáp án nằm tường minh trong phần TÀI LIỆU bên dưới.
  Tuyệt đối không dùng kiến thức ngoài tài liệu, kể cả khi bạn biết chắc.
- Mỗi câu phải ghi `source_index` là số [n] của khối tài liệu chứa đáp án.
- Tài liệu chỉ đủ căn cứ cho ít câu hơn số được yêu cầu thì soạn ít hơn.
  Trả về danh sách rỗng nếu không soạn được câu nào. KHÔNG BAO GIỜ thêm câu
  cho đủ số lượng.
- `explanation` phải nêu rõ vì sao đáp án đúng, dựa trên tài liệu.
- Viết toàn bộ bằng {language_name}.

Định dạng câu hỏi:
{type_rule}

Độ khó cần đạt: {difficulty}"""

_USER_PROMPT = """TÀI LIỆU:
{context}

Soạn tối đa {count} câu hỏi.{extra}"""

PROMPT = ChatPromptTemplate.from_messages(
    [("system", _SYSTEM_PROMPT), ("human", _USER_PROMPT)]
)

_VERIFY_SYSTEM = """Bạn kiểm tra tính chính xác của câu hỏi kiểm tra.

Chỉ đọc ĐOẠN VĂN được cung cấp. Trả lời DUY NHẤT một từ:
- CO  — nếu đoạn văn khẳng định đáp án đã cho là đúng.
- KHONG — nếu đoạn văn không nói tới, nói khác đi, hoặc chỉ nói mơ hồ.

Không giải thích, không viết gì thêm."""

_VERIFY_USER = """ĐOẠN VĂN:
{excerpt}

CÂU HỎI: {question}
ĐÁP ÁN ĐƯỢC CHO LÀ ĐÚNG: {answer}"""

VERIFY_PROMPT = ChatPromptTemplate.from_messages(
    [("system", _VERIFY_SYSTEM), ("human", _VERIFY_USER)]
)

VERIFIED_MARKER = "CO"

_RELEVANCE_SYSTEM = """Bạn kiểm tra học liệu có bàn về chủ đề được hỏi không.

Trả lời DUY NHẤT một từ:
- CO — nếu TÀI LIỆU có nội dung thực chất về chủ đề, đủ để ra đề kiểm tra.
- KHONG — nếu tài liệu nói về thứ khác, hoặc chỉ nhắc thoáng qua chủ đề.

Không giải thích, không viết gì thêm."""

_RELEVANCE_USER = """TÀI LIỆU:
{context}

CHỦ ĐỀ CẦN RA ĐỀ: {topic}"""

RELEVANCE_PROMPT = ChatPromptTemplate.from_messages(
    [("system", _RELEVANCE_SYSTEM), ("human", _RELEVANCE_USER)]
)


def _covers_topic(topic: str, context: str) -> bool:
    """Học liệu truy xuất được có thật sự bàn về chủ đề không.

    Bốn tầng kia chặn *bịa* — chúng buộc mọi câu hỏi phải bám vào một đoạn tài
    liệu có thật. Chúng KHÔNG chặn *lạc đề*: điểm tương đồng không tách được
    trong và ngoài phạm vi (xem services/rag.py — E5 nén mọi điểm vào dải
    0,82-0,87), nên ``retrieve`` luôn trả về thứ gì đó, và bộ sinh ngoan ngoãn
    soạn đề từ những gì nó nhận.

    Đo thật: hỏi "Gradient Descent và learning rate trong machine learning" —
    corpus không có mảng này — vẫn ra 3 câu, đều hợp lệ và neo đúng nguồn,
    nhưng nội dung là kiểm thử phần mềm và REST API.

    Cổng này được nhìn thấy ``topic``, khác với lời nhắc sinh. An toàn vì nó
    không sinh ra chữ nào của đề: nó chỉ phán CO/KHONG, nên kiến thức nền của
    mô hình không có đường lọt vào câu hỏi.

    Mô hình lỗi thì cho qua: đây là bộ lọc lạc đề, không phải chốt chặn bịa —
    ba tầng sau vẫn đứng nguyên.
    """
    try:
        message = (RELEVANCE_PROMPT | get_chat_model(VERIFICATION_TEMPERATURE)).invoke(
            {"context": context, "topic": topic}
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("relevance_check_failed", error=str(exc))
        return True

    verdict = str(getattr(message, "content", "")).strip().upper()
    return verdict.startswith(VERIFIED_MARKER)


def _format_context(documents: list[tuple[Document, float]]) -> str:
    """Đánh số khối để mô hình có cái mà trích. Số [n] khớp source_index."""
    blocks = []
    for index, (doc, _score) in enumerate(documents, start=1):
        title = doc.metadata.get("title", "Không rõ tiêu đề")
        blocks.append(f"[{index}] {title}\n{doc.page_content}")
    return "\n\n".join(blocks)


def _stated_answer(draft: DraftQuestion) -> str:
    """Đáp án dưới dạng chữ, để đem đi đối chiếu."""
    correct = [o.option_text for o in draft.options if o.is_correct]
    if correct:
        return "; ".join(correct)
    return draft.answer_text or ""


def _shape_is_valid(draft: DraftQuestion, question_type: QuestionType) -> bool:
    """Ràng buộc hình dạng theo loại câu hỏi.

    Trùng với QuestionTypeOptionsMatch bên exam-suite. Kiểm ở đây để không đẩy
    câu hỏi hỏng sang cho giảng viên duyệt rồi mới bị API lưu từ chối.
    """
    correct_count = sum(1 for o in draft.options if o.is_correct)

    if question_type in (QuestionType.MULTIPLE_CHOICE, QuestionType.TRUE_FALSE):
        expected_options = 2 if question_type is QuestionType.TRUE_FALSE else 4
        return len(draft.options) == expected_options and correct_count == 1

    if question_type is QuestionType.MULTIPLE_SELECT:
        return 4 <= len(draft.options) <= 6 and correct_count >= 2

    if question_type is QuestionType.SHORT_ANSWER:
        return not draft.options and bool((draft.answer_text or "").strip())

    # ESSAY: không phương án, không đáp án — chỉ cần tiêu chí chấm, đã bắt buộc
    # ở schema qua min_length của explanation.
    return not draft.options


def _verify(draft: DraftQuestion, passage: str) -> bool:
    """Đoạn văn có thật sự chống lưng đáp án không.

    ``passage`` phải là **toàn văn** đoạn tài liệu, đúng cái mà lượt sinh đã
    đọc — không phải ``RetrievedSource.excerpt``. Excerpt bị cắt còn 280 ký tự
    để hiển thị, trong khi chunk dài tới 800; đối chiếu trên bản cắt thì mọi
    câu rút từ phần đuôi chunk đều bị loại oan. Đo trên chủ đề "Box model
    trong CSS": dùng excerpt loại 2 trên 3 câu, mà cả hai đều đúng.

    Mô hình lỗi thì coi như KHÔNG qua: thà mất một câu đúng còn hơn để lọt một
    câu sai vào ngân hàng đề.
    """
    answer = _stated_answer(draft)
    if not answer:
        # ESSAY không có đáp án cố định nên không đối chiếu được. Tầng 1 và 2
        # đã buộc nó bám vào một đoạn tài liệu cụ thể.
        return True

    try:
        message = (VERIFY_PROMPT | get_chat_model(VERIFICATION_TEMPERATURE)).invoke(
            {
                "excerpt": passage,
                "question": draft.question_text,
                "answer": answer,
            }
        )
    except Exception as exc:  # noqa: BLE001 - hỏng thì loại câu, không cho qua
        logger.warning("question_verification_failed", error=str(exc))
        return False

    verdict = str(getattr(message, "content", "")).strip().upper()
    return verdict.startswith(VERIFIED_MARKER)


def generate(request: GenerateQuestionsRequest) -> GenerateQuestionsResponse:
    """Soạn câu hỏi từ học liệu, chỉ giữ lại những câu kiểm chứng được."""
    started = time.perf_counter()

    def _elapsed_ms() -> int:
        return int((time.perf_counter() - started) * 1000)

    def _empty(grounded: bool, usage: TokenUsage | None = None) -> GenerateQuestionsResponse:
        return GenerateQuestionsResponse(
            questions=[],
            requested=request.count,
            returned=0,
            dropped_unverified=0,
            grounded=grounded,
            model=active_model_name(),
            usage=usage or TokenUsage(),
            latency_ms=_elapsed_ms(),
        )

    # Tầng 1 — topic chỉ dùng để truy xuất, không đi tiếp vào lời nhắc sinh.
    documents = retrieve(request.topic, request.top_k)
    if not documents:
        logger.info("question_generation_no_context", topic=request.topic)
        return _empty(grounded=False)

    # Truy xuất luôn trả về thứ gì đó, kể cả khi corpus không có mảng này —
    # ngưỡng điểm không tách được trong và ngoài phạm vi. Hỏi mô hình xem tài
    # liệu vừa lấy có bàn về chủ đề không, trước khi tốn lượt sinh.
    context = _format_context(documents)
    if not _covers_topic(request.topic, context):
        logger.info("question_generation_off_topic", topic=request.topic)
        return _empty(grounded=False)

    chain = PROMPT | get_chat_model(GENERATION_TEMPERATURE).with_structured_output(
        DraftQuestionList
    )
    payload = {
        "language_name": _LANGUAGE_NAMES[request.language],
        "type_rule": _TYPE_RULES[request.question_type],
        "difficulty": request.difficulty.value,
        "context": context,
        "count": request.count,
        "extra": f"\n\nYêu cầu thêm: {request.instructions}" if request.instructions else "",
    }

    try:
        # with_structured_output khai kiểu trả về là dict | BaseModel vì nó
        # nhận cả TypedDict; ở đây truyền lớp Pydantic nên luôn ra đúng lớp đó.
        drafts = cast(DraftQuestionList, chain.invoke(payload))
    except Exception as exc:  # noqa: BLE001 - schema sai hoặc nhà cung cấp lỗi
        logger.error("question_generation_failed", topic=request.topic, error=str(exc))
        return _empty(grounded=True)

    sources = _to_sources(documents)
    accepted: list[GeneratedQuestion] = []
    dropped = 0

    for draft in drafts.questions[: request.count]:
        # Tầng 2 — trích nguồn phải nằm trong khoảng đã đưa.
        if not 1 <= draft.source_index <= len(sources):
            logger.info(
                "question_dropped_bad_source",
                source_index=draft.source_index,
                blocks=len(sources),
            )
            dropped += 1
            continue

        if not _shape_is_valid(draft, request.question_type):
            logger.info("question_dropped_bad_shape", question_type=request.question_type.value)
            dropped += 1
            continue

        source = sources[draft.source_index - 1]
        # Toàn văn đoạn, không phải source.excerpt: excerpt đã cắt còn 280 ký
        # tự cho phần hiển thị, đối chiếu trên đó sẽ loại oan câu rút từ đuôi.
        passage = documents[draft.source_index - 1][0].page_content

        # Tầng 3 — đoạn văn có chống lưng đáp án không.
        if not _verify(draft, passage):
            logger.info("question_dropped_unverified", chunk_id=source.chunk_id)
            dropped += 1
            continue

        accepted.append(
            GeneratedQuestion(
                question_text=draft.question_text,
                question_type=request.question_type,
                difficulty=request.difficulty,
                options=[GeneratedOption(**o.model_dump()) for o in draft.options],
                answer_text=draft.answer_text,
                explanation=draft.explanation,
                source=source,
            )
        )

    logger.info(
        "questions_generated",
        topic=request.topic,
        requested=request.count,
        drafted=len(drafts.questions),
        returned=len(accepted),
        dropped=dropped,
        latency_ms=_elapsed_ms(),
    )

    # Tầng 4 — trả đúng số câu qua được, không đắp thêm cho đủ request.count.
    #
    # usage để rỗng: with_structured_output trả thẳng đối tượng Pydantic chứ
    # không phải AIMessage, nên không còn usage_metadata để đọc như chuỗi RAG.
    # Muốn đếm token phải chuyển sang dùng tool-calling thô — chưa cần.
    return GenerateQuestionsResponse(
        questions=accepted,
        requested=request.count,
        returned=len(accepted),
        dropped_unverified=dropped,
        grounded=True,
        model=active_model_name(),
        usage=TokenUsage(),
        latency_ms=_elapsed_ms(),
    )
