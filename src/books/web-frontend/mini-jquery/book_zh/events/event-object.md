# 事件对象封装与增强

原生事件对象已经很完善，但我们仍需要封装来提供统一的接口和额外功能。

## 为什么要封装事件对象

1. **添加便利方法**：如 `isDefaultPrevented()`
2. **保存上下文信息**：如 `delegateTarget`
3. **统一接口**：确保行为一致

## 原生事件对象的能力

```javascript
event.type           // 事件类型
event.target         // 触发事件的元素
event.currentTarget  // 绑定事件的元素
event.preventDefault()
event.stopPropagation()
event.stopImmediatePropagation()
```

## jQuery 事件对象的增强

jQuery 添加了以下特性：

```javascript
event.isDefaultPrevented()           // 是否调用了 preventDefault
event.isPropagationStopped()         // 是否调用了 stopPropagation
event.isImmediatePropagationStopped()// 是否调用了 stopImmediatePropagation
event.delegateTarget                 // 委托时的匹配元素
event.data                           // 绑定时传入的数据
```

## EventWrapper 实现

```javascript
// src/events/EventWrapper.js

export class EventWrapper {
  constructor(originalEvent) {
    // 保存原始事件
    this.originalEvent = originalEvent;
    
    // 复制常用属性
    this.type = originalEvent.type;
    this.target = originalEvent.target;
    this.currentTarget = originalEvent.currentTarget;
    this.timeStamp = originalEvent.timeStamp;
    
    // 鼠标事件属性
    this.pageX = originalEvent.pageX;
    this.pageY = originalEvent.pageY;
    this.clientX = originalEvent.clientX;
    this.clientY = originalEvent.clientY;
    this.button = originalEvent.button;
    
    // 键盘事件属性
    this.key = originalEvent.key;
    this.code = originalEvent.code;
    this.keyCode = originalEvent.keyCode;
    this.altKey = originalEvent.altKey;
    this.ctrlKey = originalEvent.ctrlKey;
    this.shiftKey = originalEvent.shiftKey;
    this.metaKey = originalEvent.metaKey;
    
    // 其他
    this.relatedTarget = originalEvent.relatedTarget;
    
    // 状态标志
    this._isDefaultPrevented = false;
    this._isPropagationStopped = false;
    this._isImmediatePropagationStopped = false;
    
    // 委托目标（由事件系统设置）
    this.delegateTarget = null;
    
    // 绑定时的数据（由事件系统设置）
    this.data = undefined;
  }
  
  preventDefault() {
    this._isDefaultPrevented = true;
    this.originalEvent.preventDefault();
  }
  
  stopPropagation() {
    this._isPropagationStopped = true;
    this.originalEvent.stopPropagation();
  }
  
  stopImmediatePropagation() {
    this._isImmediatePropagationStopped = true;
    this._isPropagationStopped = true;
    this.originalEvent.stopImmediatePropagation();
  }
  
  isDefaultPrevented() {
    return this._isDefaultPrevented || this.originalEvent.defaultPrevented;
  }
  
  isPropagationStopped() {
    return this._isPropagationStopped;
  }
  
  isImmediatePropagationStopped() {
    return this._isImmediatePropagationStopped;
  }
}
```

## 动态属性代理

有些属性我们不想全部复制，可以用代理：

```javascript
export class EventWrapper {
  constructor(originalEvent) {
    this.originalEvent = originalEvent;
    this._isDefaultPrevented = false;
    this._isPropagationStopped = false;
    this._isImmediatePropagationStopped = false;
    this.delegateTarget = null;
    this.data = undefined;
    
    // 使用 Proxy 代理其他属性
    return new Proxy(this, {
      get(target, prop) {
        // 优先返回包装器自己的属性
        if (prop in target) {
          return target[prop];
        }
        // 否则从原始事件获取
        const value = originalEvent[prop];
        return typeof value === 'function' 
          ? value.bind(originalEvent) 
          : value;
      }
    });
  }
  
  // ... 方法定义
}
```

这样可以自动代理所有未定义的属性。

## 简化版实现

如果不用 Proxy，可以只复制必要的属性：

```javascript
// src/events/EventWrapper.js

// 需要复制的属性列表
const eventProps = [
  // 通用
  'type', 'target', 'currentTarget', 'timeStamp',
  'bubbles', 'cancelable', 'defaultPrevented',
  // 鼠标
  'button', 'buttons', 'clientX', 'clientY', 'pageX', 'pageY',
  'screenX', 'screenY', 'offsetX', 'offsetY',
  'relatedTarget', 'movementX', 'movementY',
  // 键盘
  'key', 'code', 'keyCode', 'charCode',
  'altKey', 'ctrlKey', 'shiftKey', 'metaKey',
  // 触摸
  'touches', 'targetTouches', 'changedTouches',
  // 滚轮
  'deltaX', 'deltaY', 'deltaZ', 'deltaMode',
  // 其他
  'detail', 'which'
];

export class EventWrapper {
  constructor(originalEvent) {
    this.originalEvent = originalEvent;
    
    // 复制属性
    for (const prop of eventProps) {
      if (prop in originalEvent) {
        this[prop] = originalEvent[prop];
      }
    }
    
    // 状态标志
    this._isDefaultPrevented = originalEvent.defaultPrevented;
    this._isPropagationStopped = false;
    this._isImmediatePropagationStopped = false;
    
    // 扩展属性
    this.delegateTarget = null;
    this.data = undefined;
  }
  
  preventDefault() {
    this._isDefaultPrevented = true;
    this.originalEvent.preventDefault();
  }
  
  stopPropagation() {
    this._isPropagationStopped = true;
    this.originalEvent.stopPropagation();
  }
  
  stopImmediatePropagation() {
    this._isImmediatePropagationStopped = true;
    this._isPropagationStopped = true;
    this.originalEvent.stopImmediatePropagation();
  }
  
  isDefaultPrevented() {
    return this._isDefaultPrevented;
  }
  
  isPropagationStopped() {
    return this._isPropagationStopped;
  }
  
  isImmediatePropagationStopped() {
    return this._isImmediatePropagationStopped;
  }
}
```

## target vs currentTarget vs delegateTarget

这三个属性容易混淆：

```html
<ul class="list">
  <li class="item">Item 1</li>
</ul>
```

```javascript
$('.list').on('click', '.item', function(e) {
  e.target         // 实际点击的元素（可能是 li 的子元素）
  e.currentTarget  // 绑定事件的元素（ul.list）
  e.delegateTarget // 匹配选择器的元素（li.item）
  this             // 同 delegateTarget
});
```

## 创建自定义事件

用于 `trigger()` 方法：

```javascript
export function createEvent(type, props = {}) {
  const event = new CustomEvent(type, {
    bubbles: true,
    cancelable: true,
    detail: props.detail
  });
  
  // 包装成我们的事件对象
  const wrapped = new EventWrapper(event);
  
  // 添加额外属性
  Object.assign(wrapped, props);
  
  return wrapped;
}
```

## 使用示例

在事件系统中使用：

```javascript
function mainHandler(event) {
  const elem = this;
  const handlers = getHandlers(elem, event.type);
  
  // 创建增强的事件对象
  const wrappedEvent = new EventWrapper(event);
  
  for (const h of handlers) {
    // 设置委托目标
    if (h.selector) {
      const target = event.target.closest(h.selector);
      if (!target) continue;
      wrappedEvent.delegateTarget = target;
    }
    
    // 设置数据
    wrappedEvent.data = h.data;
    
    // 执行处理函数
    h.handler.call(wrappedEvent.delegateTarget || elem, wrappedEvent);
    
    // 检查停止标志
    if (wrappedEvent.isImmediatePropagationStopped()) {
      break;
    }
  }
}
```

## 返回 false 的处理

jQuery 中返回 `false` 等同于同时调用 `preventDefault()` 和 `stopPropagation()`：

```javascript
$('.link').on('click', function(e) {
  return false;  // 阻止默认行为 + 停止冒泡
});

// 等同于
$('.link').on('click', function(e) {
  e.preventDefault();
  e.stopPropagation();
});
```

在事件系统中处理：

```javascript
const result = h.handler.call(context, wrappedEvent);

if (result === false) {
  wrappedEvent.preventDefault();
  wrappedEvent.stopPropagation();
}
```

## 本章小结

事件对象封装的要点：

- **保存原始事件**：`originalEvent` 属性
- **复制必要属性**：type, target, 鼠标坐标, 键盘按键等
- **添加状态检测**：`isDefaultPrevented()` 等方法
- **扩展属性**：`delegateTarget`, `data`

封装的价值：

- 统一的接口
- 便利的状态检测
- 支持事件委托时的上下文

下一章，我们实现核心的 `on()` 方法。

---

**思考题**：`stopPropagation()` 阻止事件冒泡，`stopImmediatePropagation()` 还会阻止同元素其他处理函数执行。什么场景下需要用后者？
