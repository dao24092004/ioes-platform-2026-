"""Unit tests for ioes_common.ml_utils."""

import math

import pytest

from ioes_common.ml_utils import (
    chunk_text,
    content_hash,
    cosine_similarity,
    euclidean_distance,
    normalize_vector,
    top_k_indices,
)


def test_cosine_similarity_identical_is_one():
    assert math.isclose(cosine_similarity([1, 0, 0], [1, 0, 0]), 1.0, abs_tol=1e-6)


def test_cosine_similarity_orthogonal_is_zero():
    assert math.isclose(cosine_similarity([1, 0], [0, 1]), 0.0, abs_tol=1e-6)


def test_euclidean_distance_zero_for_identical():
    assert euclidean_distance([1, 2, 3], [1, 2, 3]) == 0


def test_euclidean_distance_known_value():
    assert math.isclose(euclidean_distance([0, 0], [3, 4]), 5.0, abs_tol=1e-6)


def test_normalize_vector_unit_length():
    vec = normalize_vector([3.0, 4.0])
    norm = math.sqrt(v * v for v in vec)  # noqa: not used, replaced below
    sq = sum(v * v for v in vec)
    assert math.isclose(sq, 1.0, abs_tol=1e-6)


def test_content_hash_stable_and_short():
    assert content_hash("hello world") == content_hash("hello world")
    assert len(content_hash("hello world")) == 16


def test_chunk_text_splits_with_overlap():
    text = "x" * 1000
    chunks = chunk_text(text, chunk_size=200, overlap=50)
    assert all(len(c) == 200 for c in chunks[:-1])
    assert len(chunks[-1]) == 100


def test_chunk_text_invalid_overlap():
    with pytest.raises(ValueError):
        chunk_text("abc", chunk_size=10, overlap=10)


def test_top_k_indices_ordered():
    indices = top_k_indices([0.1, 0.9, 0.5, 0.7, 0.3], k=3)
    assert indices == [1, 3, 2]
