# 手写 Mini-Axios：从零实现 HTTP 客户端库

通过亲手实现一个功能完备的 HTTP 客户端，深入理解 Axios 的核心设计。

- [序言](index.md)

---

### 第一部分：起步——环境搭建与核心骨架

1. [项目初始化与环境搭建](setup.md)
2. [从一个简单的请求开始](core/first-request.md)
3. [实现 Axios 类与实例化](core/axios-class.md)
4. [请求方法别名：get、post、put、delete](core/method-aliases.md)
5. [axios 函数与实例的双重身份](core/dual-identity.md)

---

### 第二部分：请求配置系统

6. [定义配置类型与默认值](config/types-and-defaults.md)
7. [实现配置合并策略](config/merge-config.md)
8. [配置优先级与覆盖规则](config/priority.md)
9. [超时处理与 timeout 配置](config/timeout.md)
10. [凭据与跨域：withCredentials](config/credentials.md)

---

### 第三部分：URL 处理

11. [URL 拼接与 baseURL 处理](url/build-url.md)
12. [查询参数序列化](url/params-serializer.md)
13. [处理特殊字符与编码](url/encoding.md)

---

### 第四部分：请求头与数据处理

14. [请求头处理与 Content-Type 推断](headers/process-headers.md)
15. [响应头解析](headers/parse-headers.md)
16. [默认请求头配置](headers/default-headers.md)
17. [请求数据序列化 transformRequest](data/transform-request.md)
18. [响应数据解析 transformResponse](data/transform-response.md)
19. [FormData 与文件上传支持](data/formdata-upload.md)
20. [URL-Encoding 请求体处理](data/urlencoded.md)

---

### 第五部分：适配器层——多环境支持

21. [理解适配器模式](adapters/adapter-pattern.md)
22. [实现 XHR 适配器](adapters/xhr-adapter.md)
23. [实现 Node.js 端 HTTP 适配器](adapters/http-adapter.md)
24. [实现 Fetch 适配器](adapters/fetch-adapter.md)

---

### 第六部分：拦截器与请求控制

25. [实现 InterceptorManager](interceptors/interceptor-manager.md)
26. [构建拦截器链](interceptors/chain-execution.md)
27. [基于拦截器的请求重试](interceptors/retry.md)
28. [实现 CancelToken](cancel/cancel-token.md)
29. [AbortController 集成](cancel/abort-controller.md)

---

### 第七部分：错误处理与安全

30. [实现 AxiosError 类](errors/axios-error.md)
31. [统一错误处理策略](errors/error-handling.md)
32. [XSRF/CSRF 防护实现](security/xsrf-protection.md)

---

### 第八部分：高级特性

33. [创建独立实例](advanced/create-instance.md)
34. [并发请求控制](advanced/concurrency.md)
35. [上传下载进度监控](advanced/progress.md)
36. [请求与响应的自动重试](advanced/auto-retry.md)

---

### 第九部分：TypeScript 支持与工程化

37. [完整类型定义](typescript/type-definitions.md)
38. [泛型响应类型](typescript/generic-response.md)
39. [单元测试](testing/unit-testing.md)
40. [集成测试](testing/integration-testing.md)
41. [npm 发布流程](testing/npm-publish.md)

---

### 附录

42. [Mini-Axios 与 Axios 源码对照](appendix/source-comparison.md)
43. [常见使用场景与最佳实践](appendix/best-practices.md)
