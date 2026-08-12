# 📋 PROJECT MANAGEMENT PLAN (PMP)
# Hệ Thống Thi Trực Tuyến Thông Minh (Intelligent Online Examination System)

> **Phiên bản:** 1.0
> **Ngày tạo:** 11/08/2026
> **Người tạo:** Project Management Office (PMO)
> **Căn cứ:** BA Document v1.1 (Approved for Development)
> **Trạng thái:** ✅ Approved for Execution

---

## 📑 MỤC LỤC

1. [Tổng Quan Dự Án](#1-tổng-quan-dự-án)
2. [Mục Tiêu & Tiêu Chí Thành Công](#2-mục-tiêu--tiêu-chí-thành-công)
3. [Phạm Vi & Ràng Buộc](#3-phạm-vi--ràng-buộc)
4. [Tổ Chức & Nhân Sự](#4-tổ-chức--nhân-sự)
5. [Lịch Trình & Milestone](#5-lịch-trình--milestone)
6. [Quản Lý Phương Pháp & Quy Trình](#6-quản-lý-phương-pháp--quy-trình)
7. [Quản Lý Chất Lượng](#7-quản-lý-chất-lượng)
8. [Quản Lý Rủi Ro](#8-quản-lý-rủi-ro)
9. [Quản Lý Giao Tiếp](#9-quản-lý-giao-tiếp)
10. [Quản Lý Thay Đổi](#10-quản-lý-thay-đổi)
11. [Quản Lý Chi Phí & Nguồn Lực](#11-quản-lý-chi-phí--nguồn-lực)
12. [Quản Lý Mua Sắm & Vendor](#12-quản-lý-mua-sắm--vendor)
13. [Kế Hoạch Triển Khai Kỹ Thuật](#13-kế-hoạch-triển-khai-kỹ-thuật)
14. [Kế Hoạch Bảo Trì & Vận Hành](#14-kế-hoạch-bảo-trì--vận-hành)
15. [Metrics & KPIs Quản Lý](#15-metrics--kpis-quản-lý)
16. [Phụ Lục](#16-phụ-lục)

---

## 1. TỔNG QUAN DỰ ÁN

### 1.1. Thông Tin Cơ Bản

| Thuộc Tính | Chi Tiết |
|------------|----------|
| **Tên dự án** | Hệ Thống Thi Trực Tuyến Thông Minh (Intelligent Online Examination System) |
| **Mã dự án** | IOES-2026 |
| **Project Sponsor** | Ban Giám Đốc |
| **Project Manager** | _________ |
| **Product Owner** | _________ |
| **Tech Lead** | _________ |
| **Ngày bắt đầu** | 01/09/2026 |
| **Ngày kết thúc dự kiến** | 31/12/2026 (16 tuần) |
| **Ngân sách ước tính** | $250,000 (Cloud + Resources + Vendor) |
| **Phương pháp** | Agile Scrum + DevOps |

### 1.2. Mô Tả Dự Án

Hệ thống thi trực tuyến tích hợp AI, hỗ trợ cá nhân hóa lộ trình học tập, giám sát thi bằng computer vision, và xác thực học thuật bằng blockchain. Hệ thống phục vụ cho các tổ chức giáo dục, doanh nghiệp đào tạo, và cá nhân học viên.

### 1.3. Lý Do Thực Hiện (Business Case)

- **Cơ hội thị trường:** Thị trường EdTech Đông Nam Á tăng trưởng 20%/năm
- **Bài toán cần giải:** Gian lận thi trực tuyến, thiếu cá nhân hóa lộ trình học, bằng cấp khó xác thực
- **Lợi thế cạnh tranh:** Tích hợp AI + Blockchain + Computer Vision
- **ROI kỳ vọng:** 18 tháng, với 50K MAU sau 6 tháng GA

### 1.4. Tầm Nhìn & Sứ Mệnh

- **Tầm nhìn:** Trở thành nền tảng thi trực tuyến hàng đầu Đông Nam Á
- **Sứ mệnh:** Trải nghiệm thi trực tuyến công bằng, minh bạch, thông minh

---

## 2. MỤC TIÊU & TIÊU CHÍ THÀNH CÔNG

### 2.1. SMART Objectives

| ID | Mục Tiêu | Specific | Measurable | Achievable | Relevant | Time-bound |
|----|----------|----------|------------|------------|----------|------------|
| OBJ-1 | Ra mắt MVP | Auth + Content + Exam + Basic AI | 4 modules P0 hoàn thành | Có 10 services sẵn sàng | Đáp ứng P0 | Tuần 6 |
| OBJ-2 | Hoàn thiện AI | Learning Path + Vision Attention | 2 paper modules | AI team có GPU | Cá nhân hóa | Tuần 10 |
| OBJ-3 | Tích hợp Blockchain | Academic Records + Tokens | 100% cert verify | Polygon + IPFS | Minh bạch | Tuần 12 |
| OBJ-4 | Đạt SLA | Uptime ≥ 99.5% | Monitoring real-time | Multi-AZ + circuit breaker | Đảm bảo chất lượng | Tuần 14 |
| OBJ-5 | Beta Launch | 100 users test | Feedback ≥ 4.0/5 | 100 user mời | Validate PMF | Tuần 14 |
| OBJ-6 | GA Launch | Public release | 1000+ users đăng ký | Marketing plan | Tăng trưởng | Tuần 16 |

### 2.2. Tiêu Chí Thành Công (Success Criteria)

| Tiêu Chí | Mô Tả | Đo Lường |
|----------|--------|----------|
| **Chất lượng kỹ thuật** | Code coverage ≥ 80%, API P95 < 500ms | SonarQube, Prometheus |
| **Chất lượng sản phẩm** | User satisfaction ≥ 4.5/5, NPS ≥ 50 | Survey, Intercom |
| **Hiệu năng** | 100K concurrent users, 50K RPS | k6 Load Test |
| **Bảo mật** | 0 critical vulnerability, pass pen-test | OWASP ZAP, Security Audit |
| **Tuân thủ** | GDPR, PDPA compliance | Legal review |
| **Tài liệu** | OpenAPI 100%, Architecture docs | Confluence |
| **Nghiên cứu** | 3 papers submit/rejected | Conference submission |

### 2.3. Business Objectives Mapping

| BO | Mục Tiêu Kinh Doanh | Đóng Góp Dự Án |
|----|---------------------|----------------|
| BO-1 | Tăng trải nghiệm người học | Personalized Learning Path |
| BO-2 | Giảm gian lận 80% | AI Proctoring + CNN+LSTM |
| BO-3 | Bằng cấp verify 100% | Blockchain Records |
| BO-4 | Giảm chi phí 60% | Tự động hóa toàn bộ |
| BO-5 | 100K+ users | Microservices + Auto-scaling |

---

## 3. PHẠM VI & RÀNG BUỘC

### 3.1. Phạm Vi Dự Án (Scope)

#### 3.1.1. Trong Phạm Vi (In-Scope)

**8 Modules chính:**
1. **Auth & User Management** - JWT, OAuth2 (Google/GitHub/Microsoft)
2. **Content Management** - CRUD khóa học, upload, reviews
3. **Exam & Assessment** - Multiple choice, essay, coding, realtime
4. **Proctoring** - Webcam, CNN+LSTM, behavior analysis
5. **AI & Learning Path** - Chatbot, recommendation, Agentic RAG, Vision Attention
6. **Blockchain** - Academic records, tokens, IPFS
7. **Analytics & Leaderboard** - Tracking, dashboards, ranking
8. **Notification** - Email, push, SMS

**10 Microservices:**
- api-gateway, discovery-service, config-server
- auth-service, content-service, analytics-service, notification-service
- exam-suite, ai-suite, blockchain-suite

#### 3.1.2. Ngoài Phạm Vi (Out-of-Scope)

| # | Tính Năng | Lý Do | Phase |
|---|-----------|-------|-------|
| OS-1 | Video conference tích hợp | Zoom/Google Meet API | Phase 2 |
| OS-2 | Payment gateway | Stripe/VNPay | Phase 2 |
| OS-3 | Mobile app native | Chỉ web responsive | Phase 2 |
| OS-4 | LMS đầy đủ | Core features only | Phase 2 |
| OS-5 | HRM, timesheet | Không liên quan | — |

### 3.2. Giả Định (Assumptions)

| ID | Giả Định | Verify Bởi |
|----|----------|------------|
| AS-1 | Internet bandwidth ≥ 5Mbps | User survey |
| AS-2 | User có webcam | Frontend detection |
| AS-3 | Browser support WebRTC, WebSocket | E2E test |
| AS-4 | Dev team có kinh nghiệm microservices | Hiring process |
| AS-5 | Cloud budget được duyệt | Sponsor approval |
| AS-6 | Pháp lý blockchain thông qua | Legal review |

### 3.3. Ràng Buộc (Constraints)

| ID | Ràng Buộc | Impact |
|----|-----------|--------|
| CO-1 | GDPR, PDPA compliance | Data handling design |
| CO-2 | Luật giáo dục VN | Feature scope |
| CO-3 | SLA ≥ 99.5% | Architecture |
| CO-4 | VI + EN support | i18n design |
| CO-5 | Budget giới hạn | Tech selection |

### 3.4. Dependencies

| Dep ID | Phụ Thuộc | Critical Path | Mitigation |
|--------|-----------|---------------|------------|
| DEP-01 | Cloud account provisioning | Week 1 | Pre-register AWS/GCP |
| DEP-02 | GPU instance approval | Week 4 | Cost analysis pre-approved |
| DEP-03 | Blockchain node (Polygon) | Week 11 | Use public RPC |
| DEP-04 | Third-party AI API keys | Week 3 | OpenAI + Gemini fallback |
| DEP-05 | CDN setup | Week 2 | CloudFlare pre-account |
| DEP-06 | Legal review blockchain | Week 10 | Engage lawyer Week 8 |

---

## 4. TỔ CHỨC & NHÂN SỰ

### 4.1. Project Organization Structure

```
                    ┌─────────────────────────┐
                    │   Project Sponsor       │
                    │   (Ban Giám Đốc)        │
                    └──────────┬──────────────┘
                               │
                    ┌──────────▼──────────────┐
                    │   Project Manager       │
                    │   (PMO)                 │
                    └──────────┬──────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
┌───────▼────────┐   ┌────────▼────────┐   ┌────────▼────────┐
│ Product Owner  │   │   Tech Lead     │   │   Scrum Master  │
└───────┬────────┘   └────────┬────────┘   └────────┬────────┘
        │                     │                     │
   ┌────┴─────┐         ┌─────┴─────┐          ┌────┴─────┐
   │ BA Team  │         │ Dev Teams │          │ QA Team  │
   └──────────┘         └─────┬─────┘          └──────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
        ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
        │ Frontend  │   │ Backend   │   │ DevOps    │
        │ Team (3)  │   │ Team (6)  │   │ Team (2)  │
        └───────────┘   └───────────┘   └───────────┘
                              │
                    ┌─────────┼─────────┐
                    │         │         │
              ┌─────▼───┐ ┌───▼───┐ ┌───▼────┐
              │ Java BE │ │Node BE│ │AI/ML   │
              │ Squad(3)│ │Squad 2│ │Squad 2 │
              └─────────┘ └───────┘ └────────┘
```

### 4.2. Roles & Responsibilities (RACI)

| Hoạt Động | PM | PO | TL | Dev | QA | DevOps | BA | Stakeholder |
|-----------|----|----|----|----|----|--------|----|-------------|
| **Lập kế hoạch** | R/A | C | C | I | I | I | C | I |
| **Thu thập yêu cầu** | I | A | C | I | I | I | R | C |
| **Phân tích nghiệp vụ** | I | A | I | I | I | I | R | C |
| **User Stories** | I | A | C | C | C | I | R | C |
| **Architecture design** | C | C | R/A | C | I | C | I | I |
| **Code development** | I | I | A | R | C | C | I | I |
| **Unit test** | I | I | A | R | C | I | I | I |
| **Integration test** | I | I | A | C | R | C | I | I |
| **UAT** | C | A | I | I | R | I | C | R |
| **Deploy production** | I | C | A | C | C | R | I | I |
| **Monitoring** | C | I | A | I | I | R | I | I |
| **Change request** | R/A | C | C | I | I | I | C | I |

*R=Responsible, A=Accountable, C=Consulted, I=Informed*

### 4.3. Team Composition

| Team | Số Lượng | Vai Trò | Kỹ Năng Yêu Cầu |
|------|----------|---------|------------------|
| **PMO** | 1 | Project Manager | PMP/PMI-ACP, Agile, 5+ năm |
| **Product** | 2 | PO + BA | Business analysis, EdTech |
| **Tech Lead** | 1 | Technical Lead | Microservices, Cloud, 7+ năm |
| **Frontend** | 3 | FE Devs | React 18, TypeScript, Vite, Tailwind |
| **Backend Java** | 3 | BE Devs | Spring Boot 3, WebFlux, Kafka |
| **Backend Node.js** | 2 | BE Devs | NestJS 10, WebSocket, Redis |
| **Backend Python/AI** | 2 | AI/ML Eng | PyTorch, TensorRT, vLLM |
| **QA** | 2 | QA Eng | k6, Playwright, JMeter |
| **DevOps** | 2 | DevOps | K8s, Terraform, ArgoCD |
| **UI/UX Designer** | 1 | Designer | Figma, WCAG 2.1 |
| **Tổng** | **17** | | |

### 4.4. Skill Matrix & Training Plan

| Skill | Current Level | Target Level | Training |
|-------|---------------|--------------|----------|
| Microservices | 70% team | 100% P0 | Internal workshop tuần 1 |
| Kubernetes | 50% DevOps | 100% DevOps | CKA certification |
| AI/ML Serving | 40% team | 100% AI team | TensorRT workshop |
| WebFlux Reactive | 30% Java | 80% Java | Spring WebFlux course |
| Blockchain (Solidity) | 20% team | 100% BE blockchain | Polygon docs |

---

## 5. LỊCH TRÌNH & MILESTONE

### 5.1. Timeline Tổng Quan (16 tuần)

```
Week:  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16
       ├──┴──┤           │     │     │     │     │     │
       │ P0  │           │     │     │     │     │     │
       │ Fdn │           │     │     │     │     │     │
       │     ├──┴──┴──┴──┤     │     │     │     │     │
       │     │   P1      │     │     │     │     │     │
       │     │   Core MVP│     │     │     │     │     │
       │     │           ├──┴──┴──┴──┤     │     │     │
       │     │           │   P2      │     │     │     │
       │     │           │   AI Feat │     │     │     │
       │     │           │           ├──┴──┴──┤     │     │
       │     │           │           │   P3   │     │     │
       │     │           │           │   BC   │     │     │
       │     │           │           │           ├──┴──┤
       │     │           │           │           │ P4  │
       │     │           │           │           │ Hrdn│
       │     │           │           │           │     ├──┴──┤
       │     │           │           │           │     │ P5 │
       │     │           │           │           │     │ Lch │
       ▼     ▼           ▼           ▼           ▼     ▼    ▼
      M1    M2          M3          M4          M5    M6   M7
```

### 5.2. Sprint Schedule (2-week sprints)

| Sprint | Tuần | Tên | Mục Tiêu Chính | Demo |
|--------|------|-----|----------------|------|
| **S0** | 1-2 | Foundation | Infra, CI/CD, 10 skeleton services | M1 |
| **S1** | 3-4 | Core MVP-A | Auth, Content, Notification | — |
| **S2** | 5-6 | Core MVP-B | Exam (MC), Analytics, Learning Path | M2, M3 |
| **S3** | 7-8 | AI Features-A | Real-time Exam, Proctoring, Vision Attention | — |
| **S4** | 9-10 | AI Features-B | Chatbot v2, Recommendation, Question Gen | M4 |
| **S5** | 11-12 | Blockchain | Academic Records, Tokens, Multi-sig | M5 |
| **S6** | 13-14 | Hardening | E2E test, Performance, Security, Load test | M6 |
| **S7** | 15-16 | Launch | Beta → GA, Bug fixes, Monitor | M7 |

### 5.3. Chi Tiết Sprint Backlog

#### Sprint 0 (Week 1-2): Foundation
- [ ] Kubernetes cluster setup (EKS/GKE)
- [ ] CI/CD pipeline (GitHub Actions + ArgoCD)
- [ ] 10 service skeletons (Java/Node/Python)
- [ ] API Gateway + Discovery + Config Server
- [ ] Monitoring stack (Prometheus + Grafana + Jaeger)
- [ ] API documentation template (OpenAPI)
- [ ] Dev environment setup (Docker Compose)
- [ ] ADRs (Architecture Decision Records)
- [ ] Code style guide + ESLint/Checkstyle config

#### Sprint 1 (Week 3-4): Core MVP - Part A
- [ ] auth-service: register, login, JWT
- [ ] auth-service: OAuth2 (Google, GitHub)
- [ ] auth-service: password reset, email verify
- [ ] content-service: CRUD course/lesson
- [ ] content-service: file upload (S3/MinIO)
- [ ] content-service: categories, tags
- [ ] notification-service: email (SendGrid/SES)
- [ ] notification-service: template engine

#### Sprint 2 (Week 5-6): Core MVP - Part B
- [ ] exam-suite: tạo đề thi (multiple choice, essay)
- [ ] exam-suite: random questions, time limit
- [ ] exam-suite: auto-grading (MC + coding)
- [ ] exam-suite: score history
- [ ] analytics-service: basic tracking
- [ ] analytics-service: course statistics
- [ ] **Paper 1: Agentic RAG** - Learning Path MVP
- [ ] **MILESTONE 2: MVP Ready** ✅
- [ ] **MILESTONE 3: Paper 1 Done** ✅

#### Sprint 3 (Week 7-8): AI Features - Part A
- [ ] exam-suite: WebSocket realtime
- [ ] exam-suite: code editor (Monaco)
- [ ] exam-suite: auto-save mỗi 30s
- [ ] exam-suite: Kafka event GradingCompleted
- [ ] proctoring: webcam capture
- [ ] proctoring: face detection (MediaPipe)
- [ ] **Paper 2: Vision Attention** - CNN+LSTM
- [ ] ai-suite: chatbot v1 (RAG)

#### Sprint 4 (Week 9-10): AI Features - Part B
- [ ] proctoring: behavior analysis
- [ ] proctoring: real-time alerts
- [ ] proctoring: reports cho instructor
- [ ] ai-suite: chatbot v2 (LLM integration)
- [ ] ai-suite: recommendation engine
- [ ] ai-suite: auto-grade essays
- [ ] ai-suite: question generation
- [ ] **MILESTONE 4: Paper 2 Done** ✅

#### Sprint 5 (Week 11-12): Blockchain
- [ ] **Paper 3: Blockchain Records** - Academic records
- [ ] blockchain-suite: smart contract deploy
- [ ] blockchain-suite: token reward system
- [ ] blockchain-suite: multi-sig wallet
- [ ] blockchain-suite: IP registration
- [ ] blockchain-suite: SHA-256 + IPFS integration
- [ ] frontend: certificate page + QR
- [ ] frontend: public verify page
- [ ] **MILESTONE 5: Paper 3 Done** ✅

#### Sprint 6 (Week 13-14): Hardening
- [ ] E2E testing (Playwright)
- [ ] Performance testing (k6: 10K/50K/100K users)
- [ ] Security audit (OWASP ZAP, pen-test)
- [ ] Load testing AI inference
- [ ] Documentation review (API, Architecture, Runbook)
- [ ] Disaster Recovery test
- [ ] **MILESTONE 6: Beta Launch** ✅

#### Sprint 7 (Week 15-16): Launch
- [ ] Beta launch (100 users)
- [ ] Feedback collection & analysis
- [ ] Bug bash (2 days)
- [ ] Critical bug fixes
- [ ] GA launch
- [ ] Marketing website update
- [ ] On-call rotation setup
- [ ] **MILESTONE 7: GA Launch** 🎉

### 5.4. Milestone Summary

| ID | Milestone | Ngày | Deliverable | Success Criteria |
|----|-----------|------|-------------|------------------|
| **M1** | Foundation Complete | Week 2 | 10 service skeletons + infra | All services deployable |
| **M2** | MVP Ready | Week 6 | Auth, Content, Exam, basic AI | User can register, enroll, take MC exam |
| **M3** | Paper 1 Done | Week 6 | Agentic RAG learning path | Demo to research team |
| **M4** | Paper 2 Done | Week 10 | Vision Attention CNN+LSTM | Accuracy ≥ 85% |
| **M5** | Paper 3 Done | Week 12 | Blockchain Records | Cert verifiable on-chain |
| **M6** | Beta Launch | Week 14 | Production-ready | 100 users, NPS ≥ 50 |
| **M7** | GA Launch | Week 16 | Public release | 1000+ signups |

---

## 6. QUẢN LÝ PHƯƠNG PHÁP & QUY TRÌNH

### 6.1. Phương Pháp Phát Triển

**Agile Scrum + DevOps (Hybrid):**
- Sprint 2 tuần
- Daily Standup (15 phút, 9:30 AM)
- Sprint Planning (đầu sprint, 4 giờ)
- Sprint Review/Demo (cuối sprint, 2 giờ)
- Retrospective (cuối sprint, 1 giờ)
- Backlog Grooming (giữa sprint, 2 giờ)

**Ceremonies cố định:**
- Sprint Review có Stakeholder mời
- Retrospective đầy đủ team
- PO + Tech Lead sync hàng ngày (15 phút)

### 6.2. Quy Trình Phát Triển (SDLC)

```
1. Requirement (BA)
   ↓
2. User Story (PO + BA)
   ↓
3. Design (Tech Lead + Dev)
   ↓
4. Implementation (Dev pair programming)
   ↓
5. Code Review (2 approvers)
   ↓
6. Unit Test (coverage ≥ 80%)
   ↓
7. Integration Test (CI)
   ↓
8. Deploy to Staging (ArgoCD)
   ↓
9. QA Test (Playwright + Manual)
   ↓
10. UAT (Stakeholder)
   ↓
11. Deploy to Production (ArgoCD + manual approval)
   ↓
12. Monitor (Prometheus + Grafana)
```

### 6.3. Git Workflow (GitFlow)

```
main (production)
  │
  ├── develop (integration)
  │     │
  │     ├── feature/* (features)
  │     ├── bugfix/* (bugs)
  │     └── hotfix/* (urgent)
  │
  └── release/* (release prep)
```

**Quy tắc:**
- Branch từ `develop`
- PR phải có 2 review approvals
- Squash merge vào `develop`
- Squash merge vào `main` (release)
- Tag version: `v1.0.0`, `v1.1.0`

### 6.4. Code Review Checklist

- [ ] Code style (ESLint/Checkstyle pass)
- [ ] Unit tests pass + coverage ≥ 80%
- [ ] No security vulnerabilities (Snyk/Trivy)
- [ ] OpenAPI updated
- [ ] ADRs updated nếu có architectural decision
- [ ] Logging + metrics added
- [ ] Error handling đầy đủ
- [ ] Documentation (JavaDoc/JSDoc)
- [ ] Performance impact considered

### 6.5. Definition of Done (DoD)

**User Story DoD:**
- [ ] Code merged vào develop
- [ ] Unit test coverage ≥ 80%
- [ ] Integration tests pass
- [ ] Code reviewed bởi 2 người
- [ ] API documentation updated
- [ ] Deployed to staging
- [ ] QA verified
- [ ] PO accepted
- [ ] Acceptance criteria met

**Sprint DoD:**
- [ ] All committed stories done
- [ ] Demo prepared
- [ ] Release notes written
- [ ] Sprint retrospective completed

---

## 7. QUẢN LÝ CHẤT LƯỢNG

### 7.1. Quality Strategy

| Layer | Activity | Tool | Owner |
|-------|----------|------|-------|
| **Code** | Static analysis | SonarQube, ESLint | Tech Lead |
| **Code** | Unit test | JUnit, Jest, pytest | Dev |
| **Code** | Coverage | JaCoCo, Istanbul, coverage.py | Dev |
| **Build** | CI pipeline | GitHub Actions | DevOps |
| **Container** | Vulnerability scan | Trivy, Snyk | DevOps |
| **Integration** | API test | Postman, REST Assured | QA |
| **E2E** | Browser test | Playwright | QA |
| **Performance** | Load test | k6, JMeter | QA + DevOps |
| **Security** | Pen-test | OWASP ZAP | Security team |
| **UX** | Usability test | User testing session | Designer + PO |

### 7.2. Quality Gates

| Gate | Criteria | Block Deploy? |
|------|----------|---------------|
| **Code commit** | Lint pass, unit test pass | Yes |
| **PR merge** | 2 reviewers, coverage ≥ 80% | Yes |
| **Build** | All tests pass, no critical vuln | Yes |
| **Deploy to Staging** | Smoke test pass | Yes |
| **Deploy to Production** | E2E + load test pass, PO approval | Yes |

### 7.3. Test Strategy

| Test Type | Coverage Target | Tool | Frequency |
|-----------|-----------------|------|-----------|
| **Unit Test** | ≥ 80% | JUnit, Jest, pytest | Every commit |
| **Integration Test** | ≥ 60% APIs | REST Assured, supertest | Every PR |
| **Contract Test** | All service contracts | Pact | Every PR |
| **E2E Test** | Critical paths (10) | Playwright | Every release |
| **Performance Test** | All endpoints | k6 | Sprint 6, post-release |
| **Security Test** | OWASP Top 10 | ZAP, Burp | Sprint 6 |
| **Chaos Test** | All services | Chaos Monkey | Quarterly |

### 7.4. Bug Severity & SLA

| Severity | Description | Fix SLA | Verify SLA |
|----------|-------------|---------|------------|
| **Critical (S1)** | System down, data loss | 4 giờ | 8 giờ |
| **High (S2)** | Major feature broken | 1 ngày | 2 ngày |
| **Medium (S3)** | Minor feature broken | 3 ngày | 5 ngày |
| **Low (S4)** | Cosmetic, typo | Sprint tiếp theo | 1 tuần |

---

## 8. QUẢN LÝ RỦI RO

### 8.1. Risk Register

| ID | Rủi Ro | Xác Suất | Tác Động | Mức Độ | Chiến Lược Giảm Thiểu | Owner | Trigger |
|----|--------|----------|----------|--------|------------------------|-------|---------|
| **RK-001** | AI model accuracy thấp | M (40%) | H | 🔴 Cao | Retrain 2 tuần/lần, A/B test, manual fallback | AI Lead | Accuracy < 85% |
| **RK-002** | Blockchain congestion | L (15%) | M | 🟡 TB | Layer 2 Polygon, retry logic, queue | BE Lead | Tx fail > 5% |
| **RK-003** | Proctoring false positive | H (60%) | M | 🟡 TB | Manual review cho flagged cases | QA Lead | False > 10% |
| **RK-004** | Data breach | L (10%) | VH | 🔴 Cao | TLS 1.3, AES-256, pen-test quarterly | Security | Any breach alert |
| **RK-005** | Service downtime | M (30%) | H | 🟡 TB | Multi-AZ, circuit breaker, chaos test | DevOps | Uptime < 99.5% |
| **RK-006** | LLM vendor lock-in | M (40%) | M | 🟡 TB | Multi-provider (OpenAI + Gemini) | AI Lead | API price increase > 30% |
| **RK-007** | Performance bottleneck | M (35%) | H | 🟡 TB | Load testing từ Sprint 0, KEDA auto-scale | DevOps | P95 > 1s |
| **RK-008** | Scope creep | H (70%) | M | 🟡 TB | Change control board, prioritize P0 | PM + PO | CR > 3/sprint |
| **RK-009** | Resource constraints | M (30%) | M | 🟡 TB | MVP first, prioritize P0, hire sớm | PM | Vacancy > 2 tháng |
| **RK-010** | Compliance issues | L (15%) | H | 🟡 TB | Legal review tuần 8, GDPR checklist | PM + Legal | Any legal flag |
| **RK-011** | GPU instance unavailability | M (30%) | H | 🟡 TB | Reserve instances, multi-cloud | DevOps | GPU not available |
| **RK-012** | Key person dependency | M (40%) | H | 🟡 TB | Knowledge sharing, pair programming, docs | PM | Any key person leaves |
| **RK-013** | Third-party API rate limit | M (30%) | M | 🟡 TB | Caching, queue, multiple keys | Dev | 429 errors |
| **RK-014** | Browser compatibility | L (15%) | M | 🟢 Thấp | Polyfill, progressive enhancement | FE Lead | Browser bug report |
| **RK-015** | Late stakeholder feedback | H (60%) | M | 🟡 TB | Weekly demo, sprint review | PO | < 3 days review |

### 8.2. Risk Response Plan

#### RK-001: AI Model Accuracy
- **Prevent:** Diverse training data, baseline benchmark
- **Detect:** Daily accuracy metrics, A/B test
- **Respond:**
  - Retrain với data mới mỗi 2 tuần
  - Fallback manual grading nếu accuracy < threshold
  - Confidence score threshold 0.7

#### RK-004: Data Breach
- **Prevent:**
  - TLS 1.3 + AES-256 encryption
  - Penetration testing mỗi quý
  - Security code review mỗi sprint
  - Secrets management (Vault)
- **Detect:**
  - IDS (Intrusion Detection System)
  - Anomaly detection trên logs
  - SOC 24/7 (Phase 2)
- **Respond:**
  - Incident response team (IRT) sẵn sàng
  - Backup daily, restore trong 1 giờ
  - Notification trong 24 giờ (GDPR)
  - Post-mortem trong 48 giờ

#### RK-008: Scope Creep
- **Prevent:**
  - Change Control Board (CCB) meetings hàng tuần
  - Clear definition of MVP
  - Feature freeze trong Sprint 6-7
- **Process:**
  - Mọi CR phải có ROI justification
  - Impact analysis (cost, time, risk)
  - PO + PM + Tech Lead approval

### 8.3. Risk Monitoring

- **Weekly:** Risk review trong PM sync
- **Bi-weekly:** Risk register update trong steering committee
- **Monthly:** Top 5 risks presented to sponsor
- **Quarterly:** Full risk register review

---

## 9. QUẢN LÝ GIAO TIẾP

### 9.1. Communication Matrix

| Loại | Tần Suất | Người Tham Dự | Mục Đích | Tool |
|------|----------|---------------|----------|------|
| **Daily Standup** | Hàng ngày | Dev team | Sync status, blockers | Slack huddle |
| **Sprint Planning** | 2 tuần/lần | Full team + PO | Plan sprint | Jira + Zoom |
| **Sprint Review** | 2 tuần/lần | Full team + Stakeholders | Demo increment | Zoom + Confluence |
| **Retrospective** | 2 tuần/lần | Dev team | Improve process | Miro |
| **Backlog Grooming** | 1 tuần/lần | PO + Tech Lead + Dev | Refine backlog | Jira |
| **PM Sync** | 2 lần/tuần | PM + PO + TL | Cross-team sync | Slack |
| **Steering Committee** | 2 tuần/lần | Sponsor + PM + PO | Status, decisions | Zoom + Slides |
| **All-Hands** | 1 tháng/lần | Toàn team | Company update, celebrate | Zoom |
| **Stakeholder Review** | 1 tháng/lần | Sponsor + Stakeholders | Progress, feedback | Zoom + Demo |
| **Postmortem** | Khi có incident | IRT + relevant team | Learn from incident | Confluence |

### 9.2. Communication Channels

| Channel | Mục Đích | Quy Tắc |
|---------|----------|---------|
| **Slack #general** | Casual chat, announcements | Respect, no spam |
| **Slack #dev-*** | Technical discussions | Pair programming, code review |
| **Slack #incident** | Production alerts | On-call only |
| **Slack #random** | Off-topic | OK |
| **Email** | External, formal | Response within 24h |
| **Confluence** | Documentation | Searchable, versioned |
| **Jira** | Task tracking | Daily update |
| **GitHub** | Code, PR, CI | Review within 24h |
| **PagerDuty** | Critical alerts | Respond within 15 min |

### 9.3. Reporting

| Báo Cáo | Tần Suất | Audience | Format |
|---------|----------|----------|--------|
| **Daily Status** | Hàng ngày | Team | Slack |
| **Sprint Report** | 2 tuần/lần | Stakeholders | Confluence |
| **Status Report** | 2 tuần/lần | Sponsor | PowerPoint |
| **Monthly Report** | 1 tháng/lần | Ban Giám Đốc | PowerPoint + Metrics |
| **Final Report** | Cuối dự án | Sponsor | Document |

### 9.4. Stakeholder Communication Plan

| Stakeholder | Info Needed | Frequency | Channel | Owner |
|-------------|-------------|-----------|---------|-------|
| **Sponsor (BGD)** | High-level progress, risks, budget | 2 tuần/lần | Steering Committee | PM |
| **PO** | Daily progress, blockers, feedback | Daily | Slack + Standup | TL |
| **Dev Team** | Sprint goal, tasks, tech changes | Daily | Standup + Slack | Scrum Master |
| **End Users** | Product updates, new features | Monthly | Blog + Email | Marketing |
| **Legal** | Compliance, contracts | Khi cần | Email | PM |
| **Vendors** | Contracts, SLAs | Khi cần | Email + Call | PM |
| **Auditors** | Documentation, evidence | Quarterly | Confluence | Security |

---

## 10. QUẢN LÝ THAY ĐỔI

### 10.1. Change Control Process

```
1. Change Request (CR) raised
   ↓
2. Impact Analysis (PM + TL)
   - Cost impact
   - Schedule impact
   - Resource impact
   - Risk impact
   - Quality impact
   ↓
3. CCB Meeting (weekly)
   - PM + PO + TL + Sponsor (nếu lớn)
   ↓
4. Decision
   - Approved / Rejected / Deferred
   ↓
5. Implementation (nếu approved)
   ↓
6. Verification (QA + PO)
   ↓
7. Closure
```

### 10.2. Change Control Board (CCB)

| Member | Role | Vote |
|--------|------|------|
| **PM** | Chair | Yes |
| **PO** | Product perspective | Yes |
| **Tech Lead** | Technical feasibility | Yes |
| **Sponsor** | Strategic (for major CR) | Yes (if > $5K or > 1 week) |

### 10.3. Change Categories

| Category | Impact | Approval | Timeline |
|----------|--------|----------|----------|
| **Critical Fix** | Bug fix, security | TL + PO | 24 giờ |
| **Minor Change** | < 3 days, < $1K | TL | 1 tuần |
| **Major Change** | 3-7 days, < $5K | CCB | 2 tuần |
| **Strategic Change** | > 7 days hoặc > $5K | Sponsor + CCB | 1 tháng |

### 10.4. Change Log Template

| CR ID | Date | Requester | Description | Impact | Status | Approver | Date Approved |
|-------|------|-----------|-------------|--------|--------|----------|---------------|
| CR-001 | | | | | | | |

---

## 11. QUẢN LÝ CHI PHÍ & NGUỒN LỰC

### 11.1. Budget Estimate

| Category | Cost (USD) | % | Notes |
|----------|------------|---|-------|
| **Human Resources** | $180,000 | 72% | 17 người × 16 tuần |
| **Cloud Infrastructure** | $36,000 | 14.4% | 16 tháng × $2,250/tháng |
| **Third-party Services** | $15,000 | 6% | LLM API, SMS, Email |
| **Tools & Licenses** | $8,000 | 3.2% | Jira, Confluence, Figma |
| **Contingency (10%)** | $11,000 | 4.4% | Buffer |
| **Total** | **$250,000** | **100%** | |

### 11.2. Cloud Cost Breakdown (Monthly)

| Service | Provider | Cost/month | Optimization |
|---------|----------|-----------|--------------|
| **EKS/K8s** | AWS/GCP | $1,200 | Spot instances 70% |
| **PostgreSQL** | RDS | $400 | Reserved 1-year |
| **Redis Cluster** | ElastiCache | $300 | Reserved |
| **S3 Storage** | S3 | $200 | Intelligent tiering |
| **GPU (AI)** | A10G spot | $700 | Mixed deployment |
| **CloudFlare Pro** | CloudFlare | $20 | CDN |
| **Monitoring** | Datadog | $300 | Negotiated |
| **Misc (data transfer, logs)** | - | $130 | - |
| **Total** | - | **$3,250** | - |

**Sau tối ưu:** Target $2,000/tháng (giảm 38%)

### 11.3. Cost Optimization Strategy

- **Reserved Instances:** 1-year commit cho RDS, ElastiCache (-30%)
- **Spot Instances:** AI training, batch jobs (-70%)
- **Auto-scaling:** Tắt resource khi không dùng
- **S3 Lifecycle:** Move to Glacier sau 30 ngày
- **CDN:** Cache static assets aggressive
- **Multi-cloud fallback:** Tránh vendor lock-in

### 11.4. Resource Allocation Matrix

| Resource | Allocated | Utilization Target |
|----------|-----------|-------------------|
| **Frontend devs** | 3 FTE | 85% |
| **Backend Java devs** | 3 FTE | 85% |
| **Backend Node devs** | 2 FTE | 85% |
| **AI/ML devs** | 2 FTE | 80% (research overhead) |
| **QA** | 2 FTE | 90% |
| **DevOps** | 2 FTE | 75% |
| **PM + PO + TL** | 3 FTE | 90% |

---

## 12. QUẢN LÝ MUA SẮM & VENDOR

### 12.1. Vendor List

| Vendor | Service | Contract | SLA | Owner |
|--------|---------|----------|-----|-------|
| **AWS/GCP** | Cloud infrastructure | 1 year | 99.95% | DevOps |
| **CloudFlare** | CDN, WAF | 1 year | 100% | DevOps |
| **OpenAI** | LLM API | Pay-as-you-go | API uptime | AI Lead |
| **Google Gemini** | LLM fallback | Pay-as-you-go | API uptime | AI Lead |
| **SendGrid** | Email | Monthly | 99.9% | BE Lead |
| **Twilio** | SMS | Pay-as-you-go | 99.9% | BE Lead |
| **Datadog** | APM | Annual | 99.9% | DevOps |
| **GitHub** | Source code | Annual | 99.9% | DevOps |
| **Atlassian** | Jira, Confluence | Annual | 99.9% | PM |

### 12.2. Procurement Process

1. **Identify need** (PM/Lead)
2. **Vendor evaluation** (3 quotes, scorecard)
3. **Approval** (PM + Finance + Legal)
4. **Contract negotiation** (Legal + Procurement)
5. **PO issued** (Finance)
6. **Onboard vendor** (PM)
7. **Performance review** (Quarterly)

### 12.3. Vendor Performance Review

| Metric | Target | Review Frequency |
|--------|--------|------------------|
| **Uptime** | ≥ 99.9% | Monthly |
| **Response time** | < 4 hours | Monthly |
| **Cost variance** | ± 10% | Quarterly |
| **Security incidents** | 0 | Monthly |
| **Customer satisfaction** | ≥ 4/5 | Quarterly |

---

## 13. KẾ HOẠCH TRIỂN KHAI KỸ THUẬT

### 13.1. Kiến Trúc Tổng Quan

```
┌─────────────────────────────────────────────────────────────┐
│  EDGE: CloudFlare CDN (Static assets + DDoS)                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  LOAD BALANCER: NGINX + Envoy (L7 routing)                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  API GATEWAY: Spring Cloud Gateway WebFlux (3-10 pods)      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  MICROSERVICES (10 services + 3 common libs)                │
│  - auth-service (Java)                                      │
│  - content-service (Java)                                   │
│  - exam-suite (Node.js)                                     │
│  - ai-suite (Polyglot: Java/Python/Node)                    │
│  - blockchain-suite (Node.js)                               │
│  - analytics-service (Java)                                 │
│  - notification-service (Java)                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  DATA TIER                                                  │
│  - PostgreSQL (1 primary + 3 read replicas)                 │
│  - Redis Cluster (3 masters + 3 replicas)                   │
│  - MongoDB Sharded                                          │
│  - Milvus GPU (Vector search)                               │
│  - MinIO + S3 Glacier                                       │
└─────────────────────────────────────────────────────────────┘
```

### 13.2. Tech Stack Matrix

| Layer | Technology | Version | Lý Do |
|-------|-----------|---------|-------|
| **Frontend** | React + TypeScript + Vite + Tailwind | 18 / 5.x / 5.x / 3.x | Fast, modern |
| **Backend Java** | Java + Spring Boot + WebFlux | 17 / 3.x / 6.x | Reactive |
| **Backend Node** | Node.js + NestJS + uWebSockets.js | 20 / 10 / 20 | WebSocket scale |
| **Backend Python** | Python + FastAPI + TensorRT | 3.11 / 0.110 / 10 | GPU inference |
| **Database** | PostgreSQL + Redis + MongoDB + Milvus | 15 / 7 / 7 / 2.4 | Polyglot persistence |
| **Message Queue** | Kafka + Redis Streams | 3.5 | Event streaming |
| **Container** | Docker + Kubernetes + Helm | 24 / 1.29 / 3.x | Standard |
| **CI/CD** | GitHub Actions + ArgoCD | - | GitOps |
| **Observability** | Prometheus + Grafana + Jaeger + Datadog | - | Full observability |
| **Blockchain** | Solidity + Polygon + The Graph | 0.8.20 | Cheap L2 |
| **ML/AI** | PyTorch + TensorRT + vLLM + LangGraph | - | Production ML |

### 13.3. Microservices Inventory

| # | Service | Tech | Port | DB | Instances |
|---|---------|------|------|-----|-----------|
| 1 | api-gateway | Java WebFlux | 8080 | - | 3-10 |
| 2 | discovery-service | Java Spring | 9999 | - | 2 (HA) |
| 3 | config-server | Java Spring | 8888 | - | 2 (HA) |
| 4 | auth-service | Java Spring | 9000 | PG + Redis | 3-10 |
| 5 | content-service | Java Spring | 9001 | PG + Mongo + MinIO | 3-10 |
| 6 | analytics-service | Java Spring | 9004 | PG + Redis + ClickHouse | 2-5 |
| 7 | notification-service | Java Spring | 9009 | Redis | 2-5 |
| 8 | exam-suite | Node.js NestJS | 9005 | PG + Redis | 3-15 |
| 9 | ai-suite | Polyglot | 9100-9103 | Milvus + PG + Redis | 2-8 |
| 10 | blockchain-suite | Node.js NestJS | 9200 | PG | 2-4 |

### 13.4. Infrastructure Setup Plan

#### Week 1: Cloud Foundation
- [ ] AWS/GCP account setup
- [ ] EKS/GKE cluster (3 node groups)
- [ ] VPC, subnets, security groups
- [ ] IAM roles, service accounts
- [ ] S3 buckets, CloudFront

#### Week 2: Platform Services
- [ ] PostgreSQL RDS (Primary + Read Replica)
- [ ] ElastiCache Redis Cluster
- [ ] MongoDB Atlas
- [ ] Milvus cluster
- [ ] Kafka cluster (MSK)
- [ ] CloudFlare setup

#### Week 3-4: CI/CD & Monitoring
- [ ] GitHub Actions workflows
- [ ] ArgoCD setup
- [ ] Prometheus + Grafana
- [ ] Jaeger tracing
- [ ] Datadog APM
- [ ] PagerDuty integration
- [ ] ELK stack

### 13.5. Performance Optimization Plan

**4-tier caching:**
- L1: In-process (Caffeine/Node-Cache) - 30s TTL, 60% hit
- L2: Redis Cluster - 5-30min TTL, 30% hit
- L3: CDN (CloudFlare) - 1 day TTL, 8% hit
- L4: DB with read replicas

**Database optimization:**
- PgBouncer connection pooling
- 3 read replicas for read scaling
- Indexes on hot paths
- Partial indexes for active records

**AI optimization:**
- TensorRT (5-10x faster than PyTorch)
- Dynamic batching (10x throughput)
- Mixed deployment: GPU + API fallback
- Model warm pool

**WebSocket optimization:**
- uWebSockets.js (10x faster than ws)
- Sticky sessions (NGINX ip_hash)
- Redis Pub/Sub cross-instance
- WebSocket compression

**Target:**
- API P95: 150ms
- Throughput: 50K RPS
- Concurrent: 100K+ users
- AI inference: 50ms
- DB query P95: 50ms

### 13.6. Performance Testing Plan

**Tools:** k6 (JavaScript)

**Test scenarios (BẮT BUỘC trước deploy):**
1. Baseline: 10K concurrent users × 30s
2. Stress: 50K concurrent × 60s
3. Spike: 0 → 100K users trong 10s
4. Soak: 20K users × 24h (memory leak)

**Metrics:**
- http_req_duration P95 < 500ms
- http_req_failed rate < 0.1%
- iteration_duration
- memory_usage (không leak)

---

## 14. KẾ HOẠCH BẢO TRÌ & VẬN HÀNH

### 14.1. Deployment Strategy

**Environments:**
- **Dev:** Auto-deploy từ `develop` branch
- **Staging:** Auto-deploy từ `release/*` branches
- **Production:** Manual approval, deploy từ `main`

**Deployment Methods:**
- Blue-Green deployment (zero downtime)
- Canary release (5% → 25% → 100%)
- Feature flags (LaunchDarkly hoặc tự build)

### 14.2. Monitoring & Alerting

**Metrics (Prometheus):**
- Application: http_requests, http_duration, jvm_memory
- Database: pg_pool, pg_query, redis_memory
- Business: exam_submissions, ai_inference, blockchain_anchor

**Alerts:**
- P95 latency > 500ms × 5 min → Slack + Page
- Error rate > 1% × 5 min → Slack + Page
- CPU > 80% × 10 min → Slack
- Memory > 90% → Slack + Page
- Disk > 85% → Slack

**On-call rotation:**
- 1 Dev + 1 DevOps, 1 week rotation
- PagerDuty integration
- Response SLA: 15 min for P1, 1 hour for P2

### 14.3. Backup & Recovery

**Backup strategy:**
- PostgreSQL: Daily full + hourly incremental (WAL archiving)
- Redis: AOF every second
- S3: Cross-region replication
- Blockchain: Immutable (no backup needed)

**RTO:** < 1 giờ
**RPO:** < 15 phút

**Disaster Recovery test:** Quarterly

### 14.4. Maintenance Windows

- **Patch OS:** Sunday 2-4 AM (low traffic)
- **DB maintenance:** Sunday 3-5 AM
- **Deploy:** Tuesday/Thursday 10-11 AM (avoid peak)
- **No deploy Friday/Saturday:** Risk reduction

### 14.5. SLA

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Uptime** | ≥ 99.5% | Monthly |
| **API Response P95** | < 500ms | Continuous |
| **Error Rate** | < 0.1% | Continuous |
| **Incident Response P1** | < 15 min | Per incident |
| **Incident Response P2** | < 1 hour | Per incident |

### 14.6. Documentation

| Document | Owner | Update Frequency |
|----------|-------|------------------|
| **API Docs (OpenAPI)** | BE Devs | Per PR |
| **Architecture Decision Records (ADRs)** | Tech Lead | Per decision |
| **Runbook** | DevOps | Per incident |
| **User Manual** | PO + Designer | Per release |
| **Admin Guide** | DevOps | Per release |
| **Architecture Diagram** | Tech Lead | Monthly |

---

## 15. METRICS & KPIs QUẢN LÝ

### 15.1. Project Management Metrics

| Metric | Target | Measurement | Frequency |
|--------|--------|-------------|-----------|
| **Schedule Variance (SV)** | ≥ 0 | Earned Value | Bi-weekly |
| **Cost Variance (CV)** | ≥ 0 | Earned Value | Bi-weekly |
| **SPI** | ≥ 0.95 | EV/PV | Bi-weekly |
| **CPI** | ≥ 0.95 | EV/AC | Bi-weekly |
| **Velocity** | ≥ 80 SP/sprint | Story points | Per sprint |
| **Burndown** | On track | Sprint scope | Daily |
| **Defect Density** | < 1/KLOC | Bugs/KLOC | Per sprint |
| **Code Coverage** | ≥ 80% | SonarQube | Per build |
| **Open Critical Bugs** | < 3 | Jira | Daily |
| **Risk Register Updates** | Weekly | Risk log | Weekly |

### 15.2. Engineering Metrics (DORA)

| Metric | Target | Elite |
|--------|--------|-------|
| **Deployment Frequency** | Daily | On-demand |
| **Lead Time for Changes** | < 1 day | < 1 hour |
| **Mean Time to Recovery (MTTR)** | < 1 hour | < 1 hour |
| **Change Failure Rate** | < 15% | 0-15% |

### 15.3. Quality Metrics

| Metric | Target | Tool |
|--------|--------|------|
| **Code Coverage** | ≥ 80% | SonarQube |
| **API P95 Latency** | < 500ms | Prometheus |
| **Error Rate** | < 0.1% | Sentry |
| **Uptime** | ≥ 99.5% | Status page |
| **Security Vulns (Critical)** | 0 | Trivy, Snyk |
| **OpenAPI Coverage** | 100% | Spectral |

### 15.4. Business Metrics

| Metric | Target | Timeline |
|--------|--------|----------|
| **Beta Users** | 100 | Week 14 |
| **GA Signups** | 1000+ | Week 16 |
| **User Satisfaction** | ≥ 4.0/5 | Beta |
| **Course Completion Rate** | ≥ 60% | Post-launch |
| **NPS** | ≥ 50 | Post-launch |

### 15.5. Research Metrics (3 Papers)

| Paper | Metric | Target |
|-------|--------|--------|
| **Paper 1: Agentic RAG** | Path relevance score | ≥ 0.75 |
| **Paper 1: Agentic RAG** | Latency P95 | < 10s |
| **Paper 2: Vision Attention** | Accuracy | ≥ 85% |
| **Paper 2: Vision Attention** | F1-score | ≥ 0.80 |
| **Paper 3: Blockchain Records** | Anchor latency | < 5s |
| **Paper 3: Blockchain Records** | Verify latency | < 2s |
| **Paper 3: Blockchain Records** | TPS | ≥ 100 |

---

## 16. PHỤ LỤC

### Phụ Lục A: Glossary

| Thuật Ngữ | Định Nghĩa |
|-----------|-------------|
| **PMP** | Project Management Plan |
| **CCB** | Change Control Board |
| **EV** | Earned Value |
| **SPI** | Schedule Performance Index |
| **CPI** | Cost Performance Index |
| **DORA** | DevOps Research and Assessment |
| **MTTR** | Mean Time To Recovery |
| **RTO** | Recovery Time Objective |
| **RPO** | Recovery Point Objective |
| **ADR** | Architecture Decision Record |
| **SLA** | Service Level Agreement |
| **SLO** | Service Level Objective |
| **WBS** | Work Breakdown Structure |

### Phụ Lục B: Templates

- Daily Standup Notes Template
- Sprint Planning Template
- Sprint Retrospective Template
- Risk Register Template
- Change Request Template
- Status Report Template
- Post-Mortem Template

### Phụ Lục C: References

- PMBOK 7th Edition
- Agile Practice Guide (PMI)
- Scrum Guide (Schwaber & Sutherland)
- SAFe Framework
- DORA Metrics
- BABOK v3

### Phụ Lục D: Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **Project Sponsor** | _________ | _________ | _________ |
| **Project Manager** | _________ | _________ | _________ |
| **Product Owner** | _________ | _________ | _________ |
| **Tech Lead** | _________ | _________ | _________ |
| **BA Manager** | _________ | _________ | _________ |

### Phụ Lục E: Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 11/08/2026 | PMO | Initial document based on BA v1.1 |

---

**END OF DOCUMENT**
