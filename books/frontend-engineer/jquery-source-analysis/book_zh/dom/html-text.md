# html 与 text：内容读写的双面手

在 jQuery 的 DOM 操作中，`html()` 和 `text()` 是使用频率最高的两个方法。它们看似简单——一个处理 HTML，一个处理纯文本——但在简洁的 API 背后，隐藏着精妙的设计考量。

## 基本用法

### html() 方法

```javascript
// 读取 HTML 内容
const htmlContent = $('div').html();

// 设置 HTML 内容
$('div').html('<span>新内容</span>');

// 使用函数动态设置
$('div').html(function(index, oldHtml) {
    return oldHtml + '<span>追加内容</span>';
});
```

### text() 方法

```javascript
// 读取文本内容
const textContent = $('div').text();

// 设置文本内容（自动转义 HTML）
$('div').text('<span>这会显示为文本</span>');

// 使用函数动态设置
$('div').text(function(index, oldText) {
    return oldText.toUpperCase();
});
```

## html() 源码解析

```javascript
jQuery.fn.html = function( value ) {
    return access( this, function( value ) {
        var elem = this[ 0 ] || {},
            i = 0,
            l = this.length;
        
        // 读取模式
        if ( value === undefined && elem.nodeType === 1 ) {
            return elem.innerHTML;
        }
        
        // 设置模式：尝试快速路径
        if ( typeof value === "string" && !rnoInnerhtml.test( value ) &&
            !wrapMap[ ( rtagName.exec( value ) || [ "", "" ] )[ 1 ].toLowerCase() ] ) {
            
            value = jQuery.htmlPrefilter( value );
            
            try {
                for ( ; i < l; i++ ) {
                    elem = this[ i ] || {};
                    
                    if ( elem.nodeType === 1 ) {
                        jQuery.cleanData( getAll( elem, false ) );
                        elem.innerHTML = value;
                    }
                }
                
                elem = 0;  // 标记成功
            } catch ( e ) {
                // 快速路径失败，使用 empty + append
            }
        }
        
        // 慢速路径：使用 empty + append
        if ( elem ) {
            this.empty().append( value );
        }
    }, null, value, arguments.length );
};
```

### 快速路径与慢速路径

**快速路径条件**：
1. 参数是字符串
2. 不包含特殊元素（`<script>`、`<style>` 等）
3. 不需要特殊包装（表格元素等）

```javascript
// 快速路径：直接使用 innerHTML
rnoInnerhtml = /<script|<style|<link/i;

// 检查是否需要包装
!wrapMap[ tagName ]
```

**快速路径**：直接使用 `innerHTML`，性能最佳。

**慢速路径**：使用 `empty() + append()`，确保：
- 正确处理特殊元素
- 脚本能被正确执行
- 数据被正确清理

### 为什么需要 cleanData？

```javascript
jQuery.cleanData( getAll( elem, false ) );
```

在替换内容前，必须清理旧内容的事件和数据，防止内存泄漏。

## text() 源码解析

```javascript
jQuery.fn.text = function( value ) {
    return access( this, function( value ) {
        // 读取模式
        if ( value === undefined ) {
            return jQuery.text( this );
        }
        
        // 设置模式
        return this.empty().each( function() {
            if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
                this.textContent = value;
            }
        } );
    }, null, value, arguments.length );
};
```

### jQuery.text 工具函数

```javascript
// 来自 Sizzle 的文本提取函数
jQuery.text = function( elem ) {
    var node,
        ret = "",
        i = 0,
        nodeType = elem.nodeType;
    
    if ( !nodeType ) {
        // 数组或 jQuery 对象：递归获取每个元素的文本
        while ( ( node = elem[ i++ ] ) ) {
            ret += jQuery.text( node );
        }
    } else if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {
        // 元素/文档/片段：使用 textContent
        return elem.textContent;
    } else if ( nodeType === 3 || nodeType === 4 ) {
        // 文本/CDATA 节点：返回节点值
        return elem.nodeValue;
    }
    // 注释和处理指令节点被忽略
    
    return ret;
};
```

**设计亮点**：

1. **递归处理**：jQuery 对象可能包含多个元素，递归获取所有文本
2. **类型区分**：根据节点类型选择正确的属性
3. **兼容性**：处理文本节点和 CDATA 节点

## html vs text：关键区别

| 特性 | html() | text() |
|------|--------|--------|
| 读取 | 返回 HTML 字符串 | 返回纯文本 |
| 设置 | 解析 HTML 标签 | 转义 HTML 标签 |
| 多元素读取 | 只返回第一个 | 连接所有文本 |
| 脚本执行 | 可能执行 | 不执行 |
| 性能 | 快速路径优化 | 直接使用 textContent |

### 多元素读取的区别

```javascript
// HTML
<div>First</div>
<div>Second</div>

$('div').html();   // "First"（只返回第一个）
$('div').text();   // "FirstSecond"（连接所有）
```

**为什么设计不同？**

- `html()` 返回 HTML 结构，连接多个可能产生无效 HTML
- `text()` 返回纯文本，连接多个是合理的

## access 模式的应用

`html()` 和 `text()` 都使用 `access` 函数处理读写模式：

```javascript
return access( this, function( value ) {
    // 核心逻辑
}, null, value, arguments.length );
```

**access 的作用**：
- 无参数时进入读取模式
- 有参数时进入设置模式
- 参数是函数时，先调用函数获取值

## XSS 安全考量

### html() 的风险

```javascript
// 危险！用户输入可能包含恶意脚本
$('div').html(userInput);

// 可能执行的恶意代码
// userInput = '<img src=x onerror="alert(document.cookie)">'
```

### text() 的安全性

```javascript
// 安全！HTML 标签被转义
$('div').text(userInput);

// 输出：&lt;script&gt;...&lt;/script&gt;
```

**最佳实践**：

```javascript
// 显示用户内容时使用 text()
$('.user-name').text(user.name);

// 只有确认安全的内容才使用 html()
$('.content').html(sanitizedHtml);
```

## 性能优化

### 批量操作

```javascript
// 低效：多次 DOM 操作
items.forEach(item => {
    $('<div>').html(item.content).appendTo('#list');
});

// 高效：构建完整 HTML 后一次性设置
const html = items.map(item => 
    `<div>${item.content}</div>`
).join('');
$('#list').html(html);
```

### 避免不必要的读取

```javascript
// 低效：每次都读取 HTML
$('div').html(function(i, old) {
    return old + '!';
});

// 如果只是追加，使用 append
$('div').append('!');
```

## 特殊场景处理

### script 标签的执行

```javascript
// html() 中的脚本会被执行（通过慢速路径）
$('#container').html('<script>alert("执行了")</script>');

// 这是通过 domManip -> buildFragment 实现的
```

### 表格元素的处理

```javascript
// 快速路径会失败，因为 tr 需要特殊包装
$('tbody').html('<tr><td>Cell</td></tr>');

// 自动降级到慢速路径，使用 wrapMap 正确处理
```

### 空值处理

```javascript
$('div').html('');      // 清空内容
$('div').html(null);    // 清空内容
$('div').html(undefined); // 读取模式！

$('div').text('');      // 清空文本
$('div').text(null);    // 设置为 "null" 字符串
```

## 与原生 API 的对比

```javascript
// jQuery
$('div').html('<span>Hello</span>');
$('div').text('Hello');

// 原生 JavaScript
element.innerHTML = '<span>Hello</span>';
element.textContent = 'Hello';
```

**jQuery 的优势**：
1. 自动清理旧数据
2. 正确处理特殊元素
3. 支持函数参数
4. 链式调用
5. 集合操作

## 实际应用模式

### 模式一：内容模板渲染

```javascript
function renderUser(user) {
    const $template = $('#user-template').clone();
    $template.find('.name').text(user.name);
    $template.find('.bio').html(sanitize(user.bio));
    $template.find('.avatar').attr('src', user.avatar);
    return $template;
}
```

### 模式二：动态内容更新

```javascript
function updateNotification(count) {
    if (count > 0) {
        $('#badge').html(`<span class="count">${count}</span>`);
    } else {
        $('#badge').html('');
    }
}
```

### 模式三：文本内容处理

```javascript
// 获取所有段落的文本用于搜索
const allText = $('article p').text();
const hasKeyword = allText.includes(searchTerm);

// 截断长文本
$('.excerpt').text(function(i, text) {
    return text.length > 100 ? text.slice(0, 100) + '...' : text;
});
```

## 设计智慧总结

1. **读写合一**：同一个方法通过参数区分读取和设置
2. **性能优化**：快速路径优先，慢速路径保证正确性
3. **安全设计**：text() 自动转义，防止 XSS
4. **集合语义**：html() 读取第一个，text() 合并所有
5. **内存安全**：设置前自动清理旧数据
6. **灵活参数**：支持字符串、函数等多种输入

`html()` 和 `text()` 是 jQuery API 设计哲学的典型体现：简洁的接口背后是周密的考量。理解它们的实现细节，能帮助我们在日常开发中做出更好的选择。

至此，我们完成了 DOM 操作模块的全部探索。下一部分，我们将进入属性与样式操作——探索 `attr`、`prop`、`css` 等方法的实现原理。
