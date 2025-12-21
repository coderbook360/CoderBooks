# $.getJSON：JSON 数据获取

JSON 是现代 Web 最常用的数据格式。$.getJSON 专门优化 JSON 请求。

## 基本用法

```javascript
$.getJSON('/api/users', function(data) {
  console.log(data);  // 已经是对象，不需要 JSON.parse
});

// Promise 方式
$.getJSON('/api/users')
  .then(data => console.log(data));

// 带参数
$.getJSON('/api/users', { page: 1 }, function(data) {
  console.log(data);
});
```

## 实现

```javascript
export function getJSON(url, data, success) {
  // 参数规范化
  if (typeof data === 'function') {
    success = data;
    data = undefined;
  }
  
  return $.ajax({
    url,
    data,
    success,
    dataType: 'json'
  });
}
```

就这么简单——它只是 $.get 的 JSON 专用版本。

## 为什么需要 getJSON

对比：

```javascript
// 使用 $.get
$.get('/api/users', function(data) {
  data = JSON.parse(data);  // 需要手动解析
  console.log(data);
});

// 使用 $.get + dataType
$.get('/api/users', 'json')
  .then(data => console.log(data));

// 使用 $.getJSON
$.getJSON('/api/users')
  .then(data => console.log(data));  // 最简洁
```

## JSONP 支持

传统 JSONP 用于跨域请求（现在有 CORS，已很少使用）：

```javascript
// URL 包含 callback=? 自动使用 JSONP
$.getJSON('http://other-domain.com/api?callback=?', function(data) {
  console.log(data);
});
```

JSONP 实现原理：

```javascript
function jsonp(url, callback) {
  // 生成唯一回调名
  const callbackName = 'jsonp_' + Date.now();
  
  // 注册全局回调
  window[callbackName] = function(data) {
    callback(data);
    // 清理
    delete window[callbackName];
    script.remove();
  };
  
  // 创建 script 标签
  const script = document.createElement('script');
  script.src = url.replace('callback=?', 'callback=' + callbackName);
  document.body.appendChild(script);
}
```

## 完整实现

```javascript
// src/ajax/get-json.js

export function installGetJSON(jQuery) {
  
  jQuery.getJSON = function(url, data, success) {
    // 参数规范化
    if (typeof data === 'function') {
      success = data;
      data = undefined;
    }
    
    // 检测 JSONP
    if (url.includes('callback=?')) {
      return jsonp(url, data, success);
    }
    
    return jQuery.ajax({
      url,
      data,
      success,
      dataType: 'json'
    });
  };
  
  // JSONP 实现
  function jsonp(url, data, success) {
    return new Promise((resolve, reject) => {
      // 生成回调名
      const callbackName = 'jQuery_jsonp_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      
      // 添加数据参数
      if (data) {
        const params = [];
        for (const key in data) {
          params.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
        }
        url += (url.includes('?') ? '&' : '?') + params.join('&');
      }
      
      // 替换回调占位符
      url = url.replace('callback=?', 'callback=' + callbackName);
      
      // 注册全局回调
      window[callbackName] = function(response) {
        // 清理
        delete window[callbackName];
        script.remove();
        
        // 触发回调
        success?.(response);
        resolve(response);
      };
      
      // 创建 script 标签
      const script = document.createElement('script');
      
      script.onerror = function() {
        delete window[callbackName];
        script.remove();
        reject(new Error('JSONP request failed'));
      };
      
      script.src = url;
      document.head.appendChild(script);
    });
  }
  
  // getScript - 加载并执行脚本
  jQuery.getScript = function(url, success) {
    return jQuery.ajax({
      url,
      dataType: 'script',
      success,
      cache: true  // 脚本可以缓存
    });
  };
}
```

## 使用示例

### 基础用法

```javascript
// 获取用户列表
$.getJSON('/api/users')
  .then(users => {
    users.forEach(user => {
      console.log(user.name);
    });
  });
```

### 带参数

```javascript
// 分页请求
$.getJSON('/api/posts', { page: 1, limit: 10 })
  .then(posts => {
    renderPosts(posts);
  });
```

### 错误处理

```javascript
$.getJSON('/api/data')
  .then(data => {
    console.log(data);
  })
  .catch(err => {
    console.error('Failed to load JSON:', err);
  });
```

### async/await

```javascript
async function loadData() {
  try {
    const users = await $.getJSON('/api/users');
    const posts = await $.getJSON('/api/posts', { userId: users[0].id });
    return { users, posts };
  } catch (err) {
    console.error(err);
  }
}
```

### JSONP（传统跨域）

```javascript
// 访问第三方 API
$.getJSON('https://api.example.com/data?callback=?')
  .then(data => {
    console.log(data);
  });
```

### 加载脚本

```javascript
// 动态加载第三方库
$.getScript('https://cdn.example.com/lib.js')
  .then(() => {
    // 库已加载，可以使用
    lib.init();
  });

// 带回调
$.getScript('/js/plugin.js', function() {
  console.log('Plugin loaded');
});
```

## 实际应用场景

### 场景 1：配置加载

```javascript
async function initApp() {
  const config = await $.getJSON('/config.json');
  
  app.configure(config);
  app.start();
}
```

### 场景 2：无限滚动

```javascript
let page = 1;

async function loadMore() {
  const posts = await $.getJSON('/api/posts', { page: page++ });
  
  if (posts.length === 0) {
    // 没有更多了
    return false;
  }
  
  posts.forEach(post => {
    $('.posts').append(renderPost(post));
  });
  
  return true;
}
```

### 场景 3：搜索建议

```javascript
let timer;

$('#search').on('input', function() {
  clearTimeout(timer);
  
  const keyword = this.value;
  
  timer = setTimeout(async () => {
    const suggestions = await $.getJSON('/api/suggest', { q: keyword });
    renderSuggestions(suggestions);
  }, 300);
});
```

### 场景 4：多语言

```javascript
async function loadLanguage(lang) {
  const messages = await $.getJSON(`/i18n/${lang}.json`);
  
  i18n.setMessages(messages);
  i18n.update();
}
```

## JSON 解析错误处理

```javascript
$.getJSON('/api/data')
  .catch(err => {
    if (err.message.includes('JSON')) {
      console.error('服务器返回了无效的 JSON');
    } else {
      console.error('网络错误:', err);
    }
  });
```

## 本章小结

$.getJSON 特点：

- **自动解析**：返回的直接是 JavaScript 对象
- **简洁 API**：专注于 JSON 数据获取
- **JSONP 支持**：url 含 `callback=?` 自动使用 JSONP

相关方法：

- **$.getJSON()**：获取 JSON 数据
- **$.getScript()**：加载并执行脚本

下一章，我们实现请求拦截器。

---

**思考题**：现代开发中 JSONP 已经很少使用，但了解它有什么价值？它和 CORS 相比有什么劣势？
