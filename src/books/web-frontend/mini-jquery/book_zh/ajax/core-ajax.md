# $.ajax 核心实现

前面我们分别实现了 XHR 封装和 Promise 化。本章整合为完整的 $.ajax 方法。

## API 设计

```javascript
// 完整配置
$.ajax({
  url: '/api/data',
  method: 'POST',
  data: { key: 'value' },
  dataType: 'json',
  contentType: 'application/json',
  headers: { 'X-Token': 'xxx' },
  timeout: 10000,
  cache: false,
  success(data, status, xhr) { },
  error(xhr, status, error) { },
  complete(xhr, status) { },
  beforeSend(xhr, settings) { }
});

// 返回 Promise
$.ajax({ url: '/api/data' })
  .then(data => { })
  .catch(err => { });
```

## 完整配置选项

```javascript
const defaultSettings = {
  // 请求配置
  url: '',
  method: 'GET',           // 或 type
  data: null,
  headers: {},
  
  // 超时与缓存
  timeout: 0,
  cache: true,
  
  // 数据处理
  contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
  dataType: 'text',        // text, json, xml, html, script
  processData: true,       // 是否自动序列化 data
  
  // 回调
  success: null,
  error: null,
  complete: null,
  beforeSend: null,
  
  // 高级
  async: true,
  crossDomain: false,
  xhrFields: {}            // 额外的 xhr 属性
};
```

## 核心实现

```javascript
// src/ajax/core.js

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

// 全局配置
let ajaxSettings = { ...defaults };

export function ajax(url, options) {
  // 参数规范化：支持 ajax(url, options) 和 ajax(options)
  if (typeof url === 'object') {
    options = url;
    url = options.url;
  } else {
    options = options || {};
    options.url = url;
  }
  
  // 合并配置
  const settings = mergeSettings(options);
  
  // 创建 Promise
  return new Promise((resolve, reject) => {
    const xhr = createXHR(settings);
    
    // 准备请求数据
    const { finalUrl, requestData } = prepareRequest(settings);
    
    // beforeSend 钩子
    if (settings.beforeSend) {
      const result = settings.beforeSend(xhr, settings);
      if (result === false) {
        reject(new AjaxError('Request aborted', 0, xhr));
        return;
      }
    }
    
    // 打开连接
    xhr.open(settings.method, finalUrl, settings.async);
    
    // 设置请求头
    setRequestHeaders(xhr, settings, requestData);
    
    // 设置超时
    if (settings.timeout > 0) {
      xhr.timeout = settings.timeout;
    }
    
    // 设置额外属性
    if (settings.xhrFields) {
      for (const key in settings.xhrFields) {
        xhr[key] = settings.xhrFields[key];
      }
    }
    
    // 事件处理
    xhr.onload = function() {
      handleResponse(xhr, settings, resolve, reject);
    };
    
    xhr.onerror = function() {
      handleError(xhr, settings, 'error', reject);
    };
    
    xhr.ontimeout = function() {
      handleError(xhr, settings, 'timeout', reject);
    };
    
    // 发送请求
    xhr.send(requestData);
  });
}

// 创建 XHR
function createXHR(settings) {
  const xhr = new XMLHttpRequest();
  
  // 暴露给外部
  settings._xhr = xhr;
  
  return xhr;
}

// 合并配置
function mergeSettings(options) {
  const settings = { ...ajaxSettings, ...options };
  
  // type 是 method 的别名
  if (options.type) {
    settings.method = options.type;
  }
  
  settings.method = settings.method.toUpperCase();
  
  return settings;
}

// 准备请求
function prepareRequest(settings) {
  let { url, data, method, processData, contentType, cache } = settings;
  
  // 序列化数据
  if (data && processData && typeof data === 'object') {
    if (contentType.includes('application/json')) {
      data = JSON.stringify(data);
    } else {
      data = serializeData(data);
    }
  }
  
  // GET 请求：数据放 URL
  if (method === 'GET' && data) {
    url += (url.includes('?') ? '&' : '?') + data;
    data = null;
  }
  
  // 禁用缓存
  if (!cache && method === 'GET') {
    url += (url.includes('?') ? '&' : '?') + '_=' + Date.now();
  }
  
  return {
    finalUrl: url,
    requestData: data
  };
}

// 序列化数据
function serializeData(data) {
  const parts = [];
  
  for (const key in data) {
    if (!data.hasOwnProperty(key)) continue;
    
    const value = data[key];
    if (value == null) continue;
    
    if (Array.isArray(value)) {
      value.forEach((v, i) => {
        parts.push(encodeURIComponent(`${key}[${i}]`) + '=' + encodeURIComponent(v));
      });
    } else if (typeof value === 'object') {
      parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(JSON.stringify(value)));
    } else {
      parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
    }
  }
  
  return parts.join('&');
}

// 设置请求头
function setRequestHeaders(xhr, settings, data) {
  const { method, contentType, headers, dataType } = settings;
  
  // Content-Type
  if (data && method !== 'GET') {
    xhr.setRequestHeader('Content-Type', contentType);
  }
  
  // Accept
  const accepts = {
    '*': '*/*',
    text: 'text/plain',
    html: 'text/html',
    xml: 'application/xml, text/xml',
    json: 'application/json, text/javascript',
    script: 'text/javascript, application/javascript'
  };
  xhr.setRequestHeader('Accept', accepts[dataType] || accepts['*']);
  
  // 自定义头
  for (const key in headers) {
    xhr.setRequestHeader(key, headers[key]);
  }
  
  // AJAX 标识
  xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
}

// 处理响应
function handleResponse(xhr, settings, resolve, reject) {
  const status = xhr.status;
  
  // HTTP 状态检查
  const isSuccess = status >= 200 && status < 300 || status === 304;
  
  if (isSuccess) {
    try {
      const response = parseResponse(xhr, settings.dataType);
      
      // 成功回调
      settings.success?.(response, 'success', xhr);
      settings.complete?.(xhr, 'success');
      
      resolve(response);
    } catch (e) {
      // 解析错误
      settings.error?.(xhr, 'parsererror', e);
      settings.complete?.(xhr, 'parsererror');
      
      reject(new AjaxError('Parse error: ' + e.message, status, xhr));
    }
  } else {
    // HTTP 错误
    const error = new AjaxError(xhr.statusText || 'Error', status, xhr);
    
    settings.error?.(xhr, 'error', error);
    settings.complete?.(xhr, 'error');
    
    reject(error);
  }
}

// 处理错误
function handleError(xhr, settings, type, reject) {
  const messages = {
    error: 'Network Error',
    timeout: 'Request Timeout',
    abort: 'Request Aborted'
  };
  
  const error = new AjaxError(messages[type], 0, xhr);
  
  settings.error?.(xhr, type, error);
  settings.complete?.(xhr, type);
  
  reject(error);
}

// 解析响应
function parseResponse(xhr, dataType) {
  const responseText = xhr.responseText;
  const contentType = xhr.getResponseHeader('Content-Type') || '';
  
  // 自动检测
  if (!dataType || dataType === 'auto') {
    if (contentType.includes('json')) {
      dataType = 'json';
    } else if (contentType.includes('xml')) {
      dataType = 'xml';
    } else if (contentType.includes('html')) {
      dataType = 'html';
    } else {
      dataType = 'text';
    }
  }
  
  switch (dataType) {
    case 'json':
      return JSON.parse(responseText);
    case 'xml':
      return xhr.responseXML;
    case 'script':
      new Function(responseText)();
      return responseText;
    default:
      return responseText;
  }
}

// 自定义错误类
class AjaxError extends Error {
  constructor(message, status, xhr) {
    super(message);
    this.name = 'AjaxError';
    this.status = status;
    this.xhr = xhr;
  }
}
```

## 全局配置

```javascript
// 设置全局默认值
export function ajaxSetup(options) {
  Object.assign(ajaxSettings, options);
}

// 使用
$.ajaxSetup({
  timeout: 10000,
  headers: {
    'X-Token': 'my-token'
  }
});
```

## 集成到 jQuery

```javascript
// src/ajax/index.js
import { ajax, ajaxSetup } from './core.js';

export function installAjax(jQuery) {
  jQuery.ajax = ajax;
  jQuery.ajaxSetup = ajaxSetup;
  
  // 暴露默认配置
  jQuery.ajaxSettings = ajaxSettings;
}
```

## 使用示例

### GET 请求

```javascript
const data = await $.ajax({
  url: '/api/users',
  dataType: 'json'
});
```

### POST JSON

```javascript
const result = await $.ajax({
  url: '/api/users',
  method: 'POST',
  contentType: 'application/json',
  data: { name: 'John', age: 30 },
  dataType: 'json'
});
```

### 文件上传

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const result = await $.ajax({
  url: '/upload',
  method: 'POST',
  data: formData,
  processData: false,  // 不要序列化
  contentType: false   // 让浏览器自动设置
});
```

### 认证请求

```javascript
const data = await $.ajax({
  url: '/api/protected',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  xhrFields: {
    withCredentials: true  // 发送 cookies
  }
});
```

### 请求前处理

```javascript
const data = await $.ajax({
  url: '/api/data',
  beforeSend(xhr, settings) {
    // 添加签名
    const signature = sign(settings.url);
    xhr.setRequestHeader('X-Signature', signature);
    
    // 返回 false 取消请求
    if (!isOnline()) {
      return false;
    }
  }
});
```

## 本章小结

$.ajax 核心实现：

- **配置合并**：全局配置 + 请求配置
- **数据处理**：自动序列化、URL 参数
- **请求头**：Content-Type、Accept、自定义头
- **响应解析**：自动检测或指定类型
- **错误处理**：HTTP 错误、网络错误、超时、解析错误
- **生命周期**：beforeSend → success/error → complete

下一章，我们实现快捷方法。

---

**思考题**：`processData: false` 和 `contentType: false` 在文件上传时为什么必须同时设置？
