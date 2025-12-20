# Node.js安全实践: 从防护到攻防

系统掌握 Node.js 应用安全，构建坚不可摧的后端服务。

- [序言](preface.md)

---

### 第一部分：安全基础与威胁模型

1. [Node.js 安全全景图](foundations/security-landscape.md)
2. [威胁建模：识别你的攻击面](foundations/threat-modeling.md)
3. [OWASP Top 10 与 Node.js](foundations/owasp-top-10.md)
4. [安全开发思维模式](foundations/security-mindset.md)
5. [Node.js 安全发布与漏洞响应](foundations/security-releases.md)

---

### 第二部分：输入验证与注入防护

6. [输入验证基本原则](input-validation/principles.md)
7. [使用 Joi 和 Zod 进行数据验证](input-validation/joi-zod.md)
8. [SQL 注入原理与防护](injection/sql-injection.md)
9. [NoSQL 注入：MongoDB 安全实践](injection/nosql-injection.md)
10. [命令注入与防护](injection/command-injection.md)
11. [路径遍历攻击防护](injection/path-traversal.md)
12. [正则表达式拒绝服务(ReDoS)](injection/redos.md)
13. [原型污染攻击与防护](injection/prototype-pollution.md)

---

### 第三部分：Web 安全防护

14. [XSS 跨站脚本攻击详解](web-security/xss.md)
15. [XSS 防护策略与实现](web-security/xss-prevention.md)
16. [CSRF 跨站请求伪造](web-security/csrf.md)
17. [CORS 跨域资源共享配置](web-security/cors.md)
18. [安全 HTTP 头配置](web-security/security-headers.md)
19. [使用 Helmet.js 加固 Express](web-security/helmet.md)
20. [点击劫持与 Frame 安全](web-security/clickjacking.md)
21. [Cookie 安全配置](web-security/cookie-security.md)

---

### 第四部分：认证与授权

22. [认证机制概览](auth/authentication-overview.md)
23. [密码安全：存储与验证](auth/password-security.md)
24. [Session 认证实现](auth/session-authentication.md)
25. [JWT 原理与实现](auth/jwt-fundamentals.md)
26. [JWT 安全最佳实践](auth/jwt-best-practices.md)
27. [刷新令牌与令牌轮转](auth/refresh-tokens.md)
28. [OAuth 2.0 实现指南](auth/oauth2.md)
29. [OpenID Connect 集成](auth/openid-connect.md)
30. [多因素认证(MFA)实现](auth/mfa.md)
31. [基于角色的访问控制(RBAC)](auth/rbac.md)
32. [基于属性的访问控制(ABAC)](auth/abac.md)
33. [API 密钥管理](auth/api-key-management.md)

---

### 第五部分：数据安全

34. [敏感数据分类与处理](data-security/sensitive-data.md)
35. [加密基础：对称与非对称加密](data-security/encryption-basics.md)
36. [Node.js crypto 模块实战](data-security/crypto-module.md)
37. [哈希与消息认证码](data-security/hashing-hmac.md)
38. [数据脱敏与匿名化](data-security/data-masking.md)
39. [密钥管理最佳实践](data-security/key-management.md)
40. [环境变量与密钥安全](data-security/env-secrets.md)
41. [数据库连接安全](data-security/database-connection.md)

---

### 第六部分：TLS/HTTPS 安全

42. [TLS/SSL 基础原理](tls/tls-fundamentals.md)
43. [Node.js HTTPS 服务配置](tls/https-setup.md)
44. [证书管理与自动更新](tls/certificate-management.md)
45. [TLS 版本与密码套件选择](tls/cipher-suites.md)
46. [mTLS 双向认证](tls/mutual-tls.md)
47. [HSTS 与证书透明度](tls/hsts-ct.md)

---

### 第七部分：供应链安全

48. [npm 生态安全威胁](supply-chain/npm-threats.md)
49. [依赖漏洞扫描：npm audit 与 Snyk](supply-chain/vulnerability-scanning.md)
50. [依赖锁定与版本管理](supply-chain/dependency-locking.md)
51. [识别恶意包的技巧](supply-chain/malicious-packages.md)
52. [私有 npm 仓库安全](supply-chain/private-registry.md)
53. [软件物料清单(SBOM)](supply-chain/sbom.md)
54. [依赖更新策略](supply-chain/update-strategy.md)

---

### 第八部分：运行时安全与加固

55. [Node.js 沙箱与隔离](runtime/sandbox-isolation.md)
56. [Node.js 权限模型(v20+)](runtime/permission-model.md)
57. [资源限制与 DoS 防护](runtime/resource-limits.md)
58. [速率限制实现](runtime/rate-limiting.md)
59. [进程安全与权限降低](runtime/process-security.md)
60. [容器化安全最佳实践](runtime/container-security.md)
61. [生产环境安全配置清单](runtime/production-checklist.md)

---

### 第九部分：日志、监控与响应

62. [安全日志设计](monitoring/security-logging.md)
63. [敏感信息日志脱敏](monitoring/log-sanitization.md)
64. [入侵检测与告警](monitoring/intrusion-detection.md)
65. [安全事件响应流程](monitoring/incident-response.md)
66. [安全审计与合规](monitoring/audit-compliance.md)

---

### 第十部分：安全开发生命周期

67. [安全编码规范](sdlc/secure-coding-standards.md)
68. [代码审查安全检查清单](sdlc/code-review-checklist.md)
69. [静态分析工具(SAST)](sdlc/sast-tools.md)
70. [动态分析工具(DAST)](sdlc/dast-tools.md)
71. [安全测试实践](sdlc/security-testing.md)
72. [渗透测试基础](sdlc/penetration-testing.md)
73. [漏洞披露与响应](sdlc/vulnerability-disclosure.md)
74. [Node.js 安全总结与展望](sdlc/summary.md)

---

