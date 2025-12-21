# Ajax 模块设计

Ajax 让网页无需刷新就能与服务器通信。本章设计 mini-jQuery 的 Ajax 模块架构。

## Ajax 的核心能力

- 发送 HTTP 请求
- 处理响应数据
- 支持多种数据格式
- 错误处理与超时控制

## jQuery Ajax API 概览

```javascript
// 核心方法
$.ajax({ url, method, data, success, error });

// 快捷方法
$.get(url, data, success);
$.post(url, data, success);
$.getJSON(url, success);
$.getScript(url, success);

// 全局事件
$(document).ajaxStart(fn);
$(document).ajaxComplete(fn);
```

## 模块架构

```
ajax/
├── xhr.js           # XMLHttpRequest 封装
├── promise.js       # Promise 包装
├── core.js          # $.ajax 核心
├── shortcuts.js     # 快捷方法
├── interceptors.js  # 拦截器
└── index.js         # 导出
```

## 设计原则

### 1. 配置优先

```javascript
// 默认配置
const defaults = {
  method: 'GET',
  async: true,
  contentType: 'application/x-www-form-urlencoded',
  timeout: 0,
  dataType: 'text'
};

// 使用时合并
$.ajax({
  url: '/api/data',
  method: 'POST'
});
```

### 2. 数据格式自动处理

```javascript
// 根据 dataType 自动解析响应
switch (options.dataType) {
  case 'json':
    return JSON.parse(response);
  case 'xml':
    return parseXML(response);
  default:
    return response;
}
```

### 3. Promise 支持

```javascript
// 传统回调
$.ajax({
  url: '/api/data',
  success(data) { },
  error(err) { }
});

// Promise
$.ajax({ url: '/api/data' })
  .then(data => { })
  .catch(err => { });
```

## 核心接口设计

```javascript
// $.ajax 配置对象
interface AjaxOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: object | string;
  dataType?: 'text' | 'json' | 'xml' | 'html';
  contentType?: string;
  headers?: object;
  timeout?: number;
  async?: boolean;
  
  // 回调
  success?: (data, status, xhr) => void;
  error?: (xhr, status, error) => void;
  complete?: (xhr, status) => void;
  
  // 高级
  beforeSend?: (xhr, options) => boolean | void;
  processData?: boolean;
  cache?: boolean;
}
```

## 请求生命周期

```
1. 配置合并
   ↓
2. beforeSend（可取消）
   ↓
3. 数据序列化
   ↓
4. 发送请求
   ↓
5. 等待响应
   ↓
6. 解析响应
   ↓
7. success/error 回调
   ↓
8. complete 回调
```

## 核心实现框架

```javascript
// src/ajax/core.js

const defaults = {
  method: 'GET',
  async: true,
  contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
  processData: true,
  timeout: 0,
  dataType: 'text',
  headers: {}
};

export function ajax(options) {
  // 1. 合并配置
  const settings = { ...defaults, ...options };
  
  // 2. 返回 Promise
  return new Promise((resolve, reject) => {
    // 3. 创建 XHR
    const xhr = new XMLHttpRequest();
    
    // 4. 处理数据
    let { url, data, method } = settings;
    
    if (data && settings.processData && typeof data === 'object') {
      data = serialize(data);
    }
    
    if (method === 'GET' && data) {
      url += (url.includes('?') ? '&' : '?') + data;
      data = null;
    }
    
    // 5. beforeSend 钩子
    if (settings.beforeSend?.(xhr, settings) === false) {
      return reject(new Error('Request aborted'));
    }
    
    // 6. 打开连接
    xhr.open(method, url, settings.async);
    
    // 7. 设置头
    if (data && method !== 'GET') {
      xhr.setRequestHeader('Content-Type', settings.contentType);
    }
    
    for (const key in settings.headers) {
      xhr.setRequestHeader(key, settings.headers[key]);
    }
    
    // 8. 超时
    if (settings.timeout > 0) {
      xhr.timeout = settings.timeout;
    }
    
    // 9. 响应处理
    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        const response = parseResponse(xhr, settings.dataType);
        settings.success?.(response, 'success', xhr);
        resolve(response);
      } else {
        const error = new Error(xhr.statusText);
        settings.error?.(xhr, 'error', error);
        reject(error);
      }
      settings.complete?.(xhr, xhr.status < 400 ? 'success' : 'error');
    };
    
    xhr.onerror = function() {
      const error = new Error('Network error');
      settings.error?.(xhr, 'error', error);
      settings.complete?.(xhr, 'error');
      reject(error);
    };
    
    xhr.ontimeout = function() {
      const error = new Error('Request timeout');
      settings.error?.(xhr, 'timeout', error);
      settings.complete?.(xhr, 'timeout');
      reject(error);
    };
    
    // 10. 发送
    xhr.send(data);
  });
}

function serialize(data) {
  const parts = [];
  for (const key in data) {
    parts.push(
      encodeURIComponent(key) + '=' + encodeURIComponent(data[key])
    );
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
    default:
      return response;
  }
}
```

## 集成到 jQuery

```javascript
// src/ajax/index.js
import { ajax } from './core.js';
import { get, post, getJSON } from './shortcuts.js';

export function installAjax(jQuery) {
  jQuery.ajax = ajax;
  jQuery.get = get;
  jQuery.post = post;
  jQuery.getJSON = getJSON;
  
  // 配置默认值
  jQuery.ajaxSetup = function(options) {
    Object.assign(defaults, options);
  };
}
```

## 使用示例

```javascript
// GET 请求
$.ajax({
  url: '/api/users',
  dataType: 'json',
  success(users) {
    console.log(users);
  }
});

// POST 请求
$.ajax({
  url: '/api/users',
  method: 'POST',
  data: { name: 'John', age: 30 },
  dataType: 'json'
})
.then(result => console.log(result))
.catch(err => console.error(err));
```

## 与原生 fetch 对比

| 特性 | $.ajax | fetch |
|------|--------|-------|
| Promise | ✓ | ✓ |
| 回调 | ✓ | ✗ |
| 超时 | ✓ | 需封装 |
| 拦截器 | ✓ | 需封装 |
| 自动 JSON 解析 | ✓ | 需手动 |
| 进度事件 | ✓ | 有限 |

## 本章小结

Ajax 模块设计要点：

- **配置驱动**：默认配置 + 用户配置合并
- **生命周期**：beforeSend → 请求 → 响应 → success/error → complete
- **双模式**：支持回调和 Promise
- **自动处理**：数据序列化、响应解析

下一章，我们深入 XMLHttpRequest 封装。

---

**思考题**：现代开发更倾向使用 fetch API，为什么还要学习 XHR 封装？两者有什么本质区别？
