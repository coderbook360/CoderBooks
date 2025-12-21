# Promise 化改造

回调地狱是 Ajax 的经典问题。Promise 让异步代码更清晰、更易维护。

## 回调地狱

```javascript
// 串行请求
$.ajax({
  url: '/api/user',
  success(user) {
    $.ajax({
      url: '/api/user/' + user.id + '/posts',
      success(posts) {
        $.ajax({
          url: '/api/posts/' + posts[0].id + '/comments',
          success(comments) {
            console.log(comments);
          }
        });
      }
    });
  }
});
```

## Promise 解决方案

```javascript
$.ajax({ url: '/api/user' })
  .then(user => $.ajax({ url: `/api/user/${user.id}/posts` }))
  .then(posts => $.ajax({ url: `/api/posts/${posts[0].id}/comments` }))
  .then(comments => console.log(comments))
  .catch(err => console.error(err));
```

## 基础 Promise 封装

```javascript
function ajax(options) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.open(options.method || 'GET', options.url, true);
    
    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.responseText);
      } else {
        reject(new Error(xhr.statusText));
      }
    };
    
    xhr.onerror = function() {
      reject(new Error('Network Error'));
    };
    
    xhr.send(options.data);
  });
}
```

## 保留回调兼容性

jQuery 的 ajax 既支持回调又支持 Promise：

```javascript
// 回调方式
$.ajax({
  url: '/api/data',
  success(data) { },
  error(err) { }
});

// Promise 方式
$.ajax({ url: '/api/data' })
  .then(data => { })
  .catch(err => { });

// 混合使用
$.ajax({
  url: '/api/data',
  success(data) {
    console.log('Callback:', data);
  }
})
.then(data => {
  console.log('Promise:', data);
});
```

## 完整实现

```javascript
// src/ajax/promise.js

export function promisifyAjax(options) {
  // 标准化选项
  const settings = normalizeOptions(options);
  
  // 创建 Promise
  const promise = new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    // 处理数据
    let { url, data } = prepareData(settings);
    
    // beforeSend 钩子
    if (settings.beforeSend?.(xhr, settings) === false) {
      reject(new Error('Request aborted'));
      return;
    }
    
    // 打开连接
    xhr.open(settings.method, url, settings.async);
    
    // 设置请求头
    setHeaders(xhr, settings, data);
    
    // 超时
    if (settings.timeout > 0) {
      xhr.timeout = settings.timeout;
    }
    
    // 成功
    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = parseResponse(xhr, settings.dataType);
          
          // 触发回调
          settings.success?.(response, 'success', xhr);
          
          resolve(response);
        } catch (e) {
          settings.error?.(xhr, 'parseerror', e);
          reject(e);
        }
      } else {
        const error = new Error(xhr.statusText || 'Request failed');
        error.status = xhr.status;
        error.xhr = xhr;
        
        settings.error?.(xhr, 'error', error);
        reject(error);
      }
      
      settings.complete?.(xhr, xhr.status < 300 ? 'success' : 'error');
    };
    
    // 网络错误
    xhr.onerror = function() {
      const error = new Error('Network Error');
      error.xhr = xhr;
      
      settings.error?.(xhr, 'error', error);
      settings.complete?.(xhr, 'error');
      reject(error);
    };
    
    // 超时
    xhr.ontimeout = function() {
      const error = new Error('Request Timeout');
      error.xhr = xhr;
      
      settings.error?.(xhr, 'timeout', error);
      settings.complete?.(xhr, 'timeout');
      reject(error);
    };
    
    // 发送
    xhr.send(data);
    
    // 保存 xhr 引用
    promise.xhr = xhr;
  });
  
  // 添加 abort 方法
  promise.abort = function() {
    if (promise.xhr) {
      promise.xhr.abort();
    }
    return this;
  };
  
  return promise;
}

// 默认选项
const defaults = {
  method: 'GET',
  async: true,
  contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
  processData: true,
  timeout: 0,
  dataType: 'text',
  cache: true,
  headers: {}
};

function normalizeOptions(options) {
  const settings = { ...defaults, ...options };
  settings.method = settings.method.toUpperCase();
  
  // type 是 method 的别名
  if (options.type) {
    settings.method = options.type.toUpperCase();
  }
  
  return settings;
}

function prepareData(settings) {
  let { url, data, method } = settings;
  
  // 序列化数据
  if (data && settings.processData && typeof data === 'object') {
    if (settings.contentType.includes('application/json')) {
      data = JSON.stringify(data);
    } else {
      data = serialize(data);
    }
  }
  
  // GET 请求数据放 URL
  if (method === 'GET' && data) {
    url += (url.includes('?') ? '&' : '?') + data;
    data = null;
  }
  
  // 禁用缓存
  if (method === 'GET' && !settings.cache) {
    url += (url.includes('?') ? '&' : '?') + '_=' + Date.now();
  }
  
  return { url, data };
}

function setHeaders(xhr, settings, data) {
  // Content-Type
  if (data && settings.method !== 'GET') {
    xhr.setRequestHeader('Content-Type', settings.contentType);
  }
  
  // 自定义头
  for (const key in settings.headers) {
    xhr.setRequestHeader(key, settings.headers[key]);
  }
  
  // Accept
  const accepts = {
    json: 'application/json, text/javascript',
    xml: 'application/xml, text/xml',
    html: 'text/html',
    text: 'text/plain',
    '*': '*/*'
  };
  xhr.setRequestHeader('Accept', accepts[settings.dataType] || accepts['*']);
}

function serialize(data) {
  const parts = [];
  for (const key in data) {
    if (data.hasOwnProperty(key) && data[key] != null) {
      parts.push(
        encodeURIComponent(key) + '=' + encodeURIComponent(data[key])
      );
    }
  }
  return parts.join('&');
}

function parseResponse(xhr, dataType) {
  const response = xhr.responseText;
  
  switch (dataType) {
    case 'json':
      return JSON.parse(response);
    case 'xml':
      return xhr.responseXML;
    case 'script':
      // 执行脚本
      new Function(response)();
      return response;
    default:
      return response;
  }
}
```

## 集成到 jQuery

```javascript
// src/ajax/core.js
import { promisifyAjax } from './promise.js';

export function installAjax(jQuery) {
  jQuery.ajax = function(url, options) {
    // 支持 $.ajax(url, options) 和 $.ajax(options)
    if (typeof url === 'object') {
      options = url;
      url = undefined;
    }
    
    options = options || {};
    if (url) {
      options.url = url;
    }
    
    return promisifyAjax(options);
  };
}
```

## 使用示例

### 基本用法

```javascript
$.ajax({ url: '/api/users', dataType: 'json' })
  .then(users => {
    console.log('Users:', users);
  })
  .catch(err => {
    console.error('Error:', err.message);
  });
```

### async/await

```javascript
async function loadData() {
  try {
    const users = await $.ajax({ url: '/api/users', dataType: 'json' });
    const posts = await $.ajax({ url: `/api/users/${users[0].id}/posts`, dataType: 'json' });
    console.log('Posts:', posts);
  } catch (err) {
    console.error('Error:', err.message);
  }
}
```

### 并行请求

```javascript
const [users, products, orders] = await Promise.all([
  $.ajax({ url: '/api/users', dataType: 'json' }),
  $.ajax({ url: '/api/products', dataType: 'json' }),
  $.ajax({ url: '/api/orders', dataType: 'json' })
]);
```

### 中断请求

```javascript
const request = $.ajax({ url: '/api/slow-request' });

// 5 秒后中断
setTimeout(() => {
  request.abort();
}, 5000);

try {
  const data = await request;
} catch (err) {
  console.log('Request aborted or failed');
}
```

### 超时处理

```javascript
try {
  const data = await $.ajax({
    url: '/api/data',
    timeout: 5000,  // 5 秒超时
    dataType: 'json'
  });
} catch (err) {
  if (err.message === 'Request Timeout') {
    console.log('请求超时，请重试');
  }
}
```

## 与原生 Promise 结合

```javascript
// 重试机制
async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await $.ajax({ url, dataType: 'json' });
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`重试 ${i + 1}/${retries}`);
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

// 竞态控制
let currentRequest = null;

async function search(keyword) {
  // 取消之前的请求
  currentRequest?.abort();
  
  currentRequest = $.ajax({
    url: '/api/search',
    data: { q: keyword },
    dataType: 'json'
  });
  
  return currentRequest;
}
```

## 本章小结

Promise 化改造要点：

- **返回 Promise**：支持 then/catch/await
- **保留回调**：兼容传统用法
- **添加 abort**：返回的 Promise 可取消
- **错误信息丰富**：包含 status、xhr 引用

现代 Ajax 写法：

- 使用 async/await 替代回调
- Promise.all 处理并行请求
- try/catch 统一错误处理

下一章，我们实现完整的 $.ajax 核心方法。

---

**思考题**：如果请求被 abort()，Promise 应该 resolve 还是 reject？为什么？
