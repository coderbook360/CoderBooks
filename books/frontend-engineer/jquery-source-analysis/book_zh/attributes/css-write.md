# CSS 写入：style 属性操作

上一章我们探索了如何读取元素的计算样式，本章我们来看 CSS 写入——如何通过 jQuery 修改元素的样式。CSS 写入涉及到值转换、单位处理、属性名映射等细节，让我们深入 `jQuery.style` 函数的实现。

## 基本用法

```javascript
// 设置单个样式
$('div').css('color', 'red');
$('div').css('width', 100);  // 自动添加 px
$('div').css('opacity', 0.5);

// 设置多个样式
$('div').css({
    color: 'red',
    width: 100,
    height: '50px',
    opacity: 0.5
});

// 使用函数动态设置
$('div').css('width', function(index, oldValue) {
    return parseFloat(oldValue) * 1.5;
});

// 增量操作
$('div').css('width', '+=10');
```

## css() 源码解析（写入部分）

```javascript
jQuery.fn.css = function( name, value ) {
    return access( this, function( elem, name, value ) {
        // ... 读取逻辑 ...
        
        // 写入模式
        return value !== undefined ?
            jQuery.style( elem, name, value ) :
            jQuery.css( elem, name );
    }, name, value, arguments.length > 1 );
};
```

当传入 value 参数时，调用 `jQuery.style` 进行写入。

## jQuery.style：核心写入函数

```javascript
jQuery.style = function( elem, name, value, extra ) {
    // 跳过文本和注释节点
    if ( !elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style ) {
        return;
    }
    
    var ret, type, hooks,
        origName = camelCase( name ),
        isCustomProp = rcustomProp.test( name ),
        style = elem.style;
    
    // CSS 自定义属性不进行驼峰转换
    if ( !isCustomProp ) {
        name = finalPropName( origName );
    }
    
    hooks = jQuery.cssHooks[ origName ];
    
    // 设置模式
    if ( value !== undefined ) {
        type = typeof value;
        
        // 处理相对值 += / -=
        if ( type === "string" && ( ret = rcssNum.exec( value ) ) && ret[ 1 ] ) {
            value = adjustCSS( elem, origName, ret );
            type = "number";
        }
        
        // null/undefined 移除属性
        if ( value == null || value !== value ) {
            return;
        }
        
        // 数值自动添加单位
        if ( type === "number" && !isCustomProp ) {
            value += ret && ret[ 3 ] || ( jQuery.cssNumber[ origName ] ? "" : "px" );
        }
        
        // 使用 hook
        if ( hooks && "set" in hooks ) {
            value = hooks.set( elem, value, extra );
        }
        
        // 设置值
        if ( value !== undefined ) {
            if ( isCustomProp ) {
                style.setProperty( name, value );
            } else {
                style[ name ] = value;
            }
        }
    } else {
        // 读取模式（获取行内样式）
        if ( hooks && "get" in hooks &&
            ( ret = hooks.get( elem, false, extra ) ) !== undefined ) {
            return ret;
        }
        
        return style[ name ];
    }
};
```

## 核心特性解析

### 自动添加 px 单位

```javascript
if ( type === "number" && !isCustomProp ) {
    value += ret && ret[ 3 ] || ( jQuery.cssNumber[ origName ] ? "" : "px" );
}
```

**jQuery.cssNumber**：定义不需要单位的属性

```javascript
jQuery.cssNumber = {
    animationIterationCount: true,
    columnCount: true,
    fillOpacity: true,
    flexGrow: true,
    flexShrink: true,
    fontWeight: true,
    gridArea: true,
    gridColumn: true,
    gridColumnEnd: true,
    gridColumnStart: true,
    gridRow: true,
    gridRowEnd: true,
    gridRowStart: true,
    lineHeight: true,
    opacity: true,
    order: true,
    orphans: true,
    widows: true,
    zIndex: true,
    zoom: true
};
```

**使用示例**：

```javascript
$('div').css('width', 100);      // "100px"
$('div').css('opacity', 0.5);    // "0.5"（无单位）
$('div').css('zIndex', 10);      // "10"（无单位）
```

### 相对值操作

```javascript
var rcssNum = /^(?:([+-])=)?([+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|))([a-z]*|%)$/;

if ( type === "string" && ( ret = rcssNum.exec( value ) ) && ret[ 1 ] ) {
    value = adjustCSS( elem, origName, ret );
}
```

支持 `+=` 和 `-=` 语法：

```javascript
$('div').css('width', '+=20');   // 当前宽度 + 20px
$('div').css('left', '-=10');    // 当前 left - 10px
$('div').css('opacity', '-=0.1'); // 当前透明度 - 0.1
```

### adjustCSS 函数

```javascript
function adjustCSS( elem, prop, valueParts, tween ) {
    var adjusted, scale,
        maxIterations = 20,
        currentValue = tween ?
            function() { return tween.cur(); } :
            function() { return jQuery.css( elem, prop, "" ); },
        initial = currentValue(),
        unit = valueParts && valueParts[ 3 ] || ( jQuery.cssNumber[ prop ] ? "" : "px" ),
        initialInUnit = ( jQuery.cssNumber[ prop ] || unit !== "px" && +initial ) &&
            rcssNum.exec( jQuery.css( elem, prop ) );
    
    if ( initialInUnit && initialInUnit[ 3 ] !== unit ) {
        // 单位转换逻辑
        unit = unit || initialInUnit[ 3 ];
        initialInUnit = +initial || 1;
        
        do {
            scale = scale || ".5";
            initialInUnit = initialInUnit / scale;
            jQuery.style( elem, prop, initialInUnit + unit );
        } while ( scale !== ( scale = currentValue() / initial ) && 
                  scale !== 1 && --maxIterations );
    }
    
    if ( valueParts ) {
        initialInUnit = +initialInUnit || +initial || 0;
        adjusted = valueParts[ 1 ] ?
            initialInUnit + ( valueParts[ 1 ] + 1 ) * valueParts[ 2 ] :
            +valueParts[ 2 ];
    }
    
    return adjusted;
}
```

这个函数处理相对值计算和单位转换，是动画系统的重要支撑。

### CSS 自定义属性处理

```javascript
if ( isCustomProp ) {
    style.setProperty( name, value );
} else {
    style[ name ] = value;
}
```

CSS 变量必须使用 `setProperty` 设置：

```javascript
// 设置 CSS 变量
$('div').css('--main-color', '#ff0000');
$('div').css('--spacing', '20px');
```

### null/undefined 处理

```javascript
if ( value == null || value !== value ) {
    return;
}
```

设置为 null/undefined 或 NaN 时直接返回，不做任何操作。

**移除行内样式的正确方式**：

```javascript
$('div').css('color', '');  // 设置为空字符串
```

## cssHooks 的写入处理

### opacity hook 示例

```javascript
jQuery.cssHooks.opacity = {
    set: function( elem, value ) {
        // 确保值在有效范围
        if ( value < 0 ) {
            value = 0;
        } else if ( value > 1 ) {
            value = 1;
        }
        elem.style.opacity = value;
    }
};
```

### transform hook 示例

```javascript
// 某些库会添加 transform 的 hook
jQuery.cssHooks.transform = {
    set: function( elem, value ) {
        elem.style.transform = value;
        elem.style.webkitTransform = value;  // 旧版 Safari
    }
};
```

## 批量设置的实现

```javascript
$('div').css({
    color: 'red',
    width: 100,
    height: '50px'
});
```

这是通过 `access` 函数处理对象参数实现的：

```javascript
// access 函数中的对象处理
if ( toType( key ) === "object" ) {
    for ( i in key ) {
        access( elems, fn, i, key[ i ], true, emptyGet, raw );
    }
}
```

## 与 animate 的关系

`css()` 和 `animate()` 共享很多底层逻辑：

```javascript
// css 直接设置
$('div').css('width', 200);

// animate 渐进设置
$('div').animate({ width: 200 }, 1000);
```

`adjustCSS` 函数在动画中也被使用，处理单位转换和值计算。

## 实际应用模式

### 模式一：动态样式计算

```javascript
function setDynamicHeight($container) {
    const windowHeight = $(window).height();
    const headerHeight = $('header').outerHeight();
    $container.css('height', windowHeight - headerHeight);
}
```

### 模式二：响应式样式调整

```javascript
$(window).on('resize', function() {
    const width = $(window).width();
    if (width < 768) {
        $('#sidebar').css({
            width: '100%',
            position: 'relative'
        });
    } else {
        $('#sidebar').css({
            width: '250px',
            position: 'fixed'
        });
    }
});
```

### 模式三：交互反馈

```javascript
$('.button').on('mouseenter', function() {
    $(this).css({
        transform: 'scale(1.05)',
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
    });
}).on('mouseleave', function() {
    $(this).css({
        transform: 'scale(1)',
        boxShadow: 'none'
    });
});
```

### 模式四：位置调整

```javascript
function positionTooltip($tooltip, $target) {
    const targetOffset = $target.offset();
    const targetHeight = $target.outerHeight();
    
    $tooltip.css({
        top: targetOffset.top + targetHeight + 10,
        left: targetOffset.left
    });
}
```

## 性能考量

### 触发重排的属性

某些 CSS 属性的改变会触发浏览器重排（reflow）：

```javascript
// 触发重排
$el.css('width', '100px');
$el.css('height', '100px');
$el.css('top', '50px');

// 不触发重排
$el.css('color', 'red');
$el.css('opacity', 0.5);
$el.css('transform', 'scale(1.5)');
```

**最佳实践**：优先使用 `transform` 和 `opacity` 做动画。

### 批量操作

```javascript
// ❌ 多次重排
$el.css('width', '100px');
$el.css('height', '100px');
$el.css('padding', '10px');

// ✅ 一次设置，浏览器优化为一次重排
$el.css({
    width: '100px',
    height: '100px',
    padding: '10px'
});
```

### 使用 class 替代

```javascript
// ❌ 直接设置样式
$el.css({
    backgroundColor: '#f00',
    border: '1px solid #000',
    borderRadius: '4px'
});

// ✅ 使用 class（样式在 CSS 文件中定义）
$el.addClass('highlighted');
```

class 切换比直接操作样式更高效，且便于维护。

## 与原生 API 对比

```javascript
// 原生 API
element.style.width = '100px';
element.style.backgroundColor = 'red';

// jQuery
$(element).css('width', '100px');
$(element).css('background-color', 'red');
```

**jQuery 的优势**：
1. 自动驼峰转换
2. 自动添加单位
3. 批量设置
4. 相对值支持
5. 函数参数

## 设计智慧总结

1. **自动单位**：数值自动添加 px，cssNumber 列表例外
2. **相对值**：`+=` / `-=` 语法方便增量操作
3. **Hook 机制**：cssHooks 处理特殊属性
4. **属性名规范化**：自动处理驼峰和前缀
5. **CSS 变量支持**：正确使用 setProperty

CSS 写入是 jQuery 最常用的功能之一。理解其实现细节，能帮助我们写出更高效的代码。下一章，我们将探索尺寸计算——width、height 及其变体的实现原理。
