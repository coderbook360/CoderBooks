# 常用事件的快捷方法

jQuery 为常用事件提供了快捷方法，让代码更简洁。

## 快捷方法列表

```javascript
// 鼠标事件
$('.btn').click(handler);
$('.btn').dblclick(handler);
$('.btn').mousedown(handler);
$('.btn').mouseup(handler);
$('.btn').mousemove(handler);
$('.btn').mouseover(handler);
$('.btn').mouseout(handler);
$('.btn').mouseenter(handler);
$('.btn').mouseleave(handler);
$('.btn').contextmenu(handler);

// 键盘事件
$('input').keydown(handler);
$('input').keyup(handler);
$('input').keypress(handler);

// 表单事件
$('input').focus(handler);
$('input').blur(handler);
$('input').change(handler);
$('input').select(handler);
$('form').submit(handler);

// 文档/窗口事件
$(window).resize(handler);
$(window).scroll(handler);
$(document).ready(handler);
```

## 基本用法

```javascript
// 快捷方法
$('.btn').click(handler);

// 等同于
$('.btn').on('click', handler);
```

快捷方法也可以不传参数，用于触发事件：

```javascript
// 触发点击
$('.btn').click();

// 等同于
$('.btn').trigger('click');
```

## 批量生成快捷方法

```javascript
const events = [
  'click', 'dblclick',
  'mousedown', 'mouseup', 'mousemove',
  'mouseover', 'mouseout', 'mouseenter', 'mouseleave',
  'keydown', 'keyup', 'keypress',
  'focus', 'blur', 'change', 'select', 'submit',
  'resize', 'scroll', 'contextmenu'
];

events.forEach(eventName => {
  jQuery.fn[eventName] = function(data, fn) {
    // 无参数：触发事件
    if (arguments.length === 0) {
      return this.trigger(eventName);
    }
    
    // 有参数：绑定事件
    return this.on(eventName, null, data, fn);
  };
});
```

## 处理参数

快捷方法支持两种调用：

```javascript
// 只有处理函数
$('.btn').click(handler);

// 有数据和处理函数
$('.btn').click({ key: 'value' }, handler);
```

实现：

```javascript
jQuery.fn[eventName] = function(data, fn) {
  if (arguments.length === 0) {
    return this.trigger(eventName);
  }
  
  // 如果只有一个函数参数
  if (typeof data === 'function') {
    fn = data;
    data = undefined;
  }
  
  return this.on(eventName, null, data, fn);
};
```

## 完整实现

```javascript
// src/events/shortcuts.js

export function installEventShortcuts(jQuery) {
  const events = [
    // 鼠标
    'click', 'dblclick', 'contextmenu',
    'mousedown', 'mouseup', 'mousemove',
    'mouseover', 'mouseout',
    'mouseenter', 'mouseleave',
    // 键盘
    'keydown', 'keyup', 'keypress',
    // 表单
    'focus', 'blur', 'change', 'select', 'submit',
    'focusin', 'focusout',
    // 其他
    'resize', 'scroll', 'load', 'unload', 'error'
  ];
  
  events.forEach(eventName => {
    jQuery.fn[eventName] = function(data, fn) {
      // 无参数：触发
      if (arguments.length === 0) {
        return this.trigger(eventName);
      }
      
      // 只有一个函数参数
      if (typeof data === 'function') {
        fn = data;
        data = undefined;
      }
      
      return this.on(eventName, null, data, fn);
    };
  });
}
```

## hover 方法

`hover()` 是 `mouseenter` 和 `mouseleave` 的组合：

```javascript
$('.card').hover(
  function() { $(this).addClass('active'); },    // mouseenter
  function() { $(this).removeClass('active'); }  // mouseleave
);
```

实现：

```javascript
jQuery.fn.hover = function(fnOver, fnOut) {
  return this
    .on('mouseenter', fnOver)
    .on('mouseleave', fnOut || fnOver);
};
```

如果只传一个函数，则进入和离开都执行它。

## focus/blur vs focusin/focusout

```javascript
// focus/blur 不冒泡
$('.container').on('focus', 'input', handler);  // 无效

// focusin/focusout 冒泡
$('.container').on('focusin', 'input', handler);  // 有效
```

快捷方法同时提供两套：

```javascript
$('input').focus(handler);    // 直接绑定
$('.container').focusin(handler);  // 可用于委托
```

## mouseenter/mouseleave vs mouseover/mouseout

```javascript
// mouseover/mouseout 在子元素间移动也会触发
$('.parent').mouseover(handler);  // 进入子元素也触发

// mouseenter/mouseleave 只在进入/离开绑定元素时触发
$('.parent').mouseenter(handler);  // 更直观
```

`hover()` 使用 `mouseenter/mouseleave`。

## 实际应用场景

### 场景 1：点击处理

```javascript
$('.btn').click(function() {
  $(this).toggleClass('active');
});
```

### 场景 2：表单验证

```javascript
$('input.required').blur(function() {
  if (!this.value.trim()) {
    $(this).addClass('error');
  }
});

$('form').submit(function(e) {
  if (!validateForm(this)) {
    e.preventDefault();
  }
});
```

### 场景 3：悬停效果

```javascript
$('.card').hover(
  function() {
    $(this).find('.overlay').fadeIn();
  },
  function() {
    $(this).find('.overlay').fadeOut();
  }
);
```

### 场景 4：键盘快捷键

```javascript
$(document).keydown(function(e) {
  if (e.key === 'Escape') {
    closeModal();
  }
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    saveDocument();
  }
});
```

### 场景 5：窗口事件

```javascript
$(window).resize(function() {
  adjustLayout();
});

$(window).scroll(function() {
  if ($(this).scrollTop() > 100) {
    $('.back-to-top').fadeIn();
  }
});
```

### 场景 6：触发事件

```javascript
// 点击第一个按钮时，自动点击第二个
$('.btn-primary').click(function() {
  $('.btn-secondary').click();
});

// 自动聚焦
$('.search-input').focus();

// 提交表单
$('#myForm').submit();
```

## 快捷方法 vs on

| 方面 | 快捷方法 | on() |
|------|----------|------|
| 代码量 | 更少 | 更多 |
| 可读性 | 更直观 | 稍差 |
| 委托 | 不支持 | 支持 |
| 命名空间 | 不支持 | 支持 |
| 多事件 | 不支持 | 支持 |

何时用快捷方法：

- 简单的直接绑定
- 代码清晰优先

何时用 on：

- 需要事件委托
- 需要命名空间
- 需要绑定多个事件

## 本章小结

快捷方法的特点：

- **语法简洁**：直接用事件名作为方法
- **双重功能**：有参数绑定，无参数触发
- **hover 组合**：同时处理进入和离开

实现要点：

- 遍历事件列表批量生成
- 判断参数类型区分绑定和触发
- hover 使用 mouseenter/mouseleave

使用建议：

- 简单场景用快捷方法
- 复杂需求用 on()

第七部分「事件系统」到此结束。下一部分我们进入动画系统。

---

**思考题**：快捷方法 `.click(handler)` 无法使用事件委托，如果需要简洁语法又需要委托，有什么解决方案？
