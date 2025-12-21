# jQuery 对象的本质：类数组结构

当你写下 `$('.item')` 时，返回的到底是什么？

```javascript
const $items = $('.item');
console.log($items);
```

在 Chrome 控制台，你会看到类似这样的输出：

```
jQuery.fn.init(3) [div.item, div.item, div.item]
```

看起来像数组，但它不是数组。这就是 jQuery 对象的本质：**类数组对象（Array-like Object）**。

## 什么是类数组对象？

类数组对象是一种特殊的对象，它具有以下特征：

1. 有 `length` 属性
2. 有从 `0` 开始的数字索引
3. 不是真正的 `Array` 实例

JavaScript 中常见的类数组对象：

```javascript
// arguments 对象
function test() {
  console.log(arguments.length);  // 有 length
  console.log(arguments[0]);       // 有数字索引
  console.log(Array.isArray(arguments));  // false
}

// NodeList
const nodes = document.querySelectorAll('div');
console.log(nodes.length);
console.log(nodes[0]);
console.log(Array.isArray(nodes));  // false

// HTMLCollection
const elements = document.getElementsByClassName('item');
console.log(Array.isArray(elements));  // false

// 字符串
const str = 'hello';
console.log(str.length);  // 5
console.log(str[0]);      // 'h'
```

## 为什么 jQuery 选择类数组？

jQuery 选择类数组结构，有以下几个原因：

### 1. 可以使用数组语法访问元素

```javascript
const $items = $('.item');
console.log($items[0]);  // 第一个 DOM 元素
console.log($items[1]);  // 第二个 DOM 元素
```

这比调用方法更直观。

### 2. 可以用 for 循环遍历

```javascript
const $items = $('.item');
for (let i = 0; i < $items.length; i++) {
  console.log($items[i]);
}
```

### 3. 不会污染 Array.prototype

如果 jQuery 对象是真正的数组，要添加方法就只能修改 `Array.prototype`：

```javascript
// 危险！会影响所有数组
Array.prototype.css = function() { ... };
```

使用类数组，方法放在 `jQuery.prototype` 上，不会影响其他代码。

### 4. 避免方法冲突

数组有自己的 `map`、`filter`、`forEach` 等方法。jQuery 也有这些方法，但行为不同：

```javascript
// Array.map 返回新数组
[1, 2, 3].map(x => x * 2);  // [2, 4, 6]

// jQuery.map 返回新 jQuery 对象
$('.item').map(function() {
  return $(this).text();
});
```

类数组让 jQuery 可以定义自己的行为，不受 Array 方法约束。

## 实现类数组结构

让我们看看如何构建类数组：

```javascript
// 最简单的类数组
const arrayLike = {
  0: 'a',
  1: 'b',
  2: 'c',
  length: 3
};

// 可以用索引访问
console.log(arrayLike[0]);  // 'a'
console.log(arrayLike.length);  // 3

// 但没有数组方法
arrayLike.push('d');  // TypeError: arrayLike.push is not a function
```

在我们的 jQuery 实现中：

```javascript
init: function(selector) {
  const elements = document.querySelectorAll(selector);
  
  // 设置 length
  this.length = elements.length;
  
  // 设置数字索引
  for (let i = 0; i < elements.length; i++) {
    this[i] = elements[i];
  }
  
  return this;
}
```

## 让类数组"看起来"像数组

虽然 jQuery 对象不是数组，但我们可以让它在控制台显示得更友好。

### 方法一：添加 splice 属性

Chrome 控制台有一个特殊行为：如果一个对象有 `length` 和 `splice` 属性，会把它显示为数组：

```javascript
jQuery.fn = jQuery.prototype = {
  // ... 其他代码
  
  // 让控制台以数组形式显示
  splice: Array.prototype.splice
};
```

现在 `console.log($('.item'))` 会显示：

```
[div.item, div.item, div.item]
```

而不是：

```
{0: div.item, 1: div.item, 2: div.item, length: 3, ...}
```

### 方法二：自定义 Symbol.iterator

让 jQuery 对象支持 `for...of` 循环：

```javascript
jQuery.fn = jQuery.prototype = {
  // ... 其他代码
  
  // 支持 for...of
  [Symbol.iterator]: function* () {
    for (let i = 0; i < this.length; i++) {
      yield this[i];
    }
  }
};
```

现在可以这样遍历：

```javascript
for (const el of $('.item')) {
  console.log(el);
}
```

## 类数组与真数组的转换

有时候我们需要把 jQuery 对象转成真正的数组：

```javascript
// 方法一：展开运算符
const arr1 = [...$('.item')];

// 方法二：Array.from
const arr2 = Array.from($('.item'));

// 方法三：jQuery 的 toArray 方法
const arr3 = $('.item').toArray();

// 方法四：get 方法不传参数
const arr4 = $('.item').get();
```

让我们实现 `toArray` 和 `get` 方法：

```javascript
jQuery.fn = jQuery.prototype = {
  // ... 其他代码
  
  // 转换为数组
  toArray: function() {
    return Array.from(this);
  },
  
  // 获取指定索引的元素，不传参数返回所有元素组成的数组
  get: function(index) {
    if (index === undefined) {
      return this.toArray();
    }
    // 支持负索引
    if (index < 0) {
      index = this.length + index;
    }
    return this[index];
  }
};
```

测试：

```javascript
const $items = $('.item');

// toArray
const arr = $items.toArray();
console.log(Array.isArray(arr));  // true

// get
console.log($items.get(0));   // 第一个元素
console.log($items.get(-1));  // 最后一个元素
console.log($items.get());    // 所有元素的数组
```

## 完整的类数组实现

更新 `src/core/init.js`：

```javascript
function jQuery(selector) {
  return new jQuery.fn.init(selector);
}

jQuery.fn = jQuery.prototype = {
  jquery: '1.0.0',
  constructor: jQuery,
  length: 0,
  
  // 让控制台友好显示
  splice: Array.prototype.splice,
  
  // 支持 for...of
  [Symbol.iterator]: function* () {
    for (let i = 0; i < this.length; i++) {
      yield this[i];
    }
  },
  
  // 构造函数
  init: function(selector) {
    if (!selector) {
      return this;
    }
    
    if (typeof selector === 'string') {
      if (selector[0] === '<') {
        this._setElements(this._parseHTML(selector));
      } else {
        this._setElements(document.querySelectorAll(selector));
      }
      return this;
    }
    
    if (selector.nodeType) {
      this[0] = selector;
      this.length = 1;
      return this;
    }
    
    if (typeof selector === 'function') {
      document.addEventListener('DOMContentLoaded', selector);
      return this;
    }
    
    if (selector.length !== undefined) {
      this._setElements(selector);
    }
    
    return this;
  },
  
  _setElements: function(elements) {
    this.length = elements.length;
    for (let i = 0; i < elements.length; i++) {
      this[i] = elements[i];
    }
  },
  
  _parseHTML: function(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return [...template.content.childNodes];
  },
  
  // 转换为数组
  toArray: function() {
    return Array.from(this);
  },
  
  // 获取原生 DOM 元素
  get: function(index) {
    if (index === undefined) {
      return this.toArray();
    }
    if (index < 0) {
      index = this.length + index;
    }
    return this[index];
  },
  
  // 遍历
  each: function(callback) {
    for (let i = 0; i < this.length; i++) {
      if (callback.call(this[i], i, this[i]) === false) {
        break;
      }
    }
    return this;
  },
  
  // CSS
  css: function(prop, value) {
    if (value === undefined && typeof prop === 'string') {
      return this[0] ? getComputedStyle(this[0])[prop] : undefined;
    }
    return this.each(function() {
      if (typeof prop === 'object') {
        for (const key in prop) {
          this.style[key] = prop[key];
        }
      } else {
        this.style[prop] = value;
      }
    });
  }
};

jQuery.fn.init.prototype = jQuery.fn;

window.$ = window.jQuery = jQuery;

export default jQuery;
```

## 测试类数组特性

```html
<script type="module">
  import $ from './src/index.js';
  
  const $items = $('.item');
  
  // 类数组特性
  console.log('length:', $items.length);
  console.log('第一个元素:', $items[0]);
  console.log('是否为数组:', Array.isArray($items));  // false
  
  // for...of 遍历
  console.log('for...of 遍历:');
  for (const el of $items) {
    console.log(el.textContent);
  }
  
  // 展开运算符
  const arr = [...$items];
  console.log('展开为数组:', arr);
  
  // toArray
  console.log('toArray:', $items.toArray());
  
  // get
  console.log('get(0):', $items.get(0));
  console.log('get(-1):', $items.get(-1));
  console.log('get():', $items.get());
</script>
```

## 本章小结

jQuery 对象是类数组对象：

1. **有 `length` 属性**：表示包含的元素数量
2. **有数字索引**：可以用 `$items[0]` 访问元素
3. **不是真正的数组**：`Array.isArray($items)` 返回 `false`
4. **有自己的方法**：挂载在 `jQuery.prototype` 上

这种设计让 jQuery 可以：

- 使用熟悉的数组语法访问元素
- 定义自己的方法而不污染 Array
- 避免与原生数组方法冲突

下一章，我们将深入原型链的设计，理解方法共享的机制。

---

**思考题**：`arguments` 对象也是类数组，但它不能用 `for...of` 遍历（在老版本 JS 中）。为什么？我们的 jQuery 对象可以用 `for...of`，是因为什么？
