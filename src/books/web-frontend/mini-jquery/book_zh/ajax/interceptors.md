# 请求拦截与响应处理

拦截器让你在请求发送前和响应返回后统一处理，非常适合认证、日志、错误处理等场景。

## 拦截器的作用

```
请求 → [请求拦截器] → 服务器 → [响应拦截器] → 回调
```

常见用途：

- 添加认证 token
- 请求/响应日志
- 统一错误处理
- 请求签名
- 响应数据转换

## jQuery 的 ajaxPrefilter

jQuery 提供 ajaxPrefilter 在请求前修改配置：

```javascript
$.ajaxPrefilter(function(options, originalOptions, jqXHR) {
  // 添加 token
  options.headers = options.headers || {};
  options.headers['Authorization'] = 'Bearer ' + getToken();
});
```

## 实现请求拦截器

```javascript
// 存储拦截器
const requestInterceptors = [];
const responseInterceptors = [];

// 添加请求拦截器
export function addRequestInterceptor(interceptor) {
  requestInterceptors.push(interceptor);
  return requestInterceptors.length - 1;  // 返回索引用于移除
}

// 添加响应拦截器
export function addResponseInterceptor(interceptor) {
  responseInterceptors.push(interceptor);
  return responseInterceptors.length - 1;
}

// 移除拦截器
export function removeRequestInterceptor(index) {
  requestInterceptors[index] = null;
}

export function removeResponseInterceptor(index) {
  responseInterceptors[index] = null;
}
```

## 在请求中应用拦截器

```javascript
async function ajax(options) {
  // 1. 执行请求拦截器
  for (const interceptor of requestInterceptors) {
    if (interceptor) {
      const result = await interceptor(options);
      // 返回 false 取消请求
      if (result === false) {
        return Promise.reject(new Error('Request cancelled by interceptor'));
      }
      // 返回新配置则替换
      if (result && typeof result === 'object') {
        options = result;
      }
    }
  }
  
  // 2. 发送请求
  let response;
  try {
    response = await sendRequest(options);
  } catch (error) {
    // 3. 错误拦截器
    for (const interceptor of responseInterceptors) {
      if (interceptor?.error) {
        const result = await interceptor.error(error, options);
        if (result !== undefined) {
          if (result instanceof Error) {
            throw result;
          }
          return result;  // 恢复为成功
        }
      }
    }
    throw error;
  }
  
  // 4. 响应拦截器
  for (const interceptor of responseInterceptors) {
    if (interceptor?.success) {
      const result = await interceptor.success(response, options);
      if (result !== undefined) {
        response = result;
      }
    }
  }
  
  return response;
}
```

## 完整实现

```javascript
// src/ajax/interceptors.js

const interceptors = {
  request: [],
  response: []
};

export function installInterceptors(jQuery) {
  
  // 请求拦截器
  jQuery.ajaxPrefilter = function(dataTypes, handler) {
    // 参数处理
    if (typeof dataTypes === 'function') {
      handler = dataTypes;
      dataTypes = '*';
    }
    
    interceptors.request.push({
      dataTypes: dataTypes.split(' '),
      handler
    });
  };
  
  // 响应成功拦截
  jQuery.ajaxSuccess = function(handler) {
    interceptors.response.push({
      type: 'success',
      handler
    });
  };
  
  // 响应错误拦截
  jQuery.ajaxError = function(handler) {
    interceptors.response.push({
      type: 'error',
      handler
    });
  };
  
  // 请求完成拦截（无论成功失败）
  jQuery.ajaxComplete = function(handler) {
    interceptors.response.push({
      type: 'complete',
      handler
    });
  };
  
  // 在 ajax 中应用拦截器
  jQuery._applyRequestInterceptors = function(options) {
    const dataType = options.dataType || '*';
    
    for (const interceptor of interceptors.request) {
      const { dataTypes, handler } = interceptor;
      
      // 检查 dataType 匹配
      if (dataTypes.includes('*') || dataTypes.includes(dataType)) {
        const result = handler(options, options._original || options);
        
        if (result === false) {
          return false;  // 取消请求
        }
      }
    }
    
    return true;
  };
  
  jQuery._applyResponseInterceptors = function(type, response, options, xhr) {
    for (const interceptor of interceptors.response) {
      if (interceptor.type === type || interceptor.type === 'complete') {
        interceptor.handler(response, options, xhr);
      }
    }
  };
}
```

## 修改 ajax 核心

```javascript
export function ajax(url, options) {
  // ... 配置处理
  
  // 应用请求拦截器
  if (jQuery._applyRequestInterceptors(settings) === false) {
    return Promise.reject(new Error('Request aborted by prefilter'));
  }
  
  return new Promise((resolve, reject) => {
    // ... XHR 创建和发送
    
    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        // 应用成功拦截器
        jQuery._applyResponseInterceptors('success', response, settings, xhr);
        resolve(response);
      } else {
        // 应用错误拦截器
        jQuery._applyResponseInterceptors('error', error, settings, xhr);
        reject(error);
      }
      
      // 应用完成拦截器
      jQuery._applyResponseInterceptors('complete', response, settings, xhr);
    };
  });
}
```

## 使用示例

### 添加认证 Token

```javascript
$.ajaxPrefilter(function(options) {
  const token = localStorage.getItem('token');
  
  if (token) {
    options.headers = options.headers || {};
    options.headers['Authorization'] = 'Bearer ' + token;
  }
});
```

### 请求日志

```javascript
$.ajaxPrefilter(function(options) {
  console.log(`[Request] ${options.method} ${options.url}`);
  options._startTime = Date.now();
});

$.ajaxComplete(function(response, options) {
  const duration = Date.now() - options._startTime;
  console.log(`[Response] ${options.url} - ${duration}ms`);
});
```

### 统一错误处理

```javascript
$.ajaxError(function(error, options, xhr) {
  const status = xhr?.status;
  
  switch (status) {
    case 401:
      // 未授权，跳转登录
      window.location = '/login';
      break;
    case 403:
      showToast('没有权限访问');
      break;
    case 500:
      showToast('服务器错误，请稍后重试');
      break;
    default:
      showToast('请求失败');
  }
});
```

### 响应数据转换

```javascript
$.ajaxSuccess(function(response, options) {
  // 假设 API 返回 { code: 0, data: {...}, message: '' }
  if (response && response.code !== undefined) {
    if (response.code !== 0) {
      throw new Error(response.message);
    }
    // 提取 data
    return response.data;
  }
  return response;
});
```

### 请求签名

```javascript
$.ajaxPrefilter(function(options) {
  const timestamp = Date.now();
  const nonce = Math.random().toString(36).slice(2);
  const signature = sign(options.url, options.data, timestamp, nonce);
  
  options.headers = options.headers || {};
  options.headers['X-Timestamp'] = timestamp;
  options.headers['X-Nonce'] = nonce;
  options.headers['X-Signature'] = signature;
});
```

### 请求重试

```javascript
// 自动重试失败的请求
$.ajaxError(async function(error, options, xhr) {
  // 只重试网络错误
  if (xhr?.status === 0 && options._retryCount < 3) {
    options._retryCount = (options._retryCount || 0) + 1;
    
    // 等待后重试
    await new Promise(r => setTimeout(r, 1000 * options._retryCount));
    
    return $.ajax(options);  // 返回新请求
  }
});
```

### 取消特定请求

```javascript
$.ajaxPrefilter(function(options) {
  // 阻止向特定域名发送请求
  if (options.url.includes('blocked-domain.com')) {
    return false;
  }
});
```

## Axios 风格的拦截器

如果你更喜欢 Axios 的风格：

```javascript
// Axios 风格
$.interceptors = {
  request: {
    use(fulfilled, rejected) {
      requestInterceptors.push({ fulfilled, rejected });
    }
  },
  response: {
    use(fulfilled, rejected) {
      responseInterceptors.push({ fulfilled, rejected });
    }
  }
};

// 使用
$.interceptors.request.use(
  config => {
    config.headers.token = getToken();
    return config;
  },
  error => Promise.reject(error)
);

$.interceptors.response.use(
  response => response.data,
  error => {
    if (error.status === 401) {
      logout();
    }
    return Promise.reject(error);
  }
);
```

## 本章小结

拦截器类型：

- **ajaxPrefilter**：请求前修改配置
- **ajaxSuccess**：成功响应处理
- **ajaxError**：错误响应处理
- **ajaxComplete**：请求完成（无论成功失败）

常见用途：

- 认证 token
- 请求/响应日志
- 统一错误处理
- 数据转换
- 请求签名
- 自动重试

下一章，我们实现错误处理与超时控制。

---

**思考题**：如果有多个拦截器，它们的执行顺序是什么？如何实现"洋葱模型"（先进后出）的拦截器？
