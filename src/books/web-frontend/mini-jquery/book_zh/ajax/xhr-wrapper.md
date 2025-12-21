# XMLHttpRequest 封装

在实现 `$.ajax()` 之前，我们先要理解它的底层——XMLHttpRequest (XHR)。

XHR 是浏览器提供的原生 Ajax API，诞生于 2000 年代初期。虽然名字里有 XML，但它实际上可以传输任何格式的数据。现在我们常用的 JSON 数据交互，底层用的还是它（或者更现代的 Fetch API）。

## 先来看看原生用法

用 XHR 发一个 GET 请求：

```javascript
const xhr = new XMLHttpRequest();
xhr.open('GET', '/api/data', true);  // 第三个参数 true 表示异步
xhr.onreadystatechange = function() {
  if (xhr.readyState === 4 && xhr.status === 200) {
    console.log(xhr.responseText);
  }
};
xhr.send();
```

这段代码暴露了几个问题：

1. **状态检查繁琐**：要同时检查 `readyState` 和 `status`
2. **回调地狱**：所有逻辑都挤在一个回调里
3. **错误处理困难**：网络错误和 HTTP 错误处理方式不同

这就是为什么我们需要封装。

## readyState：理解请求的生命周期

XHR 的 `readyState` 表示请求的当前状态：

| 值 | 常量 | 说明 |
|---|------|------|
| 0 | UNSENT | 刚创建，还没调用 open() |
| 1 | OPENED | 已调用 open()，可以设置请求头 |
| 2 | HEADERS_RECEIVED | 收到响应头了 |
| 3 | LOADING | 正在接收响应体 |
| 4 | DONE | 请求完成（不管成功还是失败） |

为什么要了解这些？因为只有在 `readyState === 4` 时，我们才能确定请求已经完成，可以处理响应了。

## 更现代的事件模型

`onreadystatechange` 是老式写法。现代浏览器提供了更清晰的事件：

```javascript
const xhr = new XMLHttpRequest();
xhr.open('GET', '/api/data');

xhr.onload = function() {
  // 请求完成（不管 HTTP 状态码是什么）
  if (xhr.status >= 200 && xhr.status < 300) {
    console.log('成功:', xhr.responseText);
  } else {
    console.log('失败:', xhr.status);
  }
};

xhr.onerror = function() {
  // 网络错误（比如断网、DNS 解析失败）
  console.log('网络错误');
};

xhr.ontimeout = function() {
  // 超时
  console.log('请求超时');
};

xhr.send();
```

注意 `onload` 和 `onerror` 的区别：
- `onload`：HTTP 请求完成了（不管返回 200 还是 404）
- `onerror`：网络层面的错误（根本没收到 HTTP 响应）

## 基础封装：让 XHR 更好用

有了这些知识，让我们封装一个更友好的 API：

```javascript
function request(options) {
  const xhr = new XMLHttpRequest();
  
  xhr.open(options.method || 'GET', options.url, true);
  
  // 设置请求头
  if (options.headers) {
    for (const key in options.headers) {
      xhr.setRequestHeader(key, options.headers[key]);
    }
  }
  
  // 超时设置
  if (options.timeout) {
    xhr.timeout = options.timeout;
  }
  
  // 事件处理
  xhr.onload = function() {
    if (xhr.status >= 200 && xhr.status < 300) {
      options.success?.(xhr.responseText, xhr);
    } else {
      options.error?.(xhr, xhr.statusText);
    }
  };
  
  xhr.onerror = function() {
    options.error?.(xhr, 'Network Error');
  };
  
  xhr.ontimeout = function() {
    options.error?.(xhr, 'Timeout');
  };
  
  xhr.send(options.data || null);
  
  return xhr;  // 返回 xhr 对象，方便后续取消请求
}
```

这个封装已经比原生好用多了。但还有一个大问题：**回调模式不利于处理复杂的异步流程**。下一章我们会用 Promise 来解决这个问题。

## 数据序列化

### URL 编码（表单格式）

```javascript
function serializeParams(data) {
  if (!data || typeof data === 'string') {
    return data;
  }
  
  const parts = [];
  
  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const value = data[key];
      
      if (value === null || value === undefined) {
        continue;
      }
      
      if (Array.isArray(value)) {
        // 数组：key[]=1&key[]=2
        value.forEach(v => {
          parts.push(
            encodeURIComponent(key + '[]') + '=' + encodeURIComponent(v)
          );
        });
      } else if (typeof value === 'object') {
        // 对象：转 JSON
        parts.push(
          encodeURIComponent(key) + '=' + encodeURIComponent(JSON.stringify(value))
        );
      } else {
        parts.push(
          encodeURIComponent(key) + '=' + encodeURIComponent(value)
        );
      }
    }
  }
  
  return parts.join('&');
}
```

### JSON 格式

```javascript
function serializeJSON(data) {
  return JSON.stringify(data);
}
```

## 响应解析

```javascript
function parseResponse(xhr, dataType) {
  const contentType = xhr.getResponseHeader('Content-Type') || '';
  const responseText = xhr.responseText;
  
  // 自动检测或使用指定类型
  const type = dataType || detectType(contentType);
  
  switch (type) {
    case 'json':
      try {
        return JSON.parse(responseText);
      } catch (e) {
        throw new Error('Invalid JSON response');
      }
    
    case 'xml':
      return xhr.responseXML;
    
    case 'html':
    case 'text':
    default:
      return responseText;
  }
}

function detectType(contentType) {
  if (contentType.includes('application/json')) {
    return 'json';
  }
  if (contentType.includes('text/xml') || contentType.includes('application/xml')) {
    return 'xml';
  }
  if (contentType.includes('text/html')) {
    return 'html';
  }
  return 'text';
}
```

## 完整封装

```javascript
// src/ajax/xhr.js

export class XHR {
  constructor(options) {
    this.options = this.normalizeOptions(options);
    this.xhr = new XMLHttpRequest();
  }
  
  normalizeOptions(options) {
    return {
      method: (options.method || 'GET').toUpperCase(),
      url: options.url,
      data: options.data,
      headers: options.headers || {},
      timeout: options.timeout || 0,
      dataType: options.dataType || 'text',
      contentType: options.contentType || 'application/x-www-form-urlencoded; charset=UTF-8',
      processData: options.processData !== false,
      ...options
    };
  }
  
  send() {
    const { xhr, options } = this;
    let { url, data, method } = options;
    
    // 处理数据
    if (data && options.processData && typeof data === 'object') {
      if (options.contentType.includes('application/json')) {
        data = JSON.stringify(data);
      } else {
        data = serializeParams(data);
      }
    }
    
    // GET 请求的数据放 URL
    if (method === 'GET' && data) {
      url += (url.includes('?') ? '&' : '?') + data;
      data = null;
    }
    
    // 打开连接
    xhr.open(method, url, true);
    
    // 设置请求头
    if (data && method !== 'GET') {
      xhr.setRequestHeader('Content-Type', options.contentType);
    }
    
    for (const key in options.headers) {
      xhr.setRequestHeader(key, options.headers[key]);
    }
    
    // 超时
    if (options.timeout > 0) {
      xhr.timeout = options.timeout;
    }
    
    // 发送
    xhr.send(data);
    
    return this;
  }
  
  onSuccess(callback) {
    this.xhr.onload = () => {
      if (this.xhr.status >= 200 && this.xhr.status < 300) {
        const response = parseResponse(this.xhr, this.options.dataType);
        callback(response, this.xhr.status, this.xhr);
      }
    };
    return this;
  }
  
  onError(callback) {
    const { xhr } = this;
    
    xhr.onload = ((originalOnload) => () => {
      if (originalOnload) originalOnload();
      if (xhr.status >= 300) {
        callback(xhr, xhr.status, xhr.statusText);
      }
    })(xhr.onload);
    
    xhr.onerror = () => {
      callback(xhr, 0, 'Network Error');
    };
    
    xhr.ontimeout = () => {
      callback(xhr, 0, 'Timeout');
    };
    
    return this;
  }
  
  abort() {
    this.xhr.abort();
    return this;
  }
}

// 辅助函数
function serializeParams(data) {
  const parts = [];
  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const value = data[key];
      if (value != null) {
        if (Array.isArray(value)) {
          value.forEach(v => {
            parts.push(encodeURIComponent(key + '[]') + '=' + encodeURIComponent(v));
          });
        } else {
          parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
        }
      }
    }
  }
  return parts.join('&');
}

function parseResponse(xhr, dataType) {
  const responseText = xhr.responseText;
  
  switch (dataType) {
    case 'json':
      return JSON.parse(responseText);
    case 'xml':
      return xhr.responseXML;
    default:
      return responseText;
  }
}
```

## 使用封装后的 XHR

```javascript
// GET 请求
new XHR({
  url: '/api/users',
  dataType: 'json'
})
.onSuccess((data) => {
  console.log('Users:', data);
})
.onError((xhr, status, error) => {
  console.error('Error:', error);
})
.send();

// POST 请求
new XHR({
  url: '/api/users',
  method: 'POST',
  data: { name: 'John', age: 30 },
  dataType: 'json'
})
.onSuccess((data) => {
  console.log('Created:', data);
})
.send();

// JSON 请求体
new XHR({
  url: '/api/users',
  method: 'POST',
  data: { name: 'John', age: 30 },
  contentType: 'application/json',
  dataType: 'json'
})
.onSuccess((data) => {
  console.log('Created:', data);
})
.send();
```

## 上传进度

```javascript
class XHR {
  // ...
  
  onProgress(callback) {
    this.xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = (event.loaded / event.total) * 100;
        callback(percent, event.loaded, event.total);
      }
    };
    return this;
  }
}

// 使用
new XHR({
  url: '/upload',
  method: 'POST',
  data: formData,
  processData: false
})
.onProgress((percent) => {
  console.log(`上传进度: ${percent.toFixed(1)}%`);
})
.onSuccess(() => {
  console.log('上传完成');
})
.send();
```

## 中断请求

```javascript
const request = new XHR({
  url: '/api/slow-request'
}).send();

// 5 秒后中断
setTimeout(() => {
  request.abort();
  console.log('请求已中断');
}, 5000);
```

## 本章小结

XHR 封装要点：

- **现代事件**：使用 onload/onerror/ontimeout 代替 readystatechange
- **数据处理**：自动序列化请求数据，自动解析响应
- **链式调用**：返回 this 支持流式配置
- **进度监控**：upload.onprogress 跟踪上传进度
- **可中断**：abort() 取消请求

下一章，我们用 Promise 改造这个封装。

---

**思考题**：XHR 的 `withCredentials` 属性是做什么的？在什么场景下需要设置它？
