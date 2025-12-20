# pushStack与结果集栈管理

jQuery的链式调用不仅能向前操作，还能"回退"。

```javascript
$('#box')
    .find('p')           // 进入p元素
    .css('color', 'red')
    .end()               // 回到#box
    .find('span')        // 进入span元素
    .css('color', 'blue');
```

`end()` 方法让我们回到上一步的结果集。这个功能是怎么实现的？

答案是 `pushStack`——jQuery用它构建了一个结果集的"历史栈"。

## 问题：遍历后如何回退

首先考虑一个场景：

```html
<div id="box">
    <p>段落1</p>
    <p>段落2</p>
    <span>文本</span>
</div>
```

我们想：
1. 选中 `#box`
2. 找到其中的 `p` 元素，设置为红色
3. 回到 `#box`
4. 找到其中的 `span` 元素，设置为蓝色

不用 `end()`，需要这样写：

```javascript
var $box = $('#box');

$box.find('p').css('color', 'red');
$box.find('span').css('color', 'blue');
```

使用 `end()`，可以一气呵成：

```javascript
$('#box')
    .find('p').css('color', 'red')
    .end()
    .find('span').css('color', 'blue');
```

`end()` 能工作的前提是：`find()` 必须记住它是从哪里来的。

## pushStack的实现

让我们看看 `pushStack` 的源码：

```javascript
jQuery.fn.pushStack = function( elems ) {
    // 创建新的jQuery对象
    var ret = jQuery.merge( this.constructor(), elems );
    
    // 记住之前的结果集
    ret.prevObject = this;
    
    // 返回新对象
    return ret;
};
```

代码非常简洁，只做三件事：

1. **创建新jQuery对象**：`jQuery.merge( this.constructor(), elems )`
   - `this.constructor()` 创建一个空的jQuery对象
   - `jQuery.merge()` 将元素数组合并进去

2. **保存引用**：`ret.prevObject = this`
   - 新对象的 `prevObject` 指向当前对象
   - 这就是"回退"的关键

3. **返回新对象**：不是返回 `this`，而是返回新创建的对象

## prevObject链表

每次调用 `pushStack`，就在结果集之间建立了一个链接：

```javascript
var $box = $('#box');                    // { prevObject: undefined }
var $paragraphs = $box.find('p');        // { prevObject: $box }
var $firstP = $paragraphs.first();       // { prevObject: $paragraphs }
```

这形成了一个单向链表：

```
$firstP.prevObject → $paragraphs.prevObject → $box.prevObject → undefined
```

图示：

```
$firstP ────────────> $paragraphs ──────────> $box ──────────> (空)
        prevObject               prevObject         prevObject
```

多次遍历会形成更长的链：

```javascript
$('#container')
    .find('.list')
    .children('li')
    .filter('.active')
    .find('a');
```

链表结构：

```
$a → $activeLi → $allLi → $list → $container → (空)
```

## end()的实现

理解了 `prevObject`，`end()` 的实现就很简单了：

```javascript
jQuery.fn.end = function() {
    return this.prevObject || this.constructor();
};
```

返回 `prevObject`，如果不存在就返回一个空jQuery对象。

**使用示例**

```javascript
$('#box')
    .find('p')           // prevObject: $box
    .css('color', 'red')
    .end()               // 返回prevObject，即$box
    .addClass('done');   // 操作$box
```

**连续调用end()**

```javascript
$('#box')
    .find('ul')          // prevObject: $box
    .find('li')          // prevObject: $ul
    .find('a')           // prevObject: $li
    .css('color', 'red')
    .end()               // 返回$li
    .addClass('item')
    .end()               // 返回$ul
    .addClass('list')
    .end()               // 返回$box
    .addClass('container');
```

每次 `end()` 沿着链表向上回溯一步。

## 使用pushStack的方法

jQuery中很多遍历方法都使用 `pushStack`：

**find()**

```javascript
jQuery.fn.find = function( selector ) {
    var ret = [];
    
    // 对每个元素执行查找
    for ( var i = 0; i < this.length; i++ ) {
        jQuery.find( selector, this[i], ret );  // 结果收集到ret
    }
    
    // 使用pushStack返回新结果集
    return this.pushStack( ret );
};
```

**filter()**

```javascript
jQuery.fn.filter = function( selector ) {
    return this.pushStack( 
        jQuery.grep( this, function( elem ) {
            return jQuery.find.matchesSelector( elem, selector );
        })
    );
};
```

**children()**

```javascript
jQuery.fn.children = function( selector ) {
    var matched = [];
    
    this.each(function() {
        var children = this.children;
        jQuery.merge( matched, children );
    });
    
    // 可选的过滤
    if ( selector ) {
        matched = jQuery.filter( selector, matched );
    }
    
    return this.pushStack( matched );
};
```

**parent()**

```javascript
jQuery.fn.parent = function( selector ) {
    var matched = [];
    
    this.each(function() {
        var parent = this.parentNode;
        if ( parent && parent.nodeType !== 11 ) {  // 排除DocumentFragment
            matched.push( parent );
        }
    });
    
    // 去重
    matched = jQuery.uniqueSort( matched );
    
    if ( selector ) {
        matched = jQuery.filter( selector, matched );
    }
    
    return this.pushStack( matched );
};
```

**规律**

凡是"产生新结果集"的方法，都使用 `pushStack`：
- 遍历方法：`find`, `children`, `parent`, `siblings`, `next`, `prev`
- 过滤方法：`filter`, `not`, `eq`, `first`, `last`, `slice`
- 扩展方法：`add`

而"修改当前元素"的方法，返回 `this`：
- 样式方法：`css`, `addClass`, `removeClass`
- 内容方法：`html`, `text`, `val`
- 事件方法：`on`, `off`, `trigger`

## addBack()方法

有时候，我们想同时操作当前结果集和之前的结果集。

```javascript
$('#box')
    .find('p')
    .addBack()  // 包含#box和所有p
    .css('border', '1px solid red');
```

`addBack()` 的实现：

```javascript
jQuery.fn.addBack = function( selector ) {
    return this.add( 
        selector == null ? 
            this.prevObject : 
            this.prevObject.filter( selector ) 
    );
};
```

它将 `prevObject`（可选过滤）添加到当前结果集中。

**使用场景**

```javascript
// 高亮选中的元素及其父元素
$('.item')
    .parent()
    .addBack()
    .addClass('highlight');

// 等价于
$('.item').addClass('highlight');
$('.item').parent().addClass('highlight');
```

## 设计启示

`pushStack` 体现了几个重要的设计思想：

**1. 不可变性（Immutability）**

遍历方法不修改原对象，而是返回新对象。这让代码更可预测：

```javascript
var $box = $('#box');
var $paragraphs = $box.find('p');

// $box 没有被修改
console.log($box.length);        // 1
console.log($paragraphs.length); // 可能是多个
```

**2. 历史追踪**

通过 `prevObject` 链表，保留了操作历史。这是一种简单的"撤销"机制。

**3. 链式调用的完整性**

`end()` 让链式调用可以"分支"和"回溯"，表达更复杂的操作序列。

**现代应用**

这种思想在现代前端框架中也很常见：

```javascript
// Immutable.js
const list1 = Immutable.List([1, 2, 3]);
const list2 = list1.push(4);  // 返回新对象

console.log(list1.size);  // 3，原对象未变
console.log(list2.size);  // 4

// Redux
const newState = reducer(oldState, action);  // 返回新状态
```

## 实现练习

让我们为之前的迷你jQuery添加 `pushStack` 和 `end()`：

```javascript
class DOMWrapper {
    constructor(elements = [], prevObject = null) {
        if (typeof elements === 'string') {
            elements = [...document.querySelectorAll(elements)];
        } else if (elements instanceof Element) {
            elements = [elements];
        } else if (!Array.isArray(elements)) {
            elements = [...elements];  // 类数组转数组
        }
        
        this.elements = elements;
        this.length = elements.length;
        this.prevObject = prevObject;
        
        elements.forEach((el, i) => {
            this[i] = el;
        });
    }
    
    pushStack(elements) {
        return new DOMWrapper(elements, this);  // 保存当前对象为prevObject
    }
    
    end() {
        return this.prevObject || new DOMWrapper([]);
    }
    
    find(selector) {
        const matched = [];
        this.elements.forEach(el => {
            matched.push(...el.querySelectorAll(selector));
        });
        return this.pushStack(matched);
    }
    
    children() {
        const matched = [];
        this.elements.forEach(el => {
            matched.push(...el.children);
        });
        return this.pushStack(matched);
    }
    
    parent() {
        const matched = [];
        this.elements.forEach(el => {
            if (el.parentNode) {
                matched.push(el.parentNode);
            }
        });
        // 去重
        return this.pushStack([...new Set(matched)]);
    }
    
    filter(selector) {
        const matched = this.elements.filter(el => 
            el.matches(selector)
        );
        return this.pushStack(matched);
    }
    
    first() {
        return this.pushStack(this.elements.slice(0, 1));
    }
    
    last() {
        return this.pushStack(this.elements.slice(-1));
    }
    
    addBack() {
        const combined = [...this.elements];
        if (this.prevObject) {
            combined.push(...this.prevObject.elements);
        }
        return this.pushStack([...new Set(combined)]);
    }
    
    // 修改方法返回this
    css(prop, value) {
        this.elements.forEach(el => {
            el.style[prop] = value;
        });
        return this;
    }
    
    addClass(className) {
        this.elements.forEach(el => {
            el.classList.add(className);
        });
        return this;
    }
}

function $(selector) {
    return new DOMWrapper(selector);
}

// 使用
$('#box')
    .find('p')
    .css('color', 'red')
    .end()
    .find('span')
    .css('color', 'blue')
    .end()
    .addClass('processed');
```

## 小结

本章学习了jQuery的结果集栈管理：

**pushStack**
- 创建新jQuery对象
- 设置 `prevObject` 指向当前对象
- 返回新对象

**prevObject链表**
- 遍历方法通过pushStack形成链表
- 保留了操作历史

**end()**
- 返回 `prevObject`
- 实现结果集回退

**addBack()**
- 合并当前和之前的结果集

**设计思想**
- 不可变性：遍历返回新对象
- 历史追踪：保留操作链
- 链式完整性：支持分支和回溯

下一章，我们将深入分析 `jQuery.extend`——jQuery中使用最广泛的工具函数之一。
