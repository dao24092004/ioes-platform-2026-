# 🆕 ONBOARDING - Hướng dẫn cho thành viên mới

> **Mục đích:** Đây là file **ĐẦU TIÊN** bạn cần đọc khi join dự án IOES

---

## ⏱️ TIMELINE

| Tuần | Hoạt động | Output |
|------|-----------|--------|
| **Ngày 1** | Đọc tài liệu (2-3 giờ) | Hiểu tổng quan dự án |
| **Ngày 1** | Setup local (1-2 giờ) | Chạy được `localhost:3000` và `localhost:8080` |
| **Ngày 2-3** | Đọc style guide (1-2 giờ) | Sẵn sàng code |
| **Ngày 3-5** | Pick task "good first issue" | Có PR đầu tiên merged |
| **Tuần 2** | Quen với workflow | Làm việc độc lập |

---

## 📚 BƯỚC 1: ĐỌC TÀI LIỆU (2-3 giờ)

### 1.1 Đọc BẮT BUỘC (theo thứ tự)

```
1. README.md (root)                          # 10 ph - Tổng quan dự án
2. docs/01-business/BA_DOCUMENT.md           # 20 ph - Yêu cầu nghiệp vụ
3. docs/01-business/PROJECT_RULES.md         # 20 ph - MASTER RULES
4. docs/01-business/PROJECT_STRUCTURE.md     # 10 ph - Cấu trúc thư mục
```

### 1.2 Đọc theo VAI TRÒ

```
Frontend Developer:
  5. docs/03-development/coding-standards/frontend-styleguide.md   # 15 ph
  6. apps/web/README.md                                          # 5 ph

Java Backend Developer:
  5. docs/02-architecture/service-boundaries.md                   # 15 ph
  6. docs/03-development/coding-standards/java-styleguide.md      # 20 ph
  7. services/auth-service/README.md (hoặc service bạn làm)      # 5 ph

Node.js Backend Developer:
  5. docs/02-architecture/service-boundaries.md                   # 15 ph
  6. docs/03-development/coding-standards/node-styleguide.md     # 20 ph
  7. services/exam-suite/README.md (hoặc service bạn làm)       # 5 ph

AI/ML Engineer:
  5. docs/03-development/coding-standards/python-styleguide.md   # 20 ph
  6. services/ai-suite/README.md                                 # 5 ph
  7. docs/05-research/ (paper tương ứng)                        # 30 ph

DevOps/SRE:
  5. docs/02-architecture/                                       # 15 ph
  6. docs/04-operations/                                         # 20 ph
  7. infrastructure/README.md                                   # 5 ph
```

### 1.3 Đọc bổ sung (tham khảo)

```
- docs/03-development/git-workflow.md         # Git workflow
- docs/03-development/code-review-checklist.md # PR review
- docs/03-development/testing-strategy.md    # Test strategy
- docs/01-business/PROJECT_MANAGEMENT_PLAN.md # Timeline
- CONTRIBUTING.md                              # Contribute guide
```

---

## 🛠️ BƯỚC 2: SETUP MÔI TRƯỜNG (1-2 giờ)

### 2.1 Cài đặt tools

```bash
# macOS
brew install node@20 python@3.11 openjdk@17 maven docker
brew install pnpm
brew install --cask docker

# Linux (Ubuntu)
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# pnpm
npm install -g pnpm

# Python 3.11
sudo apt install -y python3.11 python3.11-venv

# Java 17
sudo apt install -y openjdk-17-jdk

# Docker
sudo apt install -y docker.io docker-compose
```

### 2.2 Clone & setup

```bash
# 1. Clone
git clone <repo-url>
cd AiProject

# 2. Cài dependencies
pnpm install

# 3. Env
cp .env.example .env

# 4. Start Docker services
make setup-dev
# Đợi 2-3 phút cho Postgres, Redis, Kafka, etc. start

# 5. Migrate + seed
make migrate
make seed

# 6. Start everything
make dev
```

### 2.3 Verify

```bash
# Check services
make health-check

# Check URLs
# Frontend: http://localhost:3000
# API Gateway: http://localhost:8080
# API Docs: http://localhost:8080/swagger-ui.html
# Grafana: http://localhost:3001 (admin/admin)

# Run tests
make test
```

### 2.4 IDE Setup

**VS Code (khuyến nghị):**

```bash
# Cài extensions
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension vue.volar
code --install-extension humao.rest-client
```

**Cấu hình:**
- `.vscode/settings.json` - đã có sẵn
- `.editorconfig` - đã có sẵn

**Cursor:**
- Rules trong `.cursor/rules/` tự động apply
- AI sẽ tự động follow PROJECT_RULES.md

---

## 👋 BƯỚC 3: GIỚI THIỆU VỚI TEAM

### 3.1 Join Slack channels

```
#ioes-general        - Thảo luận chung
#ioes-dev            - Development
#ioes-devops         - Infrastructure
#ioes-ai             - AI/ML
#ioes-alerts         - Production alerts
#ioes-random         - Off-topic
```

### 3.2 Giới thiệu

Đăng lên `#ioes-general`:
```
🎉 Chào team! Mình là [Tên], vừa join với vai trò [Vai trò].
Trước đây mình làm [Kinh nghiệm].
Sẵn sàng học hỏi và đóng góp! 🚀
```

### 3.3 1-on-1 với Tech Lead

Đặt lịch 1-on-1 với Tech Lead trong tuần đầu:
- Câu hỏi nào chưa rõ?
- Cần support gì?
- Có task nào phù hợp với mình không?

---

## 🎯 BƯỚC 4: PICK TASK ĐẦU TIÊN

### 4.1 Tìm "Good First Issue"

Vào Jira:
1. Filter: `project = IOES AND labels = "good-first-issue"`
2. Hoặc hỏi Tech Lead trong `#ioes-dev`

### 4.2 Task mẫu cho người mới

```
✅ Setup tooling
✅ Fix typo trong docs
✅ Add a test case
✅ Update README
✅ Refactor small function
✅ Add validation cho DTO
```

### 4.3 Workflow

```
1. Pick task từ Jira
2. Assign cho mình
3. Move to "In Progress"
4. Create branch: feature/PROJ-XXX-desc
5. Code + Test
6. Create PR
7. Address review
8. Merge
```

---

## ❓ CÂU HỎI THƯỜNG GẶP

### Q1: Tôi nên đọc gì trước?
> **A:** Bắt đầu từ `README.md` (root), sau đó `PROJECT_RULES.md` và `PROJECT_STRUCTURE.md`.

### Q2: Làm sao setup local?
> **A:** Xem [Bước 2](#2-bước-2-setup-môi-trường-1-2-giờ) ở trên.

### Q3: Tôi không hiểu domain (e.g., blockchain)?
> **A:** Đọc `BA_DOCUMENT.md` để hiểu business. Hỏi trong `#ioes-dev`.

### Q4: Tôi bị stuck, phải làm sao?
> **A:** Đừng ngần ngại hỏi! Hỏi trong Slack `#ioes-dev` hoặc 1-on-1 với Tech Lead.

### Q5: Có cần đọc hết tất cả docs không?
> **A:** Không. Đọc theo [vai trò](#12-đọc-theo-vai-trò). Tài liệu khác tham khảo khi cần.

### Q6: Cursor AI có tự động follow rules không?
> **A:** Có. Cursor load rules từ `.cursor/rules/`. Mỗi ngôn ngữ có rule riêng.

### Q7: Tôi có thể tự tạo thư mục mới không?
> **A:** Không, trừ khi được Tech Lead approve. File phải đúng vị trí trong `PROJECT_STRUCTURE.md`.

---

## 📞 AI HỖ TRỢ BẠN

| Vấn đề | Liên hệ |
|---------|---------|
| Question về business | Product Owner |
| Question về architecture | Tech Lead |
| Setup issues | Backend Lead tương ứng |
| Cần task đầu tiên | Tech Lead |
| Cảm thấy bị stuck | Tech Lead / PM |

---

## ✅ CHECKLIST ONBOARDING

Đánh dấu khi hoàn thành:

- [ ] Đọc README.md (root)
- [ ] Đọc PROJECT_RULES.md
- [ ] Đọc PROJECT_STRUCTURE.md
- [ ] Đọc style guide của ngôn ngữ mình
- [ ] Setup local thành công
- [ ] Truy cập được http://localhost:3000
- [ ] Truy cập được http://localhost:8080/swagger-ui.html
- [ ] Chạy được `make test` pass
- [ ] Join Slack channels
- [ ] Giới thiệu với team
- [ ] 1-on-1 với Tech Lead
- [ ] Pick task đầu tiên
- [ ] Có PR đầu tiên merged

---

**Chào mừng bạn đến với IOES Team! 🎉**
