"""Thu thập học liệu từ MDN Web Docs về thư mục corpus.

Vì sao chọn MDN: nội dung phát hành theo giấy phép CC BY-SA 2.5, cho phép tái
sử dụng miễn là ghi nguồn. Mỗi tài liệu lưu kèm ``source_url`` và ``license``,
và tầng RAG trích dẫn tiêu đề trong câu trả lời, nên nghĩa vụ ghi nguồn được
đáp ứng.

Lấy Markdown gốc từ repo ``mdn/content`` thay vì cào HTML trang web: sạch hơn,
không dính điều hướng và quảng cáo, và không tạo tải lên máy chủ MDN.

Chạy:
    python scripts/crawl_corpus.py
    python scripts/crawl_corpus.py --limit 10 --out data/corpus
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

GITHUB_API = "https://api.github.com/repos/mdn/content/contents"
RAW_BASE = "https://raw.githubusercontent.com/mdn/content/main"
MDN_SITE = "https://developer.mozilla.org/en-US/docs"
LICENSE = "CC BY-SA 2.5 (MDN Web Docs)"

# Bám đúng lộ trình Full-Stack mô tả trong BA_DOCUMENT §11.4:
# nền tảng -> frontend -> backend.
TOPICS = [
    "files/en-us/learn_web_development/core/structuring_content",
    "files/en-us/learn_web_development/core/styling_basics",
    "files/en-us/learn_web_development/core/scripting",
    "files/en-us/learn_web_development/core/css_layout",
    "files/en-us/learn_web_development/core/version_control",
    "files/en-us/learn_web_development/core/accessibility",
]

USER_AGENT = "ioes-corpus-crawler/1.0 (educational; https://github.com/dao24092004)"

# Macro riêng của MDN. Hai nhóm, xử lý khác nhau:
#
#   - Điều hướng và khung trang ({{PreviousMenuNext(...)}}, {{LearnSidebar}}):
#     tham số là đường dẫn nội bộ, không phải nội dung. Bóc lấy tham số sẽ nhét
#     một chuỗi đường dẫn vô nghĩa vào đầu tài liệu và làm nhiễu vector.
#     Nhóm này XOÁ HẲN.
#   - Tham chiếu nội dung ({{Glossary("HTML")}}, {{jsxref("Array")}}): tham số
#     chính là chữ mà người đọc thấy, nên bóc ra giữ lại.
_DROP_MACROS = (
    "PreviousMenuNext|NextMenu|PreviousMenu|PreviousNext|LearnSidebar|"
    "CSSRef|JSRef|HTMLSidebar|GlossarySidebar|DefaultAPISidebar|"
    "EmbedLiveSample|EmbedGHLiveSample|LiveSampleLink|Compat|Specifications|"
    "SeeCompatTable|Deprecated_Header|Non-standard_Header|Experimental_Inline|"
    "AvailableInWorkers|SecureContext_Header"
)
_NAV_MACRO = re.compile(
    r"\{\{\s*(?:" + _DROP_MACROS + r")\s*(?:\([^)]*\))?\s*\}\}",
    re.IGNORECASE,
)
_MACRO = re.compile(r"\{\{\s*\w+\s*\(([^)]*)\)\s*\}\}")
_BARE_MACRO = re.compile(r"\{\{[^}]*\}\}")
# Bảng và khối HTML thô trong Markdown của MDN chủ yếu là khung trang.
_HTML_TAG = re.compile(r"</?[a-zA-Z][^>]*>")

# Khối code có rào ```. Bài học của MDN phần lớn là ví dụ code, mà code tách
# khỏi lời giải thích thì thành nhiễu: đoạn chứa mỗi ".box { float: left; }"
# vẫn được chấm điểm cao cho câu hỏi về bố cục, rồi lọt vào ngữ cảnh và đẩy
# phần văn xuôi thật sự trả lời được ra ngoài cửa sổ.
_CODE_FENCE = re.compile(r"```.*?```", re.DOTALL)

# MDN dùng lorem ipsum làm chữ mẫu trong ví dụ bố cục. Những đoạn này không
# mang nội dung nào nhưng vẫn sinh vector, và vì chúng dài nên chiếm nhiều
# đoạn — đo thực tế thấy chúng chiếm phần lớn kết quả truy xuất.
_LOREM_WORDS = (
    "lorem",
    "ipsum",
    "dolor",
    "vulputate",
    "tincidunt",
    "consectetur",
    "adipiscing",
    "malesuada",
    "condimentum",
    "scelerisque",
    "fermentum",
    "sagittis",
    "posuere",
    "dignissim",
    "hendrerit",
    "facilisis",
    "bibendum",
)
_PARA_SPLIT = re.compile(r"\n\s*\n")


def _is_lorem(block: str) -> bool:
    """Đoạn chứa nhiều từ Latin mẫu thì coi là chữ giả."""
    lowered = block.lower()
    return sum(word in lowered for word in _LOREM_WORDS) >= 3


_FRONTMATTER = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
_CALLOUT = re.compile(r"^>\s*\*\*[^*]+\*\*.*$", re.MULTILINE)


def _fetch(url: str, *, retries: int = 3) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    last_error: Exception | None = None
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return response.read()
        except urllib.error.HTTPError as exc:
            if exc.code == 404:
                raise
            last_error = exc
        except urllib.error.URLError as exc:
            last_error = exc
        # Lùi dần: GitHub chặn tần suất thì chờ lâu hơn ở lần sau.
        time.sleep(2**attempt)
    raise RuntimeError(f"Không tải được {url}: {last_error}")


def list_articles(topic_path: str) -> list[str]:
    """Liệt kê thư mục con của một chủ đề. Mỗi thư mục là một bài."""
    payload = json.loads(_fetch(f"{GITHUB_API}/{topic_path}"))
    return [f"{topic_path}/{entry['name']}" for entry in payload if entry["type"] == "dir"]


def _clean(markdown: str) -> str:
    # Xoá macro điều hướng TRƯỚC, nếu không _MACRO sẽ bóc chúng thành đường dẫn.
    text = _NAV_MACRO.sub("", markdown)
    text = _MACRO.sub(lambda m: m.group(1).strip().strip('"').strip("'"), text)
    text = _BARE_MACRO.sub("", text)
    text = _CALLOUT.sub("", text)
    text = _CODE_FENCE.sub("", text)
    text = _HTML_TAG.sub("", text)

    # Bỏ đoạn chữ giả sau khi đã gỡ code, vì lorem ipsum hay nằm trong ví dụ.
    text = "\n\n".join(b for b in _PARA_SPLIT.split(text) if not _is_lorem(b))
    # Gộp dòng trống thừa do việc bóc macro để lại.
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def _title_from_frontmatter(raw: str, fallback: str) -> str:
    match = _FRONTMATTER.match(raw)
    if not match:
        return fallback
    for line in match.group(1).splitlines():
        if line.startswith("title:"):
            return line.partition(":")[2].strip().strip('"').strip("'")
    return fallback


def _body(raw: str) -> str:
    match = _FRONTMATTER.match(raw)
    return raw[match.end() :] if match else raw


def fetch_article(article_path: str) -> dict[str, str] | None:
    url = f"{RAW_BASE}/{article_path}/index.md"
    try:
        raw = _fetch(url).decode("utf-8")
    except urllib.error.HTTPError:
        return None

    slug = article_path.split("/")[-1]
    body = _clean(_body(raw))

    # Bài quá ngắn thường chỉ là trang mục lục, không có nội dung để trả lời.
    if len(body) < 400:
        return None

    doc_path = article_path.removeprefix("files/en-us/").replace("_", "-")
    return {
        "doc_id": slug.replace("_", "-"),
        "title": _title_from_frontmatter(raw, slug),
        "source_url": f"{MDN_SITE}/{doc_path}",
        "body": body,
    }


def write_document(article: dict[str, str], out_dir: Path) -> Path:
    path = out_dir / f"{article['doc_id']}.md"
    path.write_text(
        "---\n"
        f"title: {article['title']}\n"
        f"doc_id: {article['doc_id']}\n"
        f"source_url: {article['source_url']}\n"
        f"license: {LICENSE}\n"
        "---\n\n"
        f"{article['body']}\n",
        encoding="utf-8",
    )
    return path


def crawl(out_dir: Path, limit: int | None = None) -> int:
    out_dir.mkdir(parents=True, exist_ok=True)
    written = 0

    for topic in TOPICS:
        try:
            articles = list_articles(topic)
        except Exception as exc:  # noqa: BLE001 - báo rồi đi tiếp chủ đề khác
            print(f"  bo qua {topic}: {exc}", file=sys.stderr)
            continue

        print(f"{topic}: {len(articles)} bai")
        for article_path in articles:
            if limit is not None and written >= limit:
                return written
            article = fetch_article(article_path)
            if article is None:
                continue
            path = write_document(article, out_dir)
            written += 1
            print(f"  + {path.name}  ({len(article['body'])} ky tu)")
            # Lịch sự với máy chủ, dù raw.githubusercontent chịu được nhiều hơn.
            time.sleep(0.2)

    return written


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default="data/corpus", help="Thu muc dich")
    parser.add_argument("--limit", type=int, default=None, help="So bai toi da")
    args = parser.parse_args()

    out_dir = Path(args.out)
    count = crawl(out_dir, args.limit)
    print(f"\nDa ghi {count} tai lieu vao {out_dir}")
    return 0 if count else 1


if __name__ == "__main__":
    raise SystemExit(main())
