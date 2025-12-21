# Mini-Axios 与 Axios 源码对照

本附录对比 Mini-Axios 与真实 Axios 源码的差异，帮助读者进一步深入学习。

## 本节目标

通过本节学习，你将：

1. **了解 Mini-Axios 与 Axios 的结构差异**：规模、模块组织
2. **对比核心实现的差异**：Axios 类、拦截器、适配器
3. **理解 Axios 的高级特性**：同步拦截器、AxiosHeaders 类
4. **获得源码阅读指南**：推荐阅读顺序

## 为什么要对比源码？

Mini-Axios 是为学习目的设计的简化版本。通过对比，你可以：

- 理解**核心概念不变**，但**实现细节有差异**
- 学习生产级代码的**边界处理**和**兼容性考虑**
- 为**阅读真实开源项目**打下基础

## 项目结构对比

### Mini-Axios 结构（~1000 行）

```
mini-axios/
├── src/
│   ├── index.ts              # 入口
│   ├── core/
│   │   ├── Axios.ts          # 核心类
│   │   ├── InterceptorManager.ts
│   │   ├── mergeConfig.ts
│   │   └── dispatchRequest.ts
│   ├── adapters/
│   │   ├── index.ts
│   │   ├── xhr.ts
│   │   └── http.ts
│   ├── helpers/
│   │   ├── buildURL.ts
│   │   ├── headers.ts
│   │   └── data.ts
│   ├── cancel/
│   │   └── CancelToken.ts
│   └── types/
│       └── index.ts
└── dist/
```

### Axios 源码结构（~5000+ 行）

```
axios/lib/
├── axios.js                  # 入口
├── core/
│   ├── Axios.js
│   ├── AxiosError.js
│   ├── AxiosHeaders.js       # 完整的 Headers 类（Mini 没有）
│   ├── InterceptorManager.js
│   ├── buildFullPath.js
│   ├── dispatchRequest.js
│   ├── mergeConfig.js
│   └── transformData.js
├── adapters/
│   ├── adapters.js           # 适配器选择逻辑
│   ├── http.js
│   ├── xhr.js
│   └── fetch.js              # Fetch 适配器（v1.6+）
├── cancel/
│   ├── CancelToken.js
│   ├── CanceledError.js
│   └── isCancel.js
├── helpers/
│   ├── buildURL.js
│   ├── combineURLs.js
│   ├── cookies.js            # Cookie 处理（Mini 没有）
│   ├── isAbsoluteURL.js
│   ├── parseHeaders.js
│   └── ...（更多辅助函数）
├── defaults/
│   ├── index.js
│   └── transitional.js       # 过渡期配置（Mini 没有）
├── env/
│   └── data.js               # 环境信息
└── platform/
    ├── browser/              # 浏览器平台适配
    └── node/                 # Node.js 平台适配
```

### 主要差异

| 维度 | Mini-Axios | Axios |
|-----|-----------|-------|
| 语言 | TypeScript | JavaScript |
| 模块数 | ~15 | ~50+ |
| 代码量 | ~1000 行 | ~5000+ 行 |
| 平台适配 | 简单判断 | platform 目录专门处理 |
| Headers | 简单对象 | AxiosHeaders 类 |
| Cookie | 不处理 | helpers/cookies.js |
| XSRF | 不处理 | 完整支持 |

## 核心类对比

### Axios 类

**Mini-Axios 版本**（简化）：

```typescript
class Axios {
  defaults: AxiosRequestConfig;
  interceptors: {
    request: InterceptorManager<AxiosRequestConfig>;
    response: InterceptorManager<AxiosResponse>;
  };

  request<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    config = mergeConfig(this.defaults, config);
    
    // 构建拦截器链
    const chain: any[] = [dispatchRequest, undefined];
    
    this.interceptors.request.forEach((interceptor) => {
      chain.unshift(interceptor.fulfilled, interceptor.rejected);
    });
    
    this.interceptors.response.forEach((interceptor) => {
      chain.push(interceptor.fulfilled, interceptor.rejected);
    });

    let promise = Promise.resolve(config);
    while (chain.length) {
      promise = promise.then(chain.shift(), chain.shift());
    }
    
    return promise as Promise<AxiosResponse<T>>;
  }
}
```

**Axios 源码版本**（lib/core/Axios.js）：

```javascript
class Axios {
  constructor(instanceConfig) {
    this.defaults = instanceConfig;
    this.interceptors = {
      request: new InterceptorManager(),
      response: new InterceptorManager()
    };
  }

  async request(configOrUrl, config) {
    try {
      return await this._request(configOrUrl, config);
    } catch (err) {
      // 错误处理...
      throw err;
    }
  }

  _request(configOrUrl, config) {
    if (typeof configOrUrl === 'string') {
      config = config || {};
      config.url = configOrUrl;
    } else {
      config = configOrUrl || {};
    }

    config = mergeConfig(this.defaults, config);

    const {headers} = config;
    config.headers = AxiosHeaders.concat(
      this.defaults.headers,
      headers
    );

    // 同步/异步拦截器处理
    const requestInterceptorChain = [];
    let synchronousRequestInterceptors = true;

    this.interceptors.request.forEach(function(interceptor) {
      if (typeof interceptor.runWhen === 'function' && 
          interceptor.runWhen(config) === false) {
        return;
      }

      synchronousRequestInterceptors = synchronousRequestInterceptors && 
        interceptor.synchronous;

      requestInterceptorChain.unshift(
        interceptor.fulfilled, 
        interceptor.rejected
      );
    });

    const responseInterceptorChain = [];
    this.interceptors.response.forEach(function(interceptor) {
      responseInterceptorChain.push(
        interceptor.fulfilled, 
        interceptor.rejected
      );
    });

    let promise;
    let i = 0;
    let len;

    if (!synchronousRequestInterceptors) {
      // 异步执行
      const chain = [dispatchRequest.bind(this), undefined];
      chain.unshift.apply(chain, requestInterceptorChain);
      chain.push.apply(chain, responseInterceptorChain);
      len = chain.length;

      promise = Promise.resolve(config);
      while (i < len) {
        promise = promise.then(chain[i++], chain[i++]);
      }
      return promise;
    }

    // 同步执行请求拦截器
    len = requestInterceptorChain.length;
    let newConfig = config;
    i = 0;

    while (i < len) {
      const onFulfilled = requestInterceptorChain[i++];
      const onRejected = requestInterceptorChain[i++];
      try {
        newConfig = onFulfilled(newConfig);
      } catch (error) {
        onRejected.call(this, error);
        break;
      }
    }

    try {
      promise = dispatchRequest.call(this, newConfig);
    } catch (error) {
      return Promise.reject(error);
    }

    // 异步执行响应拦截器
    i = 0;
    len = responseInterceptorChain.length;
    while (i < len) {
      promise = promise.then(
        responseInterceptorChain[i++], 
        responseInterceptorChain[i++]
      );
    }

    return promise;
  }
}
```

差异说明：

- Axios 支持同步拦截器（`synchronous` 选项）
- Axios 支持条件执行（`runWhen` 选项）
- Axios 使用 AxiosHeaders 类管理请求头
- Axios 有更完善的错误处理

### InterceptorManager

**Mini-Axios**：

```typescript
class InterceptorManager<V> {
  private handlers: Array<Interceptor<V> | null> = [];

  use(
    fulfilled?: (value: V) => V | Promise<V>,
    rejected?: (error: any) => any
  ): number {
    this.handlers.push({ fulfilled, rejected });
    return this.handlers.length - 1;
  }

  eject(id: number): void {
    if (this.handlers[id]) {
      this.handlers[id] = null;
    }
  }

  forEach(fn: (interceptor: Interceptor<V>) => void): void {
    this.handlers.forEach((h) => {
      if (h !== null) fn(h);
    });
  }
}
```

**Axios 源码**（lib/core/InterceptorManager.js）：

```javascript
class InterceptorManager {
  constructor() {
    this.handlers = [];
  }

  use(fulfilled, rejected, options) {
    this.handlers.push({
      fulfilled,
      rejected,
      synchronous: options ? options.synchronous : false,
      runWhen: options ? options.runWhen : null
    });
    return this.handlers.length - 1;
  }

  eject(id) {
    if (this.handlers[id]) {
      this.handlers[id] = null;
    }
  }

  clear() {
    if (this.handlers) {
      this.handlers = [];
    }
  }

  forEach(fn) {
    utils.forEach(this.handlers, function forEachHandler(h) {
      if (h !== null) {
        fn(h);
      }
    });
  }
}
```

差异：Axios 支持 `synchronous` 和 `runWhen` 选项。

## Headers 处理对比

**Mini-Axios**（简单对象）：

```typescript
function processHeaders(
  headers: Record<string, string>,
  data: any
): Record<string, string> {
  normalizeHeaderName(headers, 'Content-Type');
  
  if (isPlainObject(data)) {
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json;charset=utf-8';
    }
  }
  
  return headers;
}
```

**Axios 源码**（lib/core/AxiosHeaders.js）：

```javascript
class AxiosHeaders {
  constructor(headers) {
    headers && this.set(headers);
  }

  set(header, valueOrRewrite, rewrite) {
    const self = this;

    function setHeader(_value, _header, _rewrite) {
      const lHeader = normalizeHeader(_header);

      if (!lHeader) {
        throw new Error('header name must be a non-empty string');
      }

      const key = findKey(self, lHeader);

      if (!key || self[key] === undefined || 
          _rewrite === true || 
          (_rewrite === undefined && self[key] !== false)) {
        self[key || _header] = normalizeValue(_value);
      }
    }

    const setHeaders = (headers, _rewrite) =>
      utils.forEach(headers, (_value, _header) => 
        setHeader(_value, _header, _rewrite)
      );

    if (utils.isPlainObject(header) || header instanceof this.constructor) {
      setHeaders(header, valueOrRewrite);
    } else if (utils.isString(header) && 
               (header = header.trim()) && 
               !isValidHeaderName(header)) {
      setHeaders(parseHeaders(header), valueOrRewrite);
    } else if (header != null) {
      setHeader(valueOrRewrite, header, rewrite);
    }

    return this;
  }

  get(header, parser) {
    header = normalizeHeader(header);

    if (header) {
      const key = findKey(this, header);

      if (key) {
        const value = this[key];

        if (!parser) {
          return value;
        }

        if (parser === true) {
          return parseTokens(value);
        }

        if (utils.isFunction(parser)) {
          return parser.call(this, value, key);
        }

        if (utils.isRegExp(parser)) {
          return parser.exec(value);
        }

        throw new TypeError('parser must be boolean|regexp|function');
      }
    }
  }

  has(header, matcher) {
    header = normalizeHeader(header);

    if (header) {
      const key = findKey(this, header);

      return !!(key && 
        this[key] !== undefined && 
        (!matcher || matchHeaderValue(this, this[key], key, matcher)));
    }

    return false;
  }

  delete(header, matcher) {
    const self = this;
    let deleted = false;

    function deleteHeader(_header) {
      _header = normalizeHeader(_header);

      if (_header) {
        const key = findKey(self, _header);

        if (key && (!matcher || matchHeaderValue(self, self[key], key, matcher))) {
          delete self[key];
          deleted = true;
        }
      }
    }

    if (utils.isArray(header)) {
      header.forEach(deleteHeader);
    } else {
      deleteHeader(header);
    }

    return deleted;
  }

  // 静态方法
  static from(thing) {
    return thing instanceof this ? thing : new this(thing);
  }

  static concat(first, ...targets) {
    const combined = new this(first);

    for (const target of targets) {
      combined.set(target);
    }

    return combined;
  }

  static accessor(header) {
    // 创建访问器方法...
  }
}
```

差异说明：

- Axios 的 AxiosHeaders 是完整的类
- 支持链式调用
- 支持解析器
- 支持匹配器
- 有静态方法 `from`、`concat`、`accessor`

## 适配器对比

**Mini-Axios XHR 适配器**：

```typescript
export function xhrAdapter(config: AxiosRequestConfig): Promise<AxiosResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open(config.method!.toUpperCase(), buildURL(config.url!, config.params));

    // 设置请求头
    Object.keys(config.headers || {}).forEach((name) => {
      xhr.setRequestHeader(name, config.headers![name]);
    });

    // 超时
    if (config.timeout) {
      xhr.timeout = config.timeout;
    }

    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      
      const response: AxiosResponse = {
        data: xhr.response,
        status: xhr.status,
        statusText: xhr.statusText,
        headers: parseHeaders(xhr.getAllResponseHeaders()),
        config,
        request: xhr,
      };

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(response);
      } else {
        reject(new AxiosError('Request failed', config, xhr, response));
      }
    };

    xhr.onerror = () => reject(new AxiosError('Network Error', config, xhr));
    xhr.ontimeout = () => reject(new AxiosError('Timeout', config, xhr));

    xhr.send(config.data);
  });
}
```

**Axios XHR 适配器**（lib/adapters/xhr.js，简化）：

```javascript
export default isXHRAdapterSupported && function (config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    const _config = resolveConfig(config);
    let requestData = _config.data;
    const requestHeaders = AxiosHeaders.from(_config.headers).normalize();
    let {responseType, onUploadProgress, onDownloadProgress} = _config;
    let onCanceled;
    let uploadThrottled, downloadThrottled;
    let flushUpload, flushDownload;

    function done() {
      _config.cancelToken && _config.cancelToken.unsubscribe(onCanceled);
      _config.signal && _config.signal.removeEventListener('abort', onCanceled);
    }

    let request = new XMLHttpRequest();

    request.open(_config.method.toUpperCase(), _config.url, true);

    request.timeout = _config.timeout;

    function onloadend() {
      if (!request) return;

      const responseHeaders = AxiosHeaders.from(
        'getAllResponseHeaders' in request && 
        request.getAllResponseHeaders()
      );

      const responseData = !responseType || 
        responseType === 'text' || 
        responseType === 'json' ?
        request.responseText : request.response;

      const response = {
        data: responseData,
        status: request.status,
        statusText: request.statusText,
        headers: responseHeaders,
        config,
        request
      };

      settle(function _resolve(value) {
        resolve(value);
        done();
      }, function _reject(err) {
        reject(err);
        done();
      }, response);

      request = null;
    }

    if ('onloadend' in request) {
      request.onloadend = onloadend;
    } else {
      request.onreadystatechange = function handleLoad() {
        if (!request || request.readyState !== 4) return;
        if (request.status === 0 && 
            !(request.responseURL && 
              request.responseURL.indexOf('file:') === 0)) {
          return;
        }
        setTimeout(onloadend);
      };
    }

    request.onabort = function handleAbort() {
      if (!request) return;
      reject(new AxiosError('Request aborted', AxiosError.ECONNABORTED, config, request));
      request = null;
    };

    request.onerror = function handleError() {
      reject(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config, request));
      request = null;
    };

    request.ontimeout = function handleTimeout() {
      let timeoutErrorMessage = _config.timeout ? 
        'timeout of ' + _config.timeout + 'ms exceeded' : 
        'timeout exceeded';
      const transitional = _config.transitional || transitionalDefaults;
      if (_config.timeoutErrorMessage) {
        timeoutErrorMessage = _config.timeoutErrorMessage;
      }
      reject(new AxiosError(
        timeoutErrorMessage,
        transitional.clarifyTimeoutError ? AxiosError.ETIMEDOUT : AxiosError.ECONNABORTED,
        config,
        request
      ));
      request = null;
    };

    // 添加 xsrf 头
    if (platform.hasStandardBrowserEnv) {
      withXSRFToken && utils.isFunction(withXSRFToken) && 
        (withXSRFToken = withXSRFToken(_config));

      if (withXSRFToken || 
          (withXSRFToken !== false && isURLSameOrigin(_config.url))) {
        const xsrfValue = _config.xsrfHeaderName && 
          _config.xsrfCookieName && 
          cookies.read(_config.xsrfCookieName);

        if (xsrfValue) {
          requestHeaders.set(_config.xsrfHeaderName, xsrfValue);
        }
      }
    }

    // 设置请求头
    requestHeaders.forEach((val, key) => {
      if (requestData === undefined && key.toLowerCase() === 'content-type') {
        requestHeaders.delete(key);
      } else {
        request.setRequestHeader(key, val);
      }
    });

    // 跨域认证
    if (!utils.isUndefined(_config.withCredentials)) {
      request.withCredentials = !!_config.withCredentials;
    }

    // 响应类型
    if (responseType && responseType !== 'json') {
      request.responseType = _config.responseType;
    }

    // 进度处理
    if (onDownloadProgress) {
      ([downloadThrottled, flushDownload] = progressEventReducer(
        onDownloadProgress, true
      ));
      request.addEventListener('progress', downloadThrottled);
    }

    if (onUploadProgress && request.upload) {
      ([uploadThrottled, flushUpload] = progressEventReducer(
        onUploadProgress
      ));
      request.upload.addEventListener('progress', uploadThrottled);
      request.upload.addEventListener('loadend', flushUpload);
    }

    // 取消处理
    if (_config.cancelToken || _config.signal) {
      onCanceled = cancel => {
        if (!request) return;
        reject(!cancel || cancel.type ? 
          new CanceledError(null, config, request) : cancel);
        request.abort();
        request = null;
      };

      _config.cancelToken && _config.cancelToken.subscribe(onCanceled);
      if (_config.signal) {
        _config.signal.aborted ? 
          onCanceled() : 
          _config.signal.addEventListener('abort', onCanceled);
      }
    }

    // 协议处理
    const protocol = parseProtocol(_config.url);

    if (protocol && platform.protocols.indexOf(protocol) === -1) {
      reject(new AxiosError(
        'Unsupported protocol ' + protocol + ':',
        AxiosError.ERR_BAD_REQUEST,
        config
      ));
      return;
    }

    request.send(requestData || null);
  });
}
```

差异说明：

- Axios 有更完善的浏览器环境检测
- 支持 XSRF 防护
- 进度事件有节流处理
- 支持 file:// 协议
- 更细粒度的错误码
- 支持 transitional 配置

## 关键差异总结

下表总结了 Mini-Axios 与 Axios 的主要功能差异：

| 功能 | Mini-Axios | Axios | 说明 |
|-----|-----------|-------|------|
| 代码量 | ~1000 行 | ~5000+ 行 | Axios 有更多边界处理 |
| 同步拦截器 | ❌ | ✅ | Axios 支持 `synchronous` 选项 |
| runWhen 条件 | ❌ | ✅ | 条件执行拦截器 |
| AxiosHeaders 类 | ❌ | ✅ | 完整的 Headers 处理 |
| XSRF 防护 | ❌ | ✅ | 自动添加 XSRF token |
| 进度节流 | ❌ | ✅ | 避免进度回调过于频繁 |
| 多环境适配 | 简单 | 完善 | platform 目录专门处理 |
| FormData 序列化 | 基础 | 完善 | 更多数据类型支持 |
| 代理支持 | 基础 | 完善 | 更多代理配置选项 |
| 重试机制 | ❌ | ❌ | 两者都需要插件实现 |

## 学习建议

### 推荐阅读顺序

1. **`lib/core/Axios.js`** - 核心类，理解请求流程
2. **`lib/core/dispatchRequest.js`** - 请求分发，理解适配器调用
3. **`lib/adapters/xhr.js`** - XHR 适配器，理解浏览器请求
4. **`lib/core/InterceptorManager.js`** - 拦截器，理解链式调用
5. **`lib/core/mergeConfig.js`** - 配置合并，理解合并策略
6. **`lib/cancel/CancelToken.js`** - 取消机制，理解取消实现

### 阅读技巧

```
阅读源码的方法：

1. 从入口开始
   └── axios.js → 找到默认导出

2. 跟踪调用链
   └── axios.get() → Axios.request() → dispatchRequest()

3. 忽略边界处理
   └── 先理解主流程，再看边界情况

4. 对照 Mini-Axios
   └── 已理解的概念可以快速跳过
```

### 进一步学习资源

- **Axios 源码仓库**：https://github.com/axios/axios
- **Axios 官方文档**：https://axios-http.com/
- **TypeScript 类型定义**：`@types/axios`（Axios 已内置）

## 常见问题解答

### Q: 为什么 Axios 用 JavaScript 而不是 TypeScript？

历史原因。Axios 创建于 2014 年，当时 TypeScript 还不普及。现在 Axios 在 `index.d.ts` 中提供了完整的类型定义。

### Q: Mini-Axios 能用于生产环境吗？

不建议。Mini-Axios 是学习项目，缺少：
- 完整的边界处理
- 安全特性（XSRF）
- 多环境兼容
- 充分的测试覆盖

### Q: 学完 Mini-Axios 后如何阅读其他源码？

遵循相同的方法：
1. 先了解库的使用方式
2. 从入口文件开始
3. 跟踪主要调用链
4. 忽略边界处理，理解核心逻辑
5. 再回头看边界处理

## 小结

本附录对比了 Mini-Axios 与 Axios 源码的差异：

```
Mini-Axios vs Axios
├── 相同点
│   ├── 核心概念一致（适配器、拦截器、配置合并）
│   ├── API 设计相似
│   └── Promise 链式调用
├── 差异点
│   ├── 规模（1000 vs 5000+ 行）
│   ├── 语言（TypeScript vs JavaScript）
│   ├── 边界处理（简化 vs 完善）
│   └── 高级特性（缺失 vs 完整）
└── 学习路径
    ├── 掌握 Mini-Axios（理解核心概念）
    ├── 对照源码（发现差异）
    └── 阅读完整 Axios（深入理解）
```

**核心启示**：

- Mini-Axios 帮你理解**核心概念**
- Axios 展示**生产级实现**
- 从简到繁是**有效的学习路径**

希望本书帮助你从「会用 Axios」进阶到「能造 Axios」！
