# 选择器结果的缓存优化

在频繁操作 DOM 的场景中，重复执行相同的选择器查询会带来性能开销。这一章，我们探讨选择器缓存的策略和实现。

## 重复查询的问题

看这段常见代码：

```javascript
$('.item').addClass('active');
$('.item').css('color', 'red');
$('.item').on('click', handler);
$('.item').fadeIn();
```

每次 `$('.item')` 都会：

1. 调用 `document.querySelectorAll('.item')`
2. 创建新的 jQuery 对象
3. 复制元素到新对象

如果 `.item` 有 100 个元素，这就是 4 次 DOM 查询 + 400 次元素复制。

## 最简单的优化：变量缓存

```javascript
const $items = $('.item');
$items.addClass('active');
$items.css('color', 'red');
$items.on('click', handler);
$items.fadeIn();
```

只查询一次，后续操作都使用缓存的 jQuery 对象。

这是最有效的优化方式，也是 jQuery 官方推荐的最佳实践。

## 链式调用的天然优势

链式调用本身就避免了重复查询：

```javascript
$('.item')
  .addClass('active')
  .css('color', 'red')
  .on('click', handler)
  .fadeIn();
```

一次查询，多次操作。

## 自动缓存的考量

你可能会想：能不能让 jQuery 自动缓存选择器结果？

```javascript
// 假想的自动缓存
$('.item');  // 第一次：查询 DOM
$('.item');  // 第二次：从缓存返回
```

这看起来很美好，但有严重问题：

### 问题 1：DOM 会变化

```javascript
$('.item').length;  // 3

// 添加新元素
$('<div class="item">New</div>').appendTo('body');

$('.item').length;  // 应该是 4，但缓存返回 3！
```

缓存会导致无法获取最新的 DOM 状态。

### 问题 2：内存泄漏

如果缓存所有选择器结果，内存会不断增长：

```javascript
for (let i = 0; i < 1000; i++) {
  $(`.item-${i}`);  // 每个都被缓存
}
// 内存中有 1000 个 jQuery 对象
```

### 问题 3：缓存失效策略

什么时候清除缓存？

- DOM 变化时？需要监听所有 DOM 操作
- 定时清除？可能清除了还需要的缓存
- 手动清除？增加使用复杂度

## 选择器缓存的正确姿势

虽然自动缓存有问题，但在特定场景下，手动缓存仍然有价值：

### 场景 1：静态内容

如果确定 DOM 不会变化，可以安全地缓存：

```javascript
// 页面加载后，菜单项不会变化
const $menuItems = $('.nav-item');

// 之后的操作都用缓存
$('.nav-item').addClass('active');  // 不推荐
$menuItems.addClass('active');      // 推荐
```

### 场景 2：组件内部

组件内的元素通常是稳定的：

```javascript
class Carousel {
  constructor(element) {
    this.$el = $(element);
    // 缓存内部元素
    this.$slides = this.$el.find('.slide');
    this.$prevBtn = this.$el.find('.prev');
    this.$nextBtn = this.$el.find('.next');
  }
  
  next() {
    this.$slides.removeClass('active');
    // 使用缓存的引用
  }
}
```

### 场景 3：高频操作

在动画或滚动处理中，避免重复查询：

```javascript
// 差
window.addEventListener('scroll', () => {
  $('.header').toggleClass('fixed', window.scrollY > 100);
});

// 好
const $header = $('.header');
window.addEventListener('scroll', () => {
  $header.toggleClass('fixed', window.scrollY > 100);
});
```

## 实现一个简单的缓存工具

如果你真的需要缓存，可以实现一个显式的缓存系统：

```javascript
// 简单的选择器缓存
const selectorCache = {
  _cache: new Map(),
  _maxSize: 50,
  
  get(selector, context) {
    const key = context ? `${selector}@${context}` : selector;
    return this._cache.get(key);
  },
  
  set(selector, context, result) {
    const key = context ? `${selector}@${context}` : selector;
    
    // 限制缓存大小
    if (this._cache.size >= this._maxSize) {
      const firstKey = this._cache.keys().next().value;
      this._cache.delete(firstKey);
    }
    
    this._cache.set(key, result);
  },
  
  clear() {
    this._cache.clear();
  },
  
  // 删除包含特定选择器的缓存
  invalidate(selector) {
    for (const key of this._cache.keys()) {
      if (key.includes(selector)) {
        this._cache.delete(key);
      }
    }
  }
};

// 带缓存的选择器（显式调用）
jQuery.cached = function(selector, context) {
  let result = selectorCache.get(selector, context);
  
  if (!result) {
    result = jQuery(selector, context);
    selectorCache.set(selector, context, result);
  }
  
  return result;
};

// 清除缓存
jQuery.clearCache = function() {
  selectorCache.clear();
};
```

使用：

```javascript
// 显式使用缓存
$.cached('.item').addClass('active');
$.cached('.item').css('color', 'red');  // 使用缓存

// DOM 变化后清除缓存
$('<div class="item">').appendTo('body');
$.clearCache();

// 或者只清除特定选择器的缓存
selectorCache.invalidate('.item');
```

## HTML 解析缓存

对于 HTML 字符串创建，缓存更有意义：

```javascript
const htmlCache = new Map();

function parseHTMLCached(html) {
  let result = htmlCache.get(html);
  
  if (!result) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    result = [...template.content.childNodes].filter(n => n.nodeType === 1);
    
    // 只缓存短 HTML
    if (html.length < 1000) {
      htmlCache.set(html, result.map(el => el.cloneNode(true)));
    }
  } else {
    // 返回克隆的节点，避免同一个节点被多次使用
    result = result.map(el => el.cloneNode(true));
  }
  
  return result;
}
```

注意：缓存的 HTML 节点必须克隆后使用，否则同一个节点不能插入到多个位置。

## 实际项目中的缓存策略

### 推荐做法

1. **使用变量缓存**：最简单有效

```javascript
const $form = $('#myForm');
const $inputs = $form.find('input');
const $submitBtn = $form.find('[type="submit"]');
```

2. **使用链式调用**：避免重复查询

```javascript
$('#box')
  .addClass('active')
  .find('.item')
  .css('color', 'red');
```

3. **组件内缓存**：在初始化时缓存常用元素

```javascript
class Widget {
  constructor(el) {
    this.$el = $(el);
    this.$header = this.$el.find('.header');
    this.$body = this.$el.find('.body');
    this.$footer = this.$el.find('.footer');
  }
}
```

### 不推荐做法

1. **全局自动缓存**：可能导致数据不一致
2. **过度优化**：现代浏览器的 DOM 查询已经很快
3. **长时间持有引用**：可能导致内存泄漏

## 性能测试

让我们测试一下缓存的实际效果：

```html
<script type="module">
  import $ from './src/index.js';
  
  // 创建测试元素
  for (let i = 0; i < 100; i++) {
    $('<div class="test-item">').appendTo('body');
  }
  
  // 测试 1：重复查询
  console.time('重复查询');
  for (let i = 0; i < 1000; i++) {
    $('.test-item').length;
  }
  console.timeEnd('重复查询');
  
  // 测试 2：缓存后操作
  const $items = $('.test-item');
  console.time('缓存后操作');
  for (let i = 0; i < 1000; i++) {
    $items.length;
  }
  console.timeEnd('缓存后操作');
  
  // 清理
  $('.test-item').remove();
</script>
```

在我的测试中：
- 重复查询：约 50ms
- 缓存后操作：约 0.5ms

**缓存快了 100 倍！**

## 本章小结

选择器缓存的关键点：

1. **变量缓存是最佳实践**：简单、可靠、有效
2. **链式调用天然避免重复查询**：充分利用
3. **自动缓存有风险**：DOM 变化、内存泄漏
4. **显式缓存用于特定场景**：静态内容、组件内部

最好的优化策略：

```javascript
// 养成缓存的习惯
const $header = $('.header');
const $nav = $header.find('.nav');
const $menuItems = $nav.find('.item');

// 然后使用缓存的引用操作
$menuItems.on('click', handler);
```

至此，选择器引擎部分完成。下一部分，我们将实现 DOM 遍历方法。

---

**思考题**：以下代码有性能问题吗？如何优化？

```javascript
$('.item').each(function() {
  $(this).addClass('processed');
  $(this).data('timestamp', Date.now());
  $(this).css('opacity', 1);
});
```
