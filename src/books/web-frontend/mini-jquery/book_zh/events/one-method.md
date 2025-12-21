# one 方法：一次性事件

`one()` 方法绑定的事件只会执行一次，执行后自动解绑。

## 基本用法

```javascript
$('.btn').one('click', function() {
  console.log('只会执行一次');
});
```

## 与 on 的区别

```javascript
// on：每次点击都执行
$('.btn').on('click', handler);

// one：只执行第一次点击
$('.btn').one('click', handler);
```

## 实现原理

有两种实现方式：

### 方式一：包装处理函数

```javascript
jQuery.fn.one = function(types, selector, data, handler) {
  // 参数规范化（同 on）
  if (typeof selector === 'function') {
    handler = selector;
    selector = undefined;
    data = undefined;
  } else if (typeof data === 'function') {
    if (typeof selector === 'string') {
      handler = data;
      data = undefined;
    } else {
      handler = data;
      data = selector;
      selector = undefined;
    }
  }
  
  const self = this;
  
  // 包装处理函数
  function oneHandler(e) {
    // 解绑
    self.off(types, selector, oneHandler);
    // 执行原始处理函数
    return handler.apply(this, arguments);
  }
  
  // 保存原始引用，用于 off
  oneHandler.originalHandler = handler;
  
  return this.on(types, selector, data, oneHandler);
};
```

### 方式二：使用标志位

在我们的事件系统中，处理函数对象有 `once` 标志：

```javascript
jQuery.fn.one = function(types, selector, data, handler) {
  // 参数规范化
  if (typeof selector === 'function') {
    handler = selector;
    selector = undefined;
    data = undefined;
  } else if (typeof data === 'function') {
    if (typeof selector === 'string') {
      handler = data;
      data = undefined;
    } else {
      handler = data;
      data = selector;
      selector = undefined;
    }
  }
  
  if (!handler) return this;
  
  const typeList = types.trim().split(/\s+/);
  
  return this.each(function() {
    const elem = this;
    
    typeList.forEach(typeNs => {
      const { type, namespace } = parseEventType(typeNs);
      
      if (!type) return;
      
      addHandler(elem, type, {
        handler,
        selector: selector || null,
        namespace: namespace || '',
        data,
        once: true  // 标记为一次性
      });
      
      bindMainHandler(elem, type);
    });
  });
};
```

在主调度器中处理：

```javascript
function mainHandler(event) {
  // ...
  
  for (const h of handlersCopy) {
    // ... 执行处理函数
    
    // 一次性事件：执行后移除
    if (h.once) {
      removeHandlerObj(elem, event.type, h);
    }
  }
}
```

## 多元素的一次性

`one()` 是每个元素执行一次，不是所有元素只执行一次：

```javascript
// 每个 .btn 都会执行一次
$('.btn').one('click', handler);
```

如果需要所有元素只执行一次：

```javascript
let executed = false;

$('.btn').on('click', function() {
  if (executed) return;
  executed = true;
  handler.call(this);
});
```

## 事件委托的 one

委托事件同样支持一次性：

```javascript
$('.list').one('click', '.item', function() {
  console.log('只对第一个点击的 .item 执行');
});
```

注意：是整个委托只执行一次，不是每个 `.item` 执行一次。

如果需要每个 `.item` 执行一次：

```javascript
const clicked = new Set();

$('.list').on('click', '.item', function() {
  if (clicked.has(this)) return;
  clicked.add(this);
  handler.call(this);
});
```

## 完整实现

```javascript
// src/events/events.js

jQuery.fn.one = function(types, selector, data, handler) {
  // 对象形式
  if (typeof types === 'object') {
    for (const type in types) {
      this.one(type, selector, data, types[type]);
    }
    return this;
  }
  
  // 参数规范化
  if (typeof selector === 'function') {
    handler = selector;
    selector = undefined;
    data = undefined;
  } else if (typeof data === 'function') {
    if (typeof selector === 'string') {
      handler = data;
      data = undefined;
    } else {
      handler = data;
      data = selector;
      selector = undefined;
    }
  }
  
  if (!handler) return this;
  
  const typeList = types.trim().split(/\s+/);
  
  return this.each(function() {
    const elem = this;
    
    typeList.forEach(typeNs => {
      const { type, namespace } = parseEventType(typeNs);
      
      if (!type) return;
      
      addHandler(elem, type, {
        handler,
        selector: selector || null,
        namespace: namespace || '',
        data,
        once: true
      });
      
      bindMainHandler(elem, type);
    });
  });
};
```

## 实际应用场景

### 场景 1：首次加载

```javascript
// 图片首次进入视口时加载
$('.lazy-img').one('inview', function() {
  this.src = $(this).data('src');
});
```

### 场景 2：初始化操作

```javascript
// 下拉菜单首次打开时加载数据
$('.dropdown').one('click', function() {
  loadDropdownData(this);
});
```

### 场景 3：动画结束

```javascript
// 动画结束后执行一次
$('.animated').one('animationend', function() {
  $(this).removeClass('animated');
});
```

### 场景 4：引导提示

```javascript
// 首次悬停显示提示
$('.feature').one('mouseenter', function() {
  showTooltip(this, '这是新功能！');
});
```

### 场景 5：表单首次提交

```javascript
// 防止重复提交
$('.form').one('submit', function(e) {
  e.preventDefault();
  submitForm(this);
});
```

### 场景 6：资源加载

```javascript
// 确保只处理一次加载完成
$('img').one('load', function() {
  $(this).addClass('loaded');
});
```

## 与手动解绑的对比

```javascript
// 使用 one
$('.btn').one('click', handler);

// 等效的手动实现
$('.btn').on('click', function(e) {
  $(this).off('click', arguments.callee);
  handler.call(this, e);
});

// 或使用命名函数
function onceHandler(e) {
  $(this).off('click', onceHandler);
  handler.call(this, e);
}
$('.btn').on('click', onceHandler);
```

`one()` 更简洁，不需要自己管理解绑。

## 本章小结

`one()` 方法的特点：

- **自动解绑**：执行后自动移除
- **每元素一次**：每个匹配元素都会执行一次
- **支持委托**：整个委托只执行一次
- **API 一致**：参数与 `on()` 相同

实现要点：

- 使用 `once` 标志位
- 在主调度器执行后检查并移除
- 或者包装处理函数

下一章，我们深入实现事件委托机制。

---

**思考题**：如果对同一个元素用 `one()` 绑定多个处理函数，它们会按什么顺序执行？第一个执行后，其他的会不会被影响？
