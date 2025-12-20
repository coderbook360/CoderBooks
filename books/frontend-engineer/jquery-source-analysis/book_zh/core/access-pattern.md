# access通用访问器模式

jQuery中很多方法都有一个特点：既能读取值，也能设置值。

```javascript
// 读取
$('#box').css('color');        // 返回颜色值
$('#box').attr('id');          // 返回'box'
$('#box').html();              // 返回innerHTML

// 设置
$('#box').css('color', 'red'); // 设置颜色
$('#box').attr('id', 'newId'); // 设置id
$('#box').html('<p>Hello</p>'); // 设置innerHTML
```

同一个方法，根据参数不同执行不同操作。如果每个方法都独立实现这种逻辑，会有大量重复代码。

jQuery用 `access` 函数解决了这个问题。

## 问题：重复的get/set逻辑

假设没有 access，每个方法可能长这样：

```javascript
jQuery.fn.css = function( name, value ) {
    // 读取模式
    if ( value === undefined ) {
        return getComputedStyle( this[0] )[ name ];
    }
    
    // 设置模式
    for ( var i = 0; i < this.length; i++ ) {
        this[i].style[ name ] = value;
    }
    return this;
};

jQuery.fn.attr = function( name, value ) {
    // 读取模式
    if ( value === undefined ) {
        return this[0].getAttribute( name );
    }
    
    // 设置模式
    for ( var i = 0; i < this.length; i++ ) {
        this[i].setAttribute( name, value );
    }
    return this;
};

jQuery.fn.prop = function( name, value ) {
    // 读取模式
    if ( value === undefined ) {
        return this[0][ name ];
    }
    
    // 设置模式
    for ( var i = 0; i < this.length; i++ ) {
        this[i][ name ] = value;
    }
    return this;
};
```

看到问题了吗？

每个方法都有相同的结构：
1. 判断是读取还是设置
2. 读取时返回第一个元素的值
3. 设置时遍历所有元素
4. 设置后返回 `this`

这就是 access 要解决的重复。

## access的设计

access 是一个高阶函数，它封装了 get/set 的通用逻辑：

```javascript
var access = function( elems, fn, key, value, chainable, emptyGet, raw ) {
    var i = 0,
        len = elems.length,
        bulk = key == null;

    // 批量设置：key是对象
    if ( jQuery.type( key ) === "object" ) {
        chainable = true;
        for ( i in key ) {
            access( elems, fn, i, key[ i ], true, emptyGet, raw );
        }

    // 单个设置
    } else if ( value !== undefined ) {
        chainable = true;

        if ( typeof value !== "function" ) {
            raw = true;
        }

        // 无key的批量操作（如html()）
        if ( bulk ) {
            if ( raw ) {
                fn.call( elems, value );
                fn = null;
            } else {
                bulk = fn;
                fn = function( elem, _key, value ) {
                    return bulk.call( jQuery( elem ), value );
                };
            }
        }

        // 遍历设置
        if ( fn ) {
            for ( ; i < len; i++ ) {
                fn( elems[ i ], key, raw ?
                    value :
                    value.call( elems[ i ], i, fn( elems[ i ], key ) )
                );
            }
        }
    }

    // 返回值：链式调用或读取值
    if ( chainable ) {
        return elems;  // setter模式返回jQuery对象
    }

    // getter模式
    if ( bulk ) {
        return fn.call( elems );
    }

    return len ? fn( elems[ 0 ], key ) : emptyGet;
};
```

看起来复杂，我们拆解来看。

## 参数解析

access 的参数：

```javascript
access( elems, fn, key, value, chainable, emptyGet, raw )
```

| 参数 | 含义 | 示例 |
|------|------|------|
| elems | jQuery对象 | $('div') |
| fn | 实际操作函数 | getCss, setCss |
| key | 属性名 | 'color' |
| value | 属性值 | 'red' |
| chainable | 是否链式调用 | true/false |
| emptyGet | 空集合返回值 | undefined |
| raw | value是否原始值 | true/false |

**chainable** 参数决定返回值：
- `true`：setter模式，返回jQuery对象（支持链式调用）
- `false`：getter模式，返回读取的值

## 核心逻辑

**判断get还是set**

```javascript
if ( value !== undefined ) {
    chainable = true;  // 有value就是setter
}
```

**批量设置（对象形式）**

```javascript
// $('div').css({ color: 'red', fontSize: '14px' })
if ( jQuery.type( key ) === "object" ) {
    chainable = true;
    for ( i in key ) {
        access( elems, fn, i, key[ i ], true, emptyGet, raw );
    }
}
```

当 key 是对象时，递归调用 access 处理每个属性。

**setter遍历**

```javascript
if ( fn ) {
    for ( ; i < len; i++ ) {
        fn( elems[ i ], key, raw ?
            value :
            value.call( elems[ i ], i, fn( elems[ i ], key ) )
        );
    }
}
```

遍历所有元素，对每个元素调用 fn。

如果 value 是函数，先调用 value 获取真正的值。这支持了回调形式的设置：

```javascript
$('div').css('width', function( index, currentValue ) {
    return parseInt( currentValue ) + 10 + 'px';
});
```

**getter返回**

```javascript
return len ? fn( elems[ 0 ], key ) : emptyGet;
```

读取时只返回第一个元素的值。如果是空集合，返回 emptyGet。

## 使用access的方法

看看 jQuery 如何使用 access：

**css()**

```javascript
jQuery.fn.css = function( name, value ) {
    return access( this, function( elem, name, value ) {
        var styles, len,
            map = {};

        // getter
        if ( value === undefined ) {
            return getComputedStyle( elem )[ name ];
        }

        // setter
        elem.style[ name ] = value;

    }, name, value, arguments.length > 1 );
};
```

access 接收一个 fn 参数，这个 fn 只需要处理单个元素的 get/set，access 负责遍历和返回值处理。

**attr()**

```javascript
jQuery.fn.attr = function( name, value ) {
    return access( this, jQuery.attr, name, value, arguments.length > 1 );
};

jQuery.attr = function( elem, name, value ) {
    // getter
    if ( value === undefined ) {
        return elem.getAttribute( name );
    }
    
    // setter
    elem.setAttribute( name, value );
};
```

这里 fn 直接使用 jQuery.attr 静态方法。

**html()**

```javascript
jQuery.fn.html = function( value ) {
    return access( this, function( elem, name, value ) {
        // getter
        if ( value === undefined ) {
            return elem.innerHTML;
        }
        
        // setter
        elem.innerHTML = value;
    }, null, value, arguments.length );
};
```

html() 没有 key（属性名），所以传 null。

## 支持的参数形式

使用 access 后，方法自动支持多种参数形式：

```javascript
// 读取
$('div').css('color');

// 设置单个
$('div').css('color', 'red');

// 设置多个（对象）
$('div').css({
    color: 'red',
    fontSize: '14px',
    backgroundColor: '#fff'
});

// 函数计算
$('div').css('width', function( i, val ) {
    return parseInt( val ) * 2 + 'px';
});
```

所有这些形式都由 access 统一处理，方法实现者只需关注核心的 get/set 逻辑。

## 设计启示

access 体现了几个重要的设计原则：

**1. DRY（Don't Repeat Yourself）**

将重复的 get/set 判断、遍历、返回值处理提取到 access 中，每个方法只需实现核心逻辑。

**2. 高阶函数**

access 接收 fn 作为参数，是典型的高阶函数。fn 封装了具体操作，access 封装了通用流程。

**3. 统一接口**

用户使用 css、attr、prop 等方法时，体验完全一致。这种一致性来自于共同使用 access。

**4. 开放封闭原则**

添加新的 getter/setter 方法时，不需要修改 access，只需要传入新的 fn。

## 简化实现

让我们实现一个简化版的 access：

```javascript
function access( elems, fn, key, value ) {
    const len = elems.length;
    
    // 批量设置（对象形式）
    if ( key !== null && typeof key === 'object' ) {
        for ( const k in key ) {
            access( elems, fn, k, key[k] );
        }
        return elems;
    }
    
    // setter模式
    if ( value !== undefined ) {
        for ( let i = 0; i < len; i++ ) {
            const elem = elems[i];
            // 支持函数形式的value
            const val = typeof value === 'function' 
                ? value.call( elem, i, fn( elem, key ) )
                : value;
            fn( elem, key, val );
        }
        return elems;  // 链式调用
    }
    
    // getter模式
    return len > 0 ? fn( elems[0], key ) : undefined;
}

// 使用
DOMWrapper.prototype.css = function( name, value ) {
    return access( this.elements, function( elem, name, value ) {
        if ( value === undefined ) {
            return getComputedStyle( elem )[ name ];
        }
        elem.style[ name ] = value;
    }, name, value );
};

// 测试
$('div').css('color');                    // getter
$('div').css('color', 'red');             // setter
$('div').css({ color: 'red', fontSize: '14px' });  // 批量
$('div').css('width', (i, v) => parseInt(v) * 2 + 'px');  // 函数
```

## 小结

本章学习了 jQuery 的 access 通用访问器模式：

**解决的问题**
- getter/setter 逻辑重复
- 多种参数形式的处理
- 遍历和返回值处理

**核心设计**
- 高阶函数接收操作函数 fn
- 根据 value 判断 get/set 模式
- 统一处理对象形式和函数形式的 value

**使用 access 的方法**
- css()
- attr()
- prop()
- html()
- data()
- 等

**设计原则**
- DRY：不重复自己
- 高阶函数：封装通用流程
- 统一接口：一致的用户体验
- 开放封闭：易于扩展

下一章，我们将学习 jQuery 的类型检测工具函数，看看如何准确判断 JavaScript 值的类型。
