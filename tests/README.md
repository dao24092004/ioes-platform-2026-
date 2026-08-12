# 🧪 Cross-cutting Tests

End-to-end, performance, contract, chaos, security tests.

## Cấu trúc

| Thư mục | Tool | Mục đích |
|---------|------|----------|
| [e2e/](./e2e/) | Playwright | Critical user flows |
| [performance/](./performance/) | k6 | Load testing (baseline, stress, spike, soak) |
| [contract/](./contract/) | Pact | Service contract testing |
| [chaos/](./chaos/) | Chaos Mesh | Resilience testing |
| [security/](./security/) | OWASP ZAP, Burp | Security testing |
| [load-data/](./load-data/) | Custom scripts | Test data generators |

## Status

⚠️ _Sẽ được triển khai trong Sprint 1 (tests cơ bản) và Sprint 6 (full load test)._
