# HTTP 协议基础回顾

> 作为前端开发者，你每天都在与 HTTP 打交道——发送 AJAX 请求、接收 JSON 响应。但你真的理解 HTTP 协议本身吗？

在深入 Node.js 的 http 模块之前，让我们先回顾 HTTP 协议的核心概念。这些知识将帮助你理解 Node.js 是如何处理 HTTP 的。

## HTTP 是什么？

HTTP（HyperText Transfer Protocol）是一个**应用层协议**，运行在 TCP 之上：

```
┌─────────────────────────────────────────────────────────┐
│                      HTTP                               │
│         请求/响应模型、方法、状态码、头部                  │
├─────────────────────────────────────────────────────────┤
│                      TCP                                │
│              可靠传输、连接管理                          │
├─────────────────────────────────────────────────────────┤
│                      IP                                 │
│                    寻址、路由                            │
└─────────────────────────────────────────────────────────┘
```

HTTP 的核心特征：
- **无状态**：每个请求独立，服务器不记住之前的请求
- **请求-响应模型**：客户端发起请求，服务器返回响应
- **基于文本**：协议本身是可读的文本格式（HTTP/2 之前）

## HTTP 请求结构

一个 HTTP 请求由三部分组成：

```
┌──────────────────────────────────────────────────────────┐
│ 请求行：方法 路径 版本                                     │
├──────────────────────────────────────────────────────────┤
│ 请求头：键值对形式的元数据                                 │
│ Host: example.com                                        │
│ Content-Type: application/json                           │
│ Authorization: Bearer xxx                                │
├──────────────────────────────────────────────────────────┤
│ 空行（分隔头部和正文）                                    │
├──────────────────────────────────────────────────────────┤
│ 请求正文（可选）                                          │
│ {"name": "John"}                                         │
└──────────────────────────────────────────────────────────┘
```

实际的 HTTP 请求文本：

```http
POST /api/users HTTP/1.1
Host: example.com
Content-Type: application/json
Content-Length: 27

{"name":"John","age":30}
```

## HTTP 响应结构

```
┌──────────────────────────────────────────────────────────┐
│ 状态行：版本 状态码 状态描述                               │
├──────────────────────────────────────────────────────────┤
│ 响应头：键值对形式的元数据                                 │
│ Content-Type: application/json                           │
│ Content-Length: 45                                       │
├──────────────────────────────────────────────────────────┤
│ 空行                                                     │
├──────────────────────────────────────────────────────────┤
│ 响应正文                                                 │
│ {"id":1,"name":"John","age":30}                          │
└──────────────────────────────────────────────────────────┘
```

实际的 HTTP 响应文本：

```http
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 45
Date: Mon, 01 Jan 2024 00:00:00 GMT

{"id":1,"name":"John","age":30}
```

## HTTP 方法

HTTP 定义了一组**方法**（也叫动词），表示对资源的不同操作：

| 方法 | 语义 | 幂等 | 安全 | 有请求体 |
|------|------|------|------|---------|
| GET | 获取资源 | ✓ | ✓ | ✗ |
| POST | 创建资源 | ✗ | ✗ | ✓ |
| PUT | 替换资源 | ✓ | ✗ | ✓ |
| PATCH | 部分更新 | ✗ | ✗ | ✓ |
| DELETE | 删除资源 | ✓ | ✗ | ✗ |
| HEAD | 获取头部 | ✓ | ✓ | ✗ |
| OPTIONS | 获取选项 | ✓ | ✓ | ✗ |

**幂等性**：多次执行结果相同（GET 多次返回相同结果，DELETE 多次删除同一资源结果一样）

**安全性**：不会修改服务器状态（GET 只读取，不修改）

## HTTP 状态码

状态码告诉客户端请求的处理结果：

### 1xx - 信息性

```javascript
100 Continue      // 继续发送请求体
101 Switching Protocols  // 协议切换（WebSocket 升级）
```

### 2xx - 成功

```javascript
200 OK            // 请求成功
201 Created       // 资源已创建
204 No Content    // 成功但无返回内容
```

### 3xx - 重定向

```javascript
301 Moved Permanently  // 永久重定向
302 Found             // 临时重定向
304 Not Modified      // 资源未修改（缓存可用）
```

### 4xx - 客户端错误

```javascript
400 Bad Request       // 请求格式错误
401 Unauthorized      // 未认证
403 Forbidden         // 无权限
404 Not Found         // 资源不存在
405 Method Not Allowed  // 方法不允许
422 Unprocessable Entity  // 语义错误（验证失败）
429 Too Many Requests    // 请求过多（限流）
```

### 5xx - 服务器错误

```javascript
500 Internal Server Error  // 服务器内部错误
502 Bad Gateway           // 网关错误
503 Service Unavailable   // 服务不可用
504 Gateway Timeout       // 网关超时
```

## HTTP 头部

头部是 HTTP 的元数据，分为请求头和响应头：

### 常见请求头

```javascript
// 客户端信息
Host: example.com           // 目标主机（必需）
User-Agent: Mozilla/5.0...  // 客户端标识

// 内容相关
Content-Type: application/json  // 请求体类型
Content-Length: 27              // 请求体长度

// 认证
Authorization: Bearer eyJ...    // 认证凭证
Cookie: session=abc123          // Cookie

// 缓存
If-None-Match: "etag-value"     // 条件请求
If-Modified-Since: Mon, 01...   // 条件请求

// 内容协商
Accept: application/json        // 期望的响应类型
Accept-Language: zh-CN,en       // 期望的语言
Accept-Encoding: gzip, deflate  // 支持的压缩
```

### 常见响应头

```javascript
// 内容相关
Content-Type: application/json; charset=utf-8
Content-Length: 256
Content-Encoding: gzip  // 压缩方式

// 缓存控制
Cache-Control: max-age=3600
ETag: "abc123"
Last-Modified: Mon, 01 Jan 2024 00:00:00 GMT

// 安全
Set-Cookie: session=abc; HttpOnly; Secure
Strict-Transport-Security: max-age=31536000

// CORS（跨域）
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST
```

## HTTP 连接管理

### HTTP/1.0 vs HTTP/1.1

```
HTTP/1.0：每个请求一个连接
┌─────────────────────────────────────────────────────┐
│ 请求1 ──► 响应1 ──► 关闭 ──► 新连接 ──► 请求2 ──► ...│
└─────────────────────────────────────────────────────┘

HTTP/1.1：连接复用（Keep-Alive）
┌─────────────────────────────────────────────────────┐
│ 建立连接 ──► 请求1 ──► 响应1 ──► 请求2 ──► 响应2 ──►...│
└─────────────────────────────────────────────────────┘
```

### HTTP/2 多路复用

```
HTTP/2：同一连接并行多个请求
┌─────────────────────────────────────────────────────┐
│ 单一连接：                                           │
│   ├── 请求1 ──────────► 响应1                        │
│   ├── 请求2 ────────────────► 响应2                  │
│   └── 请求3 ────► 响应3                              │
└─────────────────────────────────────────────────────┘
```

## 在 Node.js 中的体现

Node.js 的 http 模块将这些概念映射为对象：

```javascript
const http = require('http');

http.createServer((req, res) => {
  // req（IncomingMessage）代表请求
  console.log(req.method);    // GET, POST, ...
  console.log(req.url);       // /api/users
  console.log(req.headers);   // { host: '...', ... }
  
  // res（ServerResponse）用于构建响应
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ message: 'Hello' }));
});
```

## 本章小结

- HTTP 是基于 TCP 的应用层协议，采用请求-响应模型
- 请求由请求行、头部、空行、正文组成
- HTTP 方法有语义：GET 读取，POST 创建，PUT 替换，DELETE 删除
- 状态码表示结果：2xx 成功，4xx 客户端错误，5xx 服务器错误
- 头部携带元数据：Content-Type、Authorization、Cache-Control 等
- HTTP/1.1 支持连接复用，HTTP/2 支持多路复用

下一章我们将深入 Node.js 的 http 模块架构。
