# prop：DOM属性操作

上一章我们学习了 `attr()` 方法，它操作的是 HTML 属性。而 `prop()` 操作的是 DOM 属性。这两个概念经常被混淆，但它们有着本质的区别。理解 `prop()` 的工作原理，是掌握 jQuery 属性操作的关键。

## HTML 属性 vs DOM 属性

在深入源码之前，我们需要先理解这两个概念的区别。

**HTML 属性（Attributes）**：
- 定义在 HTML 标签中
- 通过 `getAttribute/setAttribute` 访问
- 值始终是字符串
- 表示初始状态

**DOM 属性（Properties）**：
- 存在于 DOM 对象上
- 通过点语法访问（`element.checked`）
- 值可以是任意类型
- 表示当前状态

```html
<input type="checkbox" checked value="yes">
```

```javascript
const input = document.querySelector('input');

// HTML 属性
input.getAttribute('checked');  // ""（空字符串，表示存在）
input.getAttribute('value');    // "yes"

// DOM 属性
input.checked;  // true（布尔值）
input.value;    // "yes"（当前值，可能被用户修改）
```

## 基本用法

```javascript
// 读取 DOM 属性
const isChecked = $('input').prop('checked');
const isDisabled = $('button').prop('disabled');

// 设置 DOM 属性
$('input').prop('checked', true);
$('button').prop('disabled', false);

// 批量设置
$('input').prop({
    checked: true,
    disabled: false
});

// 使用函数
$('input').prop('checked', function(index, oldValue) {
    return !oldValue;  // 切换状态
});
```

## prop() 源码解析

```javascript
jQuery.fn.prop = function( name, value ) {
    return access( this, jQuery.prop, name, value, arguments.length > 1 );
};
```

与 `attr()` 相同，使用 `access` 统一处理读写模式。

### jQuery.prop 核心实现

```javascript
jQuery.prop = function( elem, name, value ) {
    var ret, hooks,
        nType = elem.nodeType;
    
    // 跳过文本、注释和属性节点
    if ( nType === 3 || nType === 8 || nType === 2 ) {
        return;
    }
    
    // 属性名映射（处理保留字和大小写）
    if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {
        name = jQuery.propFix[ name ] || name;
        hooks = jQuery.propHooks[ name ];
    }
    
    // 设置模式
    if ( value !== undefined ) {
        if ( hooks && "set" in hooks &&
            ( ret = hooks.set( elem, value, name ) ) !== undefined ) {
            return ret;
        }
        
        return ( elem[ name ] = value );
    }
    
    // 读取模式
    if ( hooks && "get" in hooks && ( ret = hooks.get( elem, name ) ) !== null ) {
        return ret;
    }
    
    return elem[ name ];
};
```

**关键区别**：
- `attr` 使用 `getAttribute/setAttribute`
- `prop` 使用 `elem[name]`（点语法的方括号形式）

## propFix：属性名映射

某些属性名需要特殊处理：

```javascript
jQuery.propFix = {
    "for": "htmlFor",
    "class": "className"
};
```

**为什么需要映射？**

在 JavaScript 中，`class` 和 `for` 是保留字：

```javascript
// 错误：class 是保留字
element.class = 'foo';

// 正确：使用 className
element.className = 'foo';

// jQuery 帮你处理
$('div').prop('class', 'foo');  // 内部转换为 className
```

## propHooks：特殊属性处理

```javascript
jQuery.propHooks = {
    tabIndex: {
        get: function( elem ) {
            var tabindex = jQuery.find.attr( elem, "tabindex" );
            
            if ( tabindex ) {
                return parseInt( tabindex, 10 );
            }
            
            // 特定元素有默认 tabIndex
            if ( rfocusable.test( elem.nodeName ) ||
                 rclickable.test( elem.nodeName ) && elem.href ) {
                return 0;
            }
            
            return -1;
        }
    }
};
```

`tabIndex` 属性有复杂的默认值逻辑：
- 可聚焦元素（input、button 等）默认为 0
- 可点击且有 href 的元素默认为 0
- 其他元素默认为 -1

## removeProp：移除 DOM 属性

```javascript
jQuery.fn.removeProp = function( name ) {
    return this.each( function() {
        delete this[ jQuery.propFix[ name ] || name ];
    } );
};
```

**注意**：`removeProp` 使用 `delete` 操作符，只能删除自定义属性：

```javascript
// 可以删除自定义属性
$('div').prop('myCustomProp', 'value');
$('div').removeProp('myCustomProp');

// 不应该删除内置属性
$('input').removeProp('checked');  // 不推荐！
// 应该使用
$('input').prop('checked', false);
```

## 核心差异对比

让我们通过具体例子理解 attr 和 prop 的区别：

### 示例一：checkbox 的 checked 属性

```html
<input type="checkbox" checked id="cb">
```

```javascript
const $cb = $('#cb');

// 初始状态
$cb.attr('checked');   // "checked"
$cb.prop('checked');   // true

// 用户点击取消选中后
$cb.attr('checked');   // "checked"（HTML 属性不变）
$cb.prop('checked');   // false（DOM 属性反映当前状态）
```

### 示例二：input 的 value 属性

```html
<input type="text" value="initial" id="input">
```

```javascript
const $input = $('#input');

// 初始状态
$input.attr('value');   // "initial"
$input.prop('value');   // "initial"

// 用户输入 "new text" 后
$input.attr('value');   // "initial"（HTML 属性不变）
$input.prop('value');   // "new text"（DOM 属性反映当前值）
```

### 示例三：href 的规范化

```html
<a href="/path" id="link">Link</a>
```

```javascript
const $link = $('#link');

$link.attr('href');   // "/path"（原始值）
$link.prop('href');   // "http://example.com/path"（完整 URL）
```

## 使用指南

### 应该使用 prop 的场景

```javascript
// 布尔属性的当前状态
$('input[type="checkbox"]').prop('checked');
$('input[type="radio"]').prop('checked');
$('option').prop('selected');
$('button').prop('disabled');

// 表单当前值（或使用 val()）
$('input').prop('value');

// 其他 DOM 属性
$('div').prop('scrollTop');
$('select').prop('selectedIndex');
```

### 应该使用 attr 的场景

```javascript
// 自定义 data-* 属性（或使用 data()）
$('div').attr('data-id');

// HTML 属性的原始值
$('input').attr('value');  // 初始值

// 非布尔类型的属性
$('img').attr('src');
$('a').attr('href');  // 如果需要原始值
$('input').attr('placeholder');
```

## 性能对比

```javascript
// prop 直接访问对象属性，性能更好
element.checked;          // 最快
$(element).prop('checked'); // 快

// attr 需要调用方法
element.getAttribute('checked'); // 较慢
$(element).attr('checked');       // 较慢
```

对于需要频繁读取的属性（如在动画或滚动中），优先使用 `prop`。

## 实际应用模式

### 模式一：表单状态控制

```javascript
// 禁用/启用表单
function setFormEnabled($form, enabled) {
    $form.find('input, button, select, textarea')
         .prop('disabled', !enabled);
}

// 全选/取消全选
function toggleAllCheckboxes($container, checked) {
    $container.find('input[type="checkbox"]')
              .prop('checked', checked);
}
```

### 模式二：动态切换

```javascript
// 切换选中状态
$('input[type="checkbox"]').on('click', function() {
    // prop 自动获取/设置布尔值
    const isChecked = $(this).prop('checked');
    // 基于状态做处理
});

// 批量切换
$('#toggle-all').on('click', function() {
    const allChecked = $('input.item').length === 
                       $('input.item:checked').length;
    $('input.item').prop('checked', !allChecked);
});
```

### 模式三：读取节点信息

```javascript
// 获取选中选项的索引
const selectedIndex = $('select').prop('selectedIndex');

// 获取表单的有效性
const isValid = $('form')[0].checkValidity();

// 获取滚动位置
const scrollTop = $('div').prop('scrollTop');
```

## 常见错误

### 错误一：用 attr 操作布尔属性

```javascript
// ❌ 错误
$('input').attr('checked', false);  // 无法取消选中
$('input').attr('disabled', false); // 无法启用

// ✅ 正确
$('input').prop('checked', false);
$('input').prop('disabled', false);
```

### 错误二：用 removeProp 删除内置属性

```javascript
// ❌ 危险
$('input').removeProp('value');  // 可能导致问题

// ✅ 正确
$('input').prop('value', '');
```

### 错误三：混淆读取结果

```javascript
// 检查是否禁用
if ($('button').attr('disabled')) { }  // 可能是 "" 或 undefined
if ($('button').prop('disabled')) { }  // 明确的 true 或 false ✅
```

## 设计智慧总结

1. **语义分离**：`attr` 操作 HTML 属性，`prop` 操作 DOM 属性
2. **类型安全**：`prop` 返回正确的类型（布尔值、数字等）
3. **属性映射**：`propFix` 处理保留字问题
4. **Hook 扩展**：`propHooks` 处理特殊属性逻辑
5. **统一模式**：读写都通过 `access` 处理

理解 `attr` 和 `prop` 的本质区别，是正确使用 jQuery 属性 API 的关键。下一章，我们将通过更详细的对比，彻底理清这两个方法的使用场景。
