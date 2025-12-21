# Node.js HTTP 适配器

Axios 能在 Node.js 中运行，靠的是 HTTP 适配器。这一节我们实现它。

## 本节目标

通过本节学习，你将掌握：

1. **理解 Node.js HTTP 模块**：http/https 模块的基本用法
2. **实现 HTTP 适配器**：将 Node.js 底层 API 封装为 Axios 适配器
3. **处理流式请求**：支持文件上传等流式数据
4. **处理压缩响应**：gzip/deflate 解压缩
5. **支持代理配置**：企业环境常见需求

## Node.js HTTP 模块基础

Node.js 提供了 `http` 和 `https` 模块发送请求。与浏览器的 XMLHttpRequest 不同，Node.js 采用事件驱动的流式 API：

```typescript
import http from 'http';
import https from 'https';

// Node.js HTTP 请求是事件驱动的
const req = https.request({
  hostname: 'api.example.com',  // 主机名（不含协议）
  port: 443,                    // 端口
  path: '/users',               // 路径（含查询字符串）
  method: 'GET',                // HTTP 方法
}, (res) => {
  // 响应也是事件驱动的
  let data = '';
  res.on('data', chunk => data += chunk);  // 逐块接收数据
  res.on('end', () => console.log(data));  // 接收完成
});

req.on('error', (e) => console.error(e));  // 错误处理
req.end();  // 结束请求（必须调用）
```

**关键概念**：

| 概念 | 说明 |
|------|------|
| 流式响应 | 数据分块到达，通过 `data` 事件接收 |
| 必须调用 end() | 标记请求体结束，即使没有请求体 |
| http vs https | 两个独立模块，需要根据协议选择 |

## 解析 URL

首先需要从完整 URL 提取各部分，因为 Node.js http 模块需要分开的参数：

```typescript
// src/helpers/parseURL.ts

export interface ParsedURL {
  protocol: string;   // 协议：'http:' 或 'https:'
  hostname: string;   // 主机名：'api.example.com'
  port: string;       // 端口：'443'
  path: string;       // 路径：'/users?page=1'
  auth?: string;      // 认证：'username:password'
}

/**
 * 解析 URL 字符串为各组成部分
 * 
 * 示例：
 * parseURL('https://user:pass@api.example.com:8080/users?page=1')
 * → { protocol: 'https:', hostname: 'api.example.com', 
 *     port: '8080', path: '/users?page=1', auth: 'user:pass' }
 */
export function parseURL(url: string): ParsedURL {
  const urlObj = new URL(url);
  
  return {
    protocol: urlObj.protocol,
    hostname: urlObj.hostname,
    // 如果没有指定端口，根据协议使用默认端口
    port: urlObj.port || (urlObj.protocol === 'https:' ? '443' : '80'),
    // 路径包含查询字符串
    path: urlObj.pathname + urlObj.search,
    // 基本认证信息
    auth: urlObj.username 
      ? `${urlObj.username}:${urlObj.password}` 
      : undefined,
  };
}
```

## HTTP 适配器实现

下面是完整的 HTTP 适配器实现：

```typescript
// src/adapters/http.ts

import http from 'http';
import https from 'https';
import { URL } from 'url';
import { AxiosRequestConfig, AxiosResponse, AxiosAdapter } from '../types';
import { buildURL } from '../helpers/buildURL';
import { createError } from '../core/AxiosError';

/**
 * Node.js HTTP 适配器
 * 
 * 职责：将 Axios 配置转换为 Node.js http/https 请求
 * 
 * 与浏览器适配器的主要区别：
 * 1. 使用 http/https 模块而非 XHR
 * 2. 需要手动处理响应流
 * 3. 需要手动处理压缩
 * 4. 完整的代理支持
 */
export const httpAdapter: AxiosAdapter = function <T = any>(
  config: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
  return new Promise((resolve, reject) => {
    // ========== 1. 构建完整 URL ==========
    const fullUrl = buildURL({
      url: config.url,
      baseURL: config.baseURL,
      params: config.params,
      paramsSerializer: config.paramsSerializer,
    });

    // ========== 2. 解析 URL 并选择传输模块 ==========
    const urlObj = new URL(fullUrl);
    const isHttps = urlObj.protocol === 'https:';
    // 根据协议选择 http 或 https 模块
    const transport = isHttps ? https : http;

    // ========== 3. 构建请求选项 ==========
    // 将 Axios 配置转换为 Node.js http 模块需要的格式
    const options: http.RequestOptions = {
      hostname: urlObj.hostname,                    // 主机名
      port: urlObj.port || (isHttps ? 443 : 80),   // 端口（默认 80/443）
      path: urlObj.pathname + urlObj.search,       // 路径 + 查询字符串
      method: config.method?.toUpperCase() || 'GET',
      headers: config.headers,
      timeout: config.timeout,
    };

    // ========== 4. 处理 HTTP 基本认证 ==========
    if (config.auth) {
      const { username, password } = config.auth;
      options.auth = `${username}:${password}`;  // 格式：user:pass
    }

    // ========== 5. 发送请求 ==========
    const req = transport.request(options, (res) => {
      // 收集响应数据块
      const chunks: Buffer[] = [];

      // ---------- 5.1 逐块接收数据 ----------
      res.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
        
        // 触发下载进度回调
        if (config.onDownloadProgress) {
          const total = parseInt(res.headers['content-length'] || '0', 10);
          const loaded = chunks.reduce((acc, c) => acc + c.length, 0);
          config.onDownloadProgress({ loaded, total } as ProgressEvent);
        }
      });

      // ---------- 5.2 数据接收完成 ----------
      res.on('end', () => {
        // 合并所有 chunks 为完整的 Buffer
        const buffer = Buffer.concat(chunks);
        
        // 根据 responseType 转换数据格式
        let data: any = buffer;
        if (!config.responseType || config.responseType === 'text' || config.responseType === 'json') {
          data = buffer.toString('utf-8');  // 转为字符串
        }

        // 构建 Axios 响应对象
        const response: AxiosResponse<T> = {
          data,                                      // 响应数据
          status: res.statusCode || 0,               // HTTP 状态码
          statusText: res.statusMessage || '',       // 状态文本
          headers: res.headers as Record<string, string>,
          config,
          request: req,                              // 原始请求对象
        };

        // 根据状态码判断成功/失败
        settle(resolve, reject, response);
      });

      res.on('error', (err) => {
        reject(createError(err.message, config, null, req));
      });
    });

    // 6. 处理请求错误
    req.on('error', (err) => {
      reject(createError(err.message, config, err.code, req));
    });

    // 7. 处理超时
    if (config.timeout) {
      req.setTimeout(config.timeout, () => {
        req.destroy();
        reject(createError(
          `Timeout of ${config.timeout}ms exceeded`,
          config,
          'ECONNABORTED',
          req
        ));
      });
    }

    // 8. 处理取消
    if (config.cancelToken) {
      config.cancelToken.promise.then((reason) => {
        req.destroy();
        reject(reason);
      });
    }

    // 9. 发送请求体
    if (config.data) {
      // 如果是 Buffer 或字符串，直接发送
      if (Buffer.isBuffer(config.data) || typeof config.data === 'string') {
        req.write(config.data);
      }
      // 如果是流，pipe 到请求
      else if (config.data.pipe) {
        config.data.pipe(req);
        return;  // 流会自动 end
      }
    }

    req.end();
  });
};

// settle 函数同 XHR 适配器
function settle(
  resolve: (value: AxiosResponse) => void,
  reject: (reason: any) => void,
  response: AxiosResponse
): void {
  const config = response.config;
  const validateStatus = config.validateStatus || ((status) => status >= 200 && status < 300);

  if (validateStatus(response.status)) {
    resolve(response);
  } else {
    reject(createError(
      `Request failed with status code ${response.status}`,
      config,
      null,
      response.request,
      response
    ));
  }
}
```

## 处理流式请求

Node.js 可以发送流数据（如文件上传）：

```typescript
import fs from 'fs';

axios.post('/upload', fs.createReadStream('./large-file.zip'), {
  headers: {
    'Content-Type': 'application/octet-stream',
    'Content-Length': fs.statSync('./large-file.zip').size,
  },
});
```

适配器中的处理：

```typescript
if (config.data && config.data.pipe) {
  // 监听上传进度
  if (config.onUploadProgress) {
    let loaded = 0;
    const total = parseInt(String(config.headers?.['Content-Length']) || '0', 10);
    
    config.data.on('data', (chunk: Buffer) => {
      loaded += chunk.length;
      config.onUploadProgress!({ loaded, total } as ProgressEvent);
    });
  }
  
  config.data.pipe(req);
  return;
}
```

## 处理压缩响应

服务器可能返回 gzip 压缩的数据：

```typescript
import zlib from 'zlib';

// 在请求选项中声明支持压缩
options.headers = {
  ...options.headers,
  'Accept-Encoding': 'gzip, deflate',
};

// 处理响应时解压
res.on('end', () => {
  let buffer = Buffer.concat(chunks);
  const encoding = res.headers['content-encoding'];
  
  if (encoding === 'gzip') {
    buffer = zlib.gunzipSync(buffer);
  } else if (encoding === 'deflate') {
    buffer = zlib.inflateSync(buffer);
  }
  
  // 继续处理...
});
```

## 代理支持

企业环境经常需要通过代理：

```typescript
import { HttpsProxyAgent } from 'https-proxy-agent';

const agent = new HttpsProxyAgent('http://proxy.example.com:8080');

axios.get('https://api.example.com', {
  httpsAgent: agent,
});
```

在适配器中支持：

```typescript
// 添加到请求选项
if (config.httpsAgent && isHttps) {
  options.agent = config.httpsAgent;
} else if (config.httpAgent && !isHttps) {
  options.agent = config.httpAgent;
}
```

## 测试

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import http from 'http';
import { httpAdapter } from '../src/adapters/http';

describe('httpAdapter', () => {
  let server: http.Server;
  let port: number;

  beforeEach((done) => {
    server = http.createServer((req, res) => {
      // 简单的 echo 服务器
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          method: req.method,
          url: req.url,
          body,
        }));
      });
    });
    
    server.listen(0, () => {
      const addr = server.address();
      port = typeof addr === 'object' ? addr!.port : 0;
      done();
    });
  });

  afterEach((done) => {
    server.close(done);
  });

  it('should make GET request', async () => {
    const response = await httpAdapter({
      url: `http://localhost:${port}/test`,
      method: 'get',
    });

    expect(response.status).toBe(200);
    const data = JSON.parse(response.data);
    expect(data.method).toBe('GET');
    expect(data.url).toBe('/test');
  });

  it('should make POST request with body', async () => {
    // 验证 POST 请求正确发送
    const response = await httpAdapter({
      url: `http://localhost:${port}/api`,
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ name: 'test' }),
    });

    expect(response.status).toBe(200);
    const data = JSON.parse(response.data);
    expect(data.method).toBe('POST');
    expect(JSON.parse(data.body)).toEqual({ name: 'test' });
  });
});
```

## 常见问题解答

### Q: 为什么需要手动处理压缩？

浏览器会自动解压 gzip/deflate 响应，但 Node.js 不会。如果服务器返回压缩数据，需要使用 `zlib` 模块手动解压：

```typescript
import zlib from 'zlib';

// 检查响应是否压缩
const encoding = res.headers['content-encoding'];
if (encoding === 'gzip') {
  buffer = zlib.gunzipSync(buffer);
}
```

### Q: 如何处理 HTTPS 证书问题？

开发环境可能需要跳过证书验证：

```typescript
// 仅开发环境使用！
const options = {
  // ...
  rejectUnauthorized: false,  // 跳过证书验证
};
```

### Q: 为什么流式响应在 Node.js 中更强大？

因为 Node.js 的 Stream API 设计更完善，可以：
- 处理任意大小的文件
- 实现管道操作（pipe）
- 精确控制内存使用

## 三种适配器对比

| 特性 | XHR 适配器 | HTTP 适配器 | Fetch 适配器 |
|------|-----------|-------------|-------------|
| 运行环境 | 浏览器 | Node.js | 浏览器/Node18+ |
| 底层 API | XMLHttpRequest | http/https 模块 | Fetch API |
| 流支持 | 有限 | 完整 | ReadableStream |
| 压缩 | 浏览器自动 | 需手动处理 | 浏览器自动 |
| 代理 | 受浏览器限制 | 完整支持 | 受浏览器限制 |
| Cookie | 自动处理 | 需手动管理 | 自动处理 |
| 上传进度 | ✅ 支持 | ✅ 支持 | ❌ 不支持 |

## 小结

本节我们实现了 Node.js 环境下的 HTTP 适配器：

```
HTTP 适配器工作流程
├── 1. URL 处理
│   ├── 构建完整 URL
│   └── 解析为 hostname/port/path
├── 2. 选择传输模块
│   ├── https: → https 模块
│   └── http: → http 模块
├── 3. 发送请求
│   ├── transport.request(options)
│   └── req.end(data)
├── 4. 接收响应
│   ├── res.on('data') → 收集 chunks
│   └── res.on('end') → 合并并处理
└── 5. 错误处理
    ├── req.on('error') → 网络错误
    └── req.on('timeout') → 超时错误
```

**核心要点**：

- 使用 `http`/`https` 模块发送请求
- 解析 URL 获取主机名、端口、路径
- 收集响应 chunks 并合并为完整数据
- 支持流式请求（文件上传）
- 需要手动处理压缩响应
- 完整支持代理配置

下一节我们实现 Fetch 适配器。
