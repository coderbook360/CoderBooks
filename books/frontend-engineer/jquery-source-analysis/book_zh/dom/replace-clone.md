# DOM替换与克隆：replaceWith、replaceAll 与 clone

在 DOM 操作中，替换和克隆是两个密切相关的操作。替换需要用新内容取代旧元素，克隆则需要复制元素的全部或部分属性。jQuery 在这两个操作中展现了精妙的设计思维。

## replaceWith：用新内容替换元素

### 基本用法

```javascript
// 用新 HTML 替换
$('.old').replaceWith('<div class="new">新内容</div>');

// 用已有元素替换
$('.old').replaceWith($('.existing'));

// 用函数动态生成内容
$('.old').replaceWith(function(index) {
    return '<div>替换后的第' + index + '个</div>';
});
```

### 源码解析

```javascript
jQuery.fn.replaceWith = function( value ) {
    var ignored = [];
    
    return domManip( this, arguments, function( elem ) {
        var parent = this.parentNode;
        
        // 检查是否在忽略列表中
        if ( jQuery.inArray( this, ignored ) < 0 ) {
            // 清理旧元素的数据
            jQuery.cleanData( getAll( this ) );
            
            if ( parent ) {
                parent.replaceChild( elem, this );
            }
        }
    }, ignored );
};
```

**关键设计**：

1. **使用 domManip**：复用统一的 DOM 操作引擎
2. **数据清理**：在替换前调用 `cleanData` 清理旧元素
3. **ignored 参数**：收集被替换的元素，防止其中的脚本被执行
4. **原生 replaceChild**：使用 DOM API 完成实际替换

### ignored 的作用

**思考一下：如果被替换的元素包含 `<script>` 标签，应该执行吗？**

```html
<div class="old">
    <script>console.log('我应该被执行吗？');</script>
</div>
```

答案是**不应该**。被替换的内容正在被移除，其中的脚本不应该执行。`ignored` 数组就是用来收集这些元素，在 `buildFragment` 中跳过脚本执行。

## replaceAll：反向替换

```javascript
// replaceWith 的反向操作
$('<div class="new">新内容</div>').replaceAll('.old');
```

### 源码解析

```javascript
jQuery.fn.replaceAll = function( target ) {
    return domManip( jQuery( target ), this, function( elem ) {
        var parent = this.parentNode;
        if ( parent ) {
            jQuery.cleanData( getAll( this ) );
            parent.replaceChild( elem, this );
        }
    } );
};
```

**与 replaceWith 的对比**：

| 方法 | 操作对象 | 参数 | 语义 |
|------|----------|------|------|
| `replaceWith` | 被替换的元素 | 新内容 | "用这个替换我" |
| `replaceAll` | 新内容 | 目标元素 | "我去替换那个" |

## clone：深度克隆

### 基本用法

```javascript
// 只克隆 DOM 结构
const $clone = $('.original').clone();

// 克隆 DOM + 数据 + 事件
const $clone = $('.original').clone(true);

// 克隆 DOM + 数据 + 事件 + 子元素的数据和事件
const $clone = $('.original').clone(true, true);
```

### 参数说明

```javascript
.clone( [withDataAndEvents] [, deepWithDataAndEvents] )
```

| 参数 | 默认值 | 作用 |
|------|--------|------|
| `withDataAndEvents` | `false` | 是否复制元素的事件和数据 |
| `deepWithDataAndEvents` | 等于第一个参数 | 是否复制子元素的事件和数据 |

### 源码解析

```javascript
jQuery.fn.clone = function( dataAndEvents, deepDataAndEvents ) {
    dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
    deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;
    
    return this.map( function() {
        return jQuery.clone( this, dataAndEvents, deepDataAndEvents );
    } );
};
```

### 核心克隆函数

```javascript
jQuery.clone = function( elem, dataAndEvents, deepDataAndEvents ) {
    var i, l, srcElements, destElements,
        clone = elem.cloneNode( true ),
        inPage = isAttached( elem );
    
    // 修复克隆问题
    if ( !inPage || !isAttached( clone ) ) {
        destElements = getAll( clone );
        srcElements = getAll( elem );
        
        for ( i = 0, l = srcElements.length; i < l; i++ ) {
            fixInput( srcElements[ i ], destElements[ i ] );
        }
    }
    
    // 复制数据和事件
    if ( dataAndEvents ) {
        if ( deepDataAndEvents ) {
            srcElements = srcElements || getAll( elem );
            destElements = destElements || getAll( clone );
            
            for ( i = 0, l = srcElements.length; i < l; i++ ) {
                cloneCopyEvent( srcElements[ i ], destElements[ i ] );
            }
        } else {
            cloneCopyEvent( elem, clone );
        }
    }
    
    // 处理脚本
    destElements = getAll( clone, "script" );
    if ( destElements.length > 0 ) {
        setGlobalEval( destElements, !inPage && getAll( elem, "script" ) );
    }
    
    return clone;
};
```

**关键步骤**：

1. **原生克隆**：`elem.cloneNode( true )` 深度克隆 DOM 结构
2. **修复输入框**：处理表单元素的值同步问题
3. **复制数据/事件**：根据参数决定是否复制
4. **脚本标记**：防止克隆的脚本重复执行

## fixInput：表单元素修复

`cloneNode` 有一个已知问题：checkbox 和 radio 的选中状态不会被正确克隆。

```javascript
function fixInput( src, dest ) {
    var nodeName = dest.nodeName.toLowerCase();
    
    // 修复 checkbox 和 radio 的选中状态
    if ( nodeName === "input" && rcheckableType.test( src.type ) ) {
        dest.checked = src.checked;
    
    // 修复 textarea 的值
    } else if ( nodeName === "input" || nodeName === "textarea" ) {
        dest.defaultValue = src.defaultValue;
    }
}
```

**为什么需要修复？**

```javascript
// 创建一个选中的 checkbox
const checkbox = document.createElement('input');
checkbox.type = 'checkbox';
checkbox.checked = true;

// 克隆
const clone = checkbox.cloneNode(true);
console.log(clone.checked);  // 某些情况下可能是 false！
```

## cloneCopyEvent：复制数据和事件

```javascript
function cloneCopyEvent( src, dest ) {
    var i, l, type, pdataOld, udataOld, udataCur, events;
    
    if ( dest.nodeType !== 1 ) {
        return;
    }
    
    // 复制私有数据（事件）
    pdataOld = dataPriv.get( src );
    if ( pdataOld ) {
        events = pdataOld.events;
        
        if ( events ) {
            // 清除克隆元素上可能存在的事件
            dataPriv.remove( dest, "handle events" );
            
            // 重新绑定事件
            for ( type in events ) {
                for ( i = 0, l = events[ type ].length; i < l; i++ ) {
                    jQuery.event.add( dest, type, events[ type ][ i ] );
                }
            }
        }
    }
    
    // 复制用户数据
    udataOld = dataUser.get( src );
    if ( udataOld ) {
        udataCur = jQuery.extend( {}, udataOld );
        dataUser.set( dest, udataCur );
    }
}
```

**设计要点**：

1. **事件重新绑定**：不是简单复制引用，而是重新调用 `event.add`
2. **数据深拷贝**：使用 `extend` 创建数据的副本，避免引用共享
3. **仅处理元素节点**：文本节点等不需要处理

## 克隆脚本的处理

克隆包含脚本的元素时，需要特别注意：

```javascript
destElements = getAll( clone, "script" );
if ( destElements.length > 0 ) {
    setGlobalEval( destElements, !inPage && getAll( elem, "script" ) );
}
```

**逻辑解析**：

- 如果原元素**不在页面中**（`!inPage`），保持脚本的原始执行状态
- 如果原元素**在页面中**，脚本已经执行过，需要标记为已执行

这确保了：
1. 已执行的脚本不会重复执行
2. 未执行的脚本在插入时能正确执行

## 实际应用场景

### 场景一：模板克隆

```javascript
// 隐藏的模板
const $template = $('#item-template');

function addNewItem(data) {
    const $newItem = $template.clone();
    $newItem.find('.name').text(data.name);
    $newItem.find('.value').text(data.value);
    $('#list').append($newItem);
}
```

### 场景二：带事件的克隆

```javascript
// 原元素有复杂的事件绑定
$('.widget').on('click', handleClick)
            .on('mouseenter', handleHover);

// 克隆时保留事件
const $clonedWidget = $('.widget').clone(true, true);
// 新元素也有相同的事件处理
```

### 场景三：替换更新

```javascript
// 用新内容替换旧元素
function updateElement($old, newHtml) {
    const $new = $(newHtml);
    
    // 转移必要的数据
    $new.data('id', $old.data('id'));
    
    // 替换
    $old.replaceWith($new);
    
    return $new;
}
```

## clone vs 直接操作

**什么时候使用 clone？**

```javascript
// ❌ 直接移动：原位置消失
$('#source').appendTo('#target');

// ✅ 克隆后添加：原位置保留
$('#source').clone().appendTo('#target');
```

**domManip 的自动克隆**：

```javascript
// 多目标时自动克隆
$('.content').appendTo('.container');
// 如果有 3 个 .container，内容会被克隆 2 次
```

但 `domManip` 的克隆**不会**复制事件和数据。如果需要保留这些，必须手动 `clone(true)`。

## 性能考量

### 克隆的开销

```javascript
// 轻量克隆：只复制 DOM
$element.clone();

// 重量克隆：复制 DOM + 遍历子元素 + 复制事件 + 复制数据
$element.clone(true, true);
```

**建议**：
- 不需要事件和数据时，使用默认参数
- 大型 DOM 树的克隆要考虑性能影响
- 频繁克隆考虑使用模板字符串创建新元素

### 替换的开销

```javascript
// replaceWith 会清理旧元素的所有数据
$element.replaceWith(newContent);

// 如果旧元素有大量事件和数据，cleanData 开销较大
```

## 设计智慧总结

1. **职责统一**：replaceWith/replaceAll 都使用 domManip，复用核心逻辑
2. **安全清理**：替换时自动清理旧元素数据，防止内存泄漏
3. **灵活克隆**：通过参数控制克隆深度，满足不同场景
4. **细节修复**：fixInput 处理浏览器克隆的边界问题
5. **脚本安全**：正确标记脚本执行状态，防止重复执行

替换和克隆看似简单，但 jQuery 的实现考虑了众多边界情况：表单状态同步、事件复制、数据传递、脚本执行控制等。理解这些细节，能帮助我们在复杂场景中做出正确的技术选择。

下一章，我们将探索 wrap 系列方法——如何用新元素包裹已有内容，这是 DOM 结构调整的另一个重要操作。
