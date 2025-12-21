# Fetch 适配器：现代浏览器方案

Fetch API 是现代浏览器的标准 HTTP 接口。Axios 1.x 开始支持 Fetch 适配器。

## 本节目标

通过本节学习，你将掌握：

1. **理解 Fetch API 与 XHR 的差异**：API 设计理念的不同
2. **实现 Fetch 适配器**：将 Fetch API 封装为 Axios 适配器
3. **处理超时机制**：使用 AbortController 实现超时控制
4. **支持下载进度**：利用 ReadableStream 实现进度监控
5. **了解 Fetch 的局限性**：知道什么场景不适合使用 Fetch

## 为什么需要 Fetch 适配器？

XMLHttpRequest 虽然功能完善，但存在一些历史包袱：

| 对比项 | XMLHttpRequest | Fetch API |
|-------|---------------|-----------|
| API 风格 | 事件驱动，状态机 | Promise 原生 |
| 流式响应 | 不支持 | ReadableStream |
| Service Worker | 部分支持 | 完整支持 |
| 代码简洁度 | 繁琐 | 简洁 |
| 超时控制 | 原生 timeout 属性 | 需 AbortController |
| 上传进度 | ✅ 支持 | ❌ 不支持 |

**什么时候使用 Fetch 适配器？**

- 需要流式响应（如大文件下载、Server-Sent Events）
- Service Worker 环境
- 现代项目，不需要兼容旧浏览器
- 不需要上传进度功能

## 基础实现

下面我们实现一个完整的 Fetch 适配器：

```typescript
// src/adapters/fetch.ts

import { AxiosRequestConfig, AxiosResponse, AxiosAdapter } from '../types';
import { buildURL } from '../helpers/buildURL';
import { createError } from '../core/AxiosError';

/**
 * Fetch 适配器
 * 
 * 设计思路：
 * 1. 将 Axios 配置转换为 Fetch 的 RequestInit
 * 2. 处理响应，转换为 Axios 的 AxiosResponse 格式
 * 3. 统一错误处理（网络错误、取消、超时）
 */
export const fetchAdapter: AxiosAdapter = async function <T = any>(
  config: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
  // ========== 1. 构建完整 URL ==========
  // 合并 baseURL、url、params
  const url = buildURL({
    url: config.url,
    baseURL: config.baseURL,
    params: config.params,
    paramsSerializer: config.paramsSerializer,
  });

  // ========== 2. 构建 Fetch 选项 ==========
  // 将 Axios 配置转换为 Fetch 的 RequestInit
  const fetchOptions: RequestInit = {
    method: config.method?.toUpperCase() || 'GET',  // 方法名大写
    headers: config.headers,                        // 直接使用请求头
    body: config.data,                              // 请求体
    credentials: config.withCredentials             // Cookie 处理
      ? 'include'      // 跨域也携带 Cookie
      : 'same-origin', // 只有同源才携带
    signal: config.signal,  // AbortController 信号
  };

  // ========== 3. 发送请求 ==========
  let response: Response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (error) {
    // 请求被取消（AbortController.abort()）
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw createError('Request aborted', config, 'ECONNABORTED');
    }
    // 其他错误都视为网络错误
    throw createError('Network Error', config, null);
  }

  // ========== 4. 解析响应头 ==========
  // Fetch 的 Headers 对象转换为普通对象
  const headers: Record<string, string> = {};
  response.headers.forEach((value, name) => {
    headers[name.toLowerCase()] = value;  // 统一转为小写
  });

  // ========== 5. 解析响应体 ==========
  let data: any;
  try {
    data = await parseResponseBody(response, config.responseType);
  } catch (error) {
    throw createError('Response parsing failed', config, null);
  }

  // ========== 6. 构建 Axios 响应对象 ==========
  // 转换为 Axios 统一的响应格式
  const axiosResponse: AxiosResponse<T> = {
    data,                          // 解析后的响应数据
    status: response.status,       // HTTP 状态码
    statusText: response.statusText,
    headers,                       // 响应头
    config,                        // 原始配置
    request: null,                 // Fetch 没有请求对象
  };

  // ========== 7. 状态码验证 ==========
  // 检查状态码是否表示成功
  const validateStatus = config.validateStatus || (s => s >= 200 && s < 300);
  if (!validateStatus(response.status)) {
    throw createError(
      `Request failed with status code ${response.status}`,
      config,
      null,
      null,
      axiosResponse
    );
  }

  return axiosResponse;
};

/**
 * 根据 responseType 解析响应体
 * 
 * Fetch API 提供了多种解析方法，每种返回不同的数据类型
 */
async function parseResponseBody(
  response: Response,
  responseType?: string
): Promise<any> {
  switch (responseType) {
    case 'arraybuffer':
      return response.arrayBuffer();  // 返回 ArrayBuffer
    case 'blob':
      return response.blob();          // 返回 Blob（文件下载）
    case 'json':
      return response.json();          // 返回解析后的 JSON
    case 'text':
    default:
      return response.text();          // 返回文本字符串
  }
}
```

## 处理超时

Fetch API 本身不支持超时，这是它与 XHR 的一个重要区别。我们需要使用 AbortController 来实现：

```
超时实现原理：
                           
   开始请求              超时时间到达
      │                      │
      ▼                      ▼
  ┌───────┐  setTimeout  ┌───────┐
  │ fetch │──────────────│ abort │
  └───────┘              └───────┘
      │                      │
      └──────── 竞争 ────────┘
                │
    先完成的决定结果（响应 or 超时错误）
```

```typescript
// src/adapters/fetch.ts

export const fetchAdapter: AxiosAdapter = async function <T = any>(
  config: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
  // ========== 超时处理 ==========
  // 创建内部的 AbortController 用于超时
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  // 如果配置了超时，设置定时器
  if (config.timeout && config.timeout > 0) {
    timeoutId = setTimeout(() => {
      controller.abort();  // 超时后取消请求
    }, config.timeout);
  }

  // ========== 信号合并 ==========
  // 可能同时存在用户传入的 signal（手动取消）和超时 signal
  // 需要合并两个信号，任一触发都取消请求
  const signal = config.signal 
    ? anySignal([config.signal, controller.signal])  // 合并信号
    : controller.signal;                             // 只有超时信号

  const fetchOptions: RequestInit = {
    // ...其他选项
    signal,  // 统一的取消信号
  };

  try {
    const response = await fetch(url, fetchOptions);
    // ...处理响应
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      // 判断是超时还是主动取消
      // 如果 timeoutId 未定义，说明没设置超时，是主动取消
      if (timeoutId === undefined) {
        throw createError('Request aborted', config, 'ECONNABORTED');
      } else {
        // 设置了超时，是超时导致的取消
        throw createError(
          `Timeout of ${config.timeout}ms exceeded`,
          config,
          'ECONNABORTED'
        );
      }
    }
    throw error;
  } finally {
    // 清理超时计时器
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
};

/**
 * 合并多个 AbortSignal
 */
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      return controller.signal;
    }
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  
  return controller.signal;
}
```

## 处理进度

Fetch 的进度监控与 XHR 不同：

```typescript
// 下载进度：使用 ReadableStream
async function parseResponseBodyWithProgress(
  response: Response,
  responseType: string | undefined,
  onProgress?: (event: ProgressEvent) => void
): Promise<any> {
  if (!onProgress || !response.body) {
    return parseResponseBody(response, responseType);
  }

  const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
    loaded += value.length;

    // 触发进度回调
    onProgress({
      loaded,
      total: contentLength,
      lengthComputable: contentLength > 0,
    } as ProgressEvent);
  }

  // 合并所有 chunks
  const buffer = new Uint8Array(loaded);
  let position = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, position);
    position += chunk.length;
  }

  // 转换为目标类型
  switch (responseType) {
    case 'arraybuffer':
      return buffer.buffer;
    case 'blob':
      return new Blob([buffer]);
    case 'json':
      return JSON.parse(new TextDecoder().decode(buffer));
    default:
      return new TextDecoder().decode(buffer);
  }
}
```

上传进度目前 Fetch 不支持，需要使用其他方案。

## 处理取消

使用 AbortController 取消请求：

```typescript
// 使用方式
const controller = new AbortController();

axios.get('/api', {
  signal: controller.signal,
}).catch(error => {
  if (axios.isCancel(error)) {
    console.log('Request cancelled');
  }
});

// 取消请求
controller.abort();
```

适配器中已经处理了 `config.signal`。

## XHR vs Fetch 适配器对比

| 特性 | XHR | Fetch |
|------|-----|-------|
| 超时 | 原生支持 | 需要 AbortController |
| 取消 | xhr.abort() | AbortController |
| 上传进度 | ✅ 支持 | ❌ 不支持 |
| 下载进度 | ✅ 支持 | ✅ ReadableStream |
| 流式响应 | 有限 | ✅ 完整支持 |
| 同步请求 | ✅ 支持 | ❌ 不支持 |

## 何时使用 Fetch 适配器？

推荐场景：
- 需要流式响应
- Service Worker 环境
- 现代浏览器项目

不推荐场景：
- 需要上传进度
- 需要兼容旧浏览器
- 需要同步请求

## 配置默认适配器

```typescript
// src/defaults/index.ts

function getDefaultAdapter(): AxiosAdapter {
  // 优先使用 Fetch（如果可用且支持）
  if (typeof fetch !== 'undefined' && typeof AbortController !== 'undefined') {
    return fetchAdapter;
  }
  
  // 回退到 XHR
  if (typeof XMLHttpRequest !== 'undefined') {
    return xhrAdapter;
  }
  
  // Node.js 环境
  if (typeof process !== 'undefined') {
    return httpAdapter;
  }
  
  throw new Error('No suitable adapter found');
}

// 或者让用户选择
export const defaults: AxiosDefaults = {
  adapter: xhrAdapter,  // 默认 XHR 保证兼容性
  // ...
};
```

## 测试

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchAdapter } from '../src/adapters/fetch';

describe('fetchAdapter', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should make GET request', async () => {
    const mockResponse = new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    vi.mocked(fetch).mockResolvedValue(mockResponse);

    const response = await fetchAdapter({
      url: 'https://api.example.com/test',
      method: 'get',
      responseType: 'json',
    });

    // 验证 fetch 被正确调用
    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.com/test',
      expect.objectContaining({ method: 'GET' })
    );
    expect(response.data).toEqual({ success: true });
  });

  it('should handle network error', async () => {
    // 模拟网络错误
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'));

    // 验证抛出 Network Error
    await expect(fetchAdapter({
      url: 'https://api.example.com/test',
      method: 'get',
    })).rejects.toThrow('Network Error');
  });

  it('should handle abort', async () => {
    // 模拟请求被取消
    const abortError = new DOMException('Aborted', 'AbortError');
    vi.mocked(fetch).mockRejectedValue(abortError);

    // 验证抛出取消错误
    await expect(fetchAdapter({
      url: 'https://api.example.com/test',
      method: 'get',
    })).rejects.toThrow('Request aborted');
  });
});
```

## 常见问题解答

### Q: Fetch 适配器能完全替代 XHR 适配器吗？

不能。有以下场景仍需使用 XHR：

1. **需要上传进度**：Fetch 不支持 `onUploadProgress`
2. **需要同步请求**：Fetch 只支持异步（虽然不推荐同步）
3. **需要兼容旧浏览器**：IE 不支持 Fetch

### Q: 如何处理多个取消信号？

使用 `anySignal` 工具函数合并多个信号：

```typescript
// 任一信号触发都会取消请求
const combinedSignal = anySignal([
  controller1.signal,
  controller2.signal,
  externalSignal,
]);
```

### Q: 下载进度支持，但上传进度不支持的原因？

- **下载**：可以通过 `response.body`（ReadableStream）逐块读取
- **上传**：请求体一旦发送就无法跟踪，Fetch 规范未提供相关 API

## 小结

本节我们实现了基于现代 Fetch API 的适配器：

```
Fetch 适配器工作流程
├── 1. 配置转换
│   ├── URL 构建（baseURL + url + params）
│   ├── 方法转换（大写）
│   └── 凭证处理（credentials）
├── 2. 超时处理
│   ├── AbortController 创建
│   ├── setTimeout 设置
│   └── 信号合并（anySignal）
├── 3. 请求发送
│   └── fetch(url, options)
├── 4. 响应处理
│   ├── 响应头解析
│   ├── 响应体解析（json/text/blob/arraybuffer）
│   └── 状态码验证
└── 5. 错误处理
    ├── 网络错误 → Network Error
    ├── 超时 → Timeout exceeded
    └── 取消 → Request aborted
```

**Fetch vs XHR 适配器选择**：

| 场景 | 推荐适配器 |
|------|-----------|
| 现代项目，不需上传进度 | Fetch |
| 需要上传进度 | XHR |
| Service Worker 环境 | Fetch |
| 流式响应处理 | Fetch |
| 需要兼容旧浏览器 | XHR |

至此，三种适配器都已实现。下一章我们进入拦截器的世界。
