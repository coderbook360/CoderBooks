# off 方法：事件解绑

`off()` 方法用于移除事件处理函数。它需要与 `on()` 配合，支持精确移除和批量移除。

## 基本用法

```javascript
// 移除指定处理函数
$('.btn').off('click', handler);

// 移除所有 click 事件
$('.btn').off('click');

// 移除委托事件
$('.list').off('click', '.item');

// 移除所有事件
$('.btn').off();

// 移除命名空间下的所有事件
$('.btn').off('.myPlugin');
```

## 移除逻辑

移除时需要根据条件过滤：

```javascript
function matchesHandler(handlerObj, handler, selector, namespace) {
  // 如果指定了处理函数，必须匹配
  if (handler && handlerObj.handler !== handler) {
    return false;
  }
  
  // 如果指定了选择器，必须匹配
  if (selector && handlerObj.selector !== selector) {
    return false;
  }
  
  // 如果指定了命名空间，必须匹配
  if (namespace && !matchNamespace(handlerObj.namespace, namespace)) {
    return false;
  }
  
  return true;
}
```

## 命名空间匹配

```javascript
// 'myPlugin.v2' 匹配 'myPlugin' 和 'v2' 和 'myPlugin.v2'
function matchNamespace(handlerNs, removeNs) {
  if (!removeNs) return true;
  if (!handlerNs) return false;
  
  // 移除的命名空间的每个部分都必须在处理函数的命名空间中
  const removeParts = removeNs.split('.');
  const handlerParts = handlerNs.split('.');
  
  return removeParts.every(part => handlerParts.includes(part));
}
```

## 完整实现

```javascript
// 在 events.js 中添加

function removeHandlers(elem, type, handler, selector, namespace) {
  const data = getData(elem);
  const handlers = data.handlers[type];
  
  if (!handlers) return;
  
  data.handlers[type] = handlers.filter(h => {
    return !matchesHandler(h, handler, selector, namespace);
  });
  
  // 如果没有处理函数了，移除主调度器
  if (data.handlers[type].length === 0) {
    delete data.handlers[type];
    unbindMainHandler(elem, type);
  }
}

function matchesHandler(h, handler, selector, namespace) {
  if (handler && h.handler !== handler) return false;
  if (selector !== undefined && h.selector !== selector) return false;
  if (namespace && !matchNamespace(h.namespace, namespace)) return false;
  return true;
}

function matchNamespace(handlerNs, removeNs) {
  if (!removeNs) return true;
  if (!handlerNs) return false;
  
  const removeParts = removeNs.split('.');
  const handlerParts = handlerNs.split('.');
  
  return removeParts.every(part => handlerParts.includes(part));
}

function unbindMainHandler(elem, type) {
  const types = boundTypes.get(elem);
  if (types?.has(type)) {
    elem.removeEventListener(type, mainHandler);
    types.delete(type);
  }
}

jQuery.fn.off = function(types, selector, handler) {
  // 参数规范化
  if (typeof selector === 'function') {
    handler = selector;
    selector = undefined;
  }
  
  // 无参数：移除所有事件
  if (types === undefined) {
    return this.each(function() {
      const data = getData(this);
      for (const type in data.handlers) {
        unbindMainHandler(this, type);
      }
      data.handlers = {};
    });
  }
  
  // 只有命名空间：off('.namespace')
  if (types.startsWith('.')) {
    const namespace = types.slice(1);
    return this.each(function() {
      const data = getData(this);
      for (const type in data.handlers) {
        removeHandlers(this, type, handler, selector, namespace);
      }
    });
  }
  
  // 解析事件类型
  const typeList = types.trim().split(/\s+/);
  
  return this.each(function() {
    const elem = this;
    
    typeList.forEach(typeNs => {
      const { type, namespace } = parseEventType(typeNs);
      
      if (type) {
        removeHandlers(elem, type, handler, selector, namespace);
      } else if (namespace) {
        // 只有命名空间，遍历所有类型
        const data = getData(elem);
        for (const t in data.handlers) {
          removeHandlers(elem, t, handler, selector, namespace);
        }
      }
    });
  });
};
```

## 解绑的各种场景

### 1. 移除指定处理函数

```javascript
function clickHandler(e) { /* ... */ }

$('.btn').on('click', clickHandler);
$('.btn').off('click', clickHandler);  // 只移除这个处理函数
```

### 2. 移除某类型的所有事件

```javascript
$('.btn').off('click');  // 移除所有 click 事件
```

### 3. 移除委托事件

```javascript
$('.list').on('click', '.item', handler);
$('.list').off('click', '.item', handler);  // 移除特定委托
$('.list').off('click', '.item');           // 移除该选择器的所有委托
```

### 4. 通过命名空间移除

```javascript
$('.btn').on('click.plugin', handler1);
$('.btn').on('mouseover.plugin', handler2);

$('.btn').off('.plugin');  // 移除所有 .plugin 命名空间的事件
```

### 5. 组合条件

```javascript
$('.btn').off('click.plugin', handler);  // 类型 + 命名空间 + 处理函数
```

## 移除所有事件

```javascript
$('.btn').off();
```

这会移除元素上的所有事件，包括所有类型和所有处理函数。

## 注意事项

### 匿名函数无法精确移除

```javascript
// 这样无法移除
$('.btn').on('click', function() { /* ... */ });
$('.btn').off('click', function() { /* ... */ });  // 不同的函数引用！

// 正确做法：保存引用
const handler = function() { /* ... */ };
$('.btn').on('click', handler);
$('.btn').off('click', handler);  // 同一个引用，可以移除

// 或者使用命名空间
$('.btn').on('click.myFeature', function() { /* ... */ });
$('.btn').off('click.myFeature');  // 通过命名空间移除
```

### 委托事件的选择器必须一致

```javascript
$('.list').on('click', '.item', handler);
$('.list').off('click', '.item');  // 正确

$('.list').off('click');  // 这也会移除，因为没指定选择器时移除所有
```

## 实际应用场景

### 场景 1：组件销毁

```javascript
class Component {
  constructor(element) {
    this.$el = $(element);
    this.bindEvents();
  }
  
  bindEvents() {
    this.$el.on('click.component', '.btn', this.handleClick.bind(this));
    $(window).on('resize.component', this.handleResize.bind(this));
  }
  
  destroy() {
    // 使用命名空间一次性移除所有事件
    this.$el.off('.component');
    $(window).off('.component');
  }
}
```

### 场景 2：临时事件

```javascript
function enableDrag($elem) {
  $elem.on('mousedown.drag', function(e) {
    $(document)
      .on('mousemove.drag', handleMove)
      .on('mouseup.drag', function() {
        $(document).off('.drag');
      });
  });
}

function disableDrag($elem) {
  $elem.off('mousedown.drag');
}
```

### 场景 3：切换功能

```javascript
$('#toggle').on('click', function() {
  const $target = $('.target');
  
  if ($target.data('enabled')) {
    $target.off('click.feature');
    $target.data('enabled', false);
  } else {
    $target.on('click.feature', featureHandler);
    $target.data('enabled', true);
  }
});
```

### 场景 4：防止重复绑定

```javascript
function bindOnce($elem, type, handler) {
  $elem.off(type).on(type, handler);
}

// 每次调用都先解绑再绑定
bindOnce($('.btn'), 'click', handler);
```

## 本章小结

`off()` 方法的核心功能：

- **精确移除**：指定类型 + 处理函数
- **批量移除**：只指定类型
- **命名空间移除**：通过命名空间批量管理
- **完全清除**：无参数移除所有

实现要点：

- 过滤匹配的处理函数
- 命名空间部分匹配
- 无处理函数时移除主调度器

最佳实践：

- 使用命名空间管理事件
- 避免匿名函数（或用命名空间替代）
- 组件销毁时清理事件

下一章，我们实现 `one()` 方法。

---

**思考题**：如果在事件处理函数中调用 `off()` 移除自己，会不会影响当前事件的执行流程？如何处理这种情况？
