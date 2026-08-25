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
| Nhúng | `intfloat/multilingual-e5-small`, 384 chiều, CPU |
| Mô hình ngôn ngữ | Gemini qua endpoint tương thích OpenAI, hoặc mock |
| Truy xuất | Mở rộng câu hỏi rồi hợp nhiều bể, xếp lại bằng RRF |
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
scripts/eval_retrieval.py    Đo chất lượng truy xuất trên bộ câu hỏi chuẩn
data/eval/                   20 câu hỏi chuẩn + đáp án, hai bản có dấu và không dấu
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

## Truy xuất: vì sao không tìm thẳng một lần

Corpus lệch hẳn về tiếng Anh — 1,21 triệu ký tự MDN so với 6 nghìn ký tự viết
tay tiếng Việt — trong khi học viên chỉ hỏi tiếng Việt, và hay gõ không dấu.
Ba phép đo dẫn tới thiết kế hiện tại:

**Mô hình nhúng gom cụm theo ngôn ngữ trước, theo chủ đề sau.** Hỏi "Hàm trả về
giá trị như thế nào?" thì `vi-react` (0,8281) và `vi-rest-api` (0,8166) đứng
trên chính bài `return-values` (0,7895) — hai bài đầu không liên quan gì, chỉ
được lợi vì cùng tiếng Việt. Tám tài liệu tiếng Việt hút mọi câu hỏi.

**Bỏ dấu làm hỏng truy xuất.** Cùng bộ câu hỏi, chỉ khác cách gõ:

| Cấu hình | có dấu | không dấu |
|---|---|---|
| Tìm một lần (trước khi sửa) | 0,900 | 0,650 |
| Mở rộng câu hỏi rồi hợp các bể | **1,000** | **1,000** |

Chỉ số là tỉ lệ câu hỏi có ít nhất một tài liệu đúng lọt vào ngữ cảnh đưa cho
mô hình — thứ quyết định nó trả lời được hay từ chối.

**Cắt kết quả xuống `top_k` sau khi trộn là sai.** Bể dịch luôn giành nửa số
chỗ kể cả khi không có gì liên quan: hỏi "Rebase khac merge the nao?" thì không
tài liệu tiếng Anh nào nói về git, nhưng bốn đoạn rác vẫn chiếm chỗ và đẩy bài
"Git và GitHub" ra ngoài — câu này trước đó trả lời được, sau khi cắt thì bị từ
chối. Nay **hợp** các bể: thêm truy vấn chỉ có thể thêm tài liệu, không lấy đi.

Luồng hiện tại cho mỗi câu hỏi:

1. Một lượt gọi mô hình ở nhiệt độ 0, trả về hai bản viết lại — tiếng Việt có
   dấu đầy đủ, và tiếng Anh có bổ sung thuật ngữ
2. Truy xuất `top_k` đoạn cho mỗi bản, hợp lại, xếp thứ tự bằng RRF
3. Lọc sàn điểm, ghép ngữ cảnh, sinh câu trả lời

Bước 1 hỏng thì lui về tìm một lần — kém hơn nhưng vẫn chạy.

Tài liệu tiếng Việt còn được đánh chỉ mục thêm **một bản không dấu**. Việc này
tất định, không phụ thuộc mô hình, nên đường lui vẫn xử lý được câu gõ không
dấu khi hết hạn mức. Chỉ tốn 9 đoạn.

## Hạn mức gọi mô hình

Mỗi lượt hỏi tốn **hai** lượt gọi: một để viết lại câu hỏi, một để sinh câu trả
lời. Gói miễn phí của Gemini giới hạn **15 request/phút**, tức khoảng 7 câu hỏi
mỗi phút cho toàn hệ thống. Chạm trần thì bước viết lại thất bại và hệ tự lui
về tìm một lần — không sập, nhưng chất lượng tụt.

Ban đo đầu tiên không giãn nhịp đã dính đúng bẫy này: số nhảy giữa 0,650 và
0,850 qua các lần chạy, trông như mô hình bất định, thật ra là 429. Khi đo phải
đặt `EVAL_PACE_SECONDS=4.5`.

## Ngưỡng điểm và việc từ chối trả lời

Ngưỡng `RAG_SCORE_THRESHOLD` chỉ là **sàn lọc rác**, không phải chốt chặn chống
bịa. Phân bố điểm trong và ngoài phạm vi chồng lấn với cả hai mô hình nhúng đã
thử, nên không ngưỡng nào tách được. Việc phán đoán giao cho mô hình ngôn ngữ:
thiếu dữ liệu thì nó trả về đúng một dấu hiệu quy ước, và tầng trên đổi thành
câu từ chối, `grounded=false`, danh sách nguồn rỗng.

Vector được chuẩn hoá L2 và Milvus dùng độ đo `IP`, nên điểm số chính là cosine
similarity, nằm trong khoảng `[-1, 1]`.

## Tham số HNSW

`ef` quyết định duyệt bao nhiêu ứng viên trước khi trả kết quả. Đặt thấp không
chỉ làm lệch thứ hạng mà **mất hẳn** kết quả đúng: với câu "useState trong React
dùng để làm gì?", ở `ef=512` bài `vi-react` đứng hạng 1, còn ở `ef=64` nó không
nằm trong 20 tài liệu đầu. `ef` còn phải lớn hơn `k`, nếu không Milvus báo lỗi
thẳng `ef(64) should be larger than k(100)`.

## Đo chất lượng truy xuất

```bash
EVAL_PACE_SECONDS=4.5 python scripts/eval_retrieval.py     data/eval/ground-truth.json /tmp/ket-qua.json     data/eval/queries.json data/eval/queries-khong-dau.json

EVAL_NO_EXPAND=1 python scripts/eval_retrieval.py ...   # đo đường lui
```

Bộ chuẩn có 20 câu trong phạm vi và 4 câu ngoài phạm vi, mỗi câu hai bản có dấu
và không dấu. Đáp án bám đúng nội dung corpus: viết câu hỏi về thứ corpus không
có (useState, khoá ngoại) thì hệ từ chối, và đó là hành vi đúng chứ không phải
lỗi truy xuất.

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
