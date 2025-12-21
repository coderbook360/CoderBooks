# $.get 与 $.post 快捷方法

每次写完整的 `$.ajax()` 配置太繁琐。快捷方法让常见请求更简洁。

## 快捷方法概览

```javascript
// GET 请求
$.get(url, data, success, dataType)

// POST 请求
$.post(url, data, success, dataType)

// 等价写法
$.ajax({ url, method: 'GET', data, success, dataType })
$.ajax({ url, method: 'POST', data, success, dataType })
```

## 参数灵活性

这些方法支持多种参数组合：

```javascript
// 最简单
$.get('/api/data')

// 带数据
$.get('/api/search', { q: 'keyword' })

// 带回调
$.get('/api/data', function(data) {
  console.log(data);
})

// 完整参数
$.get('/api/data', { id: 1 }, function(data) {
  console.log(data);
}, 'json')
```

## 参数解析

```javascript
function parseArguments(url, data, success, dataType) {
  // url 必须
  // 其他参数可选且位置灵活
  
  // $.get(url, callback)
  if (typeof data === 'function') {
    dataType = success;
    success = data;
    data = undefined;
  }
  
  // $.get(url, data, dataType)
  if (typeof success === 'string') {
    dataType = success;
    success = undefined;
  }
  
  return { url, data, success, dataType };
}
```

## $.get 实现

```javascript
export function get(url, data, success, dataType) {
  // 参数规范化
  if (typeof data === 'function') {
    dataType = success;
    success = data;
    data = undefined;
  }
  
  if (typeof success === 'string') {
    dataType = success;
    success = undefined;
  }
  
  return $.ajax({
    url,
    method: 'GET',
    data,
    success,
    dataType
  });
}
```

## $.post 实现

```javascript
export function post(url, data, success, dataType) {
  if (typeof data === 'function') {
    dataType = success;
    success = data;
    data = undefined;
  }
  
  if (typeof success === 'string') {
    dataType = success;
    success = undefined;
  }
  
  return $.ajax({
    url,
    method: 'POST',
    data,
    success,
    dataType
  });
}
```

## 完整实现

```javascript
// src/ajax/shortcuts.js

export function installShortcuts(jQuery) {
  
  // 通用快捷方法生成器
  function createShortcut(method) {
    return function(url, data, success, dataType) {
      // 参数规范化
      if (typeof url === 'object') {
        // $.get({ url: '...' })
        return jQuery.ajax({ ...url, method });
      }
      
      if (typeof data === 'function') {
        dataType = success;
        success = data;
        data = undefined;
      }
      
      if (typeof success === 'string') {
        dataType = success;
        success = undefined;
      }
      
      return jQuery.ajax({
        url,
        method,
        data,
        success,
        dataType
      });
    };
  }
  
  // GET
  jQuery.get = createShortcut('GET');
  
  // POST
  jQuery.post = createShortcut('POST');
  
  // PUT
  jQuery.put = createShortcut('PUT');
  
  // DELETE
  jQuery.delete = createShortcut('DELETE');
  
  // PATCH
  jQuery.patch = createShortcut('PATCH');
}
```

## 使用示例

### 基础 GET

```javascript
// 简单获取
$.get('/api/users')
  .then(data => console.log(data));

// 带参数
$.get('/api/users', { page: 1, limit: 10 })
  .then(data => console.log(data));

// 回调方式
$.get('/api/users', function(data) {
  console.log(data);
});

// 指定返回类型
$.get('/api/users', 'json')
  .then(users => console.log(users));
```

### 基础 POST

```javascript
// 提交数据
$.post('/api/users', { name: 'John', age: 30 })
  .then(result => console.log(result));

// 表单提交
$.post('/api/login', {
  username: 'john',
  password: 'secret'
}, 'json')
.then(result => {
  if (result.success) {
    window.location = '/dashboard';
  }
});
```

### async/await

```javascript
async function loadUsers() {
  const users = await $.get('/api/users', 'json');
  console.log('Users:', users);
}

async function createUser(userData) {
  const result = await $.post('/api/users', userData, 'json');
  console.log('Created:', result);
}
```

## RESTful 风格

```javascript
// 获取列表
$.get('/api/users')

// 获取单个
$.get('/api/users/1')

// 创建
$.post('/api/users', { name: 'John' })

// 更新
$.put('/api/users/1', { name: 'Jane' })

// 删除
$.delete('/api/users/1')

// 部分更新
$.patch('/api/users/1', { name: 'Jane' })
```

## load 方法

加载 HTML 到元素：

```javascript
jQuery.fn.load = function(url, data, callback) {
  // 参数处理
  if (typeof data === 'function') {
    callback = data;
    data = undefined;
  }
  
  const $this = this;
  
  // 检查选择器
  const selector = '';
  const spacePos = url.indexOf(' ');
  if (spacePos > -1) {
    selector = url.slice(spacePos).trim();
    url = url.slice(0, spacePos);
  }
  
  const method = data ? 'POST' : 'GET';
  
  $.ajax({
    url,
    method,
    data,
    dataType: 'html'
  })
  .then(response => {
    // 如果有选择器，只取匹配部分
    if (selector) {
      const temp = document.createElement('div');
      temp.innerHTML = response;
      response = temp.querySelector(selector)?.innerHTML || '';
    }
    
    $this.html(response);
    callback?.call($this[0], response);
  })
  .catch(err => {
    callback?.call($this[0], '', 'error', err);
  });
  
  return this;
};
```

使用：

```javascript
// 加载整个页面
$('#content').load('/page.html');

// 只加载部分
$('#content').load('/page.html #main');

// 带数据
$('#content').load('/search', { q: 'keyword' });

// 带回调
$('#content').load('/page.html', function(response) {
  console.log('Loaded');
});
```

## 完整模块

```javascript
// src/ajax/shortcuts.js

export function installShortcuts(jQuery) {
  
  function createShortcut(method) {
    return function(url, data, success, dataType) {
      if (typeof url === 'object') {
        return jQuery.ajax({ ...url, method });
      }
      
      if (typeof data === 'function') {
        dataType = success;
        success = data;
        data = undefined;
      }
      
      if (typeof success === 'string') {
        dataType = success;
        success = undefined;
      }
      
      return jQuery.ajax({ url, method, data, success, dataType });
    };
  }
  
  jQuery.get = createShortcut('GET');
  jQuery.post = createShortcut('POST');
  jQuery.put = createShortcut('PUT');
  jQuery.delete = createShortcut('DELETE');
  jQuery.patch = createShortcut('PATCH');
  
  // load 方法
  jQuery.fn.load = function(url, data, callback) {
    if (typeof data === 'function') {
      callback = data;
      data = undefined;
    }
    
    const $this = this;
    let selector = '';
    
    const spacePos = url.indexOf(' ');
    if (spacePos > -1) {
      selector = url.slice(spacePos).trim();
      url = url.slice(0, spacePos);
    }
    
    jQuery.ajax({
      url,
      method: data ? 'POST' : 'GET',
      data,
      dataType: 'html'
    })
    .then(response => {
      if (selector) {
        const temp = document.createElement('div');
        temp.innerHTML = response;
        const found = temp.querySelector(selector);
        response = found ? found.innerHTML : '';
      }
      
      $this.html(response);
      callback?.call($this[0], response, 'success');
    })
    .catch(err => {
      callback?.call($this[0], '', 'error', err);
    });
    
    return this;
  };
}
```

## 本章小结

快捷方法：

- **$.get()**：GET 请求简化
- **$.post()**：POST 请求简化
- **$.put()/$.delete()/$.patch()**：RESTful 支持
- **$.fn.load()**：直接加载 HTML 到元素

实现要点：

- 灵活的参数解析
- 统一底层调用 $.ajax()
- 返回 Promise 支持链式调用

下一章，我们实现 $.getJSON。

---

**思考题**：`load()` 方法为什么返回 `this` 而不是 Promise？这种设计有什么考虑？
