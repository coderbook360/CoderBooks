# DOM删除：remove、detach 与 empty

添加元素固然重要，但安全地移除元素同样关键。jQuery 提供了三个删除方法：`remove`、`detach` 和 `empty`。它们看起来功能相似，但设计目标截然不同。理解这些差异，才能在正确的场景选择正确的方法。

## 三种删除方法的定位

**思考一下：什么情况下需要删除 DOM 元素？**

1. **彻底删除**：元素不再需要，连同所有关联数据一起清理
2. **临时移除**：元素暂时不显示，稍后可能重新插入
3. **清空内容**：保留容器，只删除其中的子元素

这三种场景对应了 jQuery 的三个方法：

| 方法 | 用途 | 保留数据 | 保留事件 |
|------|------|----------|----------|
| `remove()` | 彻底删除 | ❌ | ❌ |
| `detach()` | 临时移除 | ✅ | ✅ |
| `empty()` | 清空子元素 | ❌ | ❌ |

## remove：彻底删除

### 基本用法

```javascript
// 删除所有段落
$('p').remove();

// 带选择器过滤：只删除特定类的段落
$('p').remove('.highlight');
```

### 源码解析

```javascript
jQuery.fn.remove = function( selector ) {
    return remove( this, selector );
};

function remove( elem, selector, keepData ) {
    var node,
        nodes = selector ? jQuery.filter( selector, elem ) : elem,
        i = 0;
    
    for ( ; ( node = nodes[ i ] ) != null; i++ ) {
        // 默认不保留数据，清理关联数据
        if ( !keepData && node.nodeType === 1 ) {
            jQuery.cleanData( getAll( node ) );
        }
        
        // 从父元素中移除
        if ( node.parentNode ) {
            if ( keepData && isAttached( node ) ) {
                setGlobalEval( getAll( node, "script" ) );
            }
            node.parentNode.removeChild( node );
        }
    }
    
    return elem;
}
```

**关键设计**：

1. **选择器过滤**：`jQuery.filter( selector, elem )` 允许只删除匹配的子集
2. **数据清理**：调用 `cleanData` 移除缓存的数据和事件
3. **脚本标记**：如果保留数据，标记脚本防止重复执行
4. **返回原集合**：支持链式调用（虽然元素已被删除）

### 为什么要清理数据？

**内存泄漏是 JavaScript 开发中的隐形杀手**。

当我们使用 jQuery 的 `data()` 或事件绑定时，jQuery 会在内部维护一个数据缓存：

```javascript
// 绑定事件
$('#element').on('click', handler);

// 存储数据
$('#element').data('key', { largeObject: [...] });
```

如果直接使用原生方法删除元素：

```javascript
// 危险！数据没有清理
document.getElementById('element').remove();
```

元素虽然从 DOM 中消失了，但 jQuery 缓存中的数据和事件处理器仍然存在，造成内存泄漏。

`remove()` 会自动清理这些关联数据，这是推荐使用 jQuery 删除方法的重要原因。

## detach：临时移除

### 基本用法

```javascript
// 暂时移除元素
const $element = $('#dialog').detach();

// 做一些操作...

// 重新插入
$('body').append($element);
// 事件和数据都还在！
```

### 源码解析

```javascript
jQuery.fn.detach = function( selector ) {
    return remove( this, selector, true );  // keepData = true
};
```

**设计精髓**：`detach` 和 `remove` 共用同一个内部函数，区别仅在于 `keepData` 参数。

### 使用场景

**场景一：DOM 批量修改优化**

```javascript
// 低效：每次修改都触发重排
$('#list li').each(function() {
    $(this).addClass('processed');
    $(this).text($(this).text().toUpperCase());
});

// 高效：脱离文档后批量修改
const $list = $('#list').detach();
$list.find('li').each(function() {
    $(this).addClass('processed');
    $(this).text($(this).text().toUpperCase());
});
$('body').append($list);
```

**场景二：元素复用**

```javascript
// 模态框显示/隐藏
const $modal = $('#modal').detach();

function showModal() {
    $('body').append($modal);
}

function hideModal() {
    $modal.detach();
    // 事件仍然有效，下次显示无需重新绑定
}
```

## empty：清空内容

### 基本用法

```javascript
// 清空容器的所有子元素
$('#container').empty();
```

### 源码解析

```javascript
jQuery.fn.empty = function() {
    var elem,
        i = 0;
    
    for ( ; ( elem = this[ i ] ) != null; i++ ) {
        if ( elem.nodeType === 1 ) {
            // 清理所有子元素的数据
            jQuery.cleanData( getAll( elem, false ) );
            
            // 移除所有子节点
            elem.textContent = "";
        }
    }
    
    return this;
};
```

**关键设计**：

1. **只处理元素节点**：`nodeType === 1`
2. **递归清理数据**：`getAll( elem, false )` 获取所有后代元素
3. **高效清空**：使用 `textContent = ""` 而非逐个删除子节点
4. **保留容器**：容器元素本身不被删除

### 为什么用 textContent 而非 innerHTML？

```javascript
// 方案一：innerHTML
elem.innerHTML = "";

// 方案二：textContent
elem.textContent = "";
```

两者都能清空内容，但 `textContent` 更安全、更快：

- **更安全**：不会触发 HTML 解析器
- **更快**：直接操作文本内容，无需处理 HTML

## 选择器过滤的妙用

`remove()` 和 `detach()` 都支持选择器参数：

```javascript
// 删除所有 li，但保留 class 为 keep 的
$('li').remove(':not(.keep)');

// 只删除带 data-temporary 属性的元素
$('.items').remove('[data-temporary]');
```

**实现原理**：

```javascript
nodes = selector ? jQuery.filter( selector, elem ) : elem;
```

如果传入选择器，先用 `jQuery.filter` 筛选出匹配的元素，只删除这些元素。

## remove vs detach：性能对比

```javascript
// 场景：需要临时移除大量元素进行操作

// 方案一：使用 remove + 重新创建
$list.remove();
// ... 操作 ...
$list = $(newHtml);  // 需要重新创建，重新绑定事件

// 方案二：使用 detach
const $list = $container.find('.items').detach();
// ... 操作 ...
$container.append($list);  // 事件和数据都保留
```

**detach 的优势**：
- 无需重新绑定事件
- 保留所有 `data()` 数据
- 减少 DOM 创建开销

**remove 的优势**：
- 彻底清理，防止内存泄漏
- 适用于确定不再需要的元素

## 实际应用模式

### 模式一：列表项动态删除

```javascript
// 带确认的删除
$('.delete-btn').on('click', function() {
    const $item = $(this).closest('.list-item');
    
    if (confirm('确定删除？')) {
        $item.fadeOut(300, function() {
            $(this).remove();  // 动画完成后彻底删除
        });
    }
});
```

### 模式二：拖拽排序

```javascript
// 拖拽时临时移除，放置时重新插入
$('.draggable').on('dragstart', function() {
    window.draggedElement = $(this).detach();
});

$('.droppable').on('drop', function() {
    $(this).append(window.draggedElement);
});
```

### 模式三：内容刷新

```javascript
// 刷新容器内容
function refreshContent($container, newHtml) {
    $container.empty();  // 清空旧内容
    $container.html(newHtml);  // 填充新内容
}
```

## getAll 辅助函数

在删除操作中，`getAll` 用于获取元素及其所有后代：

```javascript
function getAll( context, tag ) {
    var ret;
    
    if ( typeof context.getElementsByTagName !== "undefined" ) {
        ret = context.getElementsByTagName( tag || "*" );
    } else if ( typeof context.querySelectorAll !== "undefined" ) {
        ret = context.querySelectorAll( tag || "*" );
    } else {
        ret = [];
    }
    
    if ( tag === undefined || tag && nodeName( context, tag ) ) {
        return jQuery.merge( [ context ], ret );
    }
    
    return ret;
}
```

**设计考量**：
- 如果不传 `tag`，返回所有元素（用于数据清理）
- 如果传了 `tag`，只返回匹配的元素（用于脚本收集）
- 结果包含 context 本身，确保不遗漏

## 设计智慧总结

1. **职责分离**：三个方法对应三种删除场景，职责清晰
2. **代码复用**：`remove` 和 `detach` 共用内部实现，通过参数区分行为
3. **内存安全**：自动清理关联数据，防止内存泄漏
4. **性能考量**：`detach` 保留数据，避免重复初始化；`empty` 使用 `textContent` 高效清空
5. **灵活过滤**：选择器参数支持精确控制删除范围

理解这三个方法的区别和原理，能帮助我们在不同场景选择最合适的删除策略，既保证功能正确，又避免内存泄漏。

下一章，我们将深入探索 `cleanData`——jQuery 数据清理的核心机制，理解它如何安全地释放元素关联的所有资源。
