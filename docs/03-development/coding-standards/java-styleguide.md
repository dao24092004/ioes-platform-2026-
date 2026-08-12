# ☕ Java Coding Style Guide
## Java 17 + Spring Boot 3 + Hexagonal Architecture

> **Áp dụng cho:** Tất cả Java services (auth, content, analytics, notification, api-gateway, discovery, config)
> **Owner:** Backend Lead

---

## 1. NAMING CONVENTIONS

| Loại | Convention | Ví dụ |
|------|-----------|-------|
| Class | PascalCase | `UserController`, `LoginUseCase` |
| Interface | PascalCase | `UserRepository`, `PasswordEncoder` |
| Method | camelCase, verb | `createUser`, `validateToken` |
| Variable | camelCase | `userName`, `maxRetryCount` |
| Constant | UPPER_SNAKE_CASE | `MAX_FILE_SIZE`, `DEFAULT_TIMEOUT` |
| Package | lowercase, dot-separated | `com.ioes.auth.domain` |
| Enum | PascalCase + values UPPER | `Role.ADMIN` |
| Generic Type | Single uppercase letter | `T`, `K`, `V` |
| DTO suffix | PascalCase + DTO | `LoginRequestDTO`, `UserResponseDTO` |
| Entity | PascalCase, no suffix | `User`, `Course` |
| Repository | PascalCase + Repository | `UserRepository` |
| UseCase | PascalCase + UseCase | `LoginUseCase` |
| Controller | PascalCase + Controller | `AuthController` |
| Test class | PascalCase + Test | `UserServiceTest` |

---

## 2. HEXAGONAL ARCHITECTURE

### 2.1 Layer Structure (BẮT BUỘC)

```
service-name/
└── src/main/java/com/ioes/{service}/
    ├── domain/              # Pure business logic - NO framework deps
    │   ├── model/           # Entities, Value Objects
    │   ├── exception/       # Domain exceptions
    │   └── event/           # Domain events
    │
    ├── application/         # Use cases, orchestration
    │   ├── usecase/         # Use case classes
    │   ├── service/         # Application services
    │   ├── port/            # Ports (interfaces for infra)
    │   └── dto/             # Application DTOs
    │
    ├── infrastructure/      # Framework, DB, external
    │   ├── persistence/     # JPA repositories, entities
    │   ├── security/        # JWT, OAuth providers
    │   ├── cache/           # Redis
    │   ├── kafka/           # Kafka producer/consumer
    │   └── external/        # Third-party APIs
    │
    ├── interfaces/          # Inbound adapters
    │   ├── rest/            # REST controllers
    │   ├── event/           # Event listeners (inbound)
    │   └── graphql/         # GraphQL (if any)
    │
    └── config/              # Spring configuration
```

### 2.2 Quy tắc giữa các layer

```java
// ❌ Domain KHÔNG ĐƯỢC phụ thuộc framework
package com.ioes.auth.domain;
import org.springframework.stereotype.Component;  // ❌ CẤM

// ✅ Domain là POJO thuần
package com.ioes.auth.domain;
public class User {
    private String id;
    private String email;
    private String passwordHash;

    public boolean isActive() {
        return status == UserStatus.ACTIVE;
    }
}

// ✅ Application PHỤ THUỘC Domain + Port interfaces
package com.ioes.auth.application.usecase;
import com.ioes.auth.domain.User;
import com.ioes.auth.application.port.UserRepository;  // Port interface

public class LoginUseCase {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public LoginUseCase(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public Token execute(LoginCommand cmd) {
        // ...
    }
}

// ✅ Infrastructure IMPLEMENT Port interfaces
package com.ioes.auth.infrastructure.persistence;
import com.ioes.auth.application.port.UserRepository;

@Repository
public class UserRepositoryImpl implements UserRepository {
    private final JpaUserRepository jpaRepo;
    // ...
}
```

### 2.3 Giải thích Hexagonal Architecture bằng ví dụ đời thường

#### 🎭 Ví dụ: "Ổ điện ở tường"

Hãy tưởng tượng **1 cái ổ điện ở tường**:

```
        ┌──────────────┐
        │    Ổ ĐIỆN    │ ← PHẦN CỐT LÕI (Domain + Application)
        │   (lỗ cắm)   │    Không quan tâm bạn cắm cái gì
        └──────┬───────┘
               │
    ┌──────────┼──────────┐
    │          │          │
┌───▼────┐ ┌───▼────┐ ┌───▼────┐
│ Sạc    │ │ Máy    │ │ Đèn    │ ← ADAPTERS (Infrastructure + Interfaces)
│ Điện   │ │ Tính  │ │ Bàn   │    Thay đổi được
└────────┘ └────────┘ └────────┘
```

- **Phần cốt lõi** (Domain + Application): quy định "ổ cắm" - không thay đổi
- **Phần xung quanh** (Infrastructure + Interfaces): cắm vào rút ra tuỳ ý

#### 🏗️ 4 Layers - Giải thích trực quan

```
                    ┌─────────────────────────────────┐
                    │   interfaces/ (INBOUND)         │
                    │   REST Controller, Event Listener│
                    │   "Nhận yêu cầu từ bên ngoài"   │
                    └──────────────┬──────────────────┘
                                   │ gọi vào
                                   ▼
                    ┌─────────────────────────────────┐
                    │   application/                  │
                    │   UseCase, ApplicationService   │
                    │   "Điều phối business logic"    │
                    └──────────────┬──────────────────┘
                                   │ dùng
                    ┌──────────────▼──────────────────┐
                    │   domain/ (CỐT LÕI)             │
                    │   Entity, Value Object, Domain  │
                    │   Event, Domain Exception      │
                    │   "Business thuần túy, không biết│
                    │    Spring/Hibernate/SQL"        │
                    └──────────────▲──────────────────┘
                                   │ implement
                    ┌──────────────┴──────────────────┐
                    │   infrastructure/ (OUTBOUND)    │
                    │   JPA Repository, Kafka, Redis, │
                    │   JWT, OAuth2, External API    │
                    │   "Kết nối với thế giới bên     │
                    │    ngoài (DB, Message Queue)"   │
                    └─────────────────────────────────┘
```

#### 🎯 Mỗi layer làm gì?

**1️⃣ domain/ - TRÁI TIM**

> **"Business logic thuần túy, không biết gì về Spring, JPA, HTTP"**

```
domain/
├── model/           # Entity nghiệp vụ: User, Course, Exam
├── exception/       # Business exception: UserNotFoundException
└── event/           # Domain event: UserRegisteredEvent
```

**Đặc điểm:**
- ✅ Chỉ chứa Plain Old Java Object (POJO)
- ❌ KHÔNG import `org.springframework.*`
- ❌ KHÔNG import `jakarta.persistence.*`
- ✅ Có thể test mà KHÔNG cần Spring Boot

**Ví dụ:**
```java
// ✅ ĐÚNG - Domain thuần
package com.ioes.auth.domain.model;

public class User {
    private String email;
    private String passwordHash;
    private UserStatus status;

    // Business logic
    public boolean verifyPassword(String raw, PasswordEncoder encoder) {
        return encoder.matches(raw, this.passwordHash);
    }

    public boolean canLogin() {
        return status == UserStatus.ACTIVE;
    }
}
```

```java
// ❌ SAI - Domain có framework
package com.ioes.auth.domain.model;

import org.springframework.stereotype.Component;  // ❌ Domain KHÔNG biết Spring

@Entity  // ❌ Domain KHÔNG biết JPA
public class User {
    @Column  // ❌ Domain KHÔNG biết Database
    private String email;
}
```

**2️⃣ application/ - BỘ NÃO ĐIỀU PHỐI**

> **"Điều phối use case, orchestrate domain"**

```
application/
├── usecase/         # LoginUseCase, RegisterUseCase, CreateCourseUseCase
├── service/         # ApplicationService (orchestration phức tạp)
├── port/            # INTERFACES (Port) - "Hợp đồng"
│   ├── UserRepository.java       # interface UserRepository { User findById(id) }
│   └── PasswordEncoder.java      # interface PasswordEncoder { matches(...) }
└── dto/             # Data Transfer Object giữa layers
```

**Đặc điểm:**
- ✅ Chỉ chứa **interface** trong `port/` (KHÔNG có implementation)
- ✅ Use case chỉ gọi qua interface, KHÔNG gọi class cụ thể
- ❌ KHÔNG biết về JPA, Kafka, Redis cụ thể

**Ví dụ:**
```java
// application/port/UserRepository.java - ĐỊNH NGHĨA interface (Port)
package com.ioes.auth.application.port;

public interface UserRepository {
    Optional<User> findByEmail(String email);  // CHỈ interface
    User save(User user);
}

// application/usecase/LoginUseCase.java - USE CASE
package com.ioes.auth.application.usecase;

public class LoginUseCase {
    private final UserRepository userRepository;  // ← depend on INTERFACE
    private final PasswordEncoder passwordEncoder; // ← depend on INTERFACE

    public LoginUseCase(UserRepository repo, PasswordEncoder encoder) {
        this.userRepository = repo;
        this.passwordEncoder = encoder;
    }

    public Token execute(LoginCommand cmd) {
        // 1. Lấy user qua interface (không biết impl)
        User user = userRepository.findByEmail(cmd.email())
            .orElseThrow(() -> new InvalidCredentialsException());

        // 2. Check password qua interface
        if (!user.verifyPassword(cmd.password(), passwordEncoder)) {
            throw new InvalidCredentialsException();
        }

        // 3. Generate token
        return tokenService.generateAccessToken(user.getId());
    }
}
```

**3️⃣ infrastructure/ - ADAPTERS RA BÊN NGOÀI**

> **"Implement các interface (Port) để kết nối DB, Kafka, Redis, etc."**

```
infrastructure/
├── persistence/     # UserRepositoryImpl (dùng JPA)
├── security/        # JwtTokenService (dùng JJWT), GoogleOAuthProvider
├── cache/           # RedisCacheService
├── kafka/           # KafkaProducer, KafkaConsumer
└── external/        # PaymentGatewayClient, EmailServiceClient
```

**Đặc điểm:**
- ✅ **Implement** các interface định nghĩa ở `application/port/`
- ✅ Chứa TẤT CẢ code "bẩn" (JPA, JDBC, Kafka, HTTP client)
- ✅ Dễ thay thế: đổi từ MySQL → MongoDB chỉ cần đổi class này

**Ví dụ:**
```java
// infrastructure/persistence/UserRepositoryImpl.java - TRIỂN KHAI
package com.ioes.auth.infrastructure.persistence;

import com.ioes.auth.application.port.UserRepository;  // ← import interface

@Repository  // ← annotation Spring, OK vì đây là Infrastructure
public class UserRepositoryImpl implements UserRepository {  // ← IMPLEMENT
    private final JpaUserRepository jpaRepo;  // Spring Data JPA

    @Override
    public Optional<User> findByEmail(String email) {
        // Map JPA entity → Domain entity
        return jpaRepo.findByEmail(email)
            .map(UserMapper::toDomain);
    }

    @Override
    public User save(User user) {
        UserEntity entity = UserMapper.toEntity(user);
        return UserMapper.toDomain(jpaRepo.save(entity));
    }
}
```

```java
// infrastructure/security/JwtTokenService.java
package com.ioes.auth.infrastructure.security;

import com.ioes.auth.application.port.TokenService;  // ← import interface

@Service
public class JwtTokenService implements TokenService {  // ← IMPLEMENT
    @Override
    public String generateAccessToken(String userId) {
        return Jwts.builder()
            .setSubject(userId)
            .setExpiration(...)  // ← code "bẩn" với JJWT
            .signWith(SignatureAlgorithm.RS256, key)
            .compact();
    }
}
```

**4️⃣ interfaces/ - ADAPTERS VÀO BÊN TRONG**

> **"Nhận request từ HTTP, WebSocket, Kafka Event"**

```
interfaces/
├── rest/            # AuthController (REST API)
├── event/           # UserEventConsumer (Kafka)
└── graphql/         # (Optional)
```

**Đặc điểm:**
- ✅ **Adapter cho inbound** (HTTP, WebSocket, Event)
- ✅ Parse request → gọi UseCase → trả response
- ❌ KHÔNG chứa business logic, chỉ là "cầu nối"

**Ví dụ:**
```java
// interfaces/rest/AuthController.java
package com.ioes.auth.interfaces.rest;

@RestController
public class AuthController {
    private final LoginUseCase loginUseCase;  // ← gọi UseCase, không làm logic

    @PostMapping("/api/v1/auth/login")
    public ResponseEntity<LoginResponse> login(@RequestBody @Valid LoginRequest req) {
        // 1. Convert Request → Command
        LoginCommand cmd = new LoginCommand(req.email(), req.password());

        // 2. Gọi UseCase
        Token token = loginUseCase.execute(cmd);

        // 3. Convert → Response
        return ResponseEntity.ok(LoginResponse.from(token));
    }
}
```

#### 🔄 Dependency Flow (Quan trọng nhất!)

```
interfaces/  ──→  application/  ──→  domain/  ←──  infrastructure/
   (HTTP)        (UseCase)        (POJO)         (JPA, Kafka,...)

   Controllers     UseCase         Entity         RepositoryImpl
                  Port (interface) ──────────────────IMPLEMENTED BY
```

**Quy tắc:**
- ✅ Domain **KHÔNG** phụ thuộc gì cả (pure)
- ✅ Application **phụ thuộc** Domain + Port (interface only)
- ✅ Infrastructure **implement** Port + phụ thuộc Application
- ✅ Interfaces **gọi** Application UseCase

**Tại sao quan trọng?**
> Domain "không biết" có JPA, có HTTP, có Kafka → Nó chỉ là business thuần. Có thể test mà không cần Spring Boot.

---

### 2.4 TẠI SAO KHÔNG DÙNG MVC? - SO SÁNH CHI TIẾT

### 📊 So sánh tổng quan

| Tiêu chí | MVC (Layered) | Hexagonal (Ports & Adapters) |
|----------|---------------|------------------------------|
| **Độ phức tạp** | ⭐ Đơn giản | ⭐⭐⭐ Phức tạp hơn |
| **Đường cong học** | Thấp - ai cũng biết | Cao - phải hiểu pattern |
| **Testability** | ⭐⭐ Khó test business thuần | ⭐⭐⭐⭐⭐ Test business cực dễ |
| **Flexibility** | ⭐⭐ Khó thay framework | ⭐⭐⭐⭐⭐ Đổi DB/framework dễ |
| **Phù hợp** | App nhỏ, CRUD đơn giản | Microservices, Domain phức tạp |
| **Setup time** | Nhanh | Chậm hơn ~30% |

### 🎭 Hình ảnh đời thường để so sánh

**MVC = NHÀ HÀNG BÌNH THƯỜNG**

```
┌─────────────────────────────────────────────────────┐
│  👨‍🍳 KHÁCH (View)                                    │
│      │ Đặt món                                       │
│      ▼                                               │
│  🧑‍💼 PHỤC VỤ (Controller)                             │
│      │ Ghi order, chuyển xuống bếp                  │
│      ▼                                               │
│  👨‍🍳 ĐẦU BẾP (Service)                                │
│      │ Chế biến, lấy nguyên liệu                   │
│      ▼                                               │
│  🧊 TỦ LẠNH (Repository/Model)                       │
│      │ Trứng, rau, thịt                             │
│      ▼                                               │
│  💾 DATABASE (MySQL, PostgreSQL)                      │
└─────────────────────────────────────────────────────┘
```

**Vấn đề của MVC:**
- 👨‍🍳 Đầu bếp phải **BIẾT** tủ lạnh ở đâu, có gì
- Đổi tủ lạnh (MySQL → MongoDB) → Đầu bếp phải học cách mở tủ mới
- Không có "đầu bếp" nào khác có thể thay thế dễ dàng

**HEXAGONAL = NHÀ HÀNG 5 SAO VỚI BẾP TRƯỞNG**

```
┌─────────────────────────────────────────────────────┐
│  👨‍🍳 KHÁCH (REST API)                                │
│      │ Gọi món qua menu                             │
│      ▼                                               │
│  🧑‍💼 PHỤC VỤ (Controller)                             │
│      │ Chuyển yêu cầu                               │
│      ▼                                               │
│  👨‍🍳 BẾP TRƯỞNG (UseCase)                             │
│      │ "Tôi cần trứng và rau"                       │
│      │   ↑ gọi qua HỢP ĐỒNG                         │
│      │   ┌────────────────┐                          │
│      │   │  Kho Cam Kết   │ ← Hợp đồng (Port)       │
│      │   │  - cho tôi rau │   Quy định rau phải      │
│      │   │  - cho tôi trứng│  tươi, đúng chủng loại  │
│      │   └────────┬───────┘                          │
│      │            │ Implement                        │
│      │   ┌────────▼───────┐                          │
│      │   │ Kho Tổng (JPA) │ ← Adapter PostgreSQL     │
│      │   └────────────────┘                          │
│      │   ┌────────────────┐                          │
│      │   │ Kho Lạnh (Mock)│ ← Adapter Test           │
│      │   └────────────────┘                          │
└─────────────────────────────────────────────────────┘
```

**Lợi ích:**
- 👨‍🍳 Bếp trưởng **CHỈ CẦN BIẾT** "cần rau tươi", không quan tâm rau từ đâu
- Đổi kho → Bếp trưởng không cần biết
- Test với "kho giả" → Bếp trưởng không cần kho thật

### 💻 So sánh code thực tế

#### ❌ MVC - Controller gọi trực tiếp Repository

```java
// ❌ MVC - Controller phụ thuộc trực tiếp vào JPA
@RestController
public class UserController {

    @Autowired
    private UserRepository userRepository;  // ← JPA Repository cụ thể

    @Autowired
    private PasswordEncoder passwordEncoder;  // ← BCrypt cụ thể

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        // 1. Tìm user (biết rõ dùng JPA)
        User user = userRepository.findByEmail(req.email())
            .orElseThrow(() -> new RuntimeException("Not found"));

        // 2. Check password (biết rõ dùng BCrypt)
        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new RuntimeException("Wrong password");
        }

        // 3. Generate token
        String token = JwtBuilder.create()...build();  // ← Code JWT lẫn vào Controller

        return ResponseEntity.ok(new LoginResponse(token));
    }
}
```

**Vấn đề của MVC:**
- 🚨 Controller chứa **business logic** (kiểm tra password)
- 🚨 Biết cụ thể JPA, BCrypt, JJWT
- 🚨 Test phải start Spring + Database
- 🚨 Đổi BCrypt → Argon2 → phải sửa Controller

#### ✅ HEXAGONAL - Tách biệt rõ ràng

```java
// 1. Domain - POJO thuần (không biết Spring)
public class User {
    private String email;
    private String passwordHash;

    public boolean verifyPassword(String raw, PasswordEncoder encoder) {
        return encoder.matches(raw, this.passwordHash);
    }
}

// 2. Application - Interface (Port)
public interface UserRepository {
    Optional<User> findByEmail(String email);  // CHỈ interface
}
public interface PasswordEncoder {
    boolean matches(String raw, String hashed);
}

// 3. Application - UseCase (chỉ phụ thuộc interface)
public class LoginUseCase {
    private final UserRepository userRepository;     // ← interface
    private final PasswordEncoder passwordEncoder;  // ← interface

    public Token execute(LoginCommand cmd) {
        User user = userRepository.findByEmail(cmd.email())
            .orElseThrow(InvalidCredentialsException::new);

        if (!user.verifyPassword(cmd.password(), passwordEncoder)) {
            throw new InvalidCredentialsException();
        }

        return tokenService.generate(user.getId());
    }
}

// 4. Infrastructure - Adapter JPA
@Repository
public class UserRepositoryImpl implements UserRepository {
    @Autowired private JpaUserRepository jpaRepo;
    // Implement findByEmail bằng JPA
}

// 5. Infrastructure - Adapter BCrypt
@Service
public class BcryptPasswordEncoder implements PasswordEncoder {
    public boolean matches(String raw, String hashed) {
        return BCrypt.checkpw(raw, hashed);  // BCrypt ở đây
    }
}

// 6. Interfaces - Controller (chỉ "vận chuyển")
@RestController
public class AuthController {
    @Autowired private LoginUseCase loginUseCase;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest req) {
        Token token = loginUseCase.execute(new LoginCommand(req.email(), req.password()));
        return ResponseEntity.ok(LoginResponse.from(token));
    }
}
```

### 📊 So sánh chi tiết - 3 tình huống thực tế

#### 🔍 Tình huống 1: Khi đổi Database (MySQL → MongoDB)

```
MVC: ❌ Phải sửa NHIỀU chỗ
─────────────────────────
1. User.java (Entity JPA) → đổi annotation
2. UserRepository.java (extends JpaRepository) → viết lại
3. UserController (nếu có query đặc biệt) → sửa
4. Mọi Service gọi Repository → KHÔNG sửa (may mắn)

Thời gian: 2-3 ngày
Risk: CAO (có thể bug do thay đổi query)


HEXAGONAL: ✅ Chỉ sửa 1 chỗ
────────────────────────────
1. Viết UserRepositoryMongoImpl implements UserRepository
2. Xoá UserRepositoryImpl (JPA)
3. Thay Bean config

Thời gian: 0.5 ngày
Risk: THẤP (UseCase không đổi)
```

#### 🧪 Tình huống 2: Khi test business logic

```
MVC: ❌ Phải start cả Spring Context
─────────────────────────────────────
@SpringBootTest  ← Start cả Spring + DB
class UserServiceTest {
    @Autowired UserService service;
    @Autowired UserRepository repo;  // ← Real hoặc in-memory DB

    @Test void testLogin() {
        // Phải setup DB, chạy migration...
    }
}

Thời gian test: ~5-10 giây
Phụ thuộc: Spring, Hibernate, Database


HEXAGONAL: ✅ Test thuần Java, không cần Spring
───────────────────────────────────────────────
@Test  ← KHÔNG cần Spring
class LoginUseCaseTest {
    // Tạo mock interface, không cần DB thật
    UserRepository mockRepo = mock(UserRepository.class);
    PasswordEncoder mockEncoder = mock(PasswordEncoder.class);
    LoginUseCase useCase = new LoginUseCase(mockRepo, mockEncoder, ...);

    @Test void testLoginSuccess() {
        when(mockRepo.findByEmail("test@x.com"))
            .thenReturn(Optional.of(testUser));
        when(mockEncoder.matches(any(), any())).thenReturn(true);

        Token token = useCase.execute(new LoginCommand("test@x.com", "pass"));

        assertThat(token).isNotNull();  // ✅ PASS
    }
}

Thời gian test: ~10ms (không cần Spring)
```

#### 🔐 Tình huống 3: Khi đổi Authentication (JWT → OAuth2 → SAML)

```
MVC: ❌ Sửa Controller + Service
─────────────────────────────────
- UserController có code JWT → phải xoá
- UserService gọi JwtBuilder → phải đổi
- Có thể ảnh hưởng business logic


HEXAGONAL: ✅ Thay Adapter
─────────────────────────
- LoginUseCase KHÔNG đổi
- Chỉ viết OAuthTokenService implements TokenService
- Xoá JwtTokenService
- Done!
```

### ⚖️ Khi nào dùng cái nào?

#### ✅ Dùng MVC khi:

```
✓ App CRUD đơn giản
✓ Business logic ít (< 50 business rules)
✓ Team mới, chưa quen pattern
✓ Single monolith nhỏ
✓ Time-to-market quan trọng
✓ Ví dụ: Blog cá nhân, Landing page, Admin tool nội bộ
```

#### ✅ Dùng HEXAGONAL khi:

```
✓ Microservices (nhiều service)
✓ Business logic phức tạp (> 100 business rules)
✓ Cần test nhanh, CI/CD nhiều
✓ Dự án dài hạn (> 1 năm)
✓ Domain thay đổi ít, framework thay đổi nhiều
✓ Ví dụ: IOES, Banking, Healthcare, E-commerce lớn
```

### 🎯 Tại sao IOES chọn Hexagonal?

**1️⃣ Business Domain RẤT PHỨC TẠP**

```
Exam Suite:
- Auto-grading (MCQ, coding, essay)
- Proctoring (CNN-LSTM real-time)
- Timer với auto-save
- Chống gian lận
- Nhiều edge cases

Auth Service:
- JWT + OAuth2 + MFA
- RBAC + ABAC
- Session management
- Password reset + rotation
- Nhiều policies
```

→ Nếu chỉ MVC, business logic sẽ trộn lẫn với code JPA, JWT → khó maintain

**2️⃣ CẦN TEST NHANH**

```
IOES có:
- 10 microservices
- ~200+ business use cases
- CI/CD chạy 50+ lần/ngày
- Mỗi PR phải test trong < 5 phút

MVC test: 5-10s/test case × 500 tests = 50 phút ❌
Hexagonal test: 10ms/test case × 500 tests = 5 giây ✅
```

**3️⃣ LONG-TERM PROJECT**

```
IOES:
- 16 tuần MVP + phát triển tiếp 2-3 năm
- Stack có thể đổi (Java 17 → 21, Spring Boot 3 → 4)
- DB có thể đổi (Postgres → CockroachDB cho scale)

Hexagonal giúp:
- Domain code KHÔNG ĐỔI khi đổi framework
- Đổi JPA → R2DBC → jOOQ chỉ cần viết Adapter mới
```

**4️⃣ MICROSERVICES = MỖI SERVICE CÓ BOUNDED CONTEXT RIÊNG**

```
Mỗi service có:
- Database riêng
- Business rules riêng
- API riêng
- Team riêng

Hexagonal giúp:
- Mỗi service tự quản business của mình
- Adapter dễ swap giữa service
```

**5️⃣ ĐỘI NGŨ LỚN, PHẢI PARALLEL**

```
Frontend team: Làm UI
Java team: Domain + Application
Infra team: Infrastructure + K8s

Với Hexagonal:
- Java team viết UseCase + Port (interface)
- Infra team viết Impl của Port
- 2 team làm SONG SONG, không cần đợi nhau
```

### 🔬 Demo nhanh - Tại sao Hexagonal "đáng tiền"

**Tình huống: Khách hàng muốn đổi JWT → OAuth2 sau 6 tháng**

**MVC (2 tuần làm):**
```
Ngày 1-3: Đọc lại code, tìm chỗ dùng JWT
Ngày 4-7: Sửa UserController, UserService
Ngày 8-10: Fix bug do sửa Controller
Ngày 11-14: Test lại tất cả
→ 2 tuần, nhiều bug, mệt mỏi 😩
```

**Hexagonal (3 ngày làm):**
```
Ngày 1: Viết OAuthTokenService implements TokenService
Ngày 2: Viết GoogleOAuthProvider implements OAuthProvider
Ngày 3: Xoá JwtTokenService, update DI config
→ 3 ngày, ít bug, business không đổi 😎
```

### 📉 Hạn chế của Hexagonal (Phải nói thật)

```
❌ 1. Code nhiều hơn MVC ~30%
   - Phải tạo Interface (Port)
   - Phải tạo Impl (Adapter)
   - Phải mapping giữa Domain ↔ Entity

❌ 2. Khó hiểu cho người mới
   - "Tại sao phải tạo interface?"
   - "Mapping chi vậy, lẫn vào nhau cho dễ"

❌ 3. Over-engineering cho app nhỏ
   - CRUD user đơn giản không cần Hexagonal
   - Chỉ tốn thời gian

❌ 4. Team phải hiểu pattern
   - Nếu ai không hiểu, sẽ vô tình phá vỡ kiến trúc
   - Ví dụ: Đặt @Entity trong Domain layer (SAI!)
```

### 💡 Kết luận

```
┌─────────────────────────────────────────────────────────┐
│  MVC vs HEXAGONAL - KHÔNG PHẢI CÁI NÀO TỐT HƠN       │
│  MÀ LÀ CÁI NÀO PHÙ HỢP HƠN                            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  MVC: NHÀ NHỎ                                            │
│  - Xây nhanh, dễ sửa                                     │
│  - Nhưng khó nâng cấp, khó thay đổi kết cấu            │
│                                                          │
│  HEXAGONAL: TÒA NHÀ CAO TẦNG                            │
│  - Xây lâu hơn, cần kỹ sư giỏi                         │
│  - Nhưng dễ sửa chữa từng tầng, dễ cải tạo            │
│                                                          │
│  IOES chọn HEXAGONAL vì:                                │
│  ✓ Business domain phức tạp                              │
│  ✓ 10 microservices, cần parallel team                   │
│  ✓ Dự án dài hạn 2-3 năm                                │
│  ✓ Cần test nhanh cho CI/CD                              │
│  ✓ Có thể đổi framework mà không ảnh hưởng business    │
└─────────────────────────────────────────────────────────┘
```

**Nói ngắn gọn:**
> MVC là **"nhanh, đơn giản, dễ bắt đầu"**
> Hexagonal là **"đầu tư ban đầu nhiều hơn, nhưng về sau rẻ hơn"**

IOES chọn Hexagonal vì **đầu tư ban đầu chấp nhận được**, đổi lại **về sau đỡ tốn kém hơn rất nhiều** khi business phức tạp lên và cần maintain lâu dài! 🎯

### 🆚 So sánh với Service Node.js (NestJS) trong IOES

Dự án IOES dùng **2 style khác nhau** cho 2 ngôn ngữ:

| | Java | Node.js |
|---|------|---------|
| **Pattern** | Hexagonal Architecture | NestJS Modular Architecture |
| **Mỗi "layer"** | `domain/`, `application/`, `infrastructure/`, `interfaces/` | `modules/exam/` |
| **Tương đương Domain** | `domain/model/User.java` | `modules/exam/entities/exam.entity.ts` |
| **Tương đương Application** | `application/usecase/LoginUseCase.java` | `modules/exam/exam.service.ts` |
| **Tương đương Interface** | `interfaces/rest/AuthController.java` | `modules/exam/exam.controller.ts` |
| **Repository** | `infra/persistence/UserRepositoryImpl implements UserRepository` | `modules/exam/exam.repository.ts` |

**Lý do khác nhau:**
- Java + Spring → dùng Hexagonal là best practice vì framework nặng
- Node.js + NestJS → đã có sẵn DI, modules → NestJS style là đủ

### 📚 Tóm tắt 1 câu

> **Hexagonal Architecture** tách **business logic thuần (Domain)** ra khỏi **framework & infrastructure**, dùng **interface (Port)** làm hợp đồng để **implementation (Adapter)** có thể thay thế dễ dàng.

Đây là lý do tại sao cấu trúc thư mục Java service "có vẻ lạ lạ" - mỗi layer có 1 vai trò rất cụ thể và **domain không được phép biết về Spring/Hibernate** theo quy tắc của pattern này! 🎯

---

## 3. DEPENDENCY INJECTION

### 3.1 Constructor Injection (BẮT BUỘC)

```java
// ✅ ĐÚNG - Constructor injection, fields là final
@Service
public class UserService {
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    public UserService(
        UserRepository userRepository,
        EmailService emailService,
        PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.passwordEncoder = passwordEncoder;
    }
}

// ❌ SAI - Field injection
@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;  // ❌
}

// ❌ SAI - Setter injection (chỉ dùng khi thực sự cần optional)
@Service
public class UserService {
    @Autowired
    public void setUserRepository(UserRepository repo) {}  // ❌
}
```

### 3.2 Lombok (Optional)

```java
// ✅ Có thể dùng Lombok để giảm boilerplate
@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final EmailService emailService;
}

// ✅ Dùng @Slf4j cho logging
@Slf4j
@Service
public class UserService {
    public void createUser(CreateUserCommand cmd) {
        log.info("Creating user with email={}", cmd.email());
        // ...
    }
}
```

---

## 4. EXCEPTION HANDLING

### 4.1 Custom Exception Hierarchy

```java
// ✅ Base exception
package com.ioes.common.exception;

public class BusinessException extends RuntimeException {
    private final String code;
    private final HttpStatus status;

    public BusinessException(String code, String message, HttpStatus status) {
        super(message);
        this.code = code;
        this.status = status;
    }
}

// ✅ Domain-specific exceptions
public class UserNotFoundException extends BusinessException {
    public UserNotFoundException(String userId) {
        super("USER_NOT_FOUND", "User not found: " + userId, HttpStatus.NOT_FOUND);
    }
}

public class InvalidCredentialsException extends BusinessException {
    public InvalidCredentialsException() {
        super("INVALID_CREDENTIALS", "Invalid email or password", HttpStatus.UNAUTHORIZED);
    }
}

// ✅ Domain exceptions KHÔNG chứa framework details
public class DomainException extends RuntimeException {  // Pure Java
    // No HttpStatus here
}
```

### 4.2 Global Exception Handler

```java
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusinessException(BusinessException ex) {
        log.warn("Business exception: code={}, message={}", ex.getCode(), ex.getMessage());
        return ResponseEntity
            .status(ex.getStatus())
            .body(ApiResponse.error(ex.getCode(), ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(err ->
            errors.put(err.getField(), err.getDefaultMessage())
        );
        return ResponseEntity
            .badRequest()
            .body(ApiResponse.error("VALIDATION_ERROR", "Invalid input", errors));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleUnknown(Exception ex) {
        log.error("Unexpected error", ex);
        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ApiResponse.error("INTERNAL_ERROR", "Internal server error"));
    }
}
```

---

## 5. DTOs & VALIDATION

```java
// ✅ DTO với Bean Validation
public record CreateUserRequest(
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    String email,

    @NotBlank
    @Size(min = 8, max = 128, message = "Password must be 8-128 characters")
    @Pattern(regexp = "^(?=.*[A-Z])(?=.*\\d).*$", message = "Password must contain uppercase and digit")
    String password,

    @NotBlank
    @Size(max = 100)
    String fullName,

    @Pattern(regexp = "^\\+?[0-9]{10,15}$", message = "Invalid phone number")
    String phoneNumber
) {}

// ✅ Dùng record (Java 17) thay vì class
public record UserResponse(
    String id,
    String email,
    String fullName,
    UserStatus status,
    Instant createdAt
) {
    public static UserResponse from(User user) {
        return new UserResponse(
            user.getId(),
            user.getEmail(),
            user.getFullName(),
            user.getStatus(),
            user.getCreatedAt()
        );
    }
}
```

---

## 6. LOGGING

### 6.1 SLF4J với Structured Logging

```java
// ✅ ĐÚNG - Structured logging
@Slf4j
@Service
public class UserService {

    public User createUser(CreateUserCommand cmd) {
        log.info("Creating user email={}", cmd.email());
        try {
            User user = userRepository.save(User.create(cmd));
            log.info("User created userId={} email={}", user.getId(), user.getEmail());
            return user;
        } catch (Exception e) {
            log.error("Failed to create user email={}", cmd.email(), e);
            throw e;
        }
    }
}

// ❌ SAI
System.out.println("User created: " + userId);  // ❌
log.info("User created: " + userId);            // ❌ String concat
log.info("User created");                        // ❌ No context
```

### 6.2 MDC cho Correlation ID

```java
// ✅ Filter để set MDC
@Component
public class CorrelationIdFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain) {
        String correlationId = req.getHeader("X-Correlation-Id");
        if (correlationId == null) {
            correlationId = UUID.randomUUID().toString();
        }
        MDC.put("correlationId", correlationId);
        try {
            chain.doFilter(req, res);
        } finally {
            MDC.clear();
        }
    }
}

// ✅ Sử dụng trong log
log.info("Processing request");  // Tự động có correlationId
```

### 6.3 Log Levels

```java
log.trace("Detailed debugging info");    // Chỉ khi debug
log.debug("Debug info");                  // Development
log.info("Important business events");    // Production
log.warn("Warning but not error");        // Production
log.error("Error that needs attention");  // Production
```

---

## 7. DATABASE

### 7.1 JPA Entity

```java
// ✅ Entity với annotations
@Entity
@Table(name = "users", indexes = {
    @Index(name = "idx_users_email", columnList = "email", unique = true),
    @Index(name = "idx_users_status", columnList = "status")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserStatus status;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;  // Soft delete
}
```

### 7.2 Repository

```java
// ✅ Custom Repository Pattern
public interface UserRepository extends JpaRepository<User, String>, UserRepositoryCustom {
    Optional<User> findByEmail(String email);

    @Query("SELECT u FROM User u WHERE u.status = :status AND u.deletedAt IS NULL")
    Page<User> findAllActive(@Param("status") UserStatus status, Pageable pageable);
}

public interface UserRepositoryCustom {
    User saveWithEvent(User user);
}

@Repository
@RequiredArgsConstructor
public class UserRepositoryImpl implements UserRepositoryCustom {
    private final JpaUserRepository jpaRepo;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public User saveWithEvent(User user) {
        User saved = jpaRepo.save(user);
        eventPublisher.publishEvent(new UserSavedEvent(saved.getId()));
        return saved;
    }
}
```

### 7.3 Migration (Flyway)

```sql
-- V1__init_users.sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

-- V2__add_oauth.sql
ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN github_id VARCHAR(255) UNIQUE;
```

---

## 8. TESTING

### 8.1 Unit Test (Mockito)

```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private UserService userService;

    @Test
    void should_CreateUser_When_ValidInput() {
        // Given
        CreateUserCommand cmd = new CreateUserCommand("test@example.com", "Password123", "John");
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        // When
        User result = userService.createUser(cmd);

        // Then
        assertThat(result.getEmail()).isEqualTo("test@example.com");
        verify(emailService).sendWelcomeEmail(anyString());
    }

    @Test
    void should_ThrowException_When_EmailAlreadyExists() {
        // Given
        CreateUserCommand cmd = new CreateUserCommand("test@example.com", "Password123", "John");
        when(userRepository.existsByEmail(anyString())).thenReturn(true);

        // When & Then
        assertThatThrownBy(() -> userService.createUser(cmd))
            .isInstanceOf(EmailAlreadyExistsException.class);
    }
}
```

### 8.2 Integration Test

```java
@SpringBootTest
@Testcontainers
@ActiveProfiles("test")
class UserControllerIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine");

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }

    @Test
    void should_ReturnUser_When_GetById() {
        // Given
        User user = userRepository.save(User.create("test@example.com", "John"));

        // When
        ResponseEntity<UserResponse> response = restTemplate.getForEntity(
            "/api/v1/users/" + user.getId(),
            UserResponse.class
        );

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().email()).isEqualTo("test@example.com");
    }
}
```

---

## 9. KAFKA EVENTS

```java
// ✅ Event Publisher
@Component
@RequiredArgsConstructor
public class DomainEventPublisher {

    private final KafkaTemplate<String, DomainEvent> kafkaTemplate;

    public void publish(DomainEvent event) {
        String topic = event.getTopic();
        String key = event.getAggregateId();
        kafkaTemplate.send(topic, key, event)
            .whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("Failed to publish event topic={} key={}", topic, key, ex);
                } else {
                    log.info("Event published topic={} key={}", topic, key);
                }
            });
    }
}

// ✅ Event Consumer
@Component
@Slf4j
public class UserEventConsumer {

    @KafkaListener(
        topics = "user.events",
        groupId = "auth-service",
        containerFactory = "kafkaListenerContainerFactory"
    )
    public void handleUserRegistered(UserRegisteredEvent event) {
        log.info("Received UserRegistered userId={}", event.userId());
        // Handle event
    }
}
```

---

## 10. CẤM TUYỆT ĐỐI

```java
// ❌ System.out/err trong production
System.out.println("debug");

// ❌ Field injection
@Autowired private UserRepository repo;

// ❌ Raw types
List users = new ArrayList();  // Phải dùng generics

// ❌ Magic numbers
if (retries > 3) {}

// ❌ Empty catch block
try { ... } catch (Exception e) {}  // ❌

// ❌ Returning null thay vì Optional
public User findUser(String id) {
    return null;  // ❌ Trả Optional<User>
}

// ❌ Mutable static state
public static List<String> cache = new ArrayList<>();  // ❌

// ❌ Long methods (>50 dòng)
// ❌ Deep nesting (>4 levels)

// ❌ Comments lặp lại code
// Increment counter
counter++;  // ❌ Code đã rõ
```

---

## 📚 REFERENCE

- [Effective Java (Joshua Bloch)](https://www.oreilly.com/library/view/effective-java/9780134686091/)
- [Spring Boot Best Practices](https://docs.spring.io/spring-boot/docs/current/reference/html/)
- [Google Java Style Guide](https://google.github.io/styleguide/javaguide.html)
- [Project Rules](../../01-business/PROJECT_RULES.md)

---

**Version:** 1.0
**Last updated:** 12/08/2026
