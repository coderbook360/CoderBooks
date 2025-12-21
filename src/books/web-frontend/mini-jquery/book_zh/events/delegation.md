# 事件委托实现

事件委托是 jQuery 事件系统中最巧妙的设计之一。它不仅优化了性能，还解决了动态内容的事件绑定问题。

在理解它之前，让我们先看看没有事件委托时会遇到什么问题。

## 一个常见的坑

假设你有一个待办事项列表：

```javascript
// 给每个删除按钮绑定事件
$('.delete-btn').on('click', function() {
  $(this).parent('.item').remove();
});

// 后来添加了新的待办事项
$('.list').append('<li class="item">新任务 <button class="delete-btn">删除</button></li>');
```

问题来了：**新添加的删除按钮点击无效！**

为什么？因为 `on('click')` 执行时，新按钮还不存在，事件自然绑定不上。

传统解决方案是在添加元素后重新绑定，但这很麻烦，还容易造成重复绑定。

## 事件委托：优雅的解决方案

```javascript
// 不使用委托：需要给每个 .delete-btn 绑定
$('.delete-btn').on('click', handler);

// 使用委托：只在父元素绑定一次
$('.list').on('click', '.delete-btn', handler);
```

注意第二个参数 `.delete-btn`——这就是**委托选择器**。意思是："监听 `.list` 上的 click 事件，但只有当事件是从 `.delete-btn` 冒泡上来的时候才执行处理函数。"

## 为什么这能解决问题？

因为事件监听器绑定在 `.list` 上，而不是 `.delete-btn` 上。只要 `.list` 存在，无论里面动态添加多少 `.delete-btn`，都会被正确处理。

这就是事件冒泡的威力——子元素的事件会"冒泡"到父元素。

## 委托的三大优势

### 1. 支持动态元素

```javascript
// 使用委托后，新添加的元素自动拥有事件
$('.list').on('click', '.item', handler);
$('.list').append('<li class="item">New</li>');  // 点击有效！
```

### 2. 性能更好

```javascript
// 1000 个元素 = 1000 个监听器 = 1000 次绑定操作
$('.item').on('click', handler);

// 1000 个元素 = 1 个监听器 = 1 次绑定操作
$('.list').on('click', '.item', handler);
```

### 3. 内存更省

```javascript
// 删除元素时，不需要手动解绑
// 因为事件绑定在父元素上，子元素随便删
$('.item').remove();
```

## 委托的工作流程

```
用户点击 .delete-btn
    ↓
事件冒泡到 .list（我们绑定事件的元素）
    ↓
主调度器接收事件
    ↓
检查 event.target 是否匹配选择器 .delete-btn
    ↓
使用 closest('.delete-btn') 从 target 向上查找
    ↓
找到匹配元素，执行处理函数（this 指向匹配元素）
```

## 核心实现

在主调度器中检查委托选择器：

```javascript
function mainHandler(event) {
  const elem = this;  // 绑定事件的元素 (.list)
  const handlers = getHandlers(elem, event.type);
  const wrappedEvent = new EventWrapper(event);
  
  for (const h of handlers) {
    let target = elem;  // 默认是绑定元素
    
    // 如果有委托选择器，需要额外判断
    if (h.selector) {
      // 从触发元素向上查找匹配的元素
      target = event.target.closest(h.selector);
      
      // 没有找到匹配元素，跳过这个处理函数
      if (!target) continue;
      
      // 匹配的元素必须在绑定元素内部
      // 防止匹配到外层的同类元素
      if (!elem.contains(target)) continue;
      
      // 设置委托目标，方便处理函数使用
      wrappedEvent.delegateTarget = target;
    }
    
    // 执行处理函数，this 指向匹配的元素
    const result = h.handler.call(target, wrappedEvent);
    
    // ... 处理返回值
  }
}
```

这段代码最关键的是 `closest()` 方法——它从 `event.target` 开始向上查找，直到找到匹配选择器的元素。

## 为什么需要 closest？

```html
<ul class="list">
  <li class="item">
    <span class="text">Click me</span>
  </li>
</ul>
```

点击 `span.text` 时：

```javascript
event.target           // span.text
event.target.closest('.item')  // li.item ✓
```

## 为什么要检查 contains

防止匹配到绑定元素外部的元素：

```html
<div class="wrapper">
  <ul class="list">
    <li class="item">Inside</li>
  </ul>
</div>
<div class="item">Outside</div>
```

```javascript
$('.list').on('click', '.item', handler);

// 点击 Outside 的 .item
// closest('.item') 会匹配到它
// 但它不在 .list 内，应该跳过
```

## 多层级委托

支持多层嵌套：

```html
<div class="container">
  <ul class="list">
    <li class="item">
      <button class="btn">Click</button>
    </li>
  </ul>
</div>
```

```javascript
$('.container').on('click', '.btn', handler1);
$('.container').on('click', '.item', handler2);
$('.container').on('click', '.list', handler3);

// 点击 button 时
// handler1 执行，this = .btn
// handler2 执行，this = .item
// handler3 执行，this = .list
```

## 阻止冒泡的影响

委托依赖冒泡，如果中间阻止了冒泡：

```javascript
$('.list').on('click', '.item', handler);

$('.btn').on('click', function(e) {
  e.stopPropagation();  // 阻止冒泡
});

// 点击 .btn 时，事件不会冒泡到 .list
// 委托的处理函数不会执行
```

## 完整的委托检查逻辑

```javascript
function checkDelegate(elem, event, selector) {
  // 从触发元素开始向上查找
  let target = event.target;
  
  // 向上遍历直到绑定元素
  while (target && target !== elem) {
    // 检查是否匹配选择器
    if (target.matches(selector)) {
      return target;
    }
    target = target.parentNode;
  }
  
  return null;
}

// 或使用 closest
function checkDelegate(elem, event, selector) {
  const target = event.target.closest(selector);
  
  // 确保在绑定元素内部
  if (target && elem.contains(target)) {
    return target;
  }
  
  return null;
}
```

## 特殊事件的委托

有些事件不冒泡，如 `focus`、`blur`：

```javascript
// focus 不冒泡，委托无效
$('.form').on('focus', 'input', handler);  // 不工作

// 使用 focusin/focusout 替代
$('.form').on('focusin', 'input', handler);  // 工作
```

| 不冒泡 | 冒泡替代 |
|--------|----------|
| focus | focusin |
| blur | focusout |
| mouseenter | mouseover |
| mouseleave | mouseout |

## 实际应用场景

### 场景 1：动态列表

```javascript
// 无论何时添加 .item，都能处理点击
$('.list').on('click', '.item', function() {
  $(this).toggleClass('selected');
});

// 添加新项目
$('.list').append('<li class="item">New Item</li>');
```

### 场景 2：删除按钮

```javascript
$('.list').on('click', '.delete-btn', function() {
  $(this).closest('.item').remove();
});
```

### 场景 3：表格操作

```javascript
$('table').on('click', 'td', function() {
  // this 是点击的 td
  $(this).addClass('editing');
});

$('table').on('click', '.save-btn', function() {
  saveRow($(this).closest('tr'));
});
```

### 场景 4：弹窗内容

```javascript
// 弹窗内容可能是动态加载的
$('.modal').on('click', '.confirm-btn', confirmAction);
$('.modal').on('click', '.cancel-btn', closeModal);
```

### 场景 5：导航菜单

```javascript
$('nav').on('click', 'a', function(e) {
  e.preventDefault();
  const href = $(this).attr('href');
  navigateTo(href);
});
```

## 性能注意事项

### 不要委托到过高层级

```javascript
// 不推荐：委托到 document
$(document).on('click', '.btn', handler);

// 推荐：委托到最近的稳定父元素
$('.container').on('click', '.btn', handler);
```

### 选择器不要过于复杂

```javascript
// 复杂选择器每次都要匹配
$('.list').on('click', '.item:not(.disabled):visible', handler);

// 简单选择器 + 逻辑判断
$('.list').on('click', '.item', function() {
  if ($(this).hasClass('disabled')) return;
  // ...
});
```

## 本章小结

事件委托的核心：

- **利用冒泡**：在父元素捕获子元素的事件
- **closest 匹配**：从触发元素向上查找
- **contains 检查**：确保匹配元素在范围内

优势：

- 处理动态元素
- 减少事件监听器数量
- 自动处理元素删除

注意事项：

- 非冒泡事件需要替代
- 不要委托到过高层级
- 选择器保持简单

下一章，我们实现事件命名空间。

---

**思考题**：如果有多个委托选择器匹配同一个元素，处理函数的执行顺序是什么？能否控制这个顺序？
