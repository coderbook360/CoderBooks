# Node.js网络编程实战: 从TCP到WebSocket

深入掌握 Node.js 网络编程，构建高性能、可靠的网络应用。

- [序言](preface.md)

---

### 第一部分：网络编程基础

1. [网络协议层次概述](foundations/protocol-layers.md)
2. [TCP/IP 协议族](foundations/tcp-ip.md)
3. [Socket 编程基本概念](foundations/socket-concepts.md)
4. [IP 地址与端口](foundations/ip-ports.md)
5. [字节序与网络字节序](foundations/byte-order.md)
6. [Node.js 网络模块概览](foundations/nodejs-network-modules.md)

---

### 第二部分：TCP 编程

7. [net 模块概览](tcp/net-overview.md)
8. [创建 TCP 服务器](tcp/tcp-server.md)
9. [TCP 连接生命周期](tcp/connection-lifecycle.md)
10. [处理多个客户端连接](tcp/multiple-clients.md)
11. [创建 TCP 客户端](tcp/tcp-client.md)
12. [数据帧与消息边界](tcp/message-framing.md)
13. [TCP 粘包问题与解决方案](tcp/packet-sticking.md)
14. [自定义协议设计](tcp/custom-protocol.md)
15. [TCP 连接池实现](tcp/connection-pool.md)
16. [TCP Keep-Alive 机制](tcp/keep-alive.md)
17. [TCP 性能优化](tcp/tcp-performance.md)
18. [TCP 错误处理与重连](tcp/error-reconnection.md)
19. [Unix Domain Socket](tcp/unix-socket.md)

---

### 第三部分：UDP 编程

20. [dgram 模块概览](udp/dgram-overview.md)
21. [UDP 服务器与客户端](udp/udp-server-client.md)
22. [UDP vs TCP：选择指南](udp/udp-vs-tcp.md)
23. [UDP 广播](udp/broadcast.md)
24. [UDP 组播(Multicast)](udp/multicast.md)
25. [UDP 应用场景](udp/use-cases.md)
26. [UDP 可靠性保证](udp/reliability.md)

---

### 第四部分：HTTP 协议深度解析

27. [HTTP 协议基础回顾](http/http-basics.md)
28. [http 模块架构](http/module-architecture.md)
29. [创建 HTTP 服务器](http/http-server.md)
30. [IncomingMessage 详解](http/incoming-message.md)
31. [ServerResponse 详解](http/server-response.md)
32. [请求方法与路由](http/methods-routing.md)
33. [请求头解析与处理](http/request-headers.md)
34. [响应头设置最佳实践](http/response-headers.md)
35. [请求体解析策略](http/body-parsing.md)
36. [表单数据处理](http/form-data.md)
37. [文件上传处理](http/file-upload.md)
38. [JSON 请求与响应](http/json-handling.md)
39. [流式响应](http/streaming-response.md)
40. [HTTP 状态码使用指南](http/status-codes.md)
41. [HTTP 缓存机制](http/caching.md)
42. [HTTP 压缩](http/compression.md)
43. [Cookie 处理](http/cookies.md)
44. [HTTP 认证](http/authentication.md)
45. [HTTP 代理实现](http/http-proxy.md)

---

### 第五部分：HTTP 客户端

46. [http.request 详解](http-client/http-request.md)
47. [发起 GET 请求](http-client/get-request.md)
48. [发起 POST 请求](http-client/post-request.md)
49. [请求超时与重试](http-client/timeout-retry.md)
50. [HTTP Agent 与连接复用](http-client/http-agent.md)
51. [跟随重定向](http-client/redirects.md)
52. [下载文件](http-client/file-download.md)
53. [现代 HTTP 客户端库对比](http-client/client-libraries.md)

---

### 第六部分：HTTPS 与 TLS

54. [TLS/SSL 原理概述](https/tls-overview.md)
55. [证书与密钥](https/certificates.md)
56. [创建 HTTPS 服务器](https/https-server.md)
57. [自签名证书开发使用](https/self-signed.md)
58. [Let's Encrypt 证书获取](https/lets-encrypt.md)
59. [TLS 配置最佳实践](https/tls-best-practices.md)
60. [客户端证书验证(mTLS)](https/mutual-tls.md)
61. [HTTPS 性能优化](https/https-performance.md)
62. [HTTP 到 HTTPS 重定向](https/redirect-to-https.md)

---

### 第七部分：HTTP/2

63. [HTTP/2 协议特性](http2/http2-features.md)
64. [http2 模块概览](http2/module-overview.md)
65. [创建 HTTP/2 服务器](http2/http2-server.md)
66. [HTTP/2 流与多路复用](http2/streams-multiplexing.md)
67. [服务器推送(Server Push)](http2/server-push.md)
68. [HTTP/2 客户端](http2/http2-client.md)
69. [HTTP/1.1 与 HTTP/2 兼容](http2/compatibility.md)
70. [HTTP/2 性能分析](http2/performance-analysis.md)

---

### 第八部分：WebSocket

71. [WebSocket 协议概述](websocket/protocol-overview.md)
72. [WebSocket 握手过程](websocket/handshake.md)
73. [ws 库入门](websocket/ws-library.md)
74. [WebSocket 服务器实现](websocket/ws-server.md)
75. [WebSocket 客户端实现](websocket/ws-client.md)
76. [消息格式设计](websocket/message-format.md)
77. [心跳与连接保活](websocket/heartbeat.md)
78. [广播与房间管理](websocket/broadcast-rooms.md)
79. [WebSocket 认证](websocket/authentication.md)
80. [WebSocket 与 HTTP 共存](websocket/with-http.md)
81. [WebSocket 负载均衡](websocket/load-balancing.md)
82. [Socket.io 入门](websocket/socket-io.md)

---

### 第九部分：高级网络主题

83. [DNS 解析：dns 模块](advanced/dns-module.md)
84. [自定义 DNS 解析](advanced/custom-dns.md)
85. [网络接口信息：os.networkInterfaces](advanced/network-interfaces.md)
86. [HTTP/HTTPS 代理配置](advanced/proxy-configuration.md)
87. [SOCKS 代理支持](advanced/socks-proxy.md)
88. [网络调试与抓包](advanced/network-debugging.md)
89. [网络性能测试](advanced/performance-testing.md)
90. [网络安全最佳实践](advanced/security-practices.md)
91. [IPv6 支持](advanced/ipv6.md)
92. [网络编程总结与展望](advanced/summary.md)

---

