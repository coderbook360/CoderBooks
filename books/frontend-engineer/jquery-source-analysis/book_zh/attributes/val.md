# val：表单值的统一接口

表单是 Web 应用的核心交互方式，而获取和设置表单值是最常见的操作。jQuery 的 `val()` 方法提供了统一的接口，无论是文本框、下拉选择还是复选框，都可以用相同的方式操作。让我们深入探索它的实现原理。

## 基本用法

```javascript
// 读取值
const inputValue = $('input').val();
const selectValue = $('select').val();
const textareaValue = $('textarea').val();

// 设置值
$('input').val('新内容');
$('select').val('option2');
$('textarea').val('多行\n文本');

// 使用函数动态设置
$('input').val(function(index, oldValue) {
    return oldValue.trim().toUpperCase();
});

// 设置多选的值
$('select[multiple]').val(['option1', 'option3']);
```

## val() 源码解析

```javascript
jQuery.fn.val = function( value ) {
    var hooks, ret, valueIsFunction,
        elem = this[ 0 ];
    
    // 读取模式
    if ( !arguments.length ) {
        if ( elem ) {
            hooks = jQuery.valHooks[ elem.type ] ||
                jQuery.valHooks[ elem.nodeName.toLowerCase() ];
            
            if ( hooks && "get" in hooks &&
                ( ret = hooks.get( elem, "value" ) ) !== undefined ) {
                return ret;
            }
            
            ret = elem.value;
            
            // 处理字符串中的特殊字符
            if ( typeof ret === "string" ) {
                return ret.replace( rreturn, "" );
            }
            
            return ret == null ? "" : ret;
        }
        
        return;
    }
    
    valueIsFunction = isFunction( value );
    
    // 设置模式
    return this.each( function( i ) {
        var val;
        
        if ( this.nodeType !== 1 ) {
            return;
        }
        
        if ( valueIsFunction ) {
            val = value.call( this, i, jQuery( this ).val() );
        } else {
            val = value;
        }
        
        // null/undefined 转为空字符串
        if ( val == null ) {
            val = "";
        } else if ( typeof val === "number" ) {
            val += "";
        } else if ( Array.isArray( val ) ) {
            val = jQuery.map( val, function( value ) {
                return value == null ? "" : value + "";
            } );
        }
        
        hooks = jQuery.valHooks[ this.type ] ||
            jQuery.valHooks[ this.nodeName.toLowerCase() ];
        
        if ( !hooks || !( "set" in hooks ) ||
            hooks.set( this, val, "value" ) === undefined ) {
            this.value = val;
        }
    } );
};
```

## 核心设计分析

### 读取模式的处理

```javascript
if ( !arguments.length ) {
    if ( elem ) {
        hooks = jQuery.valHooks[ elem.type ] ||
            jQuery.valHooks[ elem.nodeName.toLowerCase() ];
        
        if ( hooks && "get" in hooks &&
            ( ret = hooks.get( elem, "value" ) ) !== undefined ) {
            return ret;
        }
        
        ret = elem.value;
        return ret.replace( rreturn, "" );
    }
}
```

**关键点**：
1. 优先使用 hooks 获取值
2. 对于无 hooks 的元素，直接读取 `value` 属性
3. 使用 `rreturn` 正则移除 `\r` 字符（跨平台换行处理）

### rreturn 正则

```javascript
var rreturn = /\r/g;
```

在 Windows 系统中，文本区域的换行是 `\r\n`。`val()` 统一移除 `\r`，确保跨平台一致性。

### 设置模式的值处理

```javascript
// null/undefined 转为空字符串
if ( val == null ) {
    val = "";
// 数字转为字符串
} else if ( typeof val === "number" ) {
    val += "";
// 数组中的每个值都转为字符串
} else if ( Array.isArray( val ) ) {
    val = jQuery.map( val, function( value ) {
        return value == null ? "" : value + "";
    } );
}
```

**设计意图**：
- 确保值总是字符串或字符串数组
- 统一处理 null/undefined
- 支持数字直接传入

## valHooks：表单元素的特殊处理

### select 元素

```javascript
jQuery.valHooks.select = {
    get: function( elem ) {
        var value, option, i,
            options = elem.options,
            index = elem.selectedIndex,
            one = elem.type === "select-one",
            values = one ? null : [],
            max = one ? index + 1 : options.length;
        
        // 没有选中项
        if ( index < 0 ) {
            i = max;
        } else {
            i = one ? index : 0;
        }
        
        // 遍历选中的选项
        for ( ; i < max; i++ ) {
            option = options[ i ];
            
            if ( option.selected &&
                !option.disabled &&
                ( !option.parentNode.disabled ||
                    !nodeName( option.parentNode, "optgroup" ) ) ) {
                
                value = jQuery( option ).val();
                
                if ( one ) {
                    return value;
                }
                
                values.push( value );
            }
        }
        
        return values;
    },
    
    set: function( elem, value ) {
        var optionSet, option,
            options = elem.options,
            values = jQuery.makeArray( value ),
            i = options.length;
        
        while ( i-- ) {
            option = options[ i ];
            
            if ( option.selected =
                jQuery.inArray( jQuery.valHooks.option.get( option ), values ) > -1 ) {
                optionSet = true;
            }
        }
        
        if ( !optionSet ) {
            elem.selectedIndex = -1;
        }
        
        return values;
    }
};
```

**读取逻辑**：
- 单选（select-one）：返回选中项的值（字符串）
- 多选（select-multiple）：返回所有选中项的值（数组）
- 过滤禁用的选项

**设置逻辑**：
- 将值转为数组
- 遍历所有选项，匹配则选中
- 支持设置多个值

### option 元素

```javascript
jQuery.valHooks.option = {
    get: function( elem ) {
        var val = jQuery.find.attr( elem, "value" );
        return val != null ?
            val :
            jQuery.text( elem ).replace( rspaces, " " );
    }
};
```

如果 option 没有 value 属性，使用其文本内容作为值。

### checkbox 和 radio

```javascript
jQuery.each( [ "radio", "checkbox" ], function() {
    jQuery.valHooks[ this ] = {
        set: function( elem, value ) {
            if ( Array.isArray( value ) ) {
                return ( elem.checked = 
                    jQuery.inArray( jQuery( elem ).val(), value ) > -1 );
            }
        }
    };
} );
```

设置复选框/单选框的值时，如果传入数组，会检查当前元素的值是否在数组中，从而决定是否选中。

```javascript
// 选中值为 "option1" 和 "option3" 的复选框
$('input[type="checkbox"]').val(['option1', 'option3']);
```

## 实际应用场景

### 场景一：表单序列化

```javascript
function getFormData($form) {
    const data = {};
    
    $form.find('input, select, textarea').each(function() {
        const $el = $(this);
        const name = $el.attr('name');
        
        if (name) {
            if (this.type === 'checkbox') {
                data[name] = $el.prop('checked');
            } else if (this.type === 'radio') {
                if ($el.prop('checked')) {
                    data[name] = $el.val();
                }
            } else {
                data[name] = $el.val();
            }
        }
    });
    
    return data;
}
```

### 场景二：表单填充

```javascript
function fillForm($form, data) {
    Object.keys(data).forEach(key => {
        const $el = $form.find(`[name="${key}"]`);
        const value = data[key];
        
        if ($el.is('input[type="checkbox"]')) {
            $el.prop('checked', !!value);
        } else if ($el.is('input[type="radio"]')) {
            $el.filter(`[value="${value}"]`).prop('checked', true);
        } else {
            $el.val(value);
        }
    });
}
```

### 场景三：输入验证

```javascript
$('input').on('blur', function() {
    const value = $(this).val().trim();
    
    if (!value) {
        $(this).addClass('error');
    } else {
        $(this).removeClass('error');
    }
});
```

### 场景四：格式化输入

```javascript
// 自动格式化电话号码
$('input[type="tel"]').on('input', function() {
    const $input = $(this);
    let value = $input.val().replace(/\D/g, '');
    
    if (value.length > 3 && value.length <= 7) {
        value = value.slice(0, 3) + '-' + value.slice(3);
    } else if (value.length > 7) {
        value = value.slice(0, 3) + '-' + value.slice(3, 7) + '-' + value.slice(7, 11);
    }
    
    $input.val(value);
});
```

## val() vs prop('value')

```javascript
// 这两种方式大多数情况等效
$('input').val();
$('input').prop('value');

// 但 val() 有更多处理
// 1. 统一的 hooks 机制
// 2. 换行符规范化
// 3. 多选 select 返回数组
```

**推荐**：表单值操作始终使用 `val()`。

## 边界情况处理

### 空 jQuery 对象

```javascript
$('#not-exist').val();  // undefined
$('#not-exist').val('test');  // 不报错，返回空 jQuery 对象
```

### 非表单元素

```javascript
$('div').val();  // undefined（div 没有 value 属性）
$('div').val('test');  // 不会有效果
```

### 多个元素

```javascript
// 读取时返回第一个元素的值
$('input').val();

// 设置时设置所有元素
$('input').val('same value');
```

## 性能考量

```javascript
// 避免在循环中重复获取同一元素的值
// ❌ 低效
for (let i = 0; i < 100; i++) {
    if ($('#input').val() === '') { }
}

// ✅ 高效
const value = $('#input').val();
for (let i = 0; i < 100; i++) {
    if (value === '') { }
}
```

## 设计智慧总结

1. **统一接口**：无论什么表单元素，都用 `val()` 操作
2. **Hook 机制**：通过 valHooks 处理不同元素类型
3. **类型转换**：自动将各种输入转为字符串
4. **跨平台处理**：统一换行符格式
5. **数组支持**：多选 select 和 checkbox 支持数组操作

`val()` 是 jQuery 表单操作的核心方法。它的 Hook 机制展示了如何用统一的接口处理多样化的需求，是学习 API 设计的好例子。

下一章，我们将探索 class 操作方法——`addClass`、`removeClass`、`toggleClass` 和 `hasClass`，看看 jQuery 如何优雅地处理 CSS 类名。
