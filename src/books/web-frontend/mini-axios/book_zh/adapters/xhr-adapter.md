# 实现 XHR 适配器

XMLHttpRequest 是浏览器中发送 HTTP 请求的传统方式。本节我们实现一个完整的 XHR 适配器。

## 本节目标

通过本节学习，你将：

1. 深入理解 XMLHttpRequest 的完整生命周期
2. 实现一个生产级的 XHR 适配器
3. 处理各种边界情况和错误
4. 理解事件处理和状态管理

## XMLHttpRequest 基础

### 请求生命周期

```
创建 XHR 对象
     │
     ↓
open() 初始化
     │
     ↓
设置 headers
     │
     ↓
send() 发送请求
     │
     ├─────────────────┬─────────────────┐
     ↓                 ↓                 ↓
  onload           onerror           ontimeout
  (成功)            (错误)            (超时)
     │                 │                 │
     └────────────────┴────────────────┘
                       │
                       ↓
                 Promise resolve/reject
```

### XHR 核心 API

```typescript
// 创建实例
const xhr = new XMLHttpRequest();

// 初始化请求（异步）
xhr.open(method, url, async);

// 设置请求头
xhr.setRequestHeader(name, value);

// 发送请求
xhr.send(body);

// 监听状态变化
xhr.onreadystatechange = function() {
  // readyState: 0-4
  // 0: UNSENT
  // 1: OPENED
  // 2: HEADERS_RECEIVED
  // 3: LOADING
  // 4: DONE
};

// 获取响应
xhr.status        // 状态码
xhr.statusText    // 状态文本
xhr.responseText  // 文本响应
xhr.response      // 根据 responseType 返回的响应
xhr.getAllResponseHeaders()  // 所有响应头
```

## XHR 适配器实现

### 完整代码

```typescript
// src/adapters/xhr.ts

import {
  AxiosRequestConfig,
  AxiosResponse,
  AxiosAdapter
} from '../types';
import { buildURL } from '../helpers/buildURL';
import { parseHeaders } from '../helpers/parseHeaders';
import { createError } from '../core/AxiosError';

export const xhrAdapter: AxiosAdapter = function <T = any>(
  config: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
  return new Promise((resolve, reject) => {
    const {
      method = 'GET',
      url,
      data,
      headers = {},
      timeout,
      responseType,
      withCredentials,
      onDownloadProgress,
      onUploadProgress,
      cancelToken,
      signal
    } = config;

    // 1. 创建 XHR 实例
    const xhr = new XMLHttpRequest();

    // 2. 构建完整 URL
    const fullURL = buildURL(url!, config.params, config.paramsSerializer);

    // 3. 初始化请求
    xhr.open(method.toUpperCase(), fullURL, true);

    // 4. 配置 XHR
    configureXHR(xhr, config);

    // 5. 设置事件处理器
    setupEventHandlers(xhr, config, resolve, reject);

    // 6. 设置请求头
    setRequestHeaders(xhr, headers, data);

    // 7. 处理取消
    setupCancelHandlers(xhr, cancelToken, signal, reject);

    // 8. 发送请求
    xhr.send(data ?? null);
  });
};

// 配置 XHR 选项
function configureXHR(xhr: XMLHttpRequest, config: AxiosRequestConfig): void {
  const { timeout, responseType, withCredentials } = config;

  // 超时设置
  if (timeout) {
    xhr.timeout = timeout;
  }

  // 响应类型
  if (responseType && responseType !== 'json') {
    xhr.responseType = responseType;
  }

  // 跨域凭据
  if (withCredentials) {
    xhr.withCredentials = true;
  }
}

// 设置事件处理器
function setupEventHandlers(
  xhr: XMLHttpRequest,
  config: AxiosRequestConfig,
  resolve: (value: AxiosResponse) => void,
  reject: (reason: any) => void
): void {
  const { onDownloadProgress, onUploadProgress, validateStatus } = config;

  // 请求完成
  xhr.onload = function () {
    if (!xhr || (xhr.readyState !== 4)) {
      return;
    }

    // 获取响应头
    const responseHeaders = parseHeaders(xhr.getAllResponseHeaders());

    // 获取响应数据
    const responseData =
      xhr.responseType === 'text' || xhr.responseType === ''
        ? xhr.responseText
        : xhr.response;

    // 构造响应对象
    const response: AxiosResponse = {
      data: responseData,
      status: xhr.status,
      statusText: xhr.statusText,
      headers: responseHeaders,
      config,
      request: xhr
    };

    // 验证状态码
    const valid = validateStatus
      ? validateStatus(xhr.status)
      : xhr.status >= 200 && xhr.status < 300;

    if (valid) {
      resolve(response);
    } else {
      reject(createError(
        `Request failed with status code ${xhr.status}`,
        config,
        null,
        xhr,
        response
      ));
    }
  };

  // 网络错误
  xhr.onerror = function () {
    reject(createError(
      'Network Error',
      config,
      'ERR_NETWORK',
      xhr
    ));
  };

  // 超时错误
  xhr.ontimeout = function () {
    reject(createError(
      `Timeout of ${config.timeout}ms exceeded`,
      config,
      'ECONNABORTED',
      xhr
    ));
  };

  // 下载进度
  if (onDownloadProgress) {
    xhr.onprogress = onDownloadProgress;
  }

  // 上传进度
  if (onUploadProgress && xhr.upload) {
    xhr.upload.onprogress = onUploadProgress;
  }
}

// 设置请求头
function setRequestHeaders(
  xhr: XMLHttpRequest,
  headers: Record<string, string>,
  data: any
): void {
  // 如果没有数据，删除 Content-Type
  if (data === undefined || data === null) {
    delete headers['Content-Type'];
  }

  // 设置所有请求头
  Object.keys(headers).forEach(name => {
    // 如果没有 data 且 header 是 content-type，跳过
    if (
      data === undefined &&
      name.toLowerCase() === 'content-type'
    ) {
      return;
    }

    xhr.setRequestHeader(name, headers[name]);
  });
}

// 设置取消处理器
function setupCancelHandlers(
  xhr: XMLHttpRequest,
  cancelToken: any,
  signal: AbortSignal | undefined,
  reject: (reason: any) => void
): void {
  // CancelToken 方式
  if (cancelToken) {
    cancelToken.promise.then((reason: any) => {
      xhr.abort();
      reject(reason);
    });
  }

  // AbortController 方式
  if (signal) {
    signal.addEventListener('abort', () => {
      xhr.abort();
      reject(createAbortError());
    });
  }
}

function createAbortError(): Error {
  const error = new Error('Request aborted');
  error.name = 'AbortError';
  return error;
}
```

## 核心功能详解

### 1. 响应类型处理

```typescript
// 支持的响应类型
type ResponseType = 
  | ''           // 默认，等同于 'text'
  | 'arraybuffer' // ArrayBuffer
  | 'blob'       // Blob
  | 'document'   // Document (HTML/XML)
  | 'json'       // 自动解析 JSON（某些浏览器）
  | 'text';      // 纯文本

// 配置示例
xhr.responseType = 'arraybuffer';

// 获取响应
const buffer = xhr.response; // ArrayBuffer
```

### 2. 进度事件

```typescript
interface ProgressEvent {
  lengthComputable: boolean;  // 是否可计算进度
  loaded: number;             // 已传输字节数
  total: number;              // 总字节数
}

// 下载进度
xhr.onprogress = (event) => {
  if (event.lengthComputable) {
    const percent = (event.loaded / event.total) * 100;
    console.log(`Downloaded: ${percent.toFixed(2)}%`);
  }
};

// 上传进度
xhr.upload.onprogress = (event) => {
  if (event.lengthComputable) {
    const percent = (event.loaded / event.total) * 100;
    console.log(`Uploaded: ${percent.toFixed(2)}%`);
  }
};
```

### 3. 跨域请求

```typescript
// 发送凭据（cookies、HTTP 认证）
xhr.withCredentials = true;

// 服务端必须设置相应的 CORS 头：
// Access-Control-Allow-Origin: https://example.com
// Access-Control-Allow-Credentials: true
```

### 4. 请求中断

```typescript
// 手动中断
xhr.abort();

// 中断后的状态
xhr.readyState // 0 (UNSENT)
xhr.status     // 0

// onabort 事件
xhr.onabort = function() {
  console.log('Request was aborted');
};
```

## 状态码验证

```typescript
// 默认验证策略
function defaultValidateStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

// 自定义验证
const config = {
  validateStatus: function (status) {
    return status < 500; // 只有 5xx 才视为错误
  }
};
```

## 响应解析

```typescript
// 解析响应头字符串
function parseHeaders(rawHeaders: string): Record<string, string> {
  const headers: Record<string, string> = {};

  if (!rawHeaders) {
    return headers;
  }

  rawHeaders.split('\r\n').forEach(line => {
    const [key, ...values] = line.split(':');
    if (key) {
      const name = key.trim().toLowerCase();
      const value = values.join(':').trim();
      headers[name] = value;
    }
  });

  return headers;
}
```

## 单元测试

```typescript
import { xhrAdapter } from '../adapters/xhr';

// Mock XMLHttpRequest
class MockXHR {
  open = jest.fn();
  send = jest.fn();
  setRequestHeader = jest.fn();
  abort = jest.fn();
  
  status = 200;
  statusText = 'OK';
  responseText = '{"message": "success"}';
  response = { message: 'success' };
  
  getAllResponseHeaders = () => 'content-type: application/json';
  
  // 触发事件
  triggerLoad() {
    this.readyState = 4;
    this.onload?.();
  }
  
  triggerError() {
    this.onerror?.();
  }
}

describe('XHR Adapter', () => {
  let originalXHR: typeof XMLHttpRequest;
  
  beforeEach(() => {
    originalXHR = global.XMLHttpRequest;
    global.XMLHttpRequest = MockXHR as any;
  });
  
  afterEach(() => {
    global.XMLHttpRequest = originalXHR;
  });
  
  it('should make a GET request', async () => {
    const promise = xhrAdapter({ url: '/api/users', method: 'GET' });
    
    // 模拟响应
    const xhr = (MockXHR as any).lastInstance;
    xhr.triggerLoad();
    
    const response = await promise;
    expect(response.status).toBe(200);
  });
});
```

## 调试技巧

```typescript
// 添加调试日志
const debugAdapter: AxiosAdapter = async (config) => {
  console.group('XHR Request');
  console.log('URL:', config.url);
  console.log('Method:', config.method);
  console.log('Headers:', config.headers);
  console.log('Data:', config.data);
  
  const startTime = Date.now();
  
  try {
    const response = await xhrAdapter(config);
    
    console.log('Status:', response.status);
    console.log('Response:', response.data);
    console.log('Duration:', Date.now() - startTime, 'ms');
    console.groupEnd();
    
    return response;
  } catch (error) {
    console.error('Error:', error);
    console.log('Duration:', Date.now() - startTime, 'ms');
    console.groupEnd();
    throw error;
  }
};
```

## 小结

本节我们实现了一个完整的 XHR 适配器，涵盖了：

1. **核心请求流程**：创建、配置、发送、响应
2. **事件处理**：load、error、timeout、progress
3. **高级特性**：跨域凭据、响应类型、进度监控
4. **取消机制**：CancelToken 和 AbortController
5. **错误处理**：网络错误、超时、状态码验证

XHR 适配器是浏览器端的基础，下一节我们将实现 Node.js 端的 HTTP 适配器。
