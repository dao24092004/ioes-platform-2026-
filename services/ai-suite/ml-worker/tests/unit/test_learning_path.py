"""Kiểm thử chuỗi năm agent sinh lộ trình (FR-AI-005).

Không gọi mạng và không chạm Milvus: mô hình ngôn ngữ được thay bằng
``FakeListChatModel`` trả về đúng những chuỗi ta dựng sẵn, còn tầng truy xuất
được thay bằng hàm giả.

Trọng tâm là agent ``validator``. Bốn agent kia chỉ sinh ra đề xuất; agent 5 là
thứ duy nhất đứng giữa mô hình và người học, nên phần lớn số bài ở đây đánh vào
nó — mỗi bài tương ứng một kiểu hỏng đã gặp khi chạy thật.
"""

from __future__ import annotations

import json
from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from langchain_core.documents import Document
from langchain_core.language_models.fake_chat_models import FakeListChatModel

from ml_worker.api import learning_path as learning_path_api
from ml_worker.schemas.learning_path import (
    CatalogCourse,
    DraftPlan,
    EnrolledCourse,
    LearningPathRequest,
    LearningResource,
    PlannedStep,
)
from ml_worker.services.learning_path import (
    base,
    curriculum_planner,
    orchestrator,
    resource_retriever,
    validator,
)

# ---------------------------------------------------------------------------
# Dữ liệu dùng chung
# ---------------------------------------------------------------------------

CATALOG = [
    CatalogCourse(
        courseId="c-html",
        title="HTML và CSS cơ bản",
        shortDescription="Dựng giao diện tĩnh",
        level=1,
        durationHours=12,
    ),
    CatalogCourse(courseId="c-js", title="JavaScript nền tảng", level=2, durationHours=20),
    CatalogCourse(courseId="c-react", title="React cho người mới", level=3, durationHours=24),
]


def _request(**overrides: Any) -> LearningPathRequest:
    payload: dict[str, Any] = {
        "userId": "u-1",
        "goal": "Trở thành lập trình viên web",
        "hoursPerWeek": 8,
        "currentSkills": ["HTML"],
        "catalog": CATALOG,
        "enrolled": [
            EnrolledCourse(
                courseId="c-html",
                title="HTML và CSS cơ bản",
                level=1,
                progressPercent=100,
                completed=True,
            )
        ],
    }
    payload.update(overrides)
    return LearningPathRequest.model_validate(payload)


PROFILE_JSON = json.dumps(
    {
        "level": "beginner",
        "strengths": ["HTML", "CSS"],
        "summary": "Người học nắm cơ bản HTML/CSS, chưa lập trình được.",
    },
    ensure_ascii=False,
)

GAP_JSON = json.dumps(
    {
        "missing_skills": ["JavaScript", "React", "HTML"],
        "summary": "Còn thiếu phần lập trình phía client.",
    },
    ensure_ascii=False,
)


def _plan_json(steps: list[dict[str, Any]], summary: str = "Lộ trình ba bước.") -> str:
    return json.dumps({"summary": summary, "steps": steps}, ensure_ascii=False)


GOOD_STEPS: list[dict[str, Any]] = [
    {
        "title": "JavaScript nền tảng",
        "objective": "Viết được logic phía client",
        "course_id": "c-js",
        "estimated_hours": 20,
        "skills": ["JavaScript"],
    },
    {
        "title": "React cho người mới",
        "objective": "Dựng được giao diện thành phần",
        "course_id": "c-react",
        "estimated_hours": 24,
        "skills": ["React"],
    },
    {
        "title": "Dự án cá nhân",
        "objective": "Ghép mọi thứ vào một sản phẩm thật",
        "course_id": None,
        "estimated_hours": 12,
        "skills": ["Tư duy sản phẩm"],
    },
]


@pytest.fixture
def no_retrieval(monkeypatch: pytest.MonkeyPatch) -> None:
    """Mặc định tắt truy xuất — bài nào cần học liệu thì tự bật lại."""
    monkeypatch.setattr(resource_retriever.rag_service, "retrieve", lambda *_a, **_k: [])


def _fake_llm(monkeypatch: pytest.MonkeyPatch, responses: list[str]) -> FakeListChatModel:
    """Thay mô hình bằng danh sách câu trả lời cố định, theo đúng thứ tự agent."""
    model = FakeListChatModel(responses=responses)
    monkeypatch.setattr(base, "get_chat_model", lambda *_a, **_k: model)
    return model


# ---------------------------------------------------------------------------
# Đường đi thuận lợi
# ---------------------------------------------------------------------------


def test_happy_path_returns_ordered_steps_and_five_trace_entries(
    monkeypatch: pytest.MonkeyPatch, no_retrieval: None
) -> None:
    _fake_llm(monkeypatch, [PROFILE_JSON, GAP_JSON, _plan_json(GOOD_STEPS)])

    result = orchestrator.generate(_request())

    assert [step.order for step in result.steps] == [1, 2, 3]
    assert [step.course_id for step in result.steps] == ["c-js", "c-react", None]
    assert [entry.agent for entry in result.agent_trace] == list(orchestrator.AGENT_ORDER)
    assert all(entry.elapsed_ms >= 0 for entry in result.agent_trace)
    assert all(entry.summary for entry in result.agent_trace)
    assert result.goal == "Trở thành lập trình viên web"
    assert result.model == "mock"


def test_hours_add_up_and_weeks_follow_hours_per_week(
    monkeypatch: pytest.MonkeyPatch, no_retrieval: None
) -> None:
    """Tổng giờ là tổng các bước CÒN LẠI, số tuần làm tròn lên."""
    _fake_llm(monkeypatch, [PROFILE_JSON, GAP_JSON, _plan_json(GOOD_STEPS)])

    result = orchestrator.generate(_request(hoursPerWeek=7))

    assert result.total_estimated_hours == 56  # 20 + 24 + 12
    assert sum(step.estimated_hours for step in result.steps) == result.total_estimated_hours
    # 56 / 7 = 8 chẵn; đổi nhịp học thì phải làm tròn lên chứ không cắt.
    assert result.weeks == 8


def test_weeks_round_up_never_down(monkeypatch: pytest.MonkeyPatch, no_retrieval: None) -> None:
    _fake_llm(monkeypatch, [PROFILE_JSON, GAP_JSON, _plan_json(GOOD_STEPS)])

    result = orchestrator.generate(_request(hoursPerWeek=9))

    # 56 / 9 = 6,22 tuần. Trả 6 là hứa với người học một cái lịch không học hết.
    assert result.weeks == 7


def test_gap_analyzer_drops_skills_the_learner_already_has(
    monkeypatch: pytest.MonkeyPatch, no_retrieval: None
) -> None:
    """Mô hình liệt kê lại "HTML" dù người học đã khai — phải bị lọc bằng mã."""
    from ml_worker.services.learning_path import gap_analyzer, profiler

    _fake_llm(monkeypatch, [PROFILE_JSON, GAP_JSON])
    profile, _ = profiler.run(_request())
    report, summary = gap_analyzer.run(_request(), profile)

    assert report.missing_skills == ["JavaScript", "React"]
    assert "2" in summary


# ---------------------------------------------------------------------------
# Agent 5 — chốt chặn chống bịa khoá học
# ---------------------------------------------------------------------------


def test_validator_drops_hallucinated_course_id(
    monkeypatch: pytest.MonkeyPatch, no_retrieval: None
) -> None:
    """Khoá không có trong catalog bị loại, các bước còn lại đánh số lại liên tục."""
    steps = [
        GOOD_STEPS[0],
        {
            "title": "Khoá do mô hình bịa ra",
            "objective": "Không tồn tại trong danh mục",
            "course_id": "c-khong-co-that",
            "estimated_hours": 30,
            "skills": ["Ảo"],
        },
        GOOD_STEPS[1],
    ]
    _fake_llm(monkeypatch, [PROFILE_JSON, GAP_JSON, _plan_json(steps)])

    result = orchestrator.generate(_request())

    assert [step.course_id for step in result.steps] == ["c-js", "c-react"]
    assert [step.order for step in result.steps] == [1, 2]
    # Giờ của bước bịa không được lọt vào tổng.
    assert result.total_estimated_hours == 44
    catalog_ids = {course.course_id for course in CATALOG}
    assert all(s.course_id in catalog_ids for s in result.steps if s.course_id)


def test_validator_drops_every_step_when_the_whole_plan_is_hallucinated(
    monkeypatch: pytest.MonkeyPatch, no_retrieval: None
) -> None:
    """Không còn bước nào thì trả lộ trình rỗng, KHÔNG phải lỗi và không bịa bù."""
    steps = [
        {"title": "Khoá ma 1", "course_id": "x-1", "estimated_hours": 10},
        {"title": "Khoá ma 2", "course_id": "x-2", "estimated_hours": 10},
    ]
    _fake_llm(monkeypatch, [PROFILE_JSON, GAP_JSON, _plan_json(steps)])

    result = orchestrator.generate(_request())

    assert result.steps == []
    assert result.total_estimated_hours == 0
    assert result.weeks == 0
    assert len(result.agent_trace) == 5


def test_validator_keeps_steps_without_a_course() -> None:
    """``courseId`` null là bước tự học hợp lệ, không phải khoá bịa."""
    plan = DraftPlan(
        summary="",
        steps=[PlannedStep(title="Tự làm dự án", objective="", estimated_hours=6)],
    )

    result, _ = validator.run(_request(), plan, {})

    assert len(result.steps) == 1
    assert result.steps[0].course_id is None
    assert result.steps[0].objective  # mục tiêu rỗng được điền bù từ tiêu đề


def test_validator_drops_duplicate_courses() -> None:
    """Cùng một khoá xếp hai lần dưới hai tên gọi — giữ lần đầu."""
    plan = DraftPlan(
        steps=[
            PlannedStep(title="JavaScript", course_id="c-js", estimated_hours=20),
            PlannedStep(title="JS nâng cao", course_id="c-js", estimated_hours=20),
            PlannedStep(title="React", course_id="c-react", estimated_hours=24),
        ]
    )

    result, trace = validator.run(_request(), plan, {})

    assert [step.course_id for step in result.steps] == ["c-js", "c-react"]
    assert result.total_estimated_hours == 44
    assert "trùng" in trace


def test_validator_falls_back_to_catalog_hours_when_estimate_is_absurd() -> None:
    """9999 giờ một bước là mô hình hỏng; lấy số giờ thật của khoá thay vào."""
    plan = DraftPlan(
        steps=[
            PlannedStep(title="JavaScript", course_id="c-js", estimated_hours=9999),
            PlannedStep(title="React", course_id="c-react", estimated_hours=0),
        ]
    )

    result, _ = validator.run(_request(), plan, {})

    assert [step.estimated_hours for step in result.steps] == [20, 24]


def test_validator_gives_self_study_steps_a_default_when_hours_missing() -> None:
    plan = DraftPlan(steps=[PlannedStep(title="Đọc tài liệu", estimated_hours=-5)])

    result, _ = validator.run(_request(), plan, {})

    assert result.steps[0].estimated_hours == validator.DEFAULT_SELF_STUDY_HOURS


def test_validator_ignores_model_summary_only_when_empty() -> None:
    """Có tóm tắt của mô hình thì giữ; rỗng thì tự dựng câu có số liệu thật."""
    plan = DraftPlan(steps=[PlannedStep(title="JavaScript", course_id="c-js")])

    with_summary, _ = validator.run(
        _request(), DraftPlan(summary="Tóm tắt thật.", steps=plan.steps), {}
    )
    without_summary, _ = validator.run(_request(), plan, {})

    assert with_summary.summary == "Tóm tắt thật."
    assert "1 bước" in without_summary.summary


def test_validator_keeps_resources_attached_to_the_right_step() -> None:
    """Học liệu bám theo chỉ số bước nháp, không theo ``order`` — kiểm sau khi loại bước."""
    plan = DraftPlan(
        steps=[
            PlannedStep(title="Khoá ma", course_id="khong-co-that"),
            PlannedStep(title="JavaScript", course_id="c-js"),
        ]
    )
    resources = {
        0: [LearningResource(title="Tài liệu của bước bị loại", docId="d-0")],
        1: [LearningResource(title="Tài liệu JavaScript", docId="d-1")],
    }

    result, _ = validator.run(_request(), plan, resources)

    assert len(result.steps) == 1
    assert [r.doc_id for r in result.steps[0].resources] == ["d-1"]


# ---------------------------------------------------------------------------
# Mô hình trả về thứ không đúng chuẩn
# ---------------------------------------------------------------------------


def test_fenced_json_is_parsed(monkeypatch: pytest.MonkeyPatch, no_retrieval: None) -> None:
    """Gemini hay bọc JSON trong ```json dù lời nhắc đã cấm."""
    fenced_plan = "```json\n" + _plan_json(GOOD_STEPS) + "\n```"
    _fake_llm(monkeypatch, ["```json\n" + PROFILE_JSON + "\n```", GAP_JSON, fenced_plan])

    result = orchestrator.generate(_request())

    assert len(result.steps) == 3
    assert "JSON hỏng" not in result.agent_trace[0].summary


def test_json_with_a_preamble_is_parsed() -> None:
    """Mô hình thêm câu dẫn trước JSON — cắt từ dấu ngoặc đầu tới ngoặc cuối."""
    raw = 'Đây là lộ trình của bạn:\n{"summary": "x", "steps": []}\nChúc bạn học tốt!'

    assert base.parse_json_object(raw) == {"summary": "x", "steps": []}


@pytest.mark.parametrize(
    "raw",
    ["", "không phải JSON", "[1, 2, 3]", "{thiếu ngoặc kép}", "```json\nhỏng\n```"],
)
def test_parse_json_object_returns_none_on_garbage(raw: str) -> None:
    assert base.parse_json_object(raw) is None


def test_profiler_falls_back_when_json_is_broken(
    monkeypatch: pytest.MonkeyPatch, no_retrieval: None
) -> None:
    """Agent 1 hỏng thì dựng hồ sơ từ chính dữ liệu người dùng khai, chuỗi đi tiếp.

    Không có chữ nào bịa ra: mọi thứ trong hồ sơ dự phòng đều lấy từ yêu cầu.
    """
    _fake_llm(monkeypatch, ["xin chào, tôi không trả JSON", GAP_JSON, _plan_json(GOOD_STEPS)])

    result = orchestrator.generate(_request())

    assert len(result.steps) == 3
    assert "JSON hỏng" in result.agent_trace[0].summary


def test_gap_analyzer_falls_back_when_json_is_broken(
    monkeypatch: pytest.MonkeyPatch, no_retrieval: None
) -> None:
    _fake_llm(monkeypatch, [PROFILE_JSON, "hỏng", _plan_json(GOOD_STEPS)])

    result = orchestrator.generate(_request())

    assert len(result.steps) == 3
    assert "JSON hỏng" in result.agent_trace[1].summary


def test_planner_json_broken_is_an_error_not_a_guess(
    monkeypatch: pytest.MonkeyPatch, no_retrieval: None
) -> None:
    """Không có bản nháp thì không có lộ trình — báo hỏng, tuyệt đối không dựng đại."""
    _fake_llm(monkeypatch, [PROFILE_JSON, GAP_JSON, "tôi không biết"])

    with pytest.raises(base.AgentLlmError, match="không đọc được"):
        orchestrator.generate(_request())


def test_planner_tolerates_camel_case_and_string_numbers(
    monkeypatch: pytest.MonkeyPatch, no_retrieval: None
) -> None:
    """Mô hình đổi lối viết tên trường và trả "20 giờ" thay vì 20."""
    steps = [
        {
            "title": "JavaScript",
            "objective": "Học JS",
            "courseId": "c-js",
            "estimatedHours": "20 giờ",
            "skills": "JavaScript, DOM",
        }
    ]
    _fake_llm(monkeypatch, [PROFILE_JSON, GAP_JSON, _plan_json(steps)])

    result = orchestrator.generate(_request())

    assert result.steps[0].course_id == "c-js"
    assert result.steps[0].estimated_hours == 20
    assert result.steps[0].skills == ["JavaScript", "DOM"]


@pytest.mark.parametrize("raw_id", ["null", "none", "", "N/A"])
def test_planner_reads_string_null_as_no_course(raw_id: str) -> None:
    step = curriculum_planner._to_step({"title": "Tự học", "course_id": raw_id})

    assert step is not None
    assert step.course_id is None


def test_planner_skips_steps_without_a_title() -> None:
    assert curriculum_planner._to_step({"objective": "thiếu tiêu đề"}) is None
    assert curriculum_planner._to_step("không phải object") is None


# ---------------------------------------------------------------------------
# Agent 4 — truy xuất học liệu
# ---------------------------------------------------------------------------


def _document(doc_id: str, title: str) -> Document:
    return Document(
        page_content="Nội dung học liệu.",
        metadata={"doc_id": doc_id, "title": title, "chunk_id": f"{doc_id}#0"},
    )


def test_resource_retriever_attaches_materials(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        resource_retriever.rag_service,
        "retrieve",
        lambda *_a, **_k: [(_document("js-basics", "JavaScript cơ bản"), 0.83)],
    )

    attached, summary = resource_retriever.run(
        [PlannedStep(title="JavaScript", objective="Học JS", skills=["DOM"])]
    )

    assert attached[0][0].doc_id == "js-basics"
    assert attached[0][0].title == "JavaScript cơ bản"
    assert "1 học liệu" in summary


def test_resource_retriever_merges_chunks_of_the_same_document(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Ba đoạn cùng một bài chỉ được hiện thành một dòng."""
    monkeypatch.setattr(
        resource_retriever.rag_service,
        "retrieve",
        lambda *_a, **_k: [
            (_document("js-basics", "JavaScript cơ bản"), 0.9),
            (_document("js-basics", "JavaScript cơ bản"), 0.8),
            (_document("dom", "DOM"), 0.75),
        ],
    )

    attached, _ = resource_retriever.run([PlannedStep(title="JavaScript")])

    assert [r.doc_id for r in attached[0]] == ["js-basics", "dom"]


def test_resource_retriever_returns_empty_when_nothing_found(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Không có học liệu là danh sách rỗng, KHÔNG phải lỗi."""
    monkeypatch.setattr(resource_retriever.rag_service, "retrieve", lambda *_a, **_k: [])

    attached, summary = resource_retriever.run([PlannedStep(title="Chủ đề lạ")])

    assert attached == {}
    assert "0 học liệu" in summary


def test_resource_retriever_survives_milvus_being_down(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Milvus chết không được làm sập cả lộ trình."""

    def boom(*_a: object, **_k: object) -> None:
        raise RuntimeError("Milvus không kết nối được")

    monkeypatch.setattr(resource_retriever.rag_service, "retrieve", boom)

    attached, _ = resource_retriever.run([PlannedStep(title="JavaScript")])

    assert attached == {}


def test_resource_retriever_skips_steps_with_no_text() -> None:
    """Bước không có chữ nào thì không tốn một lượt truy xuất."""
    attached, _ = resource_retriever.run([PlannedStep()])

    assert attached == {}


# ---------------------------------------------------------------------------
# Tầng HTTP
# ---------------------------------------------------------------------------


@pytest.fixture
def client() -> TestClient:
    """App riêng cho bài test, không nạp ``main.py``."""
    app = FastAPI()
    app.include_router(learning_path_api.router)
    return TestClient(app)


def _api_payload(**overrides: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "userId": "u-1",
        "goal": "Trở thành lập trình viên web",
        "hoursPerWeek": 8,
        "currentSkills": ["HTML"],
        "catalog": [course.model_dump(by_alias=True) for course in CATALOG],
        "enrolled": [],
    }
    payload.update(overrides)
    return payload


def test_endpoint_returns_contract_field_names(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, no_retrieval: None
) -> None:
    """Hợp đồng chốt tên trường camelCase; ai-gateway lưu nguyên cục JSON này."""
    _fake_llm(monkeypatch, [PROFILE_JSON, GAP_JSON, _plan_json(GOOD_STEPS)])

    response = client.post("/v1/learning-path/generate", json=_api_payload())
    body = response.json()

    assert response.status_code == 200
    assert set(body) >= {
        "goal",
        "summary",
        "totalEstimatedHours",
        "weeks",
        "steps",
        "agentTrace",
        "model",
        "generatedAt",
    }
    assert set(body["steps"][0]) >= {
        "order",
        "title",
        "objective",
        "courseId",
        "estimatedHours",
        "skills",
        "resources",
    }
    assert set(body["agentTrace"][0]) == {"agent", "summary", "elapsedMs"}
    assert [entry["agent"] for entry in body["agentTrace"]] == list(orchestrator.AGENT_ORDER)


def test_endpoint_returns_503_when_the_model_is_out_of_quota(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Hết quota thì báo lỗi thật, không trả lộ trình bịa."""

    def out_of_quota(*_a: object, **_k: object) -> None:
        raise RuntimeError("429 RESOURCE_EXHAUSTED: quota exceeded")

    monkeypatch.setattr(base, "get_chat_model", out_of_quota)

    response = client.post("/v1/learning-path/generate", json=_api_payload())

    assert response.status_code == 503
    assert "mô hình ngôn ngữ" in response.json()["detail"]
    assert "quota" in response.json()["detail"]


def test_endpoint_returns_503_when_the_model_is_not_configured(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    from ml_worker.services.llm import LlmNotConfiguredError

    def not_configured(*_a: object, **_k: object) -> None:
        raise LlmNotConfiguredError("LLM_PROVIDER=gemini nhưng GEMINI_API_KEY rỗng")

    monkeypatch.setattr(base, "get_chat_model", not_configured)

    response = client.post("/v1/learning-path/generate", json=_api_payload())

    assert response.status_code == 503
    assert "GEMINI_API_KEY" in response.json()["detail"]


def test_endpoint_never_returns_a_path_built_on_an_empty_catalog(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, no_retrieval: None
) -> None:
    """Danh mục rỗng: 200 với steps rỗng — trả lời thật, không phải sự cố."""
    _fake_llm(monkeypatch, [PROFILE_JSON, GAP_JSON, _plan_json(GOOD_STEPS)])

    response = client.post("/v1/learning-path/generate", json=_api_payload(catalog=[]))
    body = response.json()

    assert response.status_code == 200
    assert body["steps"] == [] or all(s["courseId"] is None for s in body["steps"])
    assert len(body["agentTrace"]) == 5


def test_endpoint_rejects_a_request_without_a_goal(client: TestClient) -> None:
    response = client.post("/v1/learning-path/generate", json=_api_payload(goal="x"))

    assert response.status_code == 422
