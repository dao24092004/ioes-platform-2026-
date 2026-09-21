"""Gói năm agent sinh lộ trình cá nhân hoá (FR-AI-005).

Mỗi agent một mô-đun, đúng tên trong hợp đồng
``docs/02-architecture/AI_FEATURES_CONTRACT.md`` mục 2. Xem ``orchestrator.py``
để biết chúng chuyền dữ liệu cho nhau thế nào.

Cố tình KHÔNG tái xuất ``orchestrator.generate`` ở đây: ``orchestrator`` import
năm mô-đun agent, mà bốn trong số đó lại import ``base`` của cùng gói — kéo
orchestrator vào ``__init__`` là dựng một vòng import ngay lúc nạp gói.
"""

from __future__ import annotations

from ml_worker.services.learning_path.base import AgentLlmError

__all__ = ["AgentLlmError"]
