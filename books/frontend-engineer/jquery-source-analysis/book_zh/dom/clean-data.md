# cleanData：内存清理机制

上一章我们看到，无论是 `remove` 还是 `empty`，都会调用 `cleanData` 来清理元素的关联数据。这个函数是 jQuery 内存管理的核心，它确保当元素被删除时，所有关联的事件处理器、缓存数据和队列都被正确释放。

## 为什么需要 cleanData？

**思考一下：当你删除一个 DOM 元素时，JavaScript 的垃圾回收器会自动清理所有相关内存吗？**

答案是**不一定**。

### 内存泄漏的典型场景

```javascript
// 场景一：事件处理器引用
const handler = function() {
    console.log(this.id);
};
$('#element').on('click', handler);

// 如果直接删除元素
document.getElementById('element').remove();
// handler 和事件绑定仍然存在于 jQuery 内部

// 场景二：数据缓存引用
$('#element').data('config', { 
    callback: function() { /* 闭包引用大量数据 */ },
    cache: largeDataObject 
});

// 直接删除元素后，数据缓存不会被清理
document.getElementById('element').remove();
// jQuery.cache 中仍然保留着这些数据
```

`cleanData` 的使命就是**在元素删除时，彻底清理所有这些关联数据**。

## cleanData 源码解析

```javascript
jQuery.cleanData = function( elems ) {
    var data, elem, type,
        special = jQuery.event.special,
        i = 0;
    
    for ( ; ( elem = elems[ i ] ) !== undefined; i++ ) {
        // 检查元素是否允许数据操作
        if ( acceptData( elem ) ) {
            data = elem[ dataPriv.expando ];
            
            if ( data ) {
                // 清理事件
                if ( data.events ) {
                    for ( type in data.events ) {
                        if ( special[ type ] ) {
                            jQuery.event.remove( elem, type );
                        } else {
                            jQuery.removeEvent( elem, type, data.handle );
                        }
                    }
                }
                
                // 删除缓存数据
                delete elem[ dataPriv.expando ];
            }
            
            // 删除用户数据
            if ( elem[ dataUser.expando ] ) {
                delete elem[ dataUser.expando ];
            }
        }
    }
};
```

## 核心流程解析

### 第一步：acceptData 检查

```javascript
function acceptData( owner ) {
    // 只有元素节点(1)和文档节点(9)可以存储数据
    // 文本节点、注释节点等不能存储数据
    return owner.nodeType === 1 || owner.nodeType === 9 ||
        !( +owner.nodeType );
}
```

**为什么需要检查？**

只有特定类型的节点才能关联数据。文本节点、注释节点等没有数据缓存，跳过检查可以避免不必要的操作。

### 第二步：获取私有数据

```javascript
data = elem[ dataPriv.expando ];
```

`dataPriv.expando` 是一个唯一的属性名，用于存储元素的私有数据（主要是事件相关）。

```javascript
// expando 的生成方式
expando: "jQuery" + ( version + Math.random() ).replace( /\D/g, "" )
// 例如: "jQuery370123456789"
```

### 第三步：清理事件

```javascript
if ( data.events ) {
    for ( type in data.events ) {
        if ( special[ type ] ) {
            jQuery.event.remove( elem, type );
        } else {
            jQuery.removeEvent( elem, type, data.handle );
        }
    }
}
```

**两种清理方式**：

1. **特殊事件**：使用 `jQuery.event.remove`，触发完整的事件清理流程
2. **普通事件**：直接使用 `removeEvent` 移除监听器

### 第四步：删除缓存对象

```javascript
// 删除私有数据（事件、队列等）
delete elem[ dataPriv.expando ];

// 删除用户数据（通过 .data() 存储的）
if ( elem[ dataUser.expando ] ) {
    delete elem[ dataUser.expando ];
}
```

**两种数据缓存**：

| 缓存类型 | 用途 | 访问方式 |
|----------|------|----------|
| `dataPriv` | jQuery 内部使用（事件、动画队列等） | 内部 API |
| `dataUser` | 用户数据 | `.data()` 方法 |

## special 事件的特殊处理

某些事件类型有特殊的清理需求：

```javascript
jQuery.event.special = {
    // 例如：focus/blur 事件使用事件代理
    focus: {
        trigger: function() { /* ... */ },
        _default: function() { /* ... */ },
        delegateType: "focusin"
    },
    blur: {
        trigger: function() { /* ... */ },
        delegateType: "focusout"
    }
    // ... 其他特殊事件
};
```

对于这些事件，简单的 `removeEventListener` 不够，需要调用 `jQuery.event.remove` 来正确处理代理和命名空间。

## removeEvent 的实现

```javascript
jQuery.removeEvent = function( elem, type, handle ) {
    if ( elem.removeEventListener ) {
        elem.removeEventListener( type, handle );
    }
};
```

**简洁设计**：直接调用原生 `removeEventListener`，不做额外处理。

## 数据存储机制回顾

要理解 `cleanData`，需要了解 jQuery 的数据存储机制：

```javascript
// 用户通过 .data() 存储数据
$('#element').data('name', 'value');

// 内部实现
function Data() {
    this.expando = jQuery.expando + Data.uid++;
}

Data.prototype = {
    set: function( owner, key, value ) {
        var cache = owner[ this.expando ];
        
        if ( !cache ) {
            cache = {};
            // 如果可以设置属性，将缓存对象挂载到元素上
            if ( acceptData( owner ) ) {
                owner[ this.expando ] = cache;
            }
        }
        
        cache[ key ] = value;
        return cache;
    },
    
    get: function( owner, key ) {
        var cache = owner[ this.expando ];
        return key === undefined ? cache : cache && cache[ key ];
    },
    
    remove: function( owner, key ) {
        var cache = owner[ this.expando ];
        if ( cache ) {
            delete cache[ key ];
        }
    }
};

// 创建两个实例
var dataPriv = new Data();  // jQuery 内部使用
var dataUser = new Data();  // 用户数据
```

**关键设计**：
- 数据直接存储在 DOM 元素上，以 expando 为属性名
- 避免了全局缓存对象，简化了清理逻辑
- `delete elem[expando]` 即可完成清理

## 批量清理的优化

`cleanData` 接收元素数组，支持批量清理：

```javascript
// empty() 调用时清理所有后代
jQuery.cleanData( getAll( elem, false ) );

// remove() 调用时清理元素及其后代
jQuery.cleanData( getAll( node ) );
```

**getAll 返回的是什么？**

```javascript
function getAll( context, tag ) {
    var ret = context.getElementsByTagName( tag || "*" );
    
    // 如果需要包含 context 本身
    if ( tag === undefined || tag && nodeName( context, tag ) ) {
        return jQuery.merge( [ context ], ret );
    }
    
    return ret;
}
```

返回元素及其所有后代，确保不遗漏任何需要清理的元素。

## 循环引用问题

**旧版本 IE 的历史问题**：

在 IE6-8 中，DOM 元素和 JavaScript 对象之间的循环引用会导致内存泄漏：

```javascript
// 循环引用示例
element.onclick = function() {
    // 闭包引用了 element
    console.log(element);
};
// element → handler → 闭包 → element（循环！）
```

早期 jQuery 通过外部缓存对象（`jQuery.cache`）避免直接在元素上存储对象引用。

**现代浏览器已解决**：Chrome 等现代浏览器的垃圾回收器能正确处理循环引用，所以现代 jQuery 直接将数据存储在元素上。

## cleanData 的调用时机

### 1. remove() 和 empty()

```javascript
// remove 调用
if ( !keepData && node.nodeType === 1 ) {
    jQuery.cleanData( getAll( node ) );
}

// empty 调用
jQuery.cleanData( getAll( elem, false ) );
```

### 2. html() 替换内容时

```javascript
jQuery.fn.html = function( value ) {
    // ...
    if ( elem ) {
        jQuery.cleanData( getAll( elem, false ) );
        elem.innerHTML = value;
    }
    // ...
};
```

### 3. replaceWith() 替换元素时

```javascript
jQuery.fn.replaceWith = function( value ) {
    // ...
    jQuery.cleanData( getAll( this ) );
    // ...
};
```

## 手动清理数据

虽然 jQuery 会自动清理，但有时需要手动清理：

```javascript
// 移除特定数据
$('#element').removeData('key');

// 移除所有用户数据
$('#element').removeData();

// 移除所有事件
$('#element').off();
```

**removeData 源码**：

```javascript
jQuery.fn.removeData = function( key ) {
    return this.each( function() {
        dataUser.remove( this, key );
    } );
};
```

## 调试内存泄漏

当怀疑有内存泄漏时，可以检查元素的数据缓存：

```javascript
// 检查私有数据（事件等）
const privateData = element[ jQuery.expando ];
console.log('Private data:', privateData);

// 检查用户数据
const userData = $(element).data();
console.log('User data:', userData);
```

## 性能考量

`cleanData` 的性能对删除操作至关重要：

**1. 批量处理**

一次性获取所有需要清理的元素，然后遍历处理，减少 DOM 查询次数。

**2. 简单类型检查**

使用 `acceptData` 快速跳过不需要处理的节点。

**3. 直接 delete**

使用 `delete elem[expando]` 直接删除属性，无需额外的清理逻辑。

## 设计智慧总结

1. **集中式清理**：所有清理逻辑集中在一个函数中，便于维护和调试
2. **完整性保证**：同时清理私有数据和用户数据，不遗漏
3. **事件特殊处理**：区分普通事件和特殊事件，确保正确清理
4. **批量优化**：支持元素数组，一次调用清理多个元素
5. **现代化设计**：利用现代浏览器特性，将数据直接存储在元素上

`cleanData` 是 jQuery 内存管理的守门人。它确保每个被删除的元素都能干净地离开，不留下任何内存垃圾。理解它的工作原理，能帮助我们在开发中避免内存泄漏，写出更健壮的代码。

下一章，我们将探索 DOM 替换与克隆操作——`replaceWith`、`replaceAll` 和 `clone`，看看 jQuery 如何在保持数据完整性的同时完成复杂的 DOM 变换。
