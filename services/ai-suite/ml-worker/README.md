# ML Worker

Tầng suy luận của AI Suite. Nhúng văn bản, truy xuất từ Milvus, gọi mô hình
ngôn ngữ. `ai-gateway` (NestJS, cổng 9100) gọi sang đây; service này không phơi
ra ngoài internet.

Thuộc **Epic 5 — AI-Powered Learning**. Story đang thi công: **US-017 Chatbot v1 (RAG)**.

## Tech stack

| Thành phần | Lựa chọn |
|---|---|
| Runtime | Python 3.11 |
| Web | FastAPI + Uvicorn |
| RAG | LangChain |
| Vector store | Milvus 2.4 qua `langchain-milvus` |
| Nhúng | `paraphrase-multilingual-MiniLM-L12-v2`, 384 chiều, CPU |
| Mô hình ngôn ngữ | Gemini qua endpoint tương thích OpenAI, hoặc mock |
| Cổng | 9101 |

## Cấu trúc

```
src/ml_worker/
├── main.py                  FastAPI app
├── api/rag.py               POST /v1/rag/query, /v1/rag/ingest, GET /v1/rag/status
├── core/config.py           Pydantic settings
├── db/milvus.py             Vectorstore, tạo collection
├── schemas/rag.py           Request/response models
└── services/
    ├── embeddings.py        Mô hình nhúng, nạp một lần
    ├── llm.py               Chọn nhà cung cấp theo LLM_PROVIDER
    ├── ingest.py            Đọc corpus, cắt đoạn, nạp vào Milvus
    └── rag.py               Chuỗi truy xuất rồi sinh câu trả lời
scripts/crawl_corpus.py      Thu thập học liệu từ MDN
data/corpus/                 Học liệu dạng Markdown
```

## Chạy local

Cần Milvus đang chạy ở cổng 19530:

```bash
make docker-up                  # ở thư mục gốc monorepo
cd services/ai-suite/ml-worker
cp .env.example .env
poetry install                  # hoặc pip install -e . nếu Poetry giải phụ thuộc quá lâu
poetry run uvicorn ml_worker.main:app --host 0.0.0.0 --port 9101
```

Nạp corpus rồi hỏi thử:

```bash
curl -X POST http://localhost:9101/v1/rag/ingest
curl http://localhost:9101/v1/rag/status
curl -X POST http://localhost:9101/v1/rag/query \
  -H "Content-Type: application/json" \
  -d '{"question":"Flexbox khác Grid thế nào?"}'
```

## Corpus

`data/corpus/` chứa hai nhóm:

- **8 tài liệu tiếng Việt** viết tay, bám lộ trình Full-Stack trong `BA_DOCUMENT §11.4`
- **88 tài liệu tiếng Anh** thu thập từ MDN Web Docs

Thu thập lại:

```bash
python scripts/crawl_corpus.py              # toàn bộ
python scripts/crawl_corpus.py --limit 10   # thử nhanh
```

> **Nguồn và giấy phép.** Nội dung MDN phát hành theo **CC BY-SA 2.5**, cho phép
> tái sử dụng kèm ghi nguồn. Mỗi tài liệu lưu `source_url` và `license` trong
> frontmatter, và tầng RAG trích dẫn tiêu đề trong câu trả lời. Thêm nguồn mới
> phải kiểm giấy phép trước — không phải trang nào cũng cho tái sử dụng.

Script lấy Markdown gốc từ repo `mdn/content` chứ không cào HTML: sạch hơn,
không dính điều hướng, và không tạo tải lên máy chủ MDN.

## Vì sao dùng mô hình nhúng đa ngữ

Corpus MDN là tiếng Anh, học viên hỏi tiếng Việt. `all-MiniLM-L6-v2` chỉ hiểu
tiếng Anh nên truy xuất chéo ngôn ngữ gần như vô dụng. Bản
`paraphrase-multilingual-MiniLM-L12-v2` cùng 384 chiều nên đổi sang không phải
sửa lược đồ Milvus — nhưng **phải nạp lại toàn bộ corpus**, vì vector cũ sinh
bởi mô hình khác thì không so sánh được với vector mới.

## Ngưỡng điểm và việc từ chối trả lời

`RAG_SCORE_THRESHOLD` là chốt chặn duy nhất ngăn mô hình bịa. Không có nó, câu
hỏi ngoài phạm vi corpus vẫn kéo về `top_k` đoạn gần nhất dù chẳng liên quan, và
mô hình sẽ dựa vào đó dựng nên câu trả lời nghe rất thuyết phục. Vượt ngưỡng thì
`grounded=true`; không đoạn nào vượt thì trả lời thẳng là không đủ dữ liệu.

Vector được chuẩn hoá L2 và Milvus dùng độ đo `IP`, nên điểm số chính là cosine
similarity, nằm trong khoảng `[-1, 1]`.

## Token suy luận ẩn

Gemini tính token suy luận vào `total_tokens` nhưng không vào `completion_tokens`.
Đo thực tế: prompt 17, completion 168, **tổng 736**. Hai hệ quả:

- `RAG_MAX_TOKENS` đặt thấp thì câu trả lời bị cắt cụt mà không báo lỗi
- Tính hạn mức phải dựa vào `total_tokens`, không thì hụt khoảng 4 lần

## Test

```bash
poetry run pytest
poetry run pytest --cov=ml_worker --cov-report=term-missing
```

Test chạy hoàn toàn trên `LLM_PROVIDER=mock`, không cần khoá API và không gọi
mạng. `tests/conftest.py` xoá biến môi trường của máy dev để kết quả không đổi
theo từng máy.

## Sở hữu

Epic 5 — Ngọc. Ranh giới bounded context xem `docs/02-architecture/service-boundaries.md`.
`FR-AI-006 Vision Attention` **không** thuộc service này — đã giao Sơn (Epic 4 Proctoring).
