# on 方法：统一的事件绑定

如果要选出 jQuery 事件系统中最重要的方法，那一定是 `on()`。

在 jQuery 的早期版本中，事件绑定有多种方法：`bind()`、`live()`、`delegate()`……每种方法适用于不同的场景，学习曲线陡峭。从 jQuery 1.7 开始，这些方法被统一成了一个 `on()`——一个方法搞定所有场景。

这是一个优秀的 API 设计案例：**复杂的实现，简洁的接口**。

## on() 能做什么

先来看看 `on()` 的能力：

```javascript
// 1. 简单绑定
$('.btn').on('click', handler);

// 2. 同时绑定多个事件
$('.btn').on('click mouseover', handler);

// 3. 事件委托（后面有专门章节）
$('.list').on('click', '.item', handler);

// 4. 传递自定义数据给事件处理函数
$('.btn').on('click', { key: 'value' }, handler);

// 5. 命名空间（方便批量移除）
$('.btn').on('click.myPlugin', handler);

// 6. 对象形式一次绑定多个
$('.btn').on({
  click: clickHandler,
  mouseover: hoverHandler
});
```

一个方法，六种用法。这种设计在 JavaScript 库中非常常见——根据参数类型和数量的不同，执行不同的逻辑。

## 参数规范化：第一道关卡

`on()` 的参数形式太多了，我们需要先把它们统一成一种内部格式：

```javascript
// 形式 1：on(type, handler)
// 形式 2：on(type, selector, handler)
// 形式 3：on(type, data, handler)
// 形式 4：on(type, selector, data, handler)
// 形式 5：on({ type: handler, ... })
```

怎么区分这些形式？关键是看**参数的类型**：

### 实现参数解析

```javascript
function normalizeOnArgs(types, selector, data, handler) {
  // 形式 5：对象形式 on({ click: fn, mouseover: fn })
  if (typeof types === 'object') {
    return {
      typesObject: types,
      selector: typeof selector === 'string' ? selector : null,
      data: typeof selector === 'string' ? data : selector
    };
  }
  
  // 形式 1：on(type, handler) - 第二个参数是函数
  if (typeof selector === 'function') {
    return {
      types,
      selector: null,
      data: undefined,
      handler: selector
    };
  }
  
  // on(type, data, handler) - data 不是字符串
  if (typeof selector !== 'string' && typeof data === 'function') {
    return {
      types,
      selector: null,
      data: selector,
      handler: data
    };
  }
  
  // on(type, selector, handler)
  if (typeof data === 'function') {
    return {
      types,
      selector,
      data: undefined,
      handler: data
    };
  }
  
  // on(type, selector, data, handler)
  return { types, selector, data, handler };
}
```

## 解析事件类型和命名空间

```javascript
function parseEventType(typeString) {
  const parts = typeString.split('.');
  return {
    type: parts[0],
    namespace: parts.slice(1).join('.')
  };
}

// 示例
parseEventType('click.myPlugin.v2')
// { type: 'click', namespace: 'myPlugin.v2' }
```

## 完整的 on 实现

```javascript
// src/events/events.js

import { EventWrapper } from './EventWrapper.js';

// 事件数据存储
const eventData = new WeakMap();
const boundTypes = new WeakMap();

function getData(elem) {
  if (!eventData.has(elem)) {
    eventData.set(elem, { handlers: {} });
  }
  return eventData.get(elem);
}

function getHandlers(elem, type) {
  return getData(elem).handlers[type] || [];
}

function addHandler(elem, type, handlerObj) {
  const data = getData(elem);
  if (!data.handlers[type]) {
    data.handlers[type] = [];
  }
  data.handlers[type].push(handlerObj);
}

// 主调度器
function mainHandler(event) {
  const elem = this;
  const handlers = getHandlers(elem, event.type);
  
  if (!handlers.length) return;
  
  const wrappedEvent = new EventWrapper(event);
  
  // 复制数组，防止执行过程中修改
  const handlersCopy = handlers.slice();
  
  for (const h of handlersCopy) {
    // 委托检查
    if (h.selector) {
      const target = event.target.closest(h.selector);
      if (!target || !elem.contains(target)) continue;
      wrappedEvent.delegateTarget = target;
    } else {
      wrappedEvent.delegateTarget = elem;
    }
    
    // 设置数据
    wrappedEvent.data = h.data;
    
    // 执行处理函数
    const context = h.selector ? wrappedEvent.delegateTarget : elem;
    const result = h.handler.call(context, wrappedEvent);
    
    // 一次性事件
    if (h.once) {
      removeHandlerObj(elem, event.type, h);
    }
    
    // 返回 false
    if (result === false) {
      wrappedEvent.preventDefault();
      wrappedEvent.stopPropagation();
    }
    
    // 立即停止
    if (wrappedEvent.isImmediatePropagationStopped()) {
      break;
    }
  }
}

function bindMainHandler(elem, type) {
  if (!boundTypes.has(elem)) {
    boundTypes.set(elem, new Set());
  }
  const types = boundTypes.get(elem);
  if (!types.has(type)) {
    elem.addEventListener(type, mainHandler);
    types.add(type);
  }
}

function removeHandlerObj(elem, type, handlerObj) {
  const data = getData(elem);
  const handlers = data.handlers[type];
  if (!handlers) return;
  
  const index = handlers.indexOf(handlerObj);
  if (index > -1) {
    handlers.splice(index, 1);
  }
}

export function installEventMethods(jQuery) {
  
  jQuery.fn.on = function(types, selector, data, handler) {
    // 对象形式
    if (typeof types === 'object') {
      for (const type in types) {
        this.on(type, selector, data, types[type]);
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
    
    // 无处理函数，直接返回
    if (!handler) {
      return this;
    }
    
    // 解析多个事件类型
    const typeList = types.trim().split(/\s+/);
    
    return this.each(function() {
      const elem = this;
      
      typeList.forEach(typeNs => {
        const { type, namespace } = parseEventType(typeNs);
        
        if (!type) return;
        
        // 创建处理函数对象
        const handlerObj = {
          handler,
          selector: selector || null,
          namespace: namespace || '',
          data,
          once: false
        };
        
        // 存储
        addHandler(elem, type, handlerObj);
        
        // 绑定主调度器
        bindMainHandler(elem, type);
      });
    });
  };
}

function parseEventType(typeString) {
  const dotIndex = typeString.indexOf('.');
  if (dotIndex === -1) {
    return { type: typeString, namespace: '' };
  }
  return {
    type: typeString.slice(0, dotIndex),
    namespace: typeString.slice(dotIndex + 1)
  };
}
```

## 事件委托的工作原理

```javascript
$('.list').on('click', '.item', handler);
```

事件委托的执行流程：

1. 事件在 `.list` 上触发（冒泡上来）
2. 主调度器检查 `event.target` 是否匹配 `.item`
3. 使用 `closest()` 向上查找匹配元素
4. 匹配成功则执行处理函数，`this` 指向匹配的 `.item`

```javascript
if (h.selector) {
  // 从触发元素向上查找匹配的元素
  const target = event.target.closest(h.selector);
  
  // 确保匹配元素在绑定元素内部
  if (!target || !elem.contains(target)) continue;
  
  // 设置委托目标
  wrappedEvent.delegateTarget = target;
}
```

## 绑定数据

```javascript
$('.btn').on('click', { id: 123 }, function(e) {
  console.log(e.data.id);  // 123
});
```

数据保存在 `handlerObj.data`，执行时设置到事件对象。

## 多个事件

```javascript
$('.btn').on('click mouseover mouseout', handler);

// 或对象形式
$('.btn').on({
  click: clickHandler,
  mouseover: overHandler
});
```

## 实际应用场景

### 场景 1：表单验证

```javascript
$('.form').on('submit', function(e) {
  const isValid = validateForm(this);
  if (!isValid) {
    e.preventDefault();
    showErrors();
  }
});
```

### 场景 2：动态列表

```javascript
// 事件委托处理动态添加的元素
$('.todo-list').on('click', '.delete-btn', function() {
  $(this).closest('.todo-item').remove();
});
```

### 场景 3：悬停效果

```javascript
$('.card').on({
  mouseenter: function() {
    $(this).addClass('hover');
  },
  mouseleave: function() {
    $(this).removeClass('hover');
  }
});
```

### 场景 4：带数据的处理

```javascript
$('.tab').each(function(index) {
  $(this).on('click', { tabIndex: index }, function(e) {
    switchToTab(e.data.tabIndex);
  });
});
```

### 场景 5：命名空间管理

```javascript
// 插件绑定事件
$('.slider').on('mousedown.slider', startDrag);
$('.slider').on('mousemove.slider', drag);
$('.slider').on('mouseup.slider', endDrag);

// 销毁时一次性解绑
$('.slider').off('.slider');
```

## 本章小结

`on()` 方法的核心功能：

- **参数规范化**：支持多种调用形式
- **多事件支持**：空格分隔或对象形式
- **事件委托**：选择器参数
- **命名空间**：点号分隔
- **数据传递**：可附加数据

实现要点：

- 主调度器模式
- 委托时使用 `closest()` 匹配
- `this` 指向正确的元素

下一章，我们实现 `off()` 方法。

---

**思考题**：为什么事件委托时要检查 `elem.contains(target)`？只用 `closest()` 不够吗？
