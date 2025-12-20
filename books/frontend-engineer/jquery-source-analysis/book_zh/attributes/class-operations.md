# class 操作：addClass、removeClass、toggleClass

CSS 类名是控制元素样式的主要方式。jQuery 提供了一组优雅的方法来操作类名：`addClass`、`removeClass`、`toggleClass` 和 `hasClass`。这些方法不仅使用方便，其内部实现也充满了值得学习的设计思想。

## 基本用法

```javascript
// 添加类名
$('div').addClass('active');
$('div').addClass('foo bar baz');  // 多个类名

// 移除类名
$('div').removeClass('active');
$('div').removeClass('foo bar');  // 多个类名
$('div').removeClass();  // 移除所有类名

// 切换类名
$('div').toggleClass('active');
$('div').toggleClass('active', true);   // 强制添加
$('div').toggleClass('active', false);  // 强制移除

// 检查类名
const hasActive = $('div').hasClass('active');  // true/false

// 使用函数
$('div').addClass(function(index, currentClass) {
    return 'item-' + index;
});
```

## addClass 源码解析

```javascript
jQuery.fn.addClass = function( value ) {
    var classes, elem, cur, curValue, clazz, j, finalValue,
        i = 0;
    
    // 函数参数处理
    if ( isFunction( value ) ) {
        return this.each( function( j ) {
            jQuery( this ).addClass( value.call( this, j, getClass( this ) ) );
        } );
    }
    
    // 将参数转为类名数组
    classes = classesToArray( value );
    
    if ( classes.length ) {
        while ( ( elem = this[ i++ ] ) ) {
            curValue = getClass( elem );
            cur = elem.nodeType === 1 && ( " " + stripAndCollapse( curValue ) + " " );
            
            if ( cur ) {
                j = 0;
                while ( ( clazz = classes[ j++ ] ) ) {
                    // 如果类名不存在，添加它
                    if ( cur.indexOf( " " + clazz + " " ) < 0 ) {
                        cur += clazz + " ";
                    }
                }
                
                finalValue = stripAndCollapse( cur );
                if ( curValue !== finalValue ) {
                    elem.className = finalValue;
                }
            }
        }
    }
    
    return this;
};
```

### 关键辅助函数

**getClass**：获取元素的类名

```javascript
function getClass( elem ) {
    return elem.getAttribute && elem.getAttribute( "class" ) || "";
}
```

**classesToArray**：将参数转为类名数组

```javascript
function classesToArray( value ) {
    if ( Array.isArray( value ) ) {
        return value;
    }
    if ( typeof value === "string" ) {
        return value.match( rnothtmlwhite ) || [];
    }
    return [];
}
```

**stripAndCollapse**：规范化空白字符

```javascript
function stripAndCollapse( value ) {
    var tokens = value.match( rnothtmlwhite ) || [];
    return tokens.join( " " );
}
```

### 设计亮点

**空格边界技巧**：

```javascript
cur = " " + stripAndCollapse( curValue ) + " ";
```

在类名字符串两端添加空格，使得查找时可以用 `" " + clazz + " "` 精确匹配，避免部分匹配问题：

```javascript
// 类名字符串："active disabled"
// 检查 "active"

// 错误方式：
"active disabled".indexOf("active")  // 0（找到了）
"active disabled".indexOf("act")     // 0（也找到了！误判）

// 正确方式：
" active disabled ".indexOf(" active ")  // 0（找到了）
" active disabled ".indexOf(" act ")     // -1（正确，没找到）
```

## removeClass 源码解析

```javascript
jQuery.fn.removeClass = function( value ) {
    var classes, elem, cur, curValue, clazz, j, finalValue,
        i = 0;
    
    // 函数参数
    if ( isFunction( value ) ) {
        return this.each( function( j ) {
            jQuery( this ).removeClass( value.call( this, j, getClass( this ) ) );
        } );
    }
    
    // 无参数：移除所有类名
    if ( !arguments.length ) {
        return this.attr( "class", "" );
    }
    
    classes = classesToArray( value );
    
    if ( classes.length ) {
        while ( ( elem = this[ i++ ] ) ) {
            curValue = getClass( elem );
            cur = elem.nodeType === 1 && ( " " + stripAndCollapse( curValue ) + " " );
            
            if ( cur ) {
                j = 0;
                while ( ( clazz = classes[ j++ ] ) ) {
                    // 移除所有匹配的类名
                    while ( cur.indexOf( " " + clazz + " " ) > -1 ) {
                        cur = cur.replace( " " + clazz + " ", " " );
                    }
                }
                
                finalValue = stripAndCollapse( cur );
                if ( curValue !== finalValue ) {
                    elem.className = finalValue;
                }
            }
        }
    }
    
    return this;
};
```

**注意 while 循环**：

```javascript
while ( cur.indexOf( " " + clazz + " " ) > -1 ) {
    cur = cur.replace( " " + clazz + " ", " " );
}
```

为什么用 `while` 而不是 `if`？因为类名可能重复出现（虽然不规范，但要处理）：

```html
<div class="active foo active">
```

## toggleClass 源码解析

```javascript
jQuery.fn.toggleClass = function( value, stateVal ) {
    var type = typeof value,
        isValidValue = type === "string" || Array.isArray( value );
    
    // 布尔状态参数
    if ( typeof stateVal === "boolean" && isValidValue ) {
        return stateVal ? this.addClass( value ) : this.removeClass( value );
    }
    
    // 函数参数
    if ( isFunction( value ) ) {
        return this.each( function( i ) {
            jQuery( this ).toggleClass(
                value.call( this, i, getClass( this ), stateVal ),
                stateVal
            );
        } );
    }
    
    return this.each( function() {
        var className, i, self, classNames;
        
        if ( isValidValue ) {
            i = 0;
            self = jQuery( this );
            classNames = classesToArray( value );
            
            while ( ( className = classNames[ i++ ] ) ) {
                // 检查存在性，决定添加还是移除
                if ( self.hasClass( className ) ) {
                    self.removeClass( className );
                } else {
                    self.addClass( className );
                }
            }
        }
    } );
};
```

### stateVal 参数

```javascript
// 根据条件强制设置状态
$('div').toggleClass('active', isActive);

// 等效于
if (isActive) {
    $('div').addClass('active');
} else {
    $('div').removeClass('active');
}
```

这个参数非常有用，可以用条件表达式控制类名：

```javascript
$('button').toggleClass('disabled', items.length === 0);
$('menu').toggleClass('open', isMenuOpen);
```

## hasClass 源码解析

```javascript
jQuery.fn.hasClass = function( selector ) {
    var className, elem,
        i = 0;
    
    className = " " + selector + " ";
    while ( ( elem = this[ i++ ] ) ) {
        if ( elem.nodeType === 1 &&
            ( " " + stripAndCollapse( getClass( elem ) ) + " " ).indexOf( className ) > -1 ) {
            return true;
        }
    }
    
    return false;
};
```

**设计特点**：

1. **多元素处理**：只要有一个元素包含该类名，就返回 `true`
2. **空格边界**：同样使用空格包裹技巧
3. **早期返回**：找到即返回，不继续遍历

## 与原生 classList 的对比

现代浏览器提供了 `classList` API：

```javascript
// 原生 API
element.classList.add('active');
element.classList.remove('active');
element.classList.toggle('active');
element.classList.contains('active');

// jQuery
$(element).addClass('active');
$(element).removeClass('active');
$(element).toggleClass('active');
$(element).hasClass('active');
```

**jQuery 的优势**：

1. **集合操作**：一次操作多个元素
2. **多类名支持**：`addClass('a b c')`
3. **函数参数**：动态计算类名
4. **链式调用**：`.addClass('a').removeClass('b')`

## 性能优化

### 批量操作

```javascript
// ❌ 多次操作
$('div').addClass('a');
$('div').addClass('b');
$('div').addClass('c');

// ✅ 一次操作
$('div').addClass('a b c');
```

### 条件类名

```javascript
// ❌ 分开判断
if (isActive) {
    $el.addClass('active');
} else {
    $el.removeClass('active');
}

// ✅ 使用 toggleClass
$el.toggleClass('active', isActive);
```

### 变化检测

源码中的优化：

```javascript
if ( curValue !== finalValue ) {
    elem.className = finalValue;
}
```

只有类名真正改变时才更新 DOM，避免不必要的重绘。

## 实际应用模式

### 模式一：状态切换

```javascript
$('.accordion-header').on('click', function() {
    $(this).toggleClass('expanded');
    $(this).next('.accordion-content').toggleClass('visible');
});
```

### 模式二：表单验证状态

```javascript
function validateField($field) {
    const isValid = $field.val().trim() !== '';
    $field.toggleClass('valid', isValid)
          .toggleClass('invalid', !isValid);
    return isValid;
}
```

### 模式三：动态主题

```javascript
function setTheme(theme) {
    $('body')
        .removeClass('theme-light theme-dark theme-auto')
        .addClass('theme-' + theme);
}
```

### 模式四：列表项操作

```javascript
// 高亮当前项
$('.list-item').on('click', function() {
    $(this).addClass('active')
           .siblings().removeClass('active');
});
```

## 常见错误

### 错误一：类名选择器混淆

```javascript
// ❌ 错误：不需要点号
$('div').addClass('.active');

// ✅ 正确
$('div').addClass('active');
```

### 错误二：hasClass 返回值误用

```javascript
// ❌ hasClass 只返回 true/false
const classes = $('div').hasClass('active');

// ✅ 获取类名字符串
const classes = $('div').attr('class');
```

### 错误三：忽略多元素

```javascript
// hasClass 检查任意一个元素
$('div').hasClass('active');  // 只要有一个 div 有 active 就返回 true

// 检查所有元素
const allHaveClass = $('div').filter('.active').length === $('div').length;
```

## 设计智慧总结

1. **空格边界技巧**：简洁优雅地解决精确匹配问题
2. **变化检测**：避免不必要的 DOM 更新
3. **多形式参数**：支持字符串、数组、函数
4. **stateVal 设计**：toggleClass 的第二参数简化条件逻辑
5. **一致性**：所有方法返回 jQuery 对象（除了 hasClass），支持链式调用

class 操作方法是 jQuery 中设计最精炼的 API 之一。理解它的实现，不仅有助于日常开发，也是学习 API 设计的好材料。

下一章，我们将进入 CSS 操作领域，探索 jQuery 如何读取元素的计算样式。
