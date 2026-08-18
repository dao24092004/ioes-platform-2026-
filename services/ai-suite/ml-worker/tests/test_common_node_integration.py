"""Common-node smoke test: import public API to verify wiring."""

from ioes_common import (
    ApiResponse,
    ErrorCodes,
    KafkaTopics,
    ServiceClient,
    configure_logging,
    get_logger,
)


def test_common_node_imports():
    """All public symbols from common-node (Python) are importable."""
    assert ApiResponse.success_response({"a": 1}).success is True
    assert ErrorCodes.UNAUTHORIZED.value == "UNAUTHORIZED"
    assert KafkaTopics.EXAM_GRADED.value == "exam.submission.graded"


def test_logger_creation():
    configure_logging(level="DEBUG", json_output=False, service_name="ml-worker-test")
    logger = get_logger("test")
    logger.info("test_event", foo="bar")
    assert logger is not None
