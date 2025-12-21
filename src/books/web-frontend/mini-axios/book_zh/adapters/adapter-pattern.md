# 适配器模式与 XHR 适配器

Axios 能同时运行在浏览器和 Node.js 中，靠的是适配器模式。这一节我们深入理解这个设计。

## 本节目标

通过本节学习，你将：

1. 理解适配器模式的核心思想和实际应用
2. 实现一个完整的 XHR 适配器
3. 掌握 XMLHttpRequest 的各种配置和事件处理
4. 了解如何扩展和自定义适配器

## 什么是适配器模式？

**生活中的例子**：想象你有一个三孔插头的电器，但墙上只有两孔插座。你需要一个"转换插头"（适配器），它一端接三孔插头，另一端插入两孔插座。

**在软件中**：适配器模式（Adapter Pattern）将一个接口转换成客户希望的另一个接口，使原本不兼容的接口可以一起工作。

在 Axios 中：
- **客户**：Axios 核心逻辑（不关心底层用什么发请求）
- **目标接口**：`(config) => Promise<response>`（统一的请求接口）
- **被适配者**：XMLHttpRequest、Node.js http 模块、Fetch API（各有各的 API）

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Axios     │ --> │   Adapter   │ --> │  Platform   │
│   Core      │     │  Interface  │     │    API      │
│             │     │             │     │             │
│ 我只要调用  │     │  统一接口    │     │ XHR/http/   │
│ adapter()   │     │ 屏蔽差异    │     │ fetch       │
└─────────────┘     └─────────────┘     └─────────────┘
                          │
              ┌───────────┼───────────┐
              ↓           ↓           ↓
         XHR Adapter  HTTP Adapter  Fetch Adapter
         (浏览器)     (Node.js)     (现代浏览器)
```

**适配器模式的价值**：

1. **解耦**：Axios 核心不依赖具体的 HTTP 实现
2. **可扩展**：轻松添加新适配器支持新环境
3. **可测试**：用 Mock 适配器替换真实适配器进行测试
4. **可定制**：用户可以提供自定义适配器

## 定义适配器接口

所有适配器必须实现相同的接口：

```typescript
// src/types/index.ts

export interface AxiosAdapter {
  (config: AxiosRequestConfig): Promise<AxiosResponse>;
}
```

这个接口定义了适配器的"契约"：
1. **输入**：接收配置对象 `AxiosRequestConfig`
2. **输出**：返回 `Promise<AxiosResponse>`
3. **成功**：Promise resolve 时返回响应对象
4. **失败**：Promise reject 时返回错误对象

无论底层用什么技术（XHR、fetch、http），对上层来说调用方式完全一样。

## XHR 适配器完整实现

现在让我们实现一个功能完整的 XHR 适配器，逐步讲解每个部分：

```typescript
// src/adapters/xhr.ts

import { AxiosRequestConfig, AxiosResponse, AxiosAdapter } from '../types';
import { buildURL } from '../helpers/buildURL';
import { parseHeaders } from '../helpers/parseHeaders';
import { createError, AxiosError } from '../core/AxiosError';

export const xhrAdapter: AxiosAdapter = function <T = any>(
  config: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // ========== 第一步：构建完整 URL ==========
    // 需要处理：baseURL + url + params 序列化
    const url = buildURL({
      url: config.url,
      baseURL: config.baseURL,
      params: config.params,
      paramsSerializer: config.paramsSerializer,
    });

    // ========== 第二步：初始化请求 ==========
    xhr.open(
      config.method?.toUpperCase() || 'GET',
      url,
      true  // true 表示异步请求，几乎总是用 true
    );

    // ========== 第三步：设置超时 ==========
    // timeout 为 0 表示无超时限制
    if (config.timeout) {
      xhr.timeout = config.timeout;
    }

    // ========== 第四步：设置响应类型 ==========
    // 注意：responseType 为 'json' 时不要设置
    // 因为我们要自己解析 JSON 以便处理解析错误
    if (config.responseType && config.responseType !== 'json') {
      xhr.responseType = config.responseType;
    }

    // ========== 第五步：设置跨域凭证 ==========
    // withCredentials 为 true 时，跨域请求会携带 cookie
    // 注意：服务端必须设置 Access-Control-Allow-Credentials: true
    if (config.withCredentials) {
      xhr.withCredentials = true;
    }

    // ========== 第六步：设置请求头 ==========
    if (config.headers) {
      Object.entries(config.headers).forEach(([name, value]) => {
        // 特殊处理：没有请求体时，Content-Type 头没有意义
        // 设置它反而可能导致某些服务器报错
        if (!config.data && name.toLowerCase() === 'content-type') {
          return; // 跳过，不设置这个头
        }
        xhr.setRequestHeader(name, value);
      });
    }

    // ========== 第七步：处理响应 ==========
    xhr.onreadystatechange = function handleLoad() {
      // readyState 状态说明：
      // 0: UNSENT - 未初始化
      // 1: OPENED - open() 已调用
      // 2: HEADERS_RECEIVED - 响应头已接收
      // 3: LOADING - 响应体接收中
      // 4: DONE - 请求完成
      if (xhr.readyState !== XMLHttpRequest.DONE) {
        return;
      }

      // status 为 0 的情况：
      // 1. 请求被取消 (abort)
      // 2. 网络错误
      // 3. CORS 被拒绝
      // 这些情况会触发 onerror，这里不处理
      if (xhr.status === 0) {
        return;
      }

      // 解析响应头
      // getAllResponseHeaders() 返回字符串，需要解析成对象
      const responseHeaders = parseHeaders(xhr.getAllResponseHeaders());

      // 获取响应数据
      // 根据 responseType 决定从哪个属性获取
      const responseData = 
        !config.responseType || config.responseType === 'text' || config.responseType === 'json'
          ? xhr.responseText  // 文本类型
          : xhr.response;     // 其他类型（blob、arraybuffer 等）

      // 构建标准响应对象
      const response: AxiosResponse<T> = {
        data: responseData,
        status: xhr.status,
        statusText: xhr.statusText,
        headers: responseHeaders,
        config,
        request: xhr,
      };

      // 根据状态码判断成功或失败
      settle(resolve, reject, response);
    };

    // ========== 第八步：处理网络错误 ==========
    // 注意：HTTP 4xx/5xx 不会触发 onerror
    // onerror 只在"无法完成请求"时触发，如：
    // - 网络断开
    // - DNS 解析失败
    // - CORS 被拒绝
    xhr.onerror = function handleError() {
      reject(createError('Network Error', config, null, xhr));
    };

    // ========== 第九步：处理超时 ==========
    xhr.ontimeout = function handleTimeout() {
      reject(createError(
        `Timeout of ${config.timeout}ms exceeded`,
        config,
        'ECONNABORTED',  // 这个错误码表示连接中止
        xhr
      ));
    };

    // ========== 第十步：处理取消（后续章节详细讲解）==========
    if (config.cancelToken) {
      // cancelToken 包含一个 promise
      // 当用户调用 cancel() 时，这个 promise 会 resolve
      config.cancelToken.promise.then((reason) => {
        xhr.abort();  // 中止请求
        reject(reason);
      });
    }

    // ========== 第十一步：处理上传进度 ==========
    // xhr.upload 是一个 XMLHttpRequestUpload 对象
    // 可以监听上传进度事件
    if (config.onUploadProgress && xhr.upload) {
      xhr.upload.onprogress = config.onUploadProgress;
    }

    // ========== 第十二步：处理下载进度 ==========
    if (config.onDownloadProgress) {
      xhr.onprogress = config.onDownloadProgress;
    }

    // ========== 第十三步：发送请求 ==========
    // data 可以是：string、FormData、Blob、ArrayBuffer 等
    // null 表示没有请求体（GET/HEAD 等方法）
    xhr.send(config.data ?? null);
  });
};
```

### 进度事件的数据结构

```typescript
// ProgressEvent 对象包含：
interface ProgressEvent {
  loaded: number;     // 已传输的字节数
  total: number;      // 总字节数（如果已知）
  lengthComputable: boolean;  // total 是否可用
}

// 使用示例：
axios.post('/upload', formData, {
  onUploadProgress: (progressEvent) => {
    const percent = (progressEvent.loaded / progressEvent.total) * 100;
    console.log(`上传进度：${percent.toFixed(2)}%`);
  }
});
```

## 状态码判断

创建 `settle` 函数，根据响应状态码决定成功或失败：

```typescript
// src/core/settle.ts

import { AxiosResponse, AxiosRequestConfig } from '../types';
import { createError } from './AxiosError';

/**
 * 根据响应状态码决定 resolve 还是 reject
 * 
 * 为什么抽成单独的函数？
 * 1. XHR 和 HTTP 适配器都需要这个逻辑
 * 2. 方便用户自定义 validateStatus
 */
export function settle(
  resolve: (value: AxiosResponse) => void,
  reject: (reason: any) => void,
  response: AxiosResponse
): void {
  const config = response.config;
  
  // 获取状态码验证函数
  // 用户可以通过 validateStatus 自定义哪些状态码算成功
  const validateStatus = config.validateStatus;

  // 判断是否为成功状态码
  if (!validateStatus || validateStatus(response.status)) {
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

**默认的 `validateStatus`**：

```typescript
// src/defaults/index.ts

export const defaults: AxiosDefaults = {
  // ...其他默认配置
  
  // 默认：2xx 状态码视为成功
  validateStatus: function (status: number): boolean {
    return status >= 200 && status < 300;
  },
};
```

**用户自定义示例**：

```typescript
// 场景1：把 304（未修改）也视为成功
axios.get('/api', {
  validateStatus: function (status) {
    return (status >= 200 && status < 300) || status === 304;
  },
});

// 场景2：只要有响应就算成功（不管状态码）
axios.get('/api', {
  validateStatus: function (status) {
    return true;
  },
});

// 场景3：只有 200 算成功
axios.get('/api', {
  validateStatus: function (status) {
    return status === 200;
  },
});
```

## 自动选择适配器

Axios 需要自动检测运行环境并选择合适的适配器：

```typescript
// src/defaults/index.ts

/**
 * 获取默认适配器
 * 
 * 检测当前运行环境，返回合适的适配器
 */
function getDefaultAdapter(): AxiosAdapter {
  let adapter: AxiosAdapter;

  // 检测浏览器环境
  // typeof XMLHttpRequest !== 'undefined' 说明在浏览器中
  if (typeof XMLHttpRequest !== 'undefined') {
    adapter = xhrAdapter;
  }
  // 检测 Node.js 环境
  // Node.js 中有 process 对象，且是 [object process] 类型
  else if (typeof process !== 'undefined' && 
           Object.prototype.toString.call(process) === '[object process]') {
    adapter = httpAdapter;
  }
  // 都不满足则报错
  else {
    throw new Error('No suitable adapter found');
  }

  return adapter;
}

export const defaults: AxiosDefaults = {
  adapter: getDefaultAdapter(),
  // ...其他默认配置
};
```

### 环境检测的注意事项

**为什么不用 `window !== undefined` 检测浏览器？**

因为：
1. Web Worker 中没有 `window`，但有 `XMLHttpRequest`
2. 某些 Node.js 测试环境（如 jsdom）会模拟 `window`

**为什么要用 `Object.prototype.toString.call(process)` 检测 Node.js？**

因为：
1. 浏览器中可能存在全局变量 `process`（如 Webpack 的 polyfill）
2. 但只有真正的 Node.js 中，`toString` 才会返回 `'[object process]'`

## 使用自定义适配器

用户可以完全替换适配器，这在以下场景很有用：

```typescript
// 场景1：使用 Fetch API
// 现代浏览器支持 Fetch，某些场景下比 XHR 更简洁
const fetchAdapter: AxiosAdapter = async (config) => {
  const response = await fetch(config.url!, {
    method: config.method,
    headers: config.headers,
    body: config.data,
  });

  return {
    data: await response.json(),
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers),
    config,
    request: null,
  };
};

axios.get('/api', { adapter: fetchAdapter });

// 场景2：Mock 适配器（用于测试）
// 不发真实请求，直接返回模拟数据
const mockAdapter: AxiosAdapter = (config) => {
  return Promise.resolve({
    data: { mocked: true },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
    request: null,
  });
};

// 场景3：延迟适配器（模拟网络延迟）
const delayAdapter = (delay: number): AxiosAdapter => {
  return async (config) => {
    await new Promise(resolve => setTimeout(resolve, delay));
    // 调用真实适配器
    return xhrAdapter(config);
  };
};

// 场景4：带日志的适配器（调试用）
const loggingAdapter: AxiosAdapter = async (config) => {
  console.log('Request:', config.method, config.url);
  const start = Date.now();
  try {
    const response = await xhrAdapter(config);
    console.log('Response:', response.status, `${Date.now() - start}ms`);
    return response;
  } catch (error) {
    console.log('Error:', error.message, `${Date.now() - start}ms`);
    throw error;
  }
};
```

## 测试 XHR 适配器

使用 jsdom 或 vitest 的 happy-dom 模拟浏览器环境：

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { xhrAdapter } from '../src/adapters/xhr';

describe('xhrAdapter', () => {
  let mockXhr: any;
  let xhrInstance: any;

  beforeEach(() => {
    mockXhr = {
      open: vi.fn(),
      send: vi.fn(),
      setRequestHeader: vi.fn(),
      getAllResponseHeaders: vi.fn(() => 'content-type: application/json\r\n'),
      readyState: 4,
      status: 200,
      statusText: 'OK',
      responseText: '{"success":true}',
      onreadystatechange: null,
    };

    vi.spyOn(global, 'XMLHttpRequest').mockImplementation(() => {
      xhrInstance = mockXhr;
      return mockXhr as any;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should make GET request', async () => {
    const promise = xhrAdapter({
      url: '/api/test',
      method: 'get',
    });

    // 触发响应
    mockXhr.onreadystatechange();

    const response = await promise;
    expect(mockXhr.open).toHaveBeenCalledWith('GET', '/api/test', true);
    expect(response.status).toBe(200);
    expect(response.data).toBe('{"success":true}');
  });

  it('should set request headers', async () => {
    const promise = xhrAdapter({
      url: '/api/test',
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'X-Custom': 'value',
      },
      data: '{}',
    });

    mockXhr.onreadystatechange();
    await promise;

    expect(mockXhr.setRequestHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
    expect(mockXhr.setRequestHeader).toHaveBeenCalledWith('X-Custom', 'value');
  });

  it('should handle network error', async () => {
    const promise = xhrAdapter({
      url: '/api/test',
      method: 'get',
    });

    mockXhr.onerror();

    await expect(promise).rejects.toThrow('Network Error');
  });

  it('should handle timeout', async () => {
    const promise = xhrAdapter({
      url: '/api/test',
      method: 'get',
      timeout: 1000,
    });

    mockXhr.ontimeout();

    await expect(promise).rejects.toThrow('Timeout');
  });
});
```

## 小结

### 适配器模式的核心价值

| 价值 | 说明 |
|------|------|
| **平台无关** | Axios 核心逻辑不依赖具体 HTTP 实现，可以在任何平台运行 |
| **可扩展** | 添加新适配器只需实现统一接口，不需要修改核心代码 |
| **可测试** | 用 Mock 适配器替换真实适配器，实现无网络测试 |
| **可定制** | 用户可以提供自定义适配器满足特殊需求 |

### XHR 适配器的关键技术点

1. **请求配置**：超时、凭证、响应类型、请求头
2. **事件处理**：onreadystatechange、onerror、ontimeout、onprogress
3. **状态判断**：readyState、status 的各种情况
4. **错误分类**：网络错误 vs HTTP 错误 vs 超时

### 常见问题解答

**Q: 为什么 responseType 为 'json' 时不设置 xhr.responseType？**

A: 如果设置 `xhr.responseType = 'json'`，浏览器会自动解析 JSON。但如果 JSON 格式有误，我们无法获取原始文本来诊断问题。所以我们选择获取文本后自己解析，这样可以更好地处理解析错误。

**Q: 为什么没有请求体时要跳过 Content-Type 头？**

A: 根据 HTTP 规范，`Content-Type` 描述的是请求体的类型。如果没有请求体，这个头就没有意义。某些服务器会拒绝这种"矛盾"的请求。

**Q: CORS 错误会触发哪个事件？**

A: CORS 错误会导致 `status = 0`，并触发 `onerror` 事件。但由于安全原因，JavaScript 无法获取具体的 CORS 错误信息。

下一节我们实现 Node.js 的 HTTP 适配器。
