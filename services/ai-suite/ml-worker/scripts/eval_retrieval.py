"""Đo chất lượng truy xuất trên bộ câu hỏi chuẩn.

Chấm đúng đường mà ml-worker dùng thật, nên số đo phản ánh cái mô hình thực sự
nhận được, không phải một mô phỏng.

Chỉ số chính là "có tài liệu đúng trong ngữ cảnh": tỉ lệ câu hỏi mà ít nhất một
tài liệu đúng lọt vào phần đưa cho mô hình. Đây mới là thứ quyết định mô hình
trả lời được hay từ chối. Precision@k không dùng làm mốc vì phần lớn câu hỏi
chỉ có một tài liệu đúng, nên trần của precision@5 đã là 0,31.

Chạy:
    python scripts/eval_retrieval.py data/eval/ground-truth.json /tmp/ket-qua.json \
        data/eval/queries.json data/eval/queries-khong-dau.json

    EVAL_PACE_SECONDS=4.5   giãn nhịp, tránh chạm hạn mức 15 request/phút
    EVAL_NO_EXPAND=1        tắt mở rộng câu hỏi, đo đường lui tất định
"""

from __future__ import annotations

import json
import math
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from ml_worker.services import rag

# Gemini goi mien phi gioi han 15 request/phut. Ban do khong gian nhip se dinh
# 429 o cau thu ~19 va tu do moi cau deu lui ve truy xuat mot truy van, lam so
# do tut ma tuong la mo hinh bat dinh.
PACE = float(os.environ.get("EVAL_PACE_SECONDS", "0"))
NO_EXPAND = os.environ.get("EVAL_NO_EXPAND") == "1"
if NO_EXPAND:
    rag.expand_query = lambda _question: []


def dcg(g):
    return sum(x / math.log2(i + 2) for i, x in enumerate(g))


def ndcg(ranked, relevant, k):
    best = dcg([1.0] * min(len(relevant), k))
    return dcg([1.0 if d in relevant else 0.0 for d in ranked[:k]]) / best if best else 0.0


def run(queries, truth, label):
    hit = 0
    total = 0
    rr = []
    nd = []
    misses = []
    for q in queries:
        relevant = set(truth.get(q["id"], []))
        if not relevant:
            continue
        total += 1
        if PACE:
            time.sleep(PACE)
        ranked = []
        for doc, _ in rag.retrieve(q["query"]):
            did = str(doc.metadata.get("doc_id", "?"))
            if did not in ranked:
                ranked.append(did)
        if relevant & set(ranked):
            hit += 1
        else:
            misses.append(f"{q['id']} {q['query'][:38]}")
        rank = next((i + 1 for i, d in enumerate(ranked) if d in relevant), 0)
        rr.append(1 / rank if rank else 0.0)
        nd.append(ndcg(ranked, relevant, 10))

    return {
        "cach go": label,
        "co tai lieu dung trong ngu canh": round(hit / total, 3),
        "mrr": round(sum(rr) / len(rr), 3),
        "ndcg@10": round(sum(nd) / len(nd), 3),
        "truot": misses,
    }


def main(truth_path, out_path, *query_files):
    truth = json.loads(Path(truth_path).read_text(encoding="utf-8"))
    report = []
    for path in query_files:
        label = "khong dau" if "khong-dau" in path else "co dau"
        queries = json.loads(Path(path).read_text(encoding="utf-8"))["queries"]
        report.append(run(queries, truth, label))

    Path(out_path).write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    for r in report:
        print(
            f"{r['cach go']:10} ngu canh co tai lieu dung {r['co tai lieu dung trong ngu canh']:.3f}"
            f"   mrr {r['mrr']:.3f}   ndcg@10 {r['ndcg@10']:.3f}"
        )
        for m in r["truot"]:
            print("      truot:", m)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(*sys.argv[1:]))
