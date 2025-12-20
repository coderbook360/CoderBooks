# domManip：DOM操作的统一引擎

上一章我们探索了 jQuery 的各种 DOM 插入方法。细心的你可能已经注意到，无论是 `append`、`prepend` 还是 `before`、`after`，它们最终都调用了同一个核心函数——`domManip`。这个函数是 jQuery DOM 操作的统一引擎，理解它的设计，就能理解 jQuery 如何优雅地处理各种复杂的插入场景。

## 为什么需要 domManip？

**思考一下：如果你来设计 jQuery 的插入方法，会面临哪些挑战？**

1. **参数多样性**：用户可能传入字符串、DOM 元素、jQuery 对象，甚至函数
2. **多目标处理**：当有多个目标元素时，需要正确克隆内容
3. **脚本执行**：HTML 中可能包含 `<script>` 标签，需要正确执行
4. **文档片段优化**：批量插入需要使用 DocumentFragment 提升性能
5. **跨文档处理**：目标可能在 iframe 或其他文档中

如果每个插入方法都自己处理这些逻辑，代码会极度冗余。`domManip` 的设计目标就是**统一处理这些复杂场景，让具体的插入方法只需关注"往哪里插"这一件事**。

## domManip 的函数签名

```javascript
function domManip( collection, args, callback, ignored ) {
    // collection: 目标 jQuery 集合
    // args: 要插入的内容（原始参数）
    // callback: 具体的插入操作（如 appendChild、insertBefore）
    // ignored: 收集被忽略的脚本元素
}
```

这个签名体现了**策略模式**：`domManip` 负责准备工作，`callback` 负责具体插入。不同的插入方法通过传入不同的 `callback` 来实现各自的功能。

## 核心源码解析

让我们逐步拆解 `domManip` 的实现：

### 第一步：参数预处理

```javascript
function domManip( collection, args, callback, ignored ) {
    args = flat( args );
    
    var fragment, first, scripts, hasScripts, node, doc,
        i = 0,
        l = collection.length,
        iNoClone = l - 1,
        value = args[ 0 ],
        valueIsFunction = isFunction( value );
```

**关键设计**：
- `flat( args )` 将嵌套数组展平，确保参数统一
- `iNoClone = l - 1` 记录最后一个目标的索引，用于判断是否需要克隆

### 第二步：处理函数参数

```javascript
    // 如果第一个参数是函数，需要对每个目标单独调用
    if ( valueIsFunction ) {
        return collection.each( function( i ) {
            var self = collection.eq( i );
            args[ 0 ] = value.call( this, i, self.html() );
            domManip( self, args, callback, ignored );
        } );
    }
```

**为什么需要递归调用？**

当参数是函数时，每个目标元素需要获得独立的内容。例如：

```javascript
$('div').append(function(index, html) {
    return '<span>第' + index + '个</span>';
});
```

每个 `div` 应该得到不同的内容，所以需要逐个处理后再递归调用 `domManip`。

### 第三步：构建文档片段

```javascript
    if ( l ) {
        fragment = buildFragment( args, collection[ 0 ].ownerDocument, false, collection, ignored );
        first = fragment.firstChild;
        
        if ( fragment.childNodes.length === 1 ) {
            fragment = first;
        }
```

**核心优化点**：
- 使用 `buildFragment` 将所有内容统一转换为 DocumentFragment
- 如果只有一个子节点，直接使用该节点，避免额外的片段包装
- `ownerDocument` 确保在正确的文档中创建节点

### 第四步：脚本处理准备

```javascript
        if ( first ) {
            scripts = jQuery.map( getAll( fragment, "script" ), disableScript );
            hasScripts = scripts.length;
```

**disableScript 的巧妙设计**：

```javascript
function disableScript( elem ) {
    elem.type = ( elem.getAttribute( "type" ) !== null ) + "/" + elem.type;
    return elem;
}
```

通过修改 `type` 属性临时禁用脚本，防止在克隆或移动过程中意外执行。例如，`type="text/javascript"` 变成 `type="true/text/javascript"`，浏览器不会将其识别为可执行脚本。

### 第五步：遍历目标并插入

```javascript
            for ( ; i < l; i++ ) {
                node = fragment;
                
                if ( i !== iNoClone ) {
                    node = jQuery.clone( node, true, true );
                    
                    // 保持对克隆脚本的引用
                    if ( hasScripts ) {
                        jQuery.merge( scripts, getAll( node, "script" ) );
                    }
                }
                
                callback.call( collection[ i ], node, i );
            }
```

**克隆策略的精妙之处**：

- 只有非最后一个目标才需要克隆
- 最后一个目标直接使用原始片段，避免不必要的克隆
- 克隆时同步收集脚本引用，确保所有脚本都能被执行

### 第六步：脚本执行

```javascript
            if ( hasScripts ) {
                doc = scripts[ scripts.length - 1 ].ownerDocument;
                
                // 恢复脚本类型
                jQuery.map( scripts, restoreScript );
                
                for ( i = 0; i < hasScripts; i++ ) {
                    node = scripts[ i ];
                    if ( rscriptType.test( node.type || "" ) &&
                        !dataPriv.access( node, "globalEval" ) &&
                        jQuery.contains( doc, node ) ) {
                        
                        if ( node.src && ( node.type || "" ).indexOf( "module" ) < 0 ) {
                            // 外部脚本：动态加载
                            jQuery._evalUrl( node.src, { ... } );
                        } else {
                            // 内联脚本：直接执行
                            DOMEval( node.textContent.replace( rcleanScript, "" ), node, doc );
                        }
                    }
                }
            }
        }
    }
    
    return collection;
}
```

**脚本执行的关键判断**：

1. **类型检测**：`rscriptType.test( node.type || "" )` 确保只执行 JavaScript 脚本
2. **去重机制**：`!dataPriv.access( node, "globalEval" )` 防止脚本被重复执行
3. **存在性验证**：`jQuery.contains( doc, node )` 确保脚本仍在文档中
4. **外部/内联区分**：外部脚本使用 `_evalUrl`，内联脚本使用 `DOMEval`

## 策略模式的应用

`domManip` 的设计是策略模式的典型应用。让我们看看不同插入方法如何使用它：

```javascript
// append：添加到末尾
jQuery.fn.append = function() {
    return domManip( this, arguments, function( elem ) {
        if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
            var target = manipulationTarget( this, elem );
            target.appendChild( elem );
        }
    } );
};

// prepend：添加到开头
jQuery.fn.prepend = function() {
    return domManip( this, arguments, function( elem ) {
        if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
            var target = manipulationTarget( this, elem );
            target.insertBefore( elem, target.firstChild );
        }
    } );
};

// before：添加到元素之前
jQuery.fn.before = function() {
    return domManip( this, arguments, function( elem ) {
        if ( this.parentNode ) {
            this.parentNode.insertBefore( elem, this );
        }
    } );
};

// after：添加到元素之后
jQuery.fn.after = function() {
    return domManip( this, arguments, function( elem ) {
        if ( this.parentNode ) {
            this.parentNode.insertBefore( elem, this.nextSibling );
        }
    } );
};
```

**统一与差异**：
- **统一**：参数处理、片段构建、克隆逻辑、脚本执行
- **差异**：仅 `callback` 中的具体插入位置不同

这种设计使得：
1. 代码复用最大化
2. 新增插入方法变得极其简单
3. Bug 修复和优化集中在一处

## ignored 参数的用途

`ignored` 参数用于收集那些不应该执行的脚本元素：

```javascript
jQuery.fn.replaceWith = function( value ) {
    var ignored = [];
    
    return domManip( this, arguments, function( elem ) {
        var parent = this.parentNode;
        
        if ( jQuery.inArray( this, ignored ) < 0 ) {
            jQuery.cleanData( getAll( this ) );
            if ( parent ) {
                parent.replaceChild( elem, this );
            }
        }
    }, ignored );
};
```

在 `replaceWith` 等场景中，被替换的元素中的脚本不应该被执行，`ignored` 数组就是用来收集这些元素的。

## 性能考量

`domManip` 包含多项性能优化：

**1. 文档片段批量处理**

```javascript
fragment = buildFragment( args, collection[ 0 ].ownerDocument, false, collection, ignored );
```

所有内容首先合并到一个 DocumentFragment 中，减少 DOM 操作次数。

**2. 智能克隆策略**

```javascript
if ( i !== iNoClone ) {
    node = jQuery.clone( node, true, true );
}
```

只在必要时克隆，最后一个目标直接使用原始内容。

**3. 脚本缓存标记**

```javascript
!dataPriv.access( node, "globalEval" )
```

通过数据缓存防止脚本重复执行。

## 流程总结

```
domManip 执行流程：

1. 参数展平 flat(args)
           ↓
2. 函数参数？ ──是──→ 递归处理每个目标
           ↓ 否
3. 构建 DocumentFragment
           ↓
4. 收集并禁用脚本
           ↓
5. 遍历目标集合
    ├── 非最后一个 → 克隆片段
    └── 最后一个 → 使用原始片段
           ↓
6. 调用 callback 执行插入
           ↓
7. 恢复并执行脚本
           ↓
8. 返回原集合（支持链式调用）
```

## 设计智慧总结

1. **统一抽象**：将复杂的 DOM 操作归纳为"准备内容 + 执行插入"两个阶段
2. **策略模式**：通过 callback 参数实现灵活的插入行为
3. **性能优先**：DocumentFragment、智能克隆、脚本去重
4. **边界处理**：函数参数、多目标、跨文档等场景完整覆盖
5. **安全执行**：脚本的禁用-克隆-恢复-执行流程确保正确性

`domManip` 是 jQuery 源码中设计最精妙的函数之一。它用约 100 行代码解决了 DOM 操作中的所有复杂场景，是理解 jQuery 内部机制的关键入口。

下一章，我们将深入探索 `buildFragment`——`domManip` 所依赖的文档片段构建器，看看 jQuery 是如何高效地将字符串转换为 DOM 节点的。
