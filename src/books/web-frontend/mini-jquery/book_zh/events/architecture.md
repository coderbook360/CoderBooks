# 事件系统架构设计

事件系统是 jQuery 最核心的功能之一。它让我们能以统一、简洁的方式处理用户交互。

## 原生事件 API 的问题

```javascript
// 原生方式
element.addEventListener('click', handler);
element.removeEventListener('click', handler);
```

有几个痛点：

1. **必须保存 handler 引用**：解绑时需要传入同一个函数
2. **没有事件委托**：需要手动实现
3. **没有命名空间**：无法批量管理事件
4. **事件对象不一致**：某些属性需要兼容处理

## jQuery 事件系统的目标

```javascript
// 简洁的绑定
$('.btn').on('click', handler);

// 轻松解绑
$('.btn').off('click');

// 事件委托
$('.list').on('click', '.item', handler);

// 命名空间
$('.btn').on('click.myPlugin', handler);
$('.btn').off('.myPlugin');
```

## 架构设计

我们的事件系统包含以下模块：

```
events/
├── events.js       # 主模块，安装所有事件方法
├── eventData.js    # 事件数据存储
├── EventWrapper.js # 事件对象封装
└── handlers.js     # 处理函数管理
```

## 核心数据结构

### 事件存储

每个元素存储的事件数据结构：

```javascript
{
  handlers: {
    'click': [
      {
        handler: Function,      // 原始处理函数
        selector: String|null,  // 委托选择器
        namespace: String,      // 命名空间
        once: Boolean          // 是否一次性
      }
    ],
    'mouseover': [...]
  }
}
```

### 存储方案

使用 WeakMap 存储，避免内存泄漏：

```javascript
// src/events/eventData.js

const eventData = new WeakMap();

export function getData(elem) {
  if (!eventData.has(elem)) {
    eventData.set(elem, {
      handlers: {}
    });
  }
  return eventData.get(elem);
}

export function removeData(elem) {
  eventData.delete(elem);
}

export function getHandlers(elem, type) {
  const data = getData(elem);
  return data.handlers[type] || [];
}

export function addHandler(elem, type, handlerObj) {
  const data = getData(elem);
  if (!data.handlers[type]) {
    data.handlers[type] = [];
  }
  data.handlers[type].push(handlerObj);
}

export function removeHandler(elem, type, handler, selector, namespace) {
  const data = getData(elem);
  const handlers = data.handlers[type];
  
  if (!handlers) return;
  
  data.handlers[type] = handlers.filter(h => {
    // 如果指定了处理函数，必须匹配
    if (handler && h.handler !== handler) return true;
    // 如果指定了选择器，必须匹配
    if (selector && h.selector !== selector) return true;
    // 如果指定了命名空间，必须匹配
    if (namespace && h.namespace !== namespace) return true;
    return false;
  });
}
```

## 主调度器设计

每个事件类型只需要绑定一个原生监听器，由我们自己分发：

```javascript
function mainHandler(event) {
  const elem = this;
  const type = event.type;
  const handlers = getHandlers(elem, type);
  
  // 创建增强的事件对象
  const wrappedEvent = new EventWrapper(event);
  
  // 执行所有匹配的处理函数
  for (const handlerObj of handlers) {
    // 检查委托
    if (handlerObj.selector) {
      const target = event.target.closest(handlerObj.selector);
      if (!target || !elem.contains(target)) continue;
      wrappedEvent.delegateTarget = target;
    }
    
    // 执行处理函数
    const result = handlerObj.handler.call(
      handlerObj.selector ? wrappedEvent.delegateTarget : elem,
      wrappedEvent
    );
    
    // 处理返回 false
    if (result === false) {
      wrappedEvent.preventDefault();
      wrappedEvent.stopPropagation();
    }
    
    // 检查是否停止
    if (wrappedEvent.isImmediatePropagationStopped()) {
      break;
    }
  }
}
```

## on 方法骨架

```javascript
jQuery.fn.on = function(types, selector, data, handler) {
  // 参数规范化
  // on(types, handler)
  // on(types, selector, handler)
  // on(types, selector, data, handler)
  
  if (typeof selector === 'function') {
    handler = selector;
    selector = undefined;
  } else if (typeof data === 'function') {
    handler = data;
    data = undefined;
  }
  
  // 解析事件类型和命名空间
  const typesArray = types.split(/\s+/);
  
  return this.each(function() {
    typesArray.forEach(typeNs => {
      const [type, namespace = ''] = typeNs.split('.');
      
      // 存储处理函数信息
      addHandler(this, type, {
        handler,
        selector,
        namespace,
        data,
        once: false
      });
      
      // 确保绑定了主调度器
      bindMainHandler(this, type);
    });
  });
};
```

## 主调度器绑定

每个元素的每个事件类型只绑定一次主调度器：

```javascript
const boundTypes = new WeakMap();

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

function unbindMainHandler(elem, type) {
  const types = boundTypes.get(elem);
  if (types?.has(type)) {
    elem.removeEventListener(type, mainHandler);
    types.delete(type);
  }
}
```

## 事件流程图

```
用户点击
    ↓
原生 click 事件
    ↓
mainHandler 接收
    ↓
查找该元素的 click 处理函数列表
    ↓
遍历列表，检查委托选择器
    ↓
匹配则执行处理函数
    ↓
检查返回值和停止标志
```

## 完整的模块结构

```javascript
// src/events/events.js

import { getData, addHandler, removeHandler, getHandlers } from './eventData.js';
import { EventWrapper } from './EventWrapper.js';

const boundTypes = new WeakMap();

function mainHandler(event) {
  const elem = this;
  const handlers = getHandlers(elem, event.type);
  const wrappedEvent = new EventWrapper(event);
  
  for (const h of handlers) {
    // 委托检查
    if (h.selector) {
      const target = event.target.closest(h.selector);
      if (!target || !elem.contains(target)) continue;
      wrappedEvent.delegateTarget = target;
    }
    
    // 执行
    const context = h.selector ? wrappedEvent.delegateTarget : elem;
    const result = h.handler.call(context, wrappedEvent, h.data);
    
    // 一次性事件
    if (h.once) {
      removeHandler(elem, event.type, h.handler, h.selector, h.namespace);
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

export function installEventMethods(jQuery) {
  jQuery.fn.on = function(types, selector, data, handler) {
    // 实现...
  };
  
  jQuery.fn.off = function(types, selector, handler) {
    // 实现...
  };
  
  jQuery.fn.one = function(types, selector, data, handler) {
    // 实现...
  };
  
  jQuery.fn.trigger = function(type, data) {
    // 实现...
  };
}
```

## 设计要点回顾

1. **单一入口**：每个事件类型只绑定一个原生监听器
2. **自主分发**：由我们控制哪些处理函数被调用
3. **WeakMap 存储**：避免内存泄漏
4. **事件对象增强**：提供更多便利方法

接下来几章，我们逐一实现各个功能。

---

**思考题**：为什么要用"单一入口 + 自主分发"的模式，而不是直接给每个处理函数绑定原生监听器？这种设计有什么优势？
