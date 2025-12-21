# trigger：手动触发事件

`trigger()` 方法用于手动触发事件，让处理函数执行，就像用户真的进行了操作一样。

## 基本用法

```javascript
// 触发 click 事件
$('.btn').trigger('click');

// 带数据触发
$('.btn').trigger('custom', [arg1, arg2]);

// 触发带命名空间的事件
$('.btn').trigger('click.myPlugin');
```

## 原生触发 vs jQuery 触发

### 原生方式

```javascript
// 创建并分发事件
const event = new Event('click', { bubbles: true });
element.dispatchEvent(event);

// 或使用特定事件类
const mouseEvent = new MouseEvent('click', {
  bubbles: true,
  cancelable: true
});
element.dispatchEvent(mouseEvent);
```

### jQuery 方式

```javascript
// 更简洁
$('.btn').trigger('click');

// 支持自定义事件和数据
$('.btn').trigger('myEvent', ['data']);
```

## 基础实现

```javascript
jQuery.fn.trigger = function(type, data) {
  return this.each(function() {
    const event = new CustomEvent(type, {
      bubbles: true,
      cancelable: true,
      detail: data
    });
    
    this.dispatchEvent(event);
  });
};
```

但这只触发原生事件，不会触发只用 jQuery 绑定的处理函数。

## 完整实现

我们需要同时触发原生事件和 jQuery 处理函数：

```javascript
// src/events/trigger.js

import { getHandlers, getData } from './eventData.js';
import { EventWrapper } from './EventWrapper.js';

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

function matchNamespace(handlerNs, triggerNs) {
  if (!triggerNs) return true;
  if (!handlerNs) return false;
  const triggerParts = triggerNs.split('.');
  const handlerParts = handlerNs.split('.');
  return triggerParts.every(p => handlerParts.includes(p));
}

export function installTriggerMethod(jQuery) {
  
  jQuery.fn.trigger = function(typeNs, data) {
    const { type, namespace } = parseEventType(typeNs);
    
    if (!type) return this;
    
    return this.each(function() {
      const elem = this;
      
      // 创建原生事件
      let event;
      
      // 根据事件类型选择构造函数
      if (['click', 'mousedown', 'mouseup', 'mousemove', 'mouseover', 'mouseout'].includes(type)) {
        event = new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          view: window
        });
      } else if (['keydown', 'keyup', 'keypress'].includes(type)) {
        event = new KeyboardEvent(type, {
          bubbles: true,
          cancelable: true,
          view: window
        });
      } else {
        event = new CustomEvent(type, {
          bubbles: true,
          cancelable: true,
          detail: data
        });
      }
      
      // 标记这是 trigger 触发的
      event._triggeredByJQuery = true;
      event._namespace = namespace;
      event._extraData = data;
      
      // 分发事件
      elem.dispatchEvent(event);
    });
  };
}
```

## 处理命名空间过滤

在主调度器中检查命名空间：

```javascript
function mainHandler(event) {
  const elem = this;
  const handlers = getHandlers(elem, event.type);
  
  if (!handlers.length) return;
  
  const wrappedEvent = new EventWrapper(event);
  
  // 获取触发时的命名空间
  const triggerNs = event._namespace;
  
  for (const h of handlers) {
    // 命名空间过滤
    if (triggerNs && !matchNamespace(h.namespace, triggerNs)) {
      continue;
    }
    
    // ... 执行处理函数
  }
}
```

## 传递额外数据

```javascript
$('.btn').trigger('custom', ['arg1', 'arg2']);

// 处理函数接收
$('.btn').on('custom', function(e, arg1, arg2) {
  console.log(arg1, arg2);
});
```

在主调度器中传递：

```javascript
function mainHandler(event) {
  // ...
  
  const extraArgs = event._extraData 
    ? (Array.isArray(event._extraData) ? event._extraData : [event._extraData])
    : [];
  
  for (const h of handlers) {
    // 传递额外参数
    const result = h.handler.call(context, wrappedEvent, ...extraArgs);
    // ...
  }
}
```

## triggerHandler

`triggerHandler()` 与 `trigger()` 类似，但有几点不同：

1. 不触发原生事件
2. 不冒泡
3. 只作用于第一个元素
4. 返回处理函数的返回值

```javascript
jQuery.fn.triggerHandler = function(typeNs, data) {
  const elem = this[0];
  if (!elem) return undefined;
  
  const { type, namespace } = parseEventType(typeNs);
  const handlers = getHandlers(elem, type);
  
  if (!handlers.length) return undefined;
  
  // 创建模拟事件
  const fakeEvent = new EventWrapper({
    type,
    target: elem,
    currentTarget: elem,
    preventDefault: () => {},
    stopPropagation: () => {},
    stopImmediatePropagation: () => {}
  });
  
  const extraArgs = data 
    ? (Array.isArray(data) ? data : [data])
    : [];
  
  let result;
  
  for (const h of handlers) {
    if (namespace && !matchNamespace(h.namespace, namespace)) {
      continue;
    }
    
    // 委托事件跳过（没有真正的 target）
    if (h.selector) continue;
    
    result = h.handler.call(elem, fakeEvent, ...extraArgs);
    
    if (fakeEvent.isImmediatePropagationStopped()) {
      break;
    }
  }
  
  return result;
};
```

## trigger vs triggerHandler

| 特性 | trigger | triggerHandler |
|------|---------|----------------|
| 触发原生事件 | ✅ | ❌ |
| 事件冒泡 | ✅ | ❌ |
| 作用元素 | 所有匹配 | 仅第一个 |
| 返回值 | jQuery对象 | 处理函数返回值 |
| 默认行为 | 会执行 | 不执行 |

## 实际应用场景

### 场景 1：模拟用户操作

```javascript
// 自动提交表单
$('form').trigger('submit');

// 自动聚焦
$('input').trigger('focus');
```

### 场景 2：自定义事件通信

```javascript
// 发布事件
$('.data-source').trigger('dataReady', [data]);

// 订阅事件
$('.data-source').on('dataReady', function(e, data) {
  renderData(data);
});
```

### 场景 3：组件初始化

```javascript
// 页面加载后触发
$(window).trigger('resize');

// 触发自定义初始化
$('.lazy-component').trigger('init');
```

### 场景 4：测试

```javascript
// 模拟点击测试
$('.btn').trigger('click');
expect($('.result').text()).toBe('Clicked');
```

### 场景 5：获取计算结果

```javascript
// 使用 triggerHandler 获取返回值
$('.calculator').on('calculate', function(e, a, b) {
  return a + b;
});

const result = $('.calculator').triggerHandler('calculate', [2, 3]);
console.log(result);  // 5
```

### 场景 6：链式操作

```javascript
$('.item')
  .addClass('active')
  .trigger('activate')
  .fadeIn();
```

## 注意事项

### 1. 原生默认行为

`trigger('click')` 会触发原生点击，包括跳转链接：

```javascript
$('a').trigger('click');  // 会跳转！

// 如果不想跳转，用 triggerHandler
$('a').triggerHandler('click');
```

### 2. 表单提交

```javascript
$('form').trigger('submit');  // 会真的提交表单

// 只执行处理函数
$('form').triggerHandler('submit');
```

### 3. 事件冒泡

```javascript
$('.child').trigger('click');
// 会冒泡到父元素，触发父元素的 click 处理函数
```

## 本章小结

trigger 方法的作用：

- **手动触发事件**：模拟用户操作
- **自定义事件**：组件间通信
- **传递数据**：附加参数到事件

两个版本：

- **trigger()**：触发完整事件流程
- **triggerHandler()**：只调用处理函数

实现要点：

- 使用 `CustomEvent` 或特定事件类
- 支持命名空间过滤
- 传递额外参数

下一章，我们实现 `ready` 事件。

---

**思考题**：`$('input').trigger('focus')` 和 `$('input')[0].focus()` 有什么区别？哪个更适合让输入框获得焦点？
