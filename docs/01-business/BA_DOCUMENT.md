# 📘 TÀI LIỆU BA (BUSINESS ANALYSIS) — HỆ THỐNG THI TRỰC TUYẾN

> **Phiên bản:** 1.1 (Bổ sung Performance Optimization Guide)  
> **Ngày tạo:** 25/07/2026  
> **Ngày cập nhật:** 25/07/2026  
> **Người tạo:** Business Analyst Team  
> **Trạng thái:** ✅ Approved for Development

---

## 📑 MỤC LỤC

1. [Tổng Quan Dự Án](#1-tổng-quan-dự-án)
2. [Phân Tích Stakeholder](#2-phân-tích-stakeholder)
3. [Phạm Vi Dự Án (Scope)](#3-phạm-vi-dự-án-scope)
4. [Phân Tích Yêu Cầu Nghiệp Vụ](#4-phân-tích-yêu-cầu-nghiệp-vụ)
5. [User Stories & Use Cases](#5-user-stories--use-cases)
6. [Quy Tắc Nghiệp Vụ (Business Rules)](#6-quy-tắc-nghiệp-vụ-business-rules)
7. [Yêu Cầu Phi Chức Năng](#7-yêu-cầu-phi-chức-năng)
8. [Mô Hình Kiến Trúc Hệ Thống](#8-mô-hình-kiến-trúc-hệ-thống)
9. [Ma Trận Phân Quyền](#9-ma-trận-phân-quyền)
10. [User Flow & Process](#10-user-flow--process)
11. [Wireframe Mô Tả](#11-wireframe-mô-tả)
12. [Phân Tích Rủi Ro](#12-phân-tích-rủi-ro)
13. [Metrics & KPIs](#13-metrics--kpis)
14. [Roadmap Triển Khai](#14-roadmap-triển-khai)
15. **⚡ [Hướng Dẫn Tối Ưu Hiệu Năng](#15-hướng-dẫn-tối-ưu-hiệu-năng)** ⭐ MỚI
16. [Phụ Lục](#16-phụ-lục)

---

## 1. TỔNG QUAN DỰ ÁN

### 1.1. Tên Dự Án
**Hệ Thống Thi Trực Tuyến Thông Minh** (Intelligent Online Examination System)

### 1.2. Mô Tả
Hệ thống thi trực tuyến tích hợp AI, hỗ trợ cá nhân hóa lộ trình học tập, giám sát thi bằng computer vision, và xác thực học thuật bằng blockchain. Hệ thống phục vụ cho các tổ chức giáo dục, doanh nghiệp đào tạo, và cá nhân học viên.

### 1.3. Mục Tiêu Kinh Doanh (Business Objectives)

| # | Mục Tiêu | Đo Lường | Thời Gian |
|---|----------|----------|-----------|
| BO-1 | Tăng trải nghiệm người học qua cá nhân hóa lộ trình | NPS ≥ 70, Satisfaction ≥ 4.5/5 | Q1/2027 |
| BO-2 | Đảm bảo tính toàn vẹn của kỳ thi | Gian lận giảm 80% | Q2/2027 |
| BO-3 | Tăng uy tín bằng văn bằng blockchain | 100% bằng cấp có thể verify | Q3/2027 |
| BO-4 | Giảm chi phí vận hành | Giảm 60% chi phí in ấn, coi thi | Ongoing |
| BO-5 | Mở rộng quy mô | Hỗ trợ 100K+ concurrent users | Q4/2027 |

### 1.4. Tầm Nhìn & Sứ Mệnh

**Tầm nhìn:** Trở thành nền tảng thi trực tuyến hàng đầu Đông Nam Á, tích hợp AI tiên tiến và blockchain.

**Sứ mệnh:** Cung cấp trải nghiệm thi trực tuyến công bằng, minh bạch, thông minh cho mọi người.

### 1.5. Phạm Vi Sản Phẩm (Product Scope)

**Bao gồm:**
- Quản lý khóa học, bài học
- Tạo và quản lý đề thi
- Thi trực tuyến real-time với giám sát
- Cá nhân hóa lộ trình học tập bằng AI
- Blockchain xác thực bằng cấp
- Hệ thống token thưởng
- Đa người dùng (student, instructor, admin)

**Không bao gồm:**
- Hệ thống LMS đầy đủ (chỉ core features)
- Video conference (tích hợp bên thứ 3)
- Payment gateway (dùng bên thứ 3)

---

## 2. PHÂN TÍCH STAKEHOLDER

### 2.1. Bảng Stakeholder

| ID | Stakeholder | Vai Trò | Mức Độ Ảnh Hưởng | Mức Độ Quan Tâm | Chiến Lược |
|----|-------------|---------|-------------------|------------------|------------|
| SH-1 | **Học viên (Student)** | Người dùng chính | Cao | Cao | Quản lý chặt chẽ |
| SH-2 | **Giảng viên (Instructor)** | Tạo khóa học, đề thi | Cao | Cao | Quản lý chặt chẽ |
| SH-3 | **Quản trị viên (Admin)** | Vận hành hệ thống | Trung bình | Cao | Thông tin đầy đủ |
| SH-4 | **Tổ chức giáo dục** | Khách hàng B2B | Cao | Trung bình | Giữ hài lòng |
| SH-5 | **Doanh nghiệp đào tạo** | Khách hàng B2B | Trung bình | Trung bình | Thông tin đầy đủ |
| SH-6 | **Ban Giám Đốc** | Quyết định chiến lược | Cao | Thấp | Báo cáo định kỳ |
| SH-7 | **Đội ngũ Phát triển** | Triển khai | Thấp | Cao | Thông tin kỹ thuật |
| SH-8 | **Đội ngũ Vận hành** | DevOps, Monitoring | Thấp | Cao | Hỗ trợ kỹ thuật |
| SH-9 | **Cơ quan quản lý** | Tuân thủ pháp luật | Trung bình | Trung bình | Tuân thủ |

### 2.2. RACI Matrix

| Hoạt Động | BA | PO | Dev | QA | Ops | Stakeholder |
|-----------|----|----|-----|----|----|-------------|
| Thu thập yêu cầu | R | A | C | I | I | C |
| Phân tích nghiệp vụ | R | A | C | I | I | C |
| User Stories | R | A | C | C | I | C |
| Acceptance Criteria | R | A | C | C | I | I |
| UAT | C | A | I | R | I | R |
| Triển khai | I | A | R | C | R | I |

*R=Responsible, A=Accountable, C=Consulted, I=Informed*

---

## 3. PHẠM VI DỰ ÁN (SCOPE)

### 3.1. In-Scope (Trong Phạm Vi)

#### 3.1.1. Module Auth & User Management
- Đăng ký, đăng nhập (email, OAuth2 Google/GitHub/Microsoft)
- JWT token (access + refresh)
- Quản lý roles (Student, Instructor, Admin)
- User profile, skills, goals
- Password reset, email verification

#### 3.1.2. Module Content Management
- CRUD khóa học, chương, bài học
- Upload file (PDF, video, image)
- Course categories, tags
- Reviews, ratings
- Prerequisites

#### 3.1.3. Module Exam
- Tạo đề thi (multiple choice, essay, coding)
- Random questions, time limit
- Auto-grading
- Score history
- Real-time exam (WebSocket)
- Code editor online
- Auto-save submissions

#### 3.1.4. Module Proctoring
- Giám sát qua webcam
- Phát hiện gian lận (CNN + CNN+LSTM)
- Screen recording
- Behavior analysis
- Real-time alerts

#### 3.1.5. Module AI & Learning Path
- Chatbot AI hỗ trợ học tập
- Recommendation engine
- Auto-grading essays
- Question generation
- Agentic RAG - Personalized Learning Path (5 agents)
- Vision Attention (CNN+LSTM)
- Speech-to-text, OCR

#### 3.1.6. Module Blockchain
- IP registration, copyright
- Token economy, rewards
- Multi-signature wallet
- Academic records on-chain
- SHA-256 hashing + IPFS

#### 3.1.7. Module Analytics & Leaderboard
- User behavior tracking
- Course statistics
- Heatmaps, funnels
- Reports & dashboards
- Real-time ranking
- Streak tracking

#### 3.1.8. Module Notification
- Email, push, SMS
- Template engine
- User preferences

### 3.2. Out-of-Scope (Ngoài Phạm Vi)

| # | Tính Năng | Lý Do |
|---|-----------|-------|
| OS-1 | Video conference tích hợp | Dùng Zoom/Google Meet API |
| OS-2 | Payment gateway tích hợp | Dùng Stripe/VNPay |
| OS-3 | Mobile app native | Chỉ web responsive |
| OS-4 | Hệ thống LMS đầy đủ | Phase 2 |
| OS-5 | Chấm công, quản lý nhân sự | Không liên quan |

### 3.3. Assumptions (Giả Định)

| ID | Giả Định |
|----|----------|
| AS-1 | Internet bandwidth người dùng ≥ 5Mbps |
| AS-2 | Người dùng có webcam (cho proctoring) |
| AS-3 | Trình duyệt hỗ trợ WebRTC, WebSocket |
| AS-4 | Đội ngũ Dev có kinh nghiệm microservices |
| AS-5 | Budget cho cloud infrastructure được duyệt |
| AS-6 | Pháp lý cho blockchain records được thông qua |

### 3.4. Constraints (Ràng Buộc)

| ID | Ràng Buộc |
|----|-----------|
| CO-1 | Tuân thủ GDPR, PDPA về dữ liệu cá nhân |
| CO-2 | Tuân thủ luật giáo dục Việt Nam |
| CO-3 | SLA ≥ 99.5% |
| CO-4 | Hỗ trợ Tiếng Việt + English |
| CO-5 | Budget giới hạn (cần tối ưu chi phí) |

---

## 4. PHÂN TÍCH YÊU CẦU NGHIỆP VỤ

### 4.1. Yêu Cầu Chức Năng (Functional Requirements)

#### Module: Authentication & User Management

| ID | Yêu Cầu | Mô Tả | Ưu Tiên |
|----|----------|--------|---------|
| FR-AUTH-001 | Đăng ký | User đăng ký bằng email + password | P0 |
| FR-AUTH-002 | Đăng nhập | Đăng nhập bằng email/password hoặc OAuth2 | P0 |
| FR-AUTH-003 | JWT Token | Cấp access token (15 phút) + refresh token (7 ngày) | P0 |
| FR-AUTH-004 | Password Reset | Reset qua email link, expire 1 giờ | P0 |
| FR-AUTH-005 | Email Verification | Verify email sau đăng ký | P1 |
| FR-AUTH-006 | OAuth2 Login | Google, GitHub, Microsoft | P1 |
| FR-AUTH-007 | Role Management | 3 roles: Student, Instructor, Admin | P0 |
| FR-AUTH-008 | Profile Management | Bio, avatar, skills, goals | P1 |
| FR-AUTH-009 | Settings | Notification preferences, privacy | P2 |

#### Module: Content Management

| ID | Yêu Cầu | Mô Tả | Ưu Tiên |
|----|----------|--------|---------|
| FR-CONTENT-001 | Tạo khóa học | Instructor tạo khóa học mới | P0 |
| FR-CONTENT-002 | Quản lý chương/bài | CRUD chương, bài học | P0 |
| FR-CONTENT-003 | Upload file | PDF, video, image (max 500MB) | P0 |
| FR-CONTENT-004 | Course Categories | Phân loại khóa học | P1 |
| FR-CONTENT-005 | Tags | Gắn tag cho khóa học | P2 |
| FR-CONTENT-006 | Reviews & Ratings | Học viên review 1-5 sao | P1 |
| FR-CONTENT-007 | Prerequisites | Khóa học tiên quyết | P2 |
| FR-CONTENT-008 | Enrollment | Đăng ký tham gia khóa học | P0 |

#### Module: Exam

| ID | Yêu Cầu | Mô Tả | Ưu Tiên |
|----|----------|--------|---------|
| FR-EXAM-001 | Tạo đề thi | Multiple choice, essay, coding | P0 |
| FR-EXAM-002 | Random questions | Random từ pool | P1 |
| FR-EXAM-003 | Time limit | Đếm ngược thời gian | P0 |
| FR-EXAM-004 | Auto-grading | Multiple choice, coding | P0 |
| FR-EXAM-005 | Score history | Lưu lịch sử điểm | P0 |
| FR-EXAM-006 | Real-time exam | WebSocket, code editor | P0 |
| FR-EXAM-007 | Auto-save | Tự động lưu mỗi 30s | P0 |
| FR-EXAM-008 | Publish events | Kafka GradingCompleted | P0 |

#### Module: Proctoring

| ID | Yêu Cầu | Mô Tả | Ưu Tiên |
|----|----------|--------|---------|
| FR-PROC-001 | Webcam capture | Mỗi 1 giây | P0 |
| FR-PROC-002 | Face detection | MediaPipe 468 landmarks | P0 |
| FR-PROC-003 | Gaze estimation | Hướng nhìn | P0 |
| FR-PROC-004 | Behavior analysis | CNN + CNN+LSTM | P0 |
| FR-PROC-005 | Alert LOW_ATTENTION | Threshold < 60 | P0 |
| FR-PROC-006 | Alert FACE_NOT_DETECTED | > 5s | P0 |
| FR-PROC-007 | Screen recording | Optional | P2 |
| FR-PROC-008 | Reports | Cho instructor | P1 |

#### Module: AI & Learning Path

| ID | Yêu Cầu | Mô Tả | Ưu Tiên |
|----|----------|--------|---------|
| FR-AI-001 | Chatbot AI | Hỗ trợ học tập 24/7 | P0 |
| FR-AI-002 | Recommendation | Gợi ý khóa học | P1 |
| FR-AI-003 | Auto-grade essays | AI chấm bài luận | P1 |
| FR-AI-004 | Question generation | Tạo câu hỏi tự động | P2 |
| FR-AI-005 | Learning path | Cá nhân hóa (5 agents) | P0 |
| FR-AI-006 | Vision attention | Phát hiện mất tập trung | P0 |
| FR-AI-007 | Speech-to-text | Chuyển giọng nói thành text | P2 |
| FR-AI-008 | OCR | Trích xuất text từ ảnh | P2 |

#### Module: Blockchain

| ID | Yêu Cầu | Mô Tả | Ưu Tiên |
|----|----------|--------|---------|
| FR-BC-001 | IP Registration | Đăng ký bản quyền | P1 |
| FR-BC-002 | Token reward | Thưởng token cho học viên | P1 |
| FR-BC-003 | Multi-sig wallet | Ví đa chữ ký | P2 |
| FR-BC-004 | Academic records | Lưu bằng cấp on-chain | P0 |
| FR-BC-005 | Public verification | Verify công khai | P0 |
| FR-BC-006 | QR Code | QR cho bằng cấp | P1 |

#### Module: Analytics & Leaderboard

| ID | Yêu Cầu | Mô Tả | Ưu Tiên |
|----|----------|--------|---------|
| FR-ANL-001 | User tracking | Track hành vi | P1 |
| FR-ANL-002 | Course statistics | Thống kê khóa học | P1 |
| FR-ANL-003 | Heatmaps | Bản đồ nhiệt | P2 |
| FR-ANL-004 | Funnels | Phễu chuyển đổi | P2 |
| FR-ANL-005 | Reports | Báo cáo dashboard | P1 |
| FR-ANL-006 | Real-time ranking | Xếp hạng real-time | P1 |
| FR-ANL-007 | Streak tracking | Chuỗi ngày học | P2 |

### 4.2. Yêu Cầu Phi Chức Năng (Non-Functional Requirements)

| ID | Loại | Yêu Cầu | Tiêu Chí Đo |
|----|------|----------|---------------|
| NFR-001 | Performance | Response time | API < 500ms, P95 < 1s |
| NFR-002 | Performance | Throughput | 10K RPS |
| NFR-003 | Scalability | Concurrent users | 100K+ |
| NFR-004 | Availability | Uptime | ≥ 99.5% |
| NFR-005 | Security | Data encryption | TLS 1.3, AES-256 |
| NFR-006 | Security | Authentication | JWT, OAuth2 |
| NFR-007 | Compliance | GDPR, PDPA | Tuân thủ |
| NFR-008 | Usability | UI/UX | Responsive, WCAG 2.1 |
| NFR-009 | Reliability | Backup | Daily, RTO < 1h |
| NFR-010 | Maintainability | Code coverage | ≥ 80% |
| NFR-011 | Observability | Monitoring | Prometheus, Grafana |
| NFR-012 | Localization | i18n | VI, EN |

---

## 5. USER STORIES & USE CASES

### 5.1. Epic & User Stories

#### Epic 1: Authentication & Onboarding

| ID | User Story | Points | Priority |
|----|------------|--------|----------|
| US-001 | Là Student, tôi muốn đăng ký bằng email để bắt đầu học | 3 | P0 |
| US-002 | Là Student, tôi muốn đăng nhập nhanh bằng Google để tiết kiệm thời gian | 2 | P1 |
| US-003 | Là User, tôi muốn reset password khi quên để lấy lại tài khoản | 3 | P0 |
| US-004 | Là Student, tôi muốn cập nhật profile (avatar, skills) để thể hiện bản thân | 5 | P1 |

#### Epic 2: Course Management

| ID | User Story | Points | Priority |
|----|------------|--------|----------|
| US-005 | Là Instructor, tôi muốn tạo khóa học mới để chia sẻ kiến thức | 8 | P0 |
| US-006 | Là Student, tôi muốn tìm khóa học theo category để dễ chọn | 5 | P0 |
| US-007 | Là Student, tôi muốn review khóa học sau khi học để chia sẻ trải nghiệm | 3 | P1 |
| US-008 | Là Instructor, tôi muốn upload video bài giảng để học viên xem | 5 | P0 |

#### Epic 3: Exam & Assessment

| ID | User Story | Points | Priority |
|----|------------|--------|----------|
| US-009 | Là Instructor, tôi muốn tạo đề thi multiple choice để đánh giá | 8 | P0 |
| US-010 | Là Student, tôi muốn thi trực tuyến và nhận điểm ngay | 13 | P0 |
| US-011 | Là Student, tôi muốn xem lịch sử điểm để theo dõi tiến bộ | 3 | P0 |
| US-012 | Là Instructor, tôi muốn tạo đề thi coding với auto-grading | 13 | P0 |

#### Epic 4: Proctoring & Security

| ID | User Story | Points | Priority |
|----|------------|--------|----------|
| US-013 | Là Admin, tôi muốn giám sát thí sinh qua webcam để đảm bảo công bằng | 13 | P0 |
| US-014 | Là Student, tôi muốn được cảnh báo khi mất tập trung để tập trung hơn | 5 | P1 |
| US-015 | Là Instructor, tôi muốn xem báo cáo gian lận sau kỳ thi | 8 | P0 |

#### Epic 5: AI-Powered Learning

| ID | User Story | Points | Priority |
|----|------------|--------|----------|
| US-016 | Là Student, tôi muốn nhận lộ trình học cá nhân hóa để học hiệu quả | 21 | P0 |
| US-017 | Là Student, tôi muốn chat với AI để giải đáp thắc mắc 24/7 | 8 | P0 |
| US-018 | Là Instructor, tôi muốn AI đề xuất câu hỏi từ nội dung bài giảng | 13 | P2 |

#### Epic 6: Blockchain & Certification

| ID | User Story | Points | Priority |
|----|------------|--------|----------|
| US-019 | Là Student, tôi muốn nhận bằng cấp blockchain để xác thực mọi nơi | 13 | P0 |
| US-020 | Là Employer, tôi muốn verify bằng cấp qua QR code để tuyển dụng | 8 | P0 |

#### Epic 7: Analytics & Engagement

| ID | User Story | Points | Priority |
|----|------------|--------|----------|
| US-021 | Là Student, tôi muốn xem streak học tập để duy trì động lực | 3 | P1 |
| US-022 | Là Student, tôi muốn xem ranking để cạnh tranh lành mạnh | 5 | P1 |
| US-023 | Là Instructor, tôi muốn xem dashboard analytics để tối ưu khóa học | 8 | P1 |

### 5.2. Use Cases Chi Tiết

#### UC-001: Đăng Ký Tài Khoản

| Thuộc Tính | Chi Tiết |
|------------|----------|
| **Use Case ID** | UC-001 |
| **Use Case Name** | Đăng ký tài khoản |
| **Actor** | Student (chưa đăng ký) |
| **Description** | User đăng ký tài khoản mới bằng email và password |
| **Trigger** | User click "Đăng ký" |
| **Pre-condition** | Email chưa tồn tại trong hệ thống |
| **Post-condition** | Tài khoản được tạo, email verification gửi |

**Main Flow:**
1. User truy cập trang đăng ký
2. User nhập email, password, confirm password
3. Hệ thống validate format (email regex, password ≥ 8 ký tự)
4. Hệ thống kiểm tra email đã tồn tại chưa
5. Hệ thống hash password (bcrypt)
6. Hệ thống tạo user record với role = STUDENT
7. Hệ thống gửi email verification
8. Hệ thống hiển thị "Đăng ký thành công, kiểm tra email"

**Alternative Flow:**
- 4a. Email đã tồn tại → Hiển thị lỗi "Email đã được sử dụng"
- 3a. Password không hợp lệ → Hiển thị yêu cầu password mạnh hơn

**Business Rules:**
- BR-001: Email phải unique
- BR-002: Password ≥ 8 ký tự, có chữ hoa, chữ thường, số
- BR-003: Email verification expire sau 24 giờ

---

#### UC-010: Thi Trực Tuyến

| Thuộc Tính | Chi Tiết |
|------------|----------|
| **Use Case ID** | UC-010 |
| **Use Case Name** | Thi trực tuyến với proctoring |
| **Actor** | Student |
| **Description** | Student làm bài thi trực tuyến được giám sát bằng webcam |
| **Trigger** | Student click "Bắt đầu thi" |
| **Pre-condition** | Student đã enroll, webcam hoạt động |
| **Post-condition** | Bài thi được nộp, điểm được tính |

**Main Flow:**
1. Student chọn bài thi
2. Hệ thống kiểm tra quyền truy cập
3. Hệ thống yêu cầu bật webcam + screen share
4. Student đồng ý cấp quyền
5. Hệ thống bắt đầu session thi (WebSocket)
6. Student làm bài, hệ thống auto-save mỗi 30s
7. Hệ thống giám sát qua AI (attention score)
8. Nếu phát hiện gian lận → cảnh báo real-time
9. Student nộp bài (hoặc hết giờ)
10. Hệ thống chấm điểm auto-grading
11. Hệ thống publish event GradingCompleted → Kafka
12. Hệ thống hiển thị điểm và đáp án

**Alternative Flow:**
- 5a. Webcam không hoạt động → Báo lỗi, không cho thi
- 8a. Gian lận 3 lần → Tự động nộp bài, flag cho instructor

**Business Rules:**
- BR-010: Không cho rời tab trong khi thi
- BR-011: Time limit không thể pause
- BR-012: Auto-save mỗi 30s
- BR-013: Gian lận > 3 lần → flag + manual review

---

## 6. QUY TẮC NGHIỆP VỤ (BUSINESS RULES)

| ID | Quy Tắc | Mô Tả |
|----|----------|--------|
| BR-001 | Email unique | Mỗi email chỉ đăng ký 1 tài khoản |
| BR-002 | Password mạnh | ≥ 8 ký tự, có chữ hoa, thường, số, ký tự đặc biệt |
| BR-003 | Email verification | Bắt buộc verify trong 24h sau đăng ký |
| BR-004 | Role default | User mới = STUDENT |
| BR-005 | Instructor upgrade | Cần Admin duyệt |
| BR-006 | Course ownership | Chỉ Instructor tạo khóa học mới sửa được |
| BR-007 | Enrollment | Student phải enroll trước khi học |
| BR-008 | Exam time | Không thể pause, không thể gia hạn |
| BR-009 | Auto-grading | Multiple choice + coding auto, essay manual |
| BR-010 | Proctoring | Bắt buộc cho exam > 30 phút |
| BR-011 | Attention threshold | < 60 → cảnh báo, < 40 → flag |
| BR-012 | Token reward | 1 token = 1 giờ học, có giá trị quy đổi |
| BR-013 | Blockchain hash | Mỗi bằng cấp có hash SHA-256 immutable |
| BR-014 | Public verify | Ai cũng có thể verify bằng QR code |
| BR-015 | Streak bonus | 7 ngày liên tục → bonus 10 tokens |
| BR-016 | Leaderboard reset | Daily/Weekly/Monthly tự động reset |
| BR-017 | Notification | User được chọn kênh nhận (email/push/sms) |
| BR-018 | Data retention | Xóa data sau 2 năm không hoạt động |
| BR-019 | Multi-tenant | Tách data theo organization |
| BR-020 | Audit log | Mọi action quan trọng đều log |

---

## 7. YÊU CẦU PHI CHỨC NĂNG

### 7.1. Performance

#### 7.1.1. Yêu Cầu Hiệu Năng Cốt Lõi

| Metric | Mục Tiêu | Đo Lường | Hiện Trạng |
|--------|----------|----------|------------|
| **API Response Time (P50)** | < 100ms | Prometheus histogram | ~400ms |
| **API Response Time (P95)** | < 500ms | Prometheus histogram | ~800ms |
| **API Response Time (P99)** | < 1s | Prometheus histogram | ~1.5s |
| **Page Load Time (P95)** | < 2s | RUM (Real User Monitoring) | ~5s |
| **Time to Interactive (TTI)** | < 3s | Lighthouse | ~6s |
| **First Contentful Paint (FCP)** | < 1s | Lighthouse | ~2.5s |
| **Throughput** | 50,000 RPS | Load testing (k6) | ~5K RPS |
| **Concurrent Users** | 100,000+ | Load testing | ~10K |
| **WebSocket Connections** | 100,000+ | K8s metrics | ~5K |
| **AI Inference Latency** | < 500ms | Custom metrics | N/A |
| **DB Query (P95)** | < 50ms | pg_stat_statements | ~200ms |
| **Cache Hit Rate** | ≥ 80% | Redis metrics | 0% |

#### 7.1.2. Cải Thiện Mục Tiêu (Sau Tối Ưu)

| Metric | Trước | Sau | Cải Thiện |
|--------|-------|-----|-----------|
| API Latency P95 | 800ms | **150ms** | 5x ⚡ |
| Throughput | 5K RPS | **50K RPS** | 10x 🚀 |
| Concurrent Users | 10K | **100K+** | 10x 👥 |
| AI Inference | 1000ms | **50ms** | 20x 🤖 |
| DB Query P95 | 200ms | **50ms** | 4x 📊 |
| WebSocket Connections | 5K | **100K+** | 20x 🔌 |

### 7.2. Scalability
- Horizontal scaling cho mọi service
- Auto-scaling theo CPU/Memory
- Database sharding khi cần

### 7.3. Availability
- **Uptime SLA:** ≥ 99.5%
- **Multi-AZ deployment**
- **Disaster Recovery:** RTO < 1 giờ, RPO < 15 phút

### 7.4. Security
- TLS 1.3 cho mọi communication
- AES-256 cho data at rest
- JWT với rotation key
- Rate limiting: 100 req/phút/user
- SQL injection prevention (ORM)
- XSS prevention (sanitize input)
- CSRF token cho form

### 7.5. Compliance
- GDPR (EU users)
- PDPA (Vietnam)
- ISO 27001 (mục tiêu)
- SOC 2 (mục tiêu)

### 7.6. Usability
- Responsive design (mobile, tablet, desktop)
- WCAG 2.1 Level AA
- Đa ngôn ngữ (VI, EN)
- Hỗ trợ screen reader
- Keyboard navigation

### 7.7. Reliability
- Circuit breaker cho inter-service
- Retry với exponential backoff
- Graceful degradation
- Health check endpoints

### 7.8. Maintainability
- Code coverage ≥ 80%
- API documentation (OpenAPI)
- Architecture documentation
- ADRs (Architecture Decision Records)

### 7.9. Observability
- Distributed tracing (Jaeger)
- Centralized logging (ELK)
- Metrics (Prometheus + Grafana)
- Alerting (PagerDuty)
- APM (Application Performance Monitoring)

### 7.10. Localization
- Hỗ trợ Tiếng Việt (mặc định)
- Hỗ trợ English
- Timezone Asia/Ho_Chi_Minh
- Currency VND

---

## 8. MÔ HÌNH KIẾN TRÚC HỆ THỐNG

### 8.1. Kiến Trúc Tổng Quan (Layered Architecture)

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1: EDGE (Global CDN)                                     │
│  CloudFlare / AWS CloudFront                                    │
│  • Static assets cache (30+ ngày)                              │
│  • DDoS protection                                              │
│  • SSL termination (TLS 1.3)                                    │
│  • HTTP/3 support                                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 2: LOAD BALANCER                                         │
│  NGINX / AWS ALB / Envoy Proxy                                  │
│  • L7 routing                                                   │
│  • Rate limiting (100 req/min/user)                            │
│  • Health checks                                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 3: API GATEWAY (Multi-instance: 3-10 pods)             │
│  Spring Cloud Gateway (WebFlux) - Reactive/Non-blocking        │
│  • JWT validation (cached public keys)                         │
│  • Request coalescing                                           │
│  • Response caching (L1 - in-process)                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 4: SERVICE MESH (Istio / Linkerd)                       │
│  • Circuit breaker                                              │
│  • Retry với exponential backoff                                │
│  • Distributed tracing (Jaeger)                                 │
│  • mTLS cho service-to-service                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 5: BUSINESS SERVICES (Auto-scaling)                     │
│  • HPA (Horizontal Pod Autoscaler)                              │
│  • KEDA (event-driven scaling)                                  │
│  • 10 services + 3 common libraries                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 6: DATA TIER                                            │
│  • PostgreSQL Primary + 3 Read Replicas                        │
│  • Redis Cluster (3 masters + 3 replicas)                      │
│  • MongoDB Sharded Cluster                                      │
│  • Milvus GPU (Vector search)                                   │
│  • MinIO + S3 Glacier (Object storage)                          │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2. Tech Stack Matrix (Tối Ưu)

| Layer | Công Nghệ Đề Xuất | Lý Do |
|-------|-------------------|-------|
| **Edge CDN** | CloudFlare / AWS CloudFront | Global, DDoS protection, HTTP/3 |
| **Load Balancer** | NGINX + Envoy | L7 routing, 100K+ RPS |
| **API Gateway** | Spring Cloud Gateway WebFlux | 50K RPS, non-blocking I/O |
| **Service Mesh** | Istio hoặc Linkerd | Circuit breaker, tracing, mTLS |
| **Frontend** | React 18 + TypeScript + Vite + Tailwind | Fast, modern, good DX |
| **Backend (Java)** | Java 17 + Spring Boot 3 + Spring Cloud WebFlux | Reactive, 10x throughput |
| **Backend (Node.js)** | Node.js 20 + NestJS 10 + uWebSockets.js | 100K+ WebSocket connections |
| **Backend (Python)** | Python 3.11 + FastAPI + Pydantic + TensorRT | GPU inference, ML serving |
| **Database** | PostgreSQL 15 + 3 Read Replicas + PgBouncer | Transaction pooling, read scaling |
| **Cache** | Redis Cluster (3M+3R) + Caffeine (L1) | Multi-tier, sub-ms latency |
| **Search/Vector** | Milvus 2.4 + GPU (CAGRA index) | 10x faster vector search |
| **Storage** | MinIO (hot) + S3 Glacier (cold) + IPFS | Tiered storage |
| **Message Queue** | Apache Kafka 3.5 + Redis Streams | Event streaming |
| **Blockchain** | Solidity 0.8.20 + Polygon + The Graph | Cheaper than Ethereum |
| **ML/AI** | PyTorch + TensorRT + vLLM + LangGraph | Production ML serving |
| **Observability** | Prometheus + Grafana + Jaeger + Datadog | Full observability |
| **Container** | Docker + Kubernetes + Helm + ArgoCD | GitOps deployment |
| **CI/CD** | GitHub Actions + ArgoCD | Automated deployment |
| **Scaling** | KEDA (event-driven) + HPA (CPU/Memory) | Auto-scale theo metrics |

### 8.3. Service Inventory (10 Services + 3 Common Libs)

| # | Service | Port | Tech Stack | Database | Instances (Min) |
|---|---------|------|------------|----------|-----------------|
| 1 | `api-gateway` | 8080 | Java/Spring Cloud WebFlux | — | 3-10 (HPA) |
| 2 | `discovery-service` | 9999 | Java/Spring Boot | — | 2 (HA) |
| 3 | `config-server` | 8888 | Java/Spring Boot | — | 2 (HA) |
| 4 | `auth-service` | 9000 | Java/Spring Boot | PostgreSQL + Redis | 3-10 (HPA) |
| 5 | `content-service` | 9001 | Java/Spring Boot | PostgreSQL + MongoDB + MinIO | 3-10 (HPA) |
| 6 | `analytics-service` | 9004 | Java/Spring Boot | PostgreSQL + Redis + ClickHouse | 2-5 (HPA) |
| 7 | `notification-service` | 9009 | Java/Spring Boot | Redis | 2-5 (HPA) |
| 8 | `exam-suite` | 9005 | Node.js/NestJS | PostgreSQL + Redis | 3-15 (HPA theo WS count) |
| 9 | `ai-suite` | 9100-9103 | Polyglot (Java/Python/Node.js) | Milvus + PostgreSQL + Redis | 2-8 (GPU-based) |
| 10 | `blockchain-suite` | 9200 | Node.js/NestJS | PostgreSQL | 2-4 |

**Common Libraries:**
- `common-library` (Java): Shared utilities, DTOs, exceptions
- `common-node` (Node.js): Shared middleware, validators
- `common-python` (Python/FastAPI): Shared ML utilities, schemas

### 8.4. Yêu Cầu Tối Ưu Kiến Trúc

> ⚠️ **Quan trọng:** Mọi service PHẢI tuân thủ các nguyên tắc sau:

1. **Stateless Services**: Không lưu state trong memory, dùng Redis
2. **Health Checks**: Endpoint `/actuator/health` (hoặc `/health`) cho K8s
3. **Graceful Shutdown**: Xử lý SIGTERM, drain traffic 30s trước khi tắt
4. **Metrics Endpoint**: Prometheus format ở `/actuator/prometheus`
5. **Distributed Tracing**: OpenTelemetry instrumentation bắt buộc
6. **Structured Logging**: JSON format, correlation ID cho mỗi request
7. **Circuit Breaker**: Resilience4j (Java), opossum (Node.js)
8. **Connection Pooling**: HikariCP (Java), PgBouncer cho PostgreSQL

---

## 9. MA TRẬN PHÂN QUYỀN

### 9.1. Role Definitions

| Role | Mô Tả | Quyền Chính |
|------|--------|-------------|
| **STUDENT** | Học viên | Học, thi, xem điểm của mình |
| **INSTRUCTOR** | Giảng viên | Tạo khóa học, đề thi, xem analytics lớp mình |
| **ADMIN** | Quản trị viên | Toàn quyền quản trị hệ thống |

### 9.2. Permission Matrix

| Chức Năng | Student | Instructor | Admin |
|-----------|---------|------------|-------|
| Đăng ký/Đăng nhập | ✅ | ✅ | ✅ |
| Xem profile cá nhân | ✅ | ✅ | ✅ |
| Sửa profile cá nhân | ✅ | ✅ | ✅ |
| Tạo khóa học | ❌ | ✅ | ✅ |
| Sửa khóa học của mình | ❌ | ✅ | ✅ |
| Xóa khóa học của mình | ❌ | ✅ | ✅ |
| Xem khóa học public | ✅ | ✅ | ✅ |
| Enroll khóa học | ✅ | ✅ | ✅ |
| Tạo đề thi | ❌ | ✅ | ✅ |
| Làm bài thi | ✅ | ✅ | ✅ |
| Chấm điểm | ❌ | ✅ | ✅ |
| Xem điểm cá nhân | ✅ | ✅ | ✅ |
| Xem điểm tất cả | ❌ | ✅ (lớp mình) | ✅ |
| Proctoring | ✅ (bị giám sát) | ✅ (giám sát) | ✅ |
| Xem leaderboard | ✅ | ✅ | ✅ |
| Xem analytics | ❌ | ✅ (lớp mình) | ✅ |
| Quản lý user | ❌ | ❌ | ✅ |
| Verify blockchain | ✅ | ✅ | ✅ |
| Tạo token reward | ❌ | ❌ | ✅ |

### 9.3. Resource-Level Permissions

| Resource | Action | Student | Instructor | Admin |
|----------|--------|---------|------------|-------|
| Course:CREATE | | ❌ | ✅ | ✅ |
| Course:READ:own | | ❌ | ✅ | ✅ |
| Course:READ:enrolled | | ✅ | ✅ | ✅ |
| Course:UPDATE:own | | ❌ | ✅ | ✅ |
| Course:DELETE:own | | ❌ | ✅ | ✅ |
| Exam:CREATE | | ❌ | ✅ | ✅ |
| Exam:TAKE | | ✅ | ✅ | ✅ |
| Exam:GRADE | | ❌ | ✅ | ✅ |
| User:READ:self | | ✅ | ✅ | ✅ |
| User:READ:all | | ❌ | ❌ | ✅ |
| User:UPDATE:self | | ✅ | ✅ | ✅ |
| User:DELETE:self | | ✅ | ✅ | ✅ |
| Analytics:VIEW:course | | ❌ | ✅ | ✅ |
| Analytics:VIEW:system | | ❌ | ❌ | ✅ |

---

## 10. USER FLOW & PROCESS

### 10.1. Flow: Học Viên Đăng Ký & Bắt Đầu Học

```
START
  │
  ↓
[Visit Website] ──→ [Click "Đăng ký"]
  │
  ↓
[Nhập email + password]
  │
  ↓
[Validate] ──NO──→ [Hiển thị lỗi] ──→ [Quay lại nhập]
  │
  YES
  │
  ↓
[Tạo tài khoản]
  │
  ↓
[Gửi email verification]
  │
  ↓
[User click link trong email]
  │
  ↓
[Verify thành công]
  │
  ↓
[Đăng nhập tự động]
  │
  ↓
[Vào Dashboard]
  │
  ↓
[Chọn "Khám phá khóa học"]
  │
  ↓
[Duyệt danh sách]
  │
  ↓
[Chọn khóa học] ──→ [Click "Enroll"]
  │
  ↓
[Bắt đầu học]
  │
  ↓
END
```

### 10.2. Flow: Làm Bài Thi Có Giám Sát

```
START
  │
  ↓
[Login] → [Dashboard]
  │
  ↓
[Click "Bài thi của tôi"]
  │
  ↓
[Chọn bài thi] ──→ [Click "Bắt đầu"]
  │
  ↓
[Check quyền] ──NO──→ [Lỗi: Chưa đủ điều kiện]
  │
  YES
  │
  ↓
[Request webcam + screen share]
  │
  ↓
[User allow] ──NO──→ [Lỗi: Cần bật camera]
  │
  YES
  │
  ↓
[Initialize session] (WebSocket)
  │
  ↓
[Start countdown] ──→ [Show câu hỏi 1]
  │
  ↓
[Student trả lời]
  │
  ↓
[Auto-save mỗi 30s]
  │
  ↓
[AI giám sát attention]
  │
  ↓
┌─────────────────────────────────────┐
│ Attention < 60?                     │
├─────────────────────────────────────┤
│ YES → Alert warning                 │
│ NO → Continue                       │
└─────────────────────────────────────┘
  │
  ↓
┌─────────────────────────────────────┐
│ Gian lận > 3 lần?                  │
├─────────────────────────────────────┤
│ YES → Auto submit + Flag            │
│ NO → Continue                       │
└─────────────────────────────────────┘
  │
  ↓
[Hoàn thành hoặc hết giờ]
  │
  ↓
[Submit bài]
  │
  ↓
[Auto-grading] (multiple choice, coding)
  │
  ↓
[Publish Kafka event GradingCompleted]
  │
  ↓
[Academic records blockchain]
  │
  ↓
[Show điểm + đáp án]
  │
  ↓
END
```

### 10.3. Flow: Tạo Khóa Học (Instructor)

```
START
  │
  ↓
[Login as Instructor]
  │
  ↓
[Dashboard Instructor]
  │
  ↓
[Click "Tạo khóa học mới"]
  │
  ↓
[Nhập thông tin cơ bản] (title, desc, category)
  │
  ↓
[Upload thumbnail]
  │
  ↓
[Thêm chương]
  │
  ↓
[Thêm bài học trong chương]
  │
  ↓
[Upload video/PDF cho bài]
  │
  ↓
[Set prerequisites]
  │
  ↓
[Preview khóa học]
  │
  ↓
[Submit] ──→ [Status: Draft]
  │
  ↓
[Click "Publish"] ──→ [Status: Published]
  │
  ↓
[Notify subscribers]
  │
  ↓
END
```

---

## 11. WIREFRAME MÔ TẢ

### 11.1. Trang Đăng Nhập

```
┌──────────────────────────────────────────────────────────┐
│  LOGO                [Login] [Register] [Courses] [About] │
├──────────────────────────────────────────────────────────┤
│                                                            │
│              ┌────────────────────────────┐               │
│              │     WELCOME BACK           │               │
│              │                            │               │
│              │  Email:    [_________]     │               │
│              │  Password: [_________]     │               │
│              │                            │               │
│              │  [ ] Remember me           │               │
│              │  Forgot password?          │               │
│              │                            │               │
│              │  [    LOGIN    ]           │               │
│              │                            │               │
│              │  ──── OR ────              │               │
│              │  [G] [GH] [M]              │               │
│              │                            │               │
│              │  Don't have account?       │               │
│              │  Register here             │               │
│              └────────────────────────────┘               │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

### 11.2. Dashboard Student

```
┌──────────────────────────────────────────────────────────────────┐
│ LOGO  [Home][Courses][Exams][Leaderboard][AI Chat] [👤 Avatar]    │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  👋 Welcome back, John!                                          │
│  🔥 Streak: 7 days | 🏆 Rank: #42 | ⭐ Points: 1,250              │
│                                                                    │
│  ┌─────────────────────┐  ┌─────────────────────┐                │
│  │ 📚 Continue Learning│  │ 🎯 Upcoming Exams    │                │
│  │                     │  │                     │                │
│  │ [Course thumbnail]  │  │ • Math Quiz (Tomorrow)                │
│  │ Progress: 65%       │  │ • Java Test (Friday)                  │
│  │ [Continue]          │  │ [View all]           │                │
│  └─────────────────────┘  └─────────────────────┘                │
│                                                                    │
│  ┌─────────────────────────────────────────────────┐            │
│  │ 🧭 Your Personalized Learning Path              │            │
│  │                                                   │            │
│  │ Week 1: HTML/CSS Basics [✅ Done]               │            │
│  │ Week 2: JavaScript Fundamentals [🔄 In progress]│            │
│  │ Week 3: React Basics [⏳ Upcoming]              │            │
│  │ [View full path]                                │            │
│  └─────────────────────────────────────────────────┘            │
│                                                                    │
│  ┌─────────────────────┐  ┌─────────────────────┐                │
│  │ 📊 Your Stats       │  │ 🏅 Recent Badges     │                │
│  │ • Courses: 5        │  │ [🥇][🥈][🥉][⭐]      │                │
│  │ • Exams passed: 12  │  │                     │                │
│  │ • Avg score: 85%    │  │                     │                │
│  └─────────────────────┘  └─────────────────────┘                │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

### 11.3. Trang Thi Trực Tuyến

```
┌──────────────────────────────────────────────────────────────────┐
│ ⏱️  TIME LEFT: 45:30  │ Question 5/20 │ [Webcam: ON] 🔴          │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Question 5: What is the output of the following code?            │
│                                                                    │
│  ┌────────────────────────────────────────────────┐              │
│  │ function add(a, b) {                            │              │
│  │   return a + b;                                 │              │
│  │ }                                               │              │
│  │ console.log(add("2", "3"));                     │              │
│  └────────────────────────────────────────────────┘              │
│                                                                    │
│  ◯ A) 5                                                            │
│  ◉ B) 23                                                           │
│  ◯ C) "23"                                                         │
│  ◯ D) Error                                                        │
│                                                                    │
│  [⚠️ Attention: 45% - Tập trung lại!]                            │
│                                                                    │
│  [« Previous]            [Next »]                                  │
│                                                                    │
│  Question Navigator: [1][2][3][4][5✓][6][7][8][9][10]...         │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

### 11.4. Trang Learning Path (AI-Generated)

```
┌──────────────────────────────────────────────────────────────────┐
│ 🧭 Your Personalized Learning Path                  [Regenerate]   │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  📊 Path Confidence: 87% | ⏱️ Est. Duration: 12 weeks            │
│                                                                    │
│  🎯 Goal: Become a Full-Stack Developer                          │
│  📚 Current Level: Beginner | Skills: HTML, CSS (basic)         │
│                                                                    │
│  ┌────────────────────────────────────────────────────────┐      │
│  │ Phase 1: Foundation (4 weeks)                          │      │
│  │ ✅ HTML & CSS Basics (Week 1)                          │      │
│  │ ✅ JavaScript Fundamentals (Week 2)                    │      │
│  │ 🔄 Git & GitHub (Week 3) ← YOU ARE HERE               │      │
│  │ ⏳ Command Line (Week 4)                              │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                    │
│  ┌────────────────────────────────────────────────────────┐      │
│  │ Phase 2: Frontend (4 weeks)                            │      │
│  │ ⏳ React Basics                                        │      │
│  │ ⏳ React Advanced                                      │      │
│  │ ⏳ CSS Frameworks (Tailwind)                           │      │
│  │ ⏳ Testing                                             │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                    │
│  ┌────────────────────────────────────────────────────────┐      │
│  │ Phase 3: Backend (4 weeks)                             │      │
│  │ ⏳ Node.js Basics                                      │      │
│  │ ⏳ Express.js                                          │      │
│  │ ⏳ Databases                                           │      │
│  │ ⏳ REST APIs                                           │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                    │
│  [💬 Why this path?] [📊 View reasoning log] [⭐ Rate this path]   │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 12. PHÂN TÍCH RỦI RO

### 12.1. Risk Matrix

| ID | Rủi Ro | Xác Suất | Tác Động | Mức Độ | Chiến Lược Giảm Thiểu |
|----|--------|----------|----------|--------|------------------------|
| RK-001 | AI model accuracy thấp | Trung bình | Cao | 🔴 Cao | Training data lớn, fallback manual |
| RK-002 | Blockchain network congestion | Thấp | Trung bình | 🟡 Trung bình | Layer 2, retry logic |
| RK-003 | Proctoring false positives | Cao | Trung bình | 🟡 Trung bình | Manual review cho flagged cases |
| RK-004 | Data breach | Thấp | Rất cao | 🔴 Cao | Encryption, audit, pen-test |
| RK-005 | Service downtime | Trung bình | Cao | 🟡 Trung bình | Multi-AZ, circuit breaker |
| RK-006 | Vendor lock-in (LLM) | Trung bình | Trung bình | 🟡 Trung bình | Multi-provider (OpenAI + Gemini) |
| RK-007 | Performance bottleneck | Trung bình | Cao | 🟡 Trung bình | Load testing, auto-scaling |
| RK-008 | Scope creep | Cao | Trung bình | 🟡 Trung bình | Change control process |
| RK-009 | Resource constraints | Trung bình | Trung bình | 🟡 Trung bình | MVP first, prioritize P0 |
| RK-010 | Compliance issues | Thấp | Cao | 🟡 Trung bình | Legal review sớm |

### 12.2. Mitigation Plan

#### RK-001: AI Model Accuracy
- **Detection:** Monitor accuracy metrics daily
- **Response:** 
  - Retrain model mỗi 2 tuần
  - A/B test với baseline
  - Fallback sang manual grading khi accuracy < threshold

#### RK-004: Data Breach
- **Prevention:**
  - TLS 1.3 + AES-256 encryption
  - Penetration testing mỗi quý
  - Security audit code mỗi sprint
- **Detection:**
  - Intrusion Detection System (IDS)
  - Anomaly detection trên logs
- **Response:**
  - Incident response team sẵn sàng
  - Backup daily, restore trong 1 giờ
  - Notification trong 24 giờ theo GDPR

---

## 13. METRICS & KPIs

### 13.1. Business Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Monthly Active Users (MAU) | 50,000+ | Unique logins |
| Daily Active Users (DAU) | 10,000+ | Unique logins/day |
| Course Completion Rate | ≥ 60% | (Completions / Enrollments) |
| Exam Pass Rate | ≥ 70% | (Passed / Total attempts) |
| User Satisfaction (NPS) | ≥ 50 | Survey quarterly |
| User Retention (30 days) | ≥ 40% | DAU/MAU ratio |
| Revenue (if applicable) | $100K/month | Stripe dashboard |

### 13.2. Technical Metrics

| Metric | Target | Tool |
|--------|--------|------|
| API Response Time (P95) | < 1s | Prometheus |
| Uptime | ≥ 99.5% | Status page |
| Error Rate | < 0.1% | Sentry |
| Code Coverage | ≥ 80% | SonarQube |
| Mean Time to Recovery (MTTR) | < 1 hour | Incident logs |
| Deployment Frequency | Daily | CI/CD |
| Change Failure Rate | < 15% | CI/CD |

### 13.3. AI/ML Metrics

| Metric | Target | Context |
|--------|--------|---------|
| Chatbot Response Accuracy | ≥ 85% | Manual evaluation |
| Recommendation CTR | ≥ 30% | Click-through rate |
| Learning Path Relevance | ≥ 4.0/5 | User rating |
| Attention Detection Accuracy | ≥ 85% | CNN+LSTM model |
| Proctoring False Positive | < 10% | Manual review |
| Auto-grading Accuracy | ≥ 90% | Coding + MC |

### 13.4. Research Metrics (Cho 3 Papers)

| Paper | Metric | Target |
|-------|--------|--------|
| Paper 1: Agentic RAG | Path relevance score | ≥ 0.75 |
| Paper 1: Agentic RAG | User satisfaction | ≥ 4.0/5 |
| Paper 1: Agentic RAG | Latency P95 | < 10s |
| Paper 2: Vision Attention | Accuracy | CNN+LSTM ≥ 85% |
| Paper 2: Vision Attention | F1-score | ≥ 0.80 |
| Paper 3: Blockchain Records | Anchor latency | < 5s |
| Paper 3: Blockchain Records | Verify latency | < 2s |
| Paper 3: Blockchain Records | TPS | ≥ 100 |

---

## 14. ROADMAP TRIỂN KHAI

### 14.1. Timeline Tổng Quan

| Phase | Thời Gian | Công Việc Chính |
|-------|-----------|------------------|
| **Phase 0: Foundation** | Tuần 1-2 | Setup infra, skeleton services |
| **Phase 1: Core MVP** | Tuần 3-6 | Auth, Content, Exam, basic AI |
| **Phase 2: AI Features** | Tuần 7-10 | Learning Path, Attention |
| **Phase 3: Blockchain** | Tuần 11-12 | Academic Records, Tokens |
| **Phase 4: Hardening** | Tuần 13-14 | E2E testing, security audit |
| **Phase 5: Launch** | Tuần 15-16 | Beta launch, GA |

### 14.2. Chi Tiết Theo Sprint

#### Sprint 0-1 (Tuần 1-2): Foundation
- [ ] Setup Kubernetes cluster
- [ ] Setup CI/CD pipeline
- [ ] Tạo skeleton 10 services
- [ ] Setup monitoring stack
- [ ] Tạo API documentation
- [ ] Setup development environment

#### Sprint 2-4 (Tuần 3-6): Core MVP
- [ ] Auth-service: đăng ký, đăng nhập, JWT
- [ ] Content-service: CRUD khóa học
- [ ] Exam-suite: tạo đề thi, multiple choice
- [ ] Analytics-service: basic tracking
- [ ] Notification-service: email
- [ ] **Paper 1 (Agentic RAG)** - Module learning-path

#### Sprint 5-7 (Tuần 7-10): AI Features
- [ ] Exam-suite: realtime + proctoring
- [ ] **Paper 2 (Vision Attention)** - Module attention
- [ ] AI chatbot improvements
- [ ] Recommendation engine

#### Sprint 8-10 (Tuần 11-12): Blockchain
- [ ] **Paper 3 (Blockchain Records)** - Module records
- [ ] Token reward system
- [ ] Multi-sig wallet
- [ ] Copyright service

#### Sprint 11-12 (Tuần 13-14): Hardening
- [ ] E2E testing
- [ ] Performance testing
- [ ] Security audit
- [ ] Load testing
- [ ] Documentation

#### Sprint 13 (Tuần 15-16): Launch
- [ ] Beta launch (100 users)
- [ ] Feedback collection
- [ ] Bug fixes
- [ ] GA launch

### 14.3. Milestone

| ID | Milestone | Ngày | Deliverable |
|----|-----------|------|-------------|
| M1 | Foundation Complete | Tuần 2 | 10 service skeletons + infra |
| M2 | MVP Ready | Tuần 6 | Auth, Content, Exam, basic AI |
| M3 | Paper 1 Done | Tuần 6 | Agentic RAG ready |
| M4 | Paper 2 Done | Tuần 10 | Vision Attention ready |
| M5 | Paper 3 Done | Tuần 12 | Blockchain ready |
| M6 | Beta Launch | Tuần 14 | Production-ready |
| M7 | GA Launch | Tuần 16 | Public release |

---

## 15. ⚡ HƯỚNG DẪN TỐI ƯU HIỆU NĂNG

> **Mục đích:** Tài liệu này mô tả chi tiết cách tối ưu hiệu năng hệ thống để đạt được **100K+ concurrent users, <500ms P95 latency, 99.9% uptime**.

### 15.1. Phân Tích Bottleneck

#### 15.1.1. Bottleneck Theo Service

| Service | Bottleneck Chính | Mức Độ | Nguyên Nhân |
|---------|------------------|--------|-------------|
| `api-gateway` | CPU (routing) | 🔴 Cao | Single point, 100% traffic |
| `auth-service` | DB + JWT verify | 🔴 Cao | Mọi request đều qua |
| `content-service` | DB read + file upload | 🟡 TB | PostgreSQL + MongoDB cùng lúc |
| `exam-suite` | WebSocket connections | 🔴 Cao | Realtime + Proctoring |
| `ai-suite` | GPU inference | 🔴 **CRITICAL** | 100K fps × inference |
| `analytics-service` | Aggregation queries | 🟡 TB | Time-series queries nặng |
| `notification-service` | External APIs | 🟡 TB | Email/SMS rate limits |
| `blockchain-suite` | Ethers.js + IPFS | 🟡 TB | Network latency |

### 15.2. Caching Strategy (4 Tầng) ⭐ QUAN TRỌNG NHẤT

#### 15.2.1. Kiến Trúc Multi-Tier Caching

```
┌─────────────────────────────────────────────┐
│  L1: In-Process Cache (Caffeine/Node-Cache) │ → TTL 30s, Hit 60%, <1ms
└─────────────────────────────────────────────┘
              ↓ miss
┌─────────────────────────────────────────────┐
│  L2: Redis Cluster (3M + 3R)                │ → TTL 5-30min, Hit 30%, <5ms
└─────────────────────────────────────────────┘
              ↓ miss
┌─────────────────────────────────────────────┐
│  L3: CDN (CloudFlare/CloudFront)            │ → TTL 1 ngày, Hit 8%, <20ms
└─────────────────────────────────────────────┘
              ↓ miss
┌─────────────────────────────────────────────┐
│  L4: Database (with read replicas)          │ → Hit 2%, 20-100ms
└─────────────────────────────────────────────┘

Tổng cache hit rate mục tiêu: ≥ 98%
```

#### 15.2.2. Cache Strategy Theo Data Type

| Data Type | Cache Layer | TTL | Invalidation |
|-----------|-------------|-----|--------------|
| JWT public keys | L1 (in-mem) | 1h | Rotate + cache |
| User profile | L1 → L2 | 10m | On update |
| Course metadata | L1 → L2 → CDN | 1h | On update |
| Course content | L2 → CDN | 1 ngày | On update |
| Leaderboard | L2 (Redis Sorted Set) | Real-time | Update on event |
| Exam questions | L2 → CDN | Đến khi exam end | Time-based |
| Blockchain data | L2 | Forever | Immutable |

### 15.3. Database Optimization

#### 15.3.1. PostgreSQL Configuration

```sql
-- 1. Indexing Strategy (BẮT BUỘC)
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_courses_instructor_created 
  ON courses(instructor_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_enrollments_user_course 
  ON enrollments(user_id, course_id);

-- Partial index cho active records (Tiết kiệm index size)
CREATE INDEX idx_active_sessions 
  ON exam_sessions(user_id) 
  WHERE status = 'in_progress';

-- 2. Read Replicas (Primary + 3 Replicas)
-- Primary: writes only
-- Replicas: reads only (3 replicas cho read scaling)

-- 3. Connection Pooling (PgBouncer)
-- Transaction pooling mode
-- 10,000 client → 100 backend connections
```

#### 15.3.2. Connection Pool Settings

```yaml
# HikariCP (Java) - MỖI SERVICE
spring:
  datasource:
    hikari:
      maximum-pool-size: 50          # Per instance
      minimum-idle: 10
      connection-timeout: 5000
      leak-detection-threshold: 30000

# Knex (Node.js)
pool: 
  min: 10
  max: 50

# SQLAlchemy (Python)
pool_size: 20
max_overflow: 30
```

### 15.4. AI/ML Performance 🔥 BOTTLENECK LỚN NHẤT

#### 15.4.1. Model Serving Architecture

```
┌──────────────────────────────────────────────────────────┐
│              Node.js API Gateway (9100)                    │
│  Cache check (Redis) → Queue → ML Worker                  │
└──────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────┐
│         Kafka / Redis Queue (Batching 10-50)              │
└──────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────┐
│       Python ML Worker (GPU: A10G/A100)                   │
│  • TensorRT / ONNX Runtime (5-10x faster)                │
│  • Dynamic batching (10x throughput)                     │
│  • Model warm pool                                        │
└──────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────┐
│           Milvus Vector DB (GPU - CAGRA index)            │
│           10x faster than CPU                             │
└──────────────────────────────────────────────────────────┘
```

#### 15.4.2. AI Tech Stack Tối Ưu

| Mục Đích | Trước | Sau (Tối Ưu) | Cải Thiện |
|----------|-------|--------------|-----------|
| Embeddings | Python (sync) | Python + ONNX Runtime + GPU | **10x** |
| LLM calls | Direct API | vLLM hoặc TGI + batching | **5x** |
| Vision inference | PyTorch (CPU) | TensorRT + GPU + batching | **20x** |
| Vector search | Milvus (default) | Milvus GPU index (CAGRA) | **10x** |

#### 15.4.3. GPU Instances Đề Xuất

| Workload | GPU | Cost/hr | Throughput |
|----------|-----|---------|------------|
| Embeddings | T4 | $0.50 | 1000 req/s |
| Vision (CNN+LSTM) | A10G | $1.00 | 500 frames/s |
| LLM serving | A100 | $3.00 | 100 tokens/s/user |
| Vector search | T4 | $0.50 | 10K QPS |

#### 15.4.4. AI Cost Optimization Strategy

```yaml
# Chiến lược: Mixed deployment
tier_1_base_load:        # Self-hosted GPU (24/7)
  gpu: 1x A10G
  cost: $700/month
  capacity: 100 req/s

tier_2_peak_load:        # API fallback
  provider: OpenAI / Gemini
  cost: $0.002 per 1K tokens
  trigger: Khi self-hosted > 80% capacity

tier_3_batch_jobs:       # Spot instances (rẻ hơn 70%)
  use_case: Embedding pre-computation
  cost: $0.30/hour (vs $1.00 on-demand)

# Total AI cost: ~$2,000/month (vs $5,000 unoptimized)
# Saving: 60% 💰
```

### 15.5. WebSocket Optimization

#### 15.5.1. Scaling Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    NGINX (Sticky Sessions)                 │
│              ip_hash for session affinity                 │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ WS Server 1 │  │ WS Server 2 │  │ WS Server 3 │
│  (Node.js)  │  │  (Node.js)  │  │  (Node.js)  │
│ 33K conns   │  │ 33K conns   │  │ 33K conns   │
└─────────────┘  └─────────────┘  └─────────────┘
       ↓                ↓                ↓
┌─────────────────────────────────────────────────────────┐
│              Redis Pub/Sub (Cross-instance)              │
│  channel: exam:{examId}, attention:{userId}              │
└─────────────────────────────────────────────────────────┘
```

#### 15.5.2. Node.js WebSocket Best Practices

```typescript
// 1. Dùng uWebSockets.js (10x faster than ws)
// npm install uWebSockets.js

// 2. WebSocket Compression (giảm 70% bandwidth)
const wss = new WebSocket.Server({
  perMessageDeflate: {
    zlibDeflateOptions: { level: 6 },
    threshold: 1024  // Only compress >1KB
  }
});

// 3. Redis Pub/Sub cho cross-instance
const redis = new Redis({ host: 'redis-cluster' });

// 4. Auto-scale với KEDA (theo connection count)
```

### 15.6. CDN & Static Assets

```yaml
cdn:
  provider: CloudFlare / AWS CloudFront
  
  cache_rules:
    - path: /static/*        → TTL: 365 days (immutable)
    - path: /media/videos/*  → TTL: 30 days (HLS streaming)
    - path: /api/courses/*   → TTL: 5 minutes
    - path: /uploads/*       → TTL: 90 days
  
  optimizations:
    - minify: html, css, js
    - image: webp, avif
    - http3: true
    - early_hints: true  # 103 Early Hints
    - brotli: true       # Better than gzip
```

### 15.7. Top 10 Quick Wins (Triển khai 1-2 tuần)

| # | Quick Win | Cải Thiện | Effort |
|---|-----------|-----------|--------|
| 1 | **NGINX gzip + brotli** | -70% bandwidth | 1 giờ |
| 2 | **Cache JWT public keys** | -80% auth latency | 2 giờ |
| 3 | **PgBouncer connection pooling** | +5x DB throughput | 1 ngày |
| 4 | **Redis cache course metadata** | -80% DB load | 3 ngày |
| 5 | **CDN cho static assets** | -60% origin load | 1 ngày |
| 6 | **WebSocket compression** | -70% WS bandwidth | 2 giờ |
| 7 | **HTTP/2 + HTTP/3** | -30% latency | 2 giờ |
| 8 | **DB read replicas** | +3x read throughput | 1 tuần |
| 9 | **Pre-compute leaderboard** | 200ms → 5ms | 2 ngày |
| 10 | **Batch blockchain transactions** | -80% gas cost | 1 ngày |

### 15.8. Performance Testing Plan

```bash
# Tools: k6 (JavaScript) hoặc Gatling (Scala)

# Test scenarios BẮT BUỘC trước khi deploy:
1. Baseline: 10K concurrent users trong 30s
2. Stress: 50K concurrent users trong 60s
3. Spike: 0 → 100K users trong 10s
4. Soak: 20K users trong 24h (memory leak detection)

# Metrics PHẢI theo dõi:
- http_req_duration (p95 < 500ms)
- http_req_failed (rate < 0.1%)
- iteration_duration
- vus (concurrent users)
- memory_usage (không leak)
```

### 15.9. Observability & Monitoring

```yaml
# Prometheus + Grafana (BẮT BUỘC)
metrics:
  application:
    - http_requests_total{service, status}
    - http_request_duration_seconds{service, endpoint}
    - jvm_memory_used_bytes{service}
  
  database:
    - pg_connection_pool_usage
    - pg_query_duration_seconds
    - redis_memory_used_bytes
  
  business:
    - exam_submissions_total
    - ai_inference_duration_seconds{model}
    - blockchain_anchor_duration_seconds

# Distributed Tracing với Jaeger
# Sampling rate: 10% (100% cho critical paths)
# Critical paths: login, exam_submission, blockchain_anchor

# APM: Datadog hoặc Elastic APM
# Alerts:
- p95_latency > 500ms trong 5 phút
- error_rate > 1% trong 5 phút
- cpu_usage > 80% trong 10 phút
- memory_usage > 90%
```

### 15.10. Tech Stack Tối Ưu (Tổng Hợp)

| Layer | Recommendation | Lý Do |
|-------|----------------|-------|
| **Edge** | CloudFlare | CDN + DDoS + WAF + HTTP/3 |
| **Load Balancer** | NGINX + Envoy | L7 routing, 100K+ RPS |
| **API Gateway** | Spring Cloud Gateway WebFlux | Reactive, 50K RPS |
| **Service Mesh** | Istio | Circuit breaker, mTLS, tracing |
| **Auth Cache** | Redis Cluster | JWT + permissions cache |
| **Database** | PostgreSQL + 3 replicas + PgBouncer | Read scaling, pooling |
| **Cache** | Redis Cluster + Caffeine (L1) | Multi-tier, sub-ms |
| **Vector DB** | Milvus GPU (CAGRA) | 10x faster search |
| **Message Queue** | Kafka + Redis Streams | Event streaming |
| **WebSocket** | uWebSockets.js + Redis Pub/Sub | 100K+ connections |
| **AI Serving** | FastAPI + TensorRT + vLLM + GPU | 20x faster inference |
| **Storage** | MinIO (hot) + S3 (cold) | Tiered storage |
| **Blockchain** | Polygon + The Graph | Cheaper than Ethereum |
| **Monitoring** | Prometheus + Grafana + Jaeger | Full observability |
| **Orchestration** | K8s + Helm + ArgoCD + KEDA | GitOps + auto-scaling |

### 15.11. Kết Quả Mong Đợi Sau Tối Ưu

| Metric | Trước | Sau | Cải Thiện |
|--------|-------|-----|-----------|
| **API Latency P95** | 800ms | **150ms** | 5x ⚡ |
| **Throughput** | 5K RPS | **50K RPS** | 10x 🚀 |
| **Concurrent Users** | 10K | **100K+** | 10x 👥 |
| **AI Inference** | 1000ms | **50ms** | 20x 🤖 |
| **WebSocket Connections** | 5K | **100K+** | 20x 🔌 |
| **DB Query P95** | 200ms | **50ms** | 4x 📊 |
| **Cost/month** | $9K | **$4.5K** | -50% 💰 |
| **Uptime** | 99.5% | **99.9%** | Higher SLA 🎯 |

### 15.12. Implementation Priority

| Ưu Tiên | Hành Động | Timeline | Owner |
|---------|-----------|----------|-------|
| 🔴 **P0** | Multi-tier Caching | Tuần 1-2 | Dev Team |
| 🔴 **P0** | DB Read Replicas + PgBouncer | Tuần 2-3 | DevOps |
| 🟡 **P1** | WebFlux Migration (Java) | Tuần 3-6 | Java Dev |
| 🟡 **P1** | GPU instances cho AI | Tuần 4-8 | AI/ML Team |
| 🟡 **P1** | CDN setup | Tuần 2-3 | DevOps |
| 🟢 **P2** | Sharding Database | Tuần 8-12 | DBA + Dev |
| 🟢 **P2** | Service Mesh (Istio) | Tuần 12-14 | DevOps |
| 🟢 **P2** | vLLM self-hosted LLM | Tuần 10-12 | AI/ML Team |

---

## 16. PHỤ LỤC

### Phụ Lục A: Glossary (Thuật Ngữ)

| Thuật Ngữ | Định Nghĩa |
|-----------|-------------|
| **JWT** | JSON Web Token - chuẩn xác thực |
| **OAuth2** | Giao thức ủy quyền |
| **RAG** | Retrieval-Augmented Generation |
| **Agentic RAG** | RAG với multi-agent (Planner, Retriever, etc.) |
| **CNN** | Convolutional Neural Network |
| **LSTM** | Long Short-Term Memory |
| **Milvus** | Vector database cho similarity search |
| **CAGRA** | GPU-accelerated graph-based ANN index (10x faster than CPU) |
| **IPFS** | InterPlanetary File System - distributed storage |
| **Ethers.js** | Library tương tác Ethereum blockchain |
| **Smart Contract** | Chương trình chạy trên blockchain |
| **Microservice** | Kiến trúc chia thành nhiều service nhỏ |
| **Polyglot** | Đa ngôn ngữ lập trình trong cùng hệ thống |
| **WebSocket** | Giao thức real-time 2 chiều |
| **Kafka** | Message queue phân tán |
| **CDN** | Content Delivery Network |
| **HPA** | Horizontal Pod Autoscaler (K8s auto-scaling) |
| **KEDA** | Kubernetes Event-Driven Autoscaling |
| **PgBouncer** | PostgreSQL connection pooler |
| **HikariCP** | High-performance JDBC connection pool |
| **WebFlux** | Reactive non-blocking web framework (Spring) |
| **TensorRT** | NVIDIA high-performance deep learning inference optimizer |
| **vLLM** | High-throughput LLM serving engine |
| **TGI** | Text Generation Inference (HuggingFace) |
| **CAGRA** | GPU-accelerated vector index (Milvus) |
| **Brotli** | Compression algorithm (better than gzip) |
| **HTTP/3** | HTTP over QUIC (faster than HTTP/2) |
| **OpenTelemetry** | Observability framework (traces, metrics, logs) |
| **mTLS** | Mutual TLS (service-to-service authentication) |
| **Service Mesh** | Infrastructure layer for service-to-service communication (Istio, Linkerd) |
| **GiGaPrometheus** | Time-series database cho metrics |
| **Grafana** | Visualization platform cho metrics |

### Phụ Lục B: References

1. IEEE Standard for System Requirements (IEEE 830)
2. BABOK v3 - Business Analysis Body of Knowledge
3. Microservices Patterns (Chris Richardson)
4. Designing Data-Intensive Applications (Martin Kleppmann)
5. NIST Cybersecurity Framework
6. GDPR Official Text
7. PDPA Vietnam

**Performance & Optimization:**
8. WebFlux Reference - https://docs.spring.io/spring-framework/reference/web/webflux.html
9. HikariCP Configuration - https://github.com/brettwooldridge/HikariCP
10. Redis Best Practices - https://redis.io/docs/manual/
11. PostgreSQL Performance Tuning - https://www.postgresql.org/docs/current/performance-tips.html
12. Kubernetes HPA - https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/
13. KEDA Documentation - https://keda.sh/docs/
14. NVIDIA TensorRT - https://developer.nvidia.com/tensorrt
15. vLLM Documentation - https://docs.vllm.ai/
16. Milvus CAGRA - https://milvus.io/docs/index.md
17. Istio Service Mesh - https://istio.io/latest/docs/
18. OpenTelemetry - https://opentelemetry.io/docs/
19. CloudFlare Performance - https://developers.cloudflare.com/
20. k6 Load Testing - https://k6.io/docs/

### Phụ Lục C: Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 25/07/2026 | BA Team | Initial document |
| **1.1** | **25/07/2026** | **BA Team + Performance Team** | **Bổ sung Chương 15: Hướng Dẫn Tối Ưu Hiệu Năng. Cập nhật: Mục lục (thêm mục 15), Phần 7.1 (metrics chi tiết + cải thiện mục tiêu), Phần 8 (Tech Stack Matrix + Service Inventory với instances), Thêm 15.1-15.12 về Performance Optimization** |

### Phụ Lục D: Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | _________ | _________ | _________ |
| Tech Lead | _________ | _________ | _________ |
| BA Manager | _________ | _________ | _________ |
| Stakeholder | _________ | _________ | _________ |

---

**END OF DOCUMENT**