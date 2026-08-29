# Sample CSV - Bulk Import Questions

## ⚠️ TRƯỚC KHI IMPORT

Bạn phải thay thế UUID topic_id bằng UUID topic thật trong DB, nếu không sẽ lỗi foreign key.

### 1. Tạo topic trước

```bash
# Login lấy token
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ioes.com","password":"admin123"}'

# Tạo 4 topics (Geography, Security, Python, Web)
curl -X POST http://localhost:8080/api/question-bank/topics \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Geography","code":"GEO","description":"Geography questions"}'

curl -X POST http://localhost:8080/api/question-bank/topics \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Security","code":"SEC","description":"Security fundamentals"}'

curl -X POST http://localhost:8080/api/question-bank/topics \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Python","code":"PY","description":"Python programming"}'

curl -X POST http://localhost:8080/api/question-bank/topics \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Web APIs","code":"WEB","description":"REST and HTTP"}'
```

### 2. Lấy topic IDs

```bash
curl http://localhost:8080/api/question-bank/topics \
  -H "Authorization: Bearer <TOKEN>"
```

Copy 4 UUID của Geography/Security/Python/Web, rồi thay thế vào CSV:
- `00000000-0000-4000-8000-000000000001` (Geography - dùng cho nhiều câu)
- `00000000-0000-4000-8000-000000000002` (Security - essay)
- `00000000-0000-4000-8000-000000000003` (Python - coding)
- `00000000-0000-4000-8000-000000000004` (Web APIs)

Có thể dùng sed để thay nhanh:
```bash
sed -i 's/00000000-0000-4000-8000-000000000001/<UUID-geography>/g' sample-questions-import.csv
sed -i 's/00000000-0000-4000-8000-000000000002/<UUID-security>/g' sample-questions-import.csv
sed -i 's/00000000-0000-4000-8000-000000000003/<UUID-python>/g' sample-questions-import.csv
sed -i 's/00000000-0000-4000-8000-000000000004/<UUID-web>/g' sample-questions-import.csv
```

### 3. Import CSV

```bash
curl -X POST http://localhost:8080/api/question-bank/bulk-import \
  -H "Authorization: Bearer <TOKEN>" \
  -F "file=@sample-questions-import.csv"
```

## 📋 CSV Schema

| Column | Required | Format | Example |
|--------|----------|--------|---------|
| `question_text` | Yes | string | "What is 2+2?" |
| `question_type` | Yes | enum | `multiple_choice`, `multiple_select`, `true_false`, `short_answer`, `essay`, `coding` |
| `difficulty` | Yes | enum | `very_easy`, `easy`, `medium`, `hard`, `very_hard` |
| `points` | Yes | int 1-100 | `1` |
| `topic_id` | Yes | UUID | `abc-123-def-456` |
| `language` | No | string | `en`, `vi` |
| `hint` | No | string | "Starts with P" |
| `explanation` | No | string (multi-line OK) | "Paris is..." |
| `estimated_seconds` | No | int 10-7200 | `60` |
| `tags` | No | CSV | `tag1,tag2` |
| `options` | No (MC/MA/TF only) | `"text\|bool,text\|bool"` | `"Paris\|true,London\|false"` |
| `correct_answers` | No (short_answer only) | CSV | `"4,four,4.0"` |
| `test_cases` | No (coding only) | `"input\|expected\|isSample\|points"` separated by `\|\|` | `"1+1\|\|2\|\|true\|\|1,,2+2\|\|4\|\|true\|\|1"` |
| `status` | No | enum | `draft`, `published` |

## 🧪 Các loại câu hỏi trong file mẫu (10 câu)

1. **multiple_choice** - 1 đáp án đúng (4 lựa chọn)
2. **multiple_select** - Nhiều đáp án đúng
3. **true_false** - 2 lựa chọn True/False
4. **essay** - Câu tự luận, chấm thủ công
5. **short_answer** - Câu trả lời ngắn, nhiều đáp án được chấp nhận (vd: "4", "four", "4.0")
6. **coding** - Bài tập code với test cases
7. **multiple_choice** (algorithms)
8. **multiple_select** (HTTP)
9. **true_false** (biology)
10. **essay** (REST architecture)

## 🔧 Test các API sau khi import

```bash
TOKEN="<paste-token>"

# 1. List tất cả topics
curl http://localhost:8080/api/question-bank/topics \
  -H "Authorization: Bearer $TOKEN"

# 2. List câu hỏi theo topic
curl "http://localhost:8080/api/question-bank/questions?topicId=<UUID-topic>" \
  -H "Authorization: Bearer $TOKEN"

# 3. Lấy câu hỏi random để tạo practice
curl http://localhost:8080/api/question-bank/topics/<UUID-topic>/practice \
  -H "Authorization: Bearer $TOKEN"

# 4. Xem chi tiết 1 câu
curl http://localhost:8080/api/question-bank/questions/<QUESTION-ID> \
  -H "Authorization: Bearer $TOKEN"

# 5. Update câu hỏi
curl -X PATCH http://localhost:8080/api/question-bank/questions/<QUESTION-ID> \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"points":2}'

# 6. Dgraph resync
curl -X POST http://localhost:8080/api/question-bank/admin/resync \
  -H "Authorization: Bearer $TOKEN"
```

## ⚠️ Lưu ý

- File CSV phải là **UTF-8** (không phải UTF-8 BOM)
- Max **50MB** và **5000 rows** mỗi file
- Rate limit: **5 imports/giờ**
- Multi-line trong field (explanation) phải đặt trong quotes: `"...line1\nline2..."`
- 1 CSV cell chứa `,` phải quote: `"a, b, c"`
- Trong field có `|` thì phải quote để không bị split nhầm
- `test_cases` separator giữa các case là `||`, các trường trong case là `|`
