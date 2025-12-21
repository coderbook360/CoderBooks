# hasClass：类名检测

`hasClass()` 方法用于检测元素是否包含指定的类名。

## 基本用法

```javascript
$('.box').hasClass('active');  // true 或 false
```

## 原生实现

现代浏览器提供 `classList.contains()`：

```javascript
element.classList.contains('active');  // true 或 false
```

## jQuery 实现

```javascript
jQuery.fn.hasClass = function(className) {
  if (!className || typeof className !== 'string') {
    return false;
  }
  
  const elem = this[0];
  if (!elem || elem.nodeType !== 1) {
    return false;
  }
  
  return elem.classList.contains(className);
};
```

## 与其他类操作方法的关系

```javascript
// 添加类
$('.box').addClass('active');

// 移除类
$('.box').removeClass('active');

// 切换类
$('.box').toggleClass('active');

// 检测类 ← 本章
$('.box').hasClass('active');
```

## 只检测第一个元素

`hasClass()` 只检测第一个匹配的元素：

```javascript
// 假设有多个 .box，只检测第一个
$('.box').hasClass('active');

// 如果需要检测所有元素是否都有某个类
$('.box').toArray().every(el => el.classList.contains('active'));

// 如果需要检测是否有任一元素有某个类
$('.box').toArray().some(el => el.classList.contains('active'));
```

## 空格处理

类名不应包含空格：

```javascript
// 错误用法
$('.box').hasClass('active highlight');  // 不正确

// 正确用法：检测多个类
$('.box').hasClass('active') && $('.box').hasClass('highlight');
```

## 与 is() 方法配合

使用 `is()` 可以用选择器语法检测类：

```javascript
// hasClass
$('.box').hasClass('active');

// is() 可以实现相同效果
$('.box').is('.active');

// is() 更灵活，可以使用复杂选择器
$('.box').is('.active.visible');
$('.box').is(':visible');
```

## 实际应用场景

### 场景 1：条件判断

```javascript
if ($('#menu').hasClass('open')) {
  closeMenu();
} else {
  openMenu();
}
```

### 场景 2：状态检查

```javascript
const isLoading = $('.button').hasClass('loading');
if (isLoading) {
  return;  // 防止重复提交
}
```

### 场景 3：样式切换

```javascript
$('.tab').click(function() {
  if ($(this).hasClass('active')) {
    return;  // 已激活，无需操作
  }
  
  $('.tab').removeClass('active');
  $(this).addClass('active');
});
```

### 场景 4：动画控制

```javascript
function toggleAnimation() {
  const $box = $('.box');
  
  if ($box.hasClass('animating')) {
    // 正在动画中，等待完成
    return;
  }
  
  $box.addClass('animating');
  // 执行动画...
}
```

### 场景 5：表单验证

```javascript
function isFormValid() {
  return !$('.form-group').toArray().some(
    group => $(group).hasClass('has-error')
  );
}
```

### 场景 6：响应式检测

```javascript
// 根据某个隐藏元素的类检测响应式断点
function isMobile() {
  return $('.responsive-check').hasClass('mobile');
}
```

## 性能考虑

`classList.contains()` 非常高效：

```javascript
// 快速
element.classList.contains('active');

// 较慢（正则匹配）
/\bactive\b/.test(element.className);

// 较慢（字符串操作）
(' ' + element.className + ' ').indexOf(' active ') > -1;
```

现代浏览器的 `classList` 是原生优化的，无需手动优化。

## 与 toggleClass 的配合

```javascript
// toggleClass 可以根据当前状态自动切换
$('.box').toggleClass('active');

// 等效于
if ($('.box').hasClass('active')) {
  $('.box').removeClass('active');
} else {
  $('.box').addClass('active');
}
```

## 完整实现

```javascript
// src/attributes/class.js

jQuery.fn.hasClass = function(className) {
  // 参数验证
  if (!className || typeof className !== 'string') {
    return false;
  }
  
  // 去除可能的空格
  className = className.trim();
  
  // 空字符串返回 false
  if (!className) {
    return false;
  }
  
  // 获取第一个元素
  const elem = this[0];
  
  // 元素不存在或不是元素节点
  if (!elem || elem.nodeType !== 1) {
    return false;
  }
  
  // 使用 classList.contains
  return elem.classList.contains(className);
};
```

## 本章小结

`hasClass()` 方法特点：

- **简单直接**：检测单个类名
- **只检测第一个**：多元素集合只看第一个
- **返回布尔值**：true 或 false

实现要点：

- 使用 `classList.contains()`
- 参数验证
- 只处理第一个元素

使用场景：

- 条件判断
- 状态检查
- 防止重复操作

下一章，我们进入样式操作，实现 `css()` 方法。

---

**思考题**：`hasClass('a b')` 应该返回什么？jQuery 原版是如何处理多个类名的？
