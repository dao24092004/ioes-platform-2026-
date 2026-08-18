"""Reusable inference helpers."""

from ioes_common import get_logger
from ioes_common.ml_utils import (
    chunk_text,
    content_hash,
    cosine_similarity,
    normalize_vector,
)

logger = get_logger(__name__)


def embed_and_cache(text: str) -> list[float]:
    """Embed a single text - hash used as cache key in Redis."""
    cache_key = f"emb:{content_hash(text)}"
    logger.debug("embedding_text", cache_key=cache_key, length=len(text))
    # TODO: real embedding call; round-trip via Redis for now
    return normalize_vector([0.1] * 384)


def find_similar(query_vec: list[float], candidates: list[list[float]]) -> list[int]:
    """Return indices of candidates sorted by cosine similarity to query."""
    scored = [(i, cosine_similarity(query_vec, c)) for i, c in enumerate(candidates)]
    scored.sort(key=lambda p: p[1], reverse=True)
    return [i for i, _ in scored]


def prepare_for_embedding(text: str, chunk_size: int = 500) -> list[str]:
    return chunk_text(text, chunk_size=chunk_size, overlap=50)
