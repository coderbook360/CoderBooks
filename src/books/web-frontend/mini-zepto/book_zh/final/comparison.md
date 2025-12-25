# 与 jQuery 对比

本章对比 Mini Zepto 与 jQuery，分析设计取舍。

## 定位差异

| 特性 | jQuery | Zepto |
|------|--------|-------|
| 定位 | 全能型 DOM 库 | 轻量级移动端库 |
| 体积 | ~90KB (min) | ~10KB (min) |
| 浏览器支持 | IE6+ | 现代浏览器 |
| 移动端优化 | 有限 | 原生触摸事件 |

Zepto 的设计哲学：**做更少的事，做得更好**。

## API 兼容性

### 完全兼容

```typescript
// 选择器
$('.class')
$('#id')
$('div.class')

// DOM 操作
$('#box').addClass('active')
$('#box').html('<p>Hello</p>')
$('#box').css('color', 'red')

// 事件
$('#btn').on('click', handler)
$('#list').on('click', 'li', handler)

// 遍历
$('.items').each((i, el) => {})
$('.items').find('.child')
```

### 部分差异

**选择器**：

```typescript
// jQuery 支持自定义选择器
$(':visible')
$(':animated')
$(':input')

// Zepto 不支持，需要用 filter
$('div').filter(function() {
  return $(this).css('display') !== 'none'
})
```

**动画**：

```typescript
// jQuery 有完整的动画队列
$('#box')
  .animate({ left: 100 }, 500)
  .animate({ top: 100 }, 500)
  .delay(200)
  .fadeOut()

// Zepto 的动画基于 CSS3 Transition
// 队列支持较简单
```

**AJAX**：

```typescript
// jQuery 返回 Deferred
$.ajax('/api').done(fn).fail(fn)

// Zepto 返回 XMLHttpRequest
// 或用 Promise 封装
```

### 不支持的功能

Zepto 不支持：
- 自定义选择器引擎
- Deferred / Promise（需额外实现）
- `.queue()` / `.dequeue()` 完整队列
- `$.Callbacks()`
- 某些遍历方法（`.addBack()`, `.end()` 部分场景）

## 实现对比

### 选择器引擎

```typescript
// jQuery Sizzle：功能强大但复杂
// 支持 :visible、:eq()、:contains() 等

// Zepto：直接用原生 API
$(selector) => document.querySelectorAll(selector)
```

**权衡**：Zepto 放弃了自定义选择器，换取更小的体积和更好的性能。

### 事件系统

```typescript
// jQuery：完整的事件抽象
// - 事件修复（跨浏览器）
// - 事件命名空间
// - 自定义事件对象

// Zepto：轻量事件封装
// - 依赖原生事件
// - 简化的命名空间
// - 直接使用 CustomEvent
```

**权衡**：现代浏览器事件 API 已足够标准，不需要复杂的兼容层。

### 动画系统

```typescript
// jQuery：JavaScript 驱动动画
$('#box').animate({
  width: '100px',
  height: '100px',
  backgroundColor: '#ff0000'  // 需要 jQuery Color 插件
}, 500)

// Zepto：CSS3 Transition 驱动
$('#box').animate({
  transform: 'scale(1.5)',
  opacity: 0.5
}, 500)
```

**权衡**：
- jQuery：兼容性好，控制精细
- Zepto：性能更好（GPU 加速），代码更少

### 数据存储

```typescript
// jQuery：独立数据缓存
const cache = {}
let uid = 1

function data(el, key, value) {
  const id = el[expando] || (el[expando] = uid++)
  cache[id] = cache[id] || {}
  
  if (value !== undefined) {
    cache[id][key] = value
  }
  return cache[id][key]
}

// Zepto：直接存储在元素上
function data(el, key, value) {
  el._data = el._data || {}
  
  if (value !== undefined) {
    el._data[key] = value
  }
  return el._data[key]
}
```

**权衡**：
- jQuery：避免内存泄漏，可以手动清理
- Zepto：简单直接，依赖 GC

## 性能对比

### 选择器性能

```typescript
// 测试：查找 1000 个元素

// jQuery
console.time('jQuery')
for (let i = 0; i < 1000; i++) {
  $('div.item')
}
console.timeEnd('jQuery')  // ~50ms

// Zepto
console.time('Zepto')
for (let i = 0; i < 1000; i++) {
  $('div.item')
}
console.timeEnd('Zepto')  // ~30ms
```

Zepto 更快，因为直接调用原生 `querySelectorAll`。

### 动画性能

```typescript
// 测试：同时动画 100 个元素

// jQuery (requestAnimationFrame)
// CPU 密集，可能卡顿

// Zepto (CSS Transition)
// GPU 加速，流畅
```

CSS3 动画在移动端优势明显。

### 内存占用

```
jQuery: ~90KB (压缩后)
Zepto:  ~10KB (压缩后)
```

对于移动端，体积差异意味着更快的加载。

## 迁移指南

从 jQuery 迁移到 Zepto：

### 1. 检查选择器

```typescript
// 替换自定义选择器
$(':visible')  →  $('*').filter(el => $(el).css('display') !== 'none')
$(':input')    →  $('input, select, textarea, button')
```

### 2. 检查动画

```typescript
// jQuery 颜色动画需要插件
$('#box').animate({ backgroundColor: 'red' })

// Zepto 原生支持
$('#box').animate({ backgroundColor: 'red' })

// 但注意：Zepto 的 animate 是 CSS Transition
// 不支持的属性需要用 anim 方法
```

### 3. 检查 Deferred

```typescript
// jQuery
$.ajax('/api').done(fn)

// Zepto：封装 Promise
function ajax(url) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url,
      success: resolve,
      error: reject
    })
  })
}

ajax('/api').then(fn)
```

### 4. 检查插件

jQuery 插件需要修改或寻找 Zepto 版本。

## 何时选择 Zepto

**适合场景**：
- 移动端 Web 应用
- 需要轻量级库
- 只需基础 DOM 操作
- 性能敏感的场景

**不适合场景**：
- 需要支持旧浏览器（IE）
- 依赖大量 jQuery 插件
- 需要复杂动画队列
- 需要自定义选择器

## 现代替代方案

```typescript
// 原生 DOM API 已经很完善
document.querySelectorAll('.item')
element.classList.add('active')
element.addEventListener('click', handler)

// 如果只需要简单操作，可能不需要任何库
```

## 小结

**Zepto vs jQuery**：

| 维度 | jQuery | Zepto |
|------|--------|-------|
| 体积 | 大 | 小 |
| 兼容性 | 好 | 现代浏览器 |
| 功能 | 全面 | 精简 |
| 性能 | 一般 | 好 |
| 移动端 | 一般 | 优秀 |

**设计取舍**：
- Zepto 选择了更小的体积和更好的性能
- 牺牲了旧浏览器支持和部分高级功能
- 这是移动互联网时代的正确选择

**启示**：
- 了解场景，选择合适的工具
- 权衡取舍是架构设计的核心
- 简单往往比复杂更好
