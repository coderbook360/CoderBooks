# CSS 读取：getComputedStyle 的封装

读取元素的样式看似简单，实际上涉及到很多细节：行内样式、样式表规则、计算值、像素转换等。jQuery 的 `css()` 方法封装了这些复杂性，提供了一致可靠的样式读取体验。本章我们专注于样式读取的实现原理。

## 基本用法

```javascript
// 读取单个样式
const color = $('div').css('color');
const width = $('div').css('width');
const display = $('div').css('display');

// 读取多个样式
const styles = $('div').css(['color', 'width', 'height']);
// { color: "rgb(0, 0, 0)", width: "100px", height: "50px" }
```

## css() 源码解析（读取部分）

```javascript
jQuery.fn.css = function( name, value ) {
    return access( this, function( elem, name, value ) {
        var styles, len,
            map = {},
            i = 0;
        
        // 数组参数：读取多个属性
        if ( Array.isArray( name ) ) {
            styles = getStyles( elem );
            len = name.length;
            
            for ( ; i < len; i++ ) {
                map[ name[ i ] ] = jQuery.css( elem, name[ i ], false, styles );
            }
            
            return map;
        }
        
        // 读取模式
        return value !== undefined ?
            jQuery.style( elem, name, value ) :
            jQuery.css( elem, name );
    }, name, value, arguments.length > 1 );
};
```

## getStyles：获取计算样式对象

```javascript
function getStyles( elem ) {
    // 支持 Shadow DOM
    var view = elem.ownerDocument.defaultView;
    
    if ( !view || !view.opener ) {
        view = window;
    }
    
    return view.getComputedStyle( elem );
}
```

**为什么要处理 view？**

元素可能位于 iframe 或 Shadow DOM 中，需要使用正确的 window 对象调用 `getComputedStyle`。

## jQuery.css：核心读取函数

```javascript
jQuery.css = function( elem, name, extra, styles ) {
    var val, num, hooks,
        origName = camelCase( name ),
        isCustomProp = rcustomProp.test( name );
    
    // CSS 自定义属性不进行驼峰转换
    if ( !isCustomProp ) {
        name = finalPropName( origName );
    }
    
    // 尝试使用 hooks
    hooks = jQuery.cssHooks[ origName ];
    if ( hooks && "get" in hooks ) {
        val = hooks.get( elem, true, extra );
    }
    
    // 没有 hook 或 hook 返回 undefined，使用标准方式
    if ( val === undefined ) {
        styles = styles || getStyles( elem );
        
        if ( styles ) {
            val = styles.getPropertyValue( name ) || styles[ name ];
        }
    }
    
    // 处理空值
    if ( val === "" ) {
        if ( !isAttached( elem ) ) {
            val = jQuery.style( elem, origName );
        }
    }
    
    // 返回值
    return val !== undefined ? val + "" : val;
};
```

### 属性名处理

**camelCase**：转换为驼峰命名

```javascript
var camelCase = function( string ) {
    return string.replace( rmsPrefix, "ms-" ).replace( rdashAlpha, fcamelCase );
};

// "background-color" -> "backgroundColor"
// "-webkit-transform" -> "webkitTransform"
// "-ms-transform" -> "msTransform"（特殊处理）
```

**finalPropName**：获取最终属性名（含浏览器前缀）

```javascript
function finalPropName( name ) {
    var final = jQuery.cssProps[ name ] || vendorProps[ name ];
    
    if ( final ) {
        return final;
    }
    
    if ( name in emptyStyle ) {
        return name;
    }
    
    return vendorProps[ name ] = vendorPropName( name ) || name;
}
```

### CSS 自定义属性（CSS 变量）

```javascript
var rcustomProp = /^--/;

if ( !isCustomProp ) {
    name = finalPropName( origName );
}
```

CSS 变量（如 `--main-color`）不需要驼峰转换，直接使用原始名称。

```javascript
// 读取 CSS 变量
$('div').css('--main-color');
```

## cssHooks：特殊属性处理

某些 CSS 属性需要特殊处理：

### opacity hook

```javascript
jQuery.cssHooks.opacity = {
    get: function( elem, computed ) {
        if ( computed ) {
            var ret = curCSS( elem, "opacity" );
            return ret === "" ? "1" : ret;
        }
    }
};
```

如果 opacity 没有设置，返回默认值 "1"。

### height/width hooks

```javascript
jQuery.each( [ "height", "width" ], function( _i, dimension ) {
    jQuery.cssHooks[ dimension ] = {
        get: function( elem, computed, extra ) {
            if ( computed ) {
                return rdisplayswap.test( jQuery.css( elem, "display" ) ) &&
                    elem.offsetWidth === 0 ?
                    swap( elem, cssShow, function() {
                        return getWidthOrHeight( elem, dimension, extra );
                    } ) :
                    getWidthOrHeight( elem, dimension, extra );
            }
        }
    };
} );
```

**隐藏元素的尺寸问题**：

隐藏元素（`display: none`）的 `offsetWidth/offsetHeight` 为 0。jQuery 使用 `swap` 函数临时显示元素来获取真实尺寸。

### swap 函数

```javascript
function swap( elem, options, callback ) {
    var ret, name,
        old = {};
    
    // 保存旧值并应用新值
    for ( name in options ) {
        old[ name ] = elem.style[ name ];
        elem.style[ name ] = options[ name ];
    }
    
    ret = callback.call( elem );
    
    // 恢复旧值
    for ( name in options ) {
        elem.style[ name ] = old[ name ];
    }
    
    return ret;
}

var cssShow = { 
    position: "absolute", 
    visibility: "hidden", 
    display: "block" 
};
```

临时将元素设为绝对定位+隐藏+block，计算完尺寸后恢复原样。

## 单位处理

```javascript
// getComputedStyle 返回带单位的值
$('div').css('width');  // "100px"
$('div').css('font-size');  // "16px"
$('div').css('line-height');  // "24px" 或 "1.5"
```

**获取纯数值**：

```javascript
// parseFloat 可以提取数值
parseFloat($('div').css('width'));  // 100

// 或使用 jQuery 的方法
$('div').width();  // 100（直接返回数值）
```

## getPropertyValue vs 方括号访问

```javascript
styles.getPropertyValue( name ) || styles[ name ]
```

**为什么要尝试两种方式？**

- `getPropertyValue` 使用 CSS 属性名格式（`background-color`）
- 方括号访问使用驼峰格式（`backgroundColor`）

大多数情况下两者等效，但 `getPropertyValue` 更规范，特别是对于 CSS 自定义属性。

## 未附加元素的处理

```javascript
if ( val === "" ) {
    if ( !isAttached( elem ) ) {
        val = jQuery.style( elem, origName );
    }
}
```

如果元素不在文档中，`getComputedStyle` 可能返回空字符串。此时尝试从行内样式读取。

## 实际应用场景

### 场景一：动画前获取初始值

```javascript
const $el = $('#element');
const currentHeight = $el.css('height');
const currentOpacity = $el.css('opacity');

// 动画到新值
$el.animate({
    height: '200px',
    opacity: 0.5
});
```

### 场景二：样式依赖判断

```javascript
if ($('#sidebar').css('position') === 'fixed') {
    // 固定定位的特殊处理
}

if ($('body').css('overflow') === 'hidden') {
    // 禁止滚动状态
}
```

### 场景三：响应式检测

```javascript
function getLayoutMode() {
    const display = $('.nav-toggle').css('display');
    return display === 'none' ? 'desktop' : 'mobile';
}
```

### 场景四：批量读取样式

```javascript
const styles = $('div').css([
    'width', 
    'height', 
    'padding', 
    'margin', 
    'border-width'
]);

console.log(styles);
// { width: "100px", height: "50px", padding: "10px", ... }
```

## 常见陷阱

### 陷阱一：简写属性

```javascript
// ❌ 简写属性可能返回空或不一致
$('div').css('background');  // 可能为空
$('div').css('margin');      // 可能为空

// ✅ 使用具体属性
$('div').css('background-color');
$('div').css('margin-top');
```

### 陷阱二：值的格式差异

```javascript
// 颜色可能是不同格式
$('div').css('color');  // "rgb(255, 0, 0)" 而非 "red"

// transform 返回矩阵
$('div').css('transform');  // "matrix(1, 0, 0, 1, 0, 0)"
```

### 陷阱三：auto 值

```javascript
// 某些属性返回 auto 而非计算值
$('div').css('height');  // 可能是 "auto"

// 使用专门方法获取计算值
$('div').height();  // 数值
```

## 与原生 API 对比

```javascript
// 原生 API
const styles = getComputedStyle(element);
const width = styles.getPropertyValue('width');

// jQuery
const width = $(element).css('width');
```

**jQuery 的优势**：
1. 统一的接口
2. 自动处理前缀
3. 批量读取
4. 隐藏元素支持
5. 边界情况处理

## 性能考量

```javascript
// ❌ 每次调用都获取 computedStyle
for (let i = 0; i < 100; i++) {
    $el.css('width');
}

// ✅ 缓存样式对象
const styles = getComputedStyle($el[0]);
for (let i = 0; i < 100; i++) {
    styles.width;
}
```

`getComputedStyle` 有一定开销，频繁读取时考虑缓存。

## 设计智慧总结

1. **统一接口**：无论是读取还是批量读取，API 保持一致
2. **Hook 机制**：cssHooks 处理特殊属性
3. **智能降级**：多种方式获取值，确保返回结果
4. **隐藏元素支持**：swap 技术解决隐藏元素尺寸问题
5. **属性名规范化**：自动处理驼峰和前缀

CSS 读取看似简单，但 jQuery 的实现考虑了众多边界情况。下一章，我们将探索 CSS 设置——如何将值写入元素的样式。
