# buildFragment：文档片段构建器

上一章我们了解了 `domManip` 如何统一处理 DOM 插入操作，其中最关键的一步就是调用 `buildFragment` 将各种格式的输入转换为 DocumentFragment。这个函数是 jQuery DOM 操作的基石，它解决了一个核心问题：**如何高效、安全地将字符串转换为可操作的 DOM 节点？**

## 为什么需要 buildFragment？

**思考一下：将 HTML 字符串转换为 DOM 节点，有哪些方案？**

**方案一：innerHTML**
```javascript
const div = document.createElement('div');
div.innerHTML = '<span>Hello</span>';
const span = div.firstChild;
```

**问题**：需要创建临时容器，某些元素（如 `<tr>`）不能直接作为 `<div>` 的子元素。

**方案二：insertAdjacentHTML**
```javascript
element.insertAdjacentHTML('beforeend', '<span>Hello</span>');
```

**问题**：必须有现有元素，无法创建独立的节点。

**方案三：DOMParser**
```javascript
const parser = new DOMParser();
const doc = parser.parseFromString('<span>Hello</span>', 'text/html');
```

**问题**：解析整个文档开销较大，返回的是 Document 对象。

`buildFragment` 的设计目标是**统一处理所有输入类型，使用最合适的方式创建 DOM 节点，并通过 DocumentFragment 优化批量操作**。

## 函数签名与参数

```javascript
function buildFragment( elems, context, scripts, selection, ignored ) {
    // elems: 要转换的内容数组
    // context: 目标文档（确保在正确的文档中创建节点）
    // scripts: 是否收集脚本元素
    // selection: 原始目标集合（用于判断是否忽略某些脚本）
    // ignored: 被忽略元素的收集数组
}
```

## 核心源码解析

### 第一步：初始化

```javascript
function buildFragment( elems, context, scripts, selection, ignored ) {
    var elem, tmp, tag, wrap, attached, j,
        fragment = context.createDocumentFragment(),
        nodes = [],
        i = 0,
        l = elems.length;
```

**关键点**：
- 使用 `context.createDocumentFragment()` 而非全局 `document`
- 这确保了在 iframe 等跨文档场景下正确创建节点

### 第二步：遍历处理每个元素

```javascript
    for ( ; i < l; i++ ) {
        elem = elems[ i ];
        
        if ( elem || elem === 0 ) {
            // 处理不同类型的输入
        }
    }
```

### 第三步：类型判断与转换

```javascript
            // 如果已经是 DOM 节点，直接添加
            if ( toType( elem ) === "object" ) {
                jQuery.merge( nodes, elem.nodeType ? [ elem ] : elem );
            
            // 如果不包含 HTML 标签，创建文本节点
            } else if ( !rhtml.test( elem ) ) {
                nodes.push( context.createTextNode( elem ) );
            
            // HTML 字符串，需要解析
            } else {
                // 复杂的 HTML 解析逻辑
            }
```

**三种情况的处理**：

1. **DOM 节点/jQuery 对象**：直接合并到 `nodes` 数组
2. **纯文本**：使用 `createTextNode` 创建文本节点
3. **HTML 字符串**：需要特殊处理

### 第四步：HTML 字符串解析

这是 `buildFragment` 最复杂的部分：

```javascript
            } else {
                tmp = tmp || fragment.appendChild( context.createElement( "div" ) );
                
                // 获取标签名，处理特殊元素的包装需求
                tag = ( rtagName.exec( elem ) || [ "", "" ] )[ 1 ].toLowerCase();
                wrap = wrapMap[ tag ] || wrapMap._default;
                
                tmp.innerHTML = wrap[ 1 ] + jQuery.htmlPrefilter( elem ) + wrap[ 2 ];
                
                // 解开包装层
                j = wrap[ 0 ];
                while ( j-- ) {
                    tmp = tmp.lastChild;
                }
                
                // 合并生成的节点
                jQuery.merge( nodes, tmp.childNodes );
                
                // 重置临时容器
                tmp = fragment.firstChild;
                tmp.textContent = "";
            }
```

**wrapMap 的作用**：

某些 HTML 元素不能直接作为 `<div>` 的子元素，需要正确的父元素包装：

```javascript
var wrapMap = {
    // 表格相关元素需要正确的父级结构
    thead: [ 1, "<table>", "</table>" ],
    col: [ 2, "<table><colgroup>", "</colgroup></table>" ],
    tr: [ 2, "<table><tbody>", "</tbody></table>" ],
    td: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],
    
    _default: [ 0, "", "" ]
};

wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
wrapMap.th = wrapMap.td;
```

**为什么需要包装？**

```javascript
// 错误：直接设置会失败或产生意外结果
div.innerHTML = '<tr><td>Cell</td></tr>';

// 正确：需要完整的表格结构
div.innerHTML = '<table><tbody><tr><td>Cell</td></tr></tbody></table>';
// 然后提取出 <tr> 元素
```

### 第五步：htmlPrefilter 预处理

```javascript
jQuery.htmlPrefilter = function( html ) {
    return html;
};
```

**设计意图**：

这是一个扩展点，允许在解析 HTML 前进行预处理。虽然默认实现是空的，但可以用于：
- 安全过滤（移除危险标签）
- 格式转换
- 兼容性处理

### 第六步：组装文档片段

```javascript
    // 清空 fragment（移除临时 div）
    tmp = fragment.firstChild;
    if ( tmp ) {
        tmp.textContent = "";
    }
    fragment.textContent = "";
    
    // 将所有节点添加到 fragment
    i = 0;
    while ( ( elem = nodes[ i++ ] ) ) {
        // 跳过被忽略的元素
        if ( selection && jQuery.inArray( elem, selection ) > -1 ) {
            if ( ignored ) {
                ignored.push( elem );
            }
            continue;
        }
        
        attached = isAttached( elem );
        
        // 添加到 fragment
        tmp = getAll( fragment.appendChild( elem ), "script" );
        
        // 保持脚本的执行历史
        if ( attached ) {
            setGlobalEval( tmp );
        }
        
        // 收集脚本元素
        if ( scripts ) {
            j = 0;
            while ( ( elem = tmp[ j++ ] ) ) {
                if ( rscriptType.test( elem.type || "" ) ) {
                    scripts.push( elem );
                }
            }
        }
    }
    
    return fragment;
}
```

## 脚本处理的细节

### isAttached 检测

```javascript
function isAttached( elem ) {
    return jQuery.contains( elem.ownerDocument, elem );
}
```

**为什么需要检测？**

如果元素已经在文档中，它的脚本可能已经执行过。需要标记这些脚本，避免重复执行。

### setGlobalEval 标记

```javascript
function setGlobalEval( elems, refElements ) {
    var i = 0,
        l = elems.length;
    
    for ( ; i < l; i++ ) {
        dataPriv.set(
            elems[ i ],
            "globalEval",
            !refElements || dataPriv.get( refElements[ i ], "globalEval" )
        );
    }
}
```

通过数据缓存标记脚本，确保在 `domManip` 中不会重复执行已执行过的脚本。

## 完整流程图

```
buildFragment 执行流程：

输入：elems 数组（混合类型）
           ↓
┌──────────────────────────────────────┐
│ 遍历每个元素，判断类型               │
├──────────────────────────────────────┤
│ DOM节点？  → 直接添加到 nodes        │
│ 纯文本？   → createTextNode          │
│ HTML字符串？→ 解析处理               │
└──────────────────────────────────────┘
           ↓
      HTML 解析流程
           ↓
┌──────────────────────────────────────┐
│ 1. 提取标签名                        │
│ 2. 查找 wrapMap 获取包装结构         │
│ 3. 拼接：包装头 + HTML + 包装尾      │
│ 4. 设置 innerHTML                    │
│ 5. 解开包装层，提取目标节点          │
└──────────────────────────────────────┘
           ↓
      组装 fragment
           ↓
┌──────────────────────────────────────┐
│ 1. 跳过 ignored 中的元素             │
│ 2. 检测元素是否已 attached           │
│ 3. 添加到 fragment                   │
│ 4. 收集 script 元素                  │
│ 5. 标记已执行脚本                    │
└──────────────────────────────────────┘
           ↓
输出：DocumentFragment
```

## 性能优化策略

### 1. DocumentFragment 批量操作

```javascript
fragment = context.createDocumentFragment();
// ... 添加多个节点 ...
targetElement.appendChild( fragment );
```

一次 DOM 操作插入所有节点，而不是逐个插入。

### 2. 临时容器复用

```javascript
tmp = tmp || fragment.appendChild( context.createElement( "div" ) );
```

使用 `||` 实现惰性创建，避免不必要的元素创建。

### 3. 智能类型判断

```javascript
if ( toType( elem ) === "object" ) {
    // 已经是节点，跳过解析
} else if ( !rhtml.test( elem ) ) {
    // 纯文本，直接创建文本节点
} else {
    // 只有真正的 HTML 才需要解析
}
```

根据内容类型选择最轻量的处理方式。

## rhtml 正则详解

```javascript
var rhtml = /<|&#?\w+;/;
```

这个正则用于判断字符串是否包含 HTML：

- `<` - HTML 标签的开始
- `&#?\w+;` - HTML 实体（如 `&nbsp;`、`&#39;`）

**为什么要检测实体？**

```javascript
$('<div>&nbsp;</div>')  // 包含实体，需要 HTML 解析
$('Hello World')        // 纯文本，直接创建文本节点
```

## rtagName 标签提取

```javascript
var rtagName = /<([a-z][^\/\0>\x20\t\r\n\f]*)/i;
```

从 HTML 字符串中提取第一个标签名：

```javascript
'<div class="foo">content</div>'.match(rtagName)
// ["<div", "div"]

'<tr><td>cell</td></tr>'.match(rtagName)
// ["<tr", "tr"]
```

## 安全考量

### XSS 防护点

`buildFragment` 本身不做 XSS 过滤，但提供了 `htmlPrefilter` 扩展点：

```javascript
// 自定义安全过滤（示例）
jQuery.htmlPrefilter = function( html ) {
    // 移除 script 标签
    return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
};
```

**重要提示**：在生产环境中，应该在服务端或使用专门的 XSS 过滤库处理用户输入。

## 设计智慧总结

1. **统一抽象**：无论输入是什么类型，输出都是标准的 DocumentFragment
2. **最小开销原则**：根据输入类型选择最轻量的处理方式
3. **正确性保证**：wrapMap 确保特殊元素正确解析
4. **脚本安全**：完整的脚本跟踪和去重机制
5. **扩展性设计**：htmlPrefilter 提供预处理扩展点
6. **跨文档支持**：通过 context 参数支持 iframe 等场景

`buildFragment` 是 jQuery DOM 操作的核心基础设施。它将混乱的输入（字符串、节点、数组）转换为整齐的 DocumentFragment，为上层的 `domManip` 提供了可靠的支撑。

下一章，我们将探索 DOM 删除操作——`remove`、`detach` 和 `empty`，看看 jQuery 如何安全高效地从文档中移除元素。
