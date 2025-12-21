# 错误处理与超时控制

网络请求不可靠。完善的错误处理让应用更健壮。

## 错误类型

Ajax 可能遇到的错误：

| 类型 | 原因 | status |
|------|------|--------|
| 网络错误 | 无网络、DNS 失败 | 0 |
| 超时 | 请求时间过长 | 0 |
| HTTP 错误 | 4xx、5xx | 400-599 |
| 解析错误 | JSON 格式错误 | 200 但解析失败 |
| 中断 | 调用 abort() | 0 |

## 基础错误处理

```javascript
$.ajax({
  url: '/api/data',
  success(data) {
    console.log(data);
  },
  error(xhr, status, error) {
    console.error('Error:', status, error);
  }
});

// Promise 方式
$.ajax({ url: '/api/data' })
  .catch(err => {
    console.error(err.message);
  });
```

## error 回调参数

```javascript
error: function(xhr, textStatus, errorThrown) {
  // xhr: XMLHttpRequest 对象
  // textStatus: 'timeout' | 'error' | 'abort' | 'parsererror'
  // errorThrown: 错误信息
}
```

## 超时设置

```javascript
$.ajax({
  url: '/api/slow-request',
  timeout: 5000,  // 5 秒
  success(data) {
    console.log(data);
  },
  error(xhr, status) {
    if (status === 'timeout') {
      console.log('请求超时');
    }
  }
});
```

## 全局超时设置

```javascript
$.ajaxSetup({
  timeout: 10000  // 所有请求默认 10 秒超时
});
```

## 实现超时控制

```javascript
function ajax(options) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    // 设置超时
    if (options.timeout > 0) {
      xhr.timeout = options.timeout;
    }
    
    // 超时处理
    xhr.ontimeout = function() {
      const error = new AjaxError('Request Timeout', 0, xhr);
      error.type = 'timeout';
      
      options.error?.(xhr, 'timeout', error);
      options.complete?.(xhr, 'timeout');
      
      reject(error);
    };
    
    // ... 其他代码
  });
}
```

## 自定义错误类

```javascript
class AjaxError extends Error {
  constructor(message, status, xhr) {
    super(message);
    this.name = 'AjaxError';
    this.status = status;
    this.xhr = xhr;
    this.type = 'error';
  }
  
  get isTimeout() {
    return this.type === 'timeout';
  }
  
  get isNetworkError() {
    return this.status === 0 && this.type !== 'timeout';
  }
  
  get isServerError() {
    return this.status >= 500;
  }
  
  get isClientError() {
    return this.status >= 400 && this.status < 500;
  }
}
```

## 完整错误处理实现

```javascript
// src/ajax/error-handling.js

export class AjaxError extends Error {
  constructor(message, status, xhr, type = 'error') {
    super(message);
    this.name = 'AjaxError';
    this.status = status;
    this.xhr = xhr;
    this.type = type;  // 'error' | 'timeout' | 'abort' | 'parsererror'
  }
}

export function handleXHRError(xhr, settings, type, reject) {
  const messages = {
    error: 'Network Error',
    timeout: 'Request Timeout',
    abort: 'Request Aborted'
  };
  
  const error = new AjaxError(
    messages[type] || 'Unknown Error',
    xhr.status || 0,
    xhr,
    type
  );
  
  // 触发回调
  settings.error?.(xhr, type, error);
  settings.complete?.(xhr, type);
  
  reject(error);
}

export function handleHTTPError(xhr, settings, reject) {
  const statusText = xhr.statusText || getStatusText(xhr.status);
  
  const error = new AjaxError(
    statusText,
    xhr.status,
    xhr,
    'error'
  );
  
  settings.error?.(xhr, 'error', error);
  settings.complete?.(xhr, 'error');
  
  reject(error);
}

export function handleParseError(xhr, settings, parseError, reject) {
  const error = new AjaxError(
    'Parse Error: ' + parseError.message,
    xhr.status,
    xhr,
    'parsererror'
  );
  
  settings.error?.(xhr, 'parsererror', error);
  settings.complete?.(xhr, 'parsererror');
  
  reject(error);
}

function getStatusText(status) {
  const statusTexts = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    408: 'Request Timeout',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout'
  };
  return statusTexts[status] || 'Error';
}
```

## 在 ajax 中应用

```javascript
export function ajax(options) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const settings = normalizeOptions(options);
    
    // 打开连接
    xhr.open(settings.method, settings.url, true);
    
    // 超时
    if (settings.timeout > 0) {
      xhr.timeout = settings.timeout;
    }
    
    // 成功
    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300 || xhr.status === 304) {
        try {
          const response = parseResponse(xhr, settings.dataType);
          settings.success?.(response, 'success', xhr);
          settings.complete?.(xhr, 'success');
          resolve(response);
        } catch (e) {
          handleParseError(xhr, settings, e, reject);
        }
      } else {
        handleHTTPError(xhr, settings, reject);
      }
    };
    
    // 网络错误
    xhr.onerror = function() {
      handleXHRError(xhr, settings, 'error', reject);
    };
    
    // 超时
    xhr.ontimeout = function() {
      handleXHRError(xhr, settings, 'timeout', reject);
    };
    
    // 中断
    xhr.onabort = function() {
      handleXHRError(xhr, settings, 'abort', reject);
    };
    
    xhr.send(settings.data);
  });
}
```

## 使用示例

### 区分错误类型

```javascript
$.ajax({ url: '/api/data', timeout: 5000 })
  .catch(err => {
    if (err.isTimeout) {
      showMessage('请求超时，请检查网络');
    } else if (err.isNetworkError) {
      showMessage('网络连接失败');
    } else if (err.status === 401) {
      redirectToLogin();
    } else if (err.status === 404) {
      showMessage('资源不存在');
    } else if (err.isServerError) {
      showMessage('服务器错误，请稍后重试');
    } else {
      showMessage('未知错误');
    }
  });
```

### 重试机制

```javascript
async function fetchWithRetry(url, options = {}, retries = 3) {
  const { timeout = 5000 } = options;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await $.ajax({ ...options, url, timeout });
    } catch (err) {
      // 只重试超时和网络错误
      if (!err.isTimeout && !err.isNetworkError) {
        throw err;
      }
      
      if (i === retries - 1) {
        throw err;  // 最后一次重试失败
      }
      
      // 指数退避
      await sleep(1000 * Math.pow(2, i));
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### 全局错误处理

```javascript
$.ajaxError(function(error, options, xhr) {
  // 记录错误
  logError({
    url: options.url,
    method: options.method,
    status: xhr?.status,
    message: error.message
  });
  
  // 显示用户友好的消息
  if (error.isTimeout) {
    showToast('请求超时');
  } else if (error.isNetworkError) {
    showToast('网络连接失败');
  } else if (error.status === 401) {
    showToast('登录已过期');
    redirectToLogin();
  } else if (error.status >= 500) {
    showToast('服务暂时不可用');
  }
});
```

### 取消请求

```javascript
const request = $.ajax({
  url: '/api/long-request',
  timeout: 30000
});

// 用户点击取消
$('#cancel').on('click', () => {
  request.abort?.();
});

try {
  const data = await request;
} catch (err) {
  if (err.type === 'abort') {
    console.log('用户取消了请求');
  }
}
```

### 竞态处理

```javascript
let currentRequest = null;

async function search(keyword) {
  // 取消之前的请求
  if (currentRequest) {
    currentRequest.abort?.();
  }
  
  currentRequest = $.ajax({
    url: '/api/search',
    data: { q: keyword },
    timeout: 5000
  });
  
  try {
    const results = await currentRequest;
    renderResults(results);
  } catch (err) {
    if (err.type !== 'abort') {
      showError(err.message);
    }
  } finally {
    currentRequest = null;
  }
}
```

## 优雅降级

```javascript
async function loadData() {
  try {
    // 优先从 API 获取
    return await $.ajax({ 
      url: '/api/data', 
      timeout: 3000,
      dataType: 'json'
    });
  } catch (err) {
    console.warn('API 请求失败，使用缓存数据');
    
    // 降级到本地缓存
    const cached = localStorage.getItem('data');
    if (cached) {
      return JSON.parse(cached);
    }
    
    // 缓存也没有，使用默认值
    return { items: [] };
  }
}
```

## 本章小结

错误类型：

- **网络错误**：status = 0
- **超时**：type = 'timeout'
- **HTTP 错误**：status 4xx/5xx
- **解析错误**：type = 'parsererror'
- **中断**：type = 'abort'

处理策略：

- 区分错误类型，给出相应提示
- 可重试的错误自动重试
- 全局拦截器统一处理
- 优雅降级保证可用性

下一章，我们开始实现工具函数。

---

**思考题**：如何实现请求的"竞态取消"——当新请求发出时，自动取消之前未完成的同类请求？
