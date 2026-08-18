"""Reusable ML helpers shared across AI services."""

import hashlib
from typing import Iterable, List, Optional

import numpy as np


def cosine_similarity(vec_a: Iterable[float], vec_b: Iterable[float]) -> float:
    """Cosine similarity between two equal-length vectors."""
    a = np.asarray(list(vec_a), dtype=np.float32)
    b = np.asarray(list(vec_b), dtype=np.float32)
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)


def euclidean_distance(vec_a: Iterable[float], vec_b: Iterable[float]) -> float:
    """Euclidean distance between two equal-length vectors."""
    a = np.asarray(list(vec_a), dtype=np.float32)
    b = np.asarray(list(vec_b), dtype=np.float32)
    return float(np.linalg.norm(a - b))


def normalize_vector(vec: Iterable[float]) -> List[float]:
    """L2-normalise a vector in-place."""
    arr = np.asarray(list(vec), dtype=np.float32)
    norm = np.linalg.norm(arr)
    if norm == 0:
        return arr.tolist()
    return (arr / norm).tolist()


def content_hash(text: str) -> str:
    """Stable hash for caching embeddings or generated content."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """Split text into overlapping chunks for embedding / RAG pipelines."""
    if chunk_size <= 0:
        raise ValueError("chunk_size must be > 0")
    if overlap >= chunk_size:
        raise ValueError("overlap must be < chunk_size")

    chunks: List[str] = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunks.append(text[start:end])
        if end == len(text):
            break
        start = end - overlap
    return chunks


def top_k_indices(scores: Iterable[float], k: int) -> List[int]:
    """Return indices of the top-k highest scores (stable ordering)."""
    pairs = sorted(enumerate(scores), key=lambda p: p[1], reverse=True)
    return [i for i, _ in pairs[:k]]
