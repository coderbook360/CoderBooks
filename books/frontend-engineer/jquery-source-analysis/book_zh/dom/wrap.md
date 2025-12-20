# wrap系列方法：包裹与解包

有时候我们需要给已有元素添加一个父级容器，或者移除现有的父级容器。jQuery 的 wrap 系列方法提供了优雅的解决方案。这组方法虽然看起来简单，但其实现涉及到有趣的 DOM 操作技巧。

## wrap 系列方法概览

| 方法 | 作用 | 示例 |
|------|------|------|
| `wrap()` | 用新元素包裹每个匹配元素 | 给每个段落加一个 div 容器 |
| `wrapAll()` | 用一个元素包裹所有匹配元素 | 把所有段落放进一个容器 |
| `wrapInner()` | 用新元素包裹每个元素的内容 | 给段落内容加一个 span |
| `unwrap()` | 移除父元素，保留自身 | 解除包裹 |

## wrap：逐个包裹

### 基本用法

```javascript
// 用 div 包裹每个段落
$('p').wrap('<div class="wrapper"></div>');

// 使用已有元素作为包裹模板
$('p').wrap($('.template'));

// 使用函数动态生成包裹元素
$('p').wrap(function(index) {
    return '<div class="item-' + index + '"></div>';
});
```

### 源码解析

```javascript
jQuery.fn.wrap = function( html ) {
    var isFunction = jQuery.isFunction( html );
    
    return this.each( function( i ) {
        jQuery( this ).wrapAll( isFunction ? html.call( this, i ) : html );
    } );
};
```

**设计精髓**：`wrap` 实际上是对每个元素分别调用 `wrapAll`。这种设计让代码复用最大化。

## wrapAll：集体包裹

### 基本用法

```javascript
// 把所有段落放进一个容器
$('p').wrapAll('<div class="container"></div>');
```

**执行前**：
```html
<p>第一段</p>
<span>中间内容</span>
<p>第二段</p>
```

**执行后**：
```html
<div class="container">
    <p>第一段</p>
    <p>第二段</p>
</div>
<span>中间内容</span>
```

**注意**：所有匹配元素会被移动到第一个匹配元素的位置。

### 源码解析

```javascript
jQuery.fn.wrapAll = function( html ) {
    var wrap;
    
    if ( this[ 0 ] ) {
        // 如果是函数，先调用获取包裹元素
        if ( isFunction( html ) ) {
            html = html.call( this[ 0 ] );
        }
        
        // 创建包裹元素，插入到第一个元素之前
        wrap = jQuery( html, this[ 0 ].ownerDocument ).eq( 0 ).clone( true );
        
        if ( this[ 0 ].parentNode ) {
            wrap.insertBefore( this[ 0 ] );
        }
        
        // 找到包裹元素的最内层，将所有元素移入
        wrap.map( function() {
            var elem = this;
            
            while ( elem.firstElementChild ) {
                elem = elem.firstElementChild;
            }
            
            return elem;
        } ).append( this );
    }
    
    return this;
};
```

**关键步骤解析**：

### 步骤一：创建包裹元素

```javascript
wrap = jQuery( html, this[ 0 ].ownerDocument ).eq( 0 ).clone( true );
```

- 将 HTML 字符串转换为 jQuery 对象
- 只使用第一个元素（`eq(0)`）
- 克隆它，避免影响原始元素

### 步骤二：插入包裹元素

```javascript
if ( this[ 0 ].parentNode ) {
    wrap.insertBefore( this[ 0 ] );
}
```

将包裹元素插入到第一个目标元素之前。

### 步骤三：找到最内层

```javascript
wrap.map( function() {
    var elem = this;
    
    while ( elem.firstElementChild ) {
        elem = elem.firstElementChild;
    }
    
    return elem;
} )
```

**为什么要找最内层？**

包裹元素可能是嵌套结构：

```javascript
$('p').wrapAll('<div class="outer"><div class="inner"></div></div>');
```

需要找到最内层的 `div.inner`，将目标元素放入其中。

### 步骤四：移入目标元素

```javascript
.append( this );
```

将所有匹配元素追加到最内层元素中。

## wrapInner：包裹内容

### 基本用法

```javascript
// 包裹段落的内容
$('p').wrapInner('<span class="highlight"></span>');
```

**执行前**：
```html
<p>Hello World</p>
```

**执行后**：
```html
<p><span class="highlight">Hello World</span></p>
```

### 源码解析

```javascript
jQuery.fn.wrapInner = function( html ) {
    if ( isFunction( html ) ) {
        return this.each( function( i ) {
            jQuery( this ).wrapInner( html.call( this, i ) );
        } );
    }
    
    return this.each( function() {
        var self = jQuery( this ),
            contents = self.contents();
        
        if ( contents.length ) {
            contents.wrapAll( html );
        } else {
            self.append( html );
        }
    } );
};
```

**实现逻辑**：

1. **获取内容**：`self.contents()` 获取所有子节点（包括文本节点）
2. **有内容**：对内容调用 `wrapAll`
3. **无内容**：直接添加包裹元素

## unwrap：解除包裹

### 基本用法

```javascript
// 解除段落的父元素
$('p').unwrap();

// 只解除匹配选择器的父元素
$('p').unwrap('.wrapper');
```

### 源码解析

```javascript
jQuery.fn.unwrap = function( selector ) {
    this.parent( selector ).not( "body" ).each( function() {
        jQuery( this ).replaceWith( this.childNodes );
    } );
    return this;
};
```

**实现逻辑**：

1. **获取父元素**：`this.parent( selector )` 可选择性过滤
2. **排除 body**：`.not( "body" )` 防止移除 body 元素
3. **替换**：用子节点替换父元素本身

**为什么用 `this.childNodes`？**

```javascript
// 保留所有子节点，包括文本节点和注释节点
parent.replaceWith( parent.childNodes );
```

这确保了父元素的所有内容都被保留。

## 嵌套包裹的处理

`wrapAll` 支持嵌套的包裹结构：

```javascript
$('p').wrap('<div class="a"><div class="b"><div class="c"></div></div></div>');
```

**查找最内层的逻辑**：

```javascript
while ( elem.firstElementChild ) {
    elem = elem.firstElementChild;
}
```

从外向内遍历，找到没有子元素的最内层。

**边界情况**：

```javascript
// 包裹元素本身就是叶子节点
$('p').wrap('<span></span>');

// 包裹元素有多个子元素（只进入第一个）
$('p').wrap('<div><span></span><em></em></div>');
// 目标会被放入 <span> 中
```

## 实际应用场景

### 场景一：动态添加装饰容器

```javascript
// 给图片添加带标题的容器
$('img').wrap(function() {
    const alt = $(this).attr('alt');
    return '<figure><figcaption>' + alt + '</figcaption></figure>';
});
```

### 场景二：表单字段包装

```javascript
// 给所有输入框添加表单组容器
$('input, select, textarea').wrap('<div class="form-group"></div>');
```

### 场景三：内容高亮

```javascript
// 给段落文字添加高亮包装
$('.important').wrapInner('<mark></mark>');
```

### 场景四：解除多余包装

```javascript
// 清理编辑器生成的多余 span
$('p span').unwrap('span');
```

## 链式操作示例

```javascript
$('.content')
    .wrapInner('<div class="inner"></div>')  // 包裹内容
    .wrap('<section class="outer"></section>')  // 包裹自身
    .parent()  // 获取 section
    .addClass('styled');  // 添加样式
```

## 性能考量

### wrap vs wrapAll

```javascript
// 每个元素单独包裹（多次 DOM 操作）
$('.items').wrap('<div></div>');

// 所有元素一起包裹（一次 DOM 操作）
$('.items').wrapAll('<div></div>');
```

当需要统一包裹时，`wrapAll` 更高效。

### 克隆的影响

```javascript
wrap = jQuery( html, this[ 0 ].ownerDocument ).eq( 0 ).clone( true );
```

每次 wrap 操作都会克隆包裹元素。如果包裹元素很复杂，可能有性能影响。

## 与其他方法的对比

| 需求 | 方法 | 说明 |
|------|------|------|
| 在元素外添加父级 | `wrap()` | 包裹每个元素 |
| 在元素内添加子级 | `wrapInner()` | 包裹元素内容 |
| 在元素后添加同级 | `after()` | 添加兄弟元素 |
| 在元素内添加内容 | `append()` | 添加子内容 |
| 移除外层包装 | `unwrap()` | 保留自身和内容 |
| 移除自身保留内容 | `replaceWith(contents)` | 用内容替换自身 |

## 设计智慧总结

1. **方法复用**：`wrap` 通过循环调用 `wrapAll` 实现，避免代码重复
2. **嵌套支持**：自动找到最内层元素进行内容放置
3. **灵活参数**：支持字符串、元素、jQuery 对象和函数
4. **安全设计**：`unwrap` 排除 body 元素，防止破坏页面结构
5. **完整内容**：使用 `childNodes` 保留所有类型的子节点

wrap 系列方法为 DOM 结构调整提供了便捷的工具。理解其实现原理，能帮助我们在复杂的布局调整场景中做出正确的选择。

下一章，我们将探索 `html()` 和 `text()` 方法——jQuery 中最常用的内容读写方法，看看它们在简洁 API 背后隐藏了哪些精妙的设计。
