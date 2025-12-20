# attr：HTML属性操作

`attr()` 是 jQuery 中最常用的方法之一，用于读取和设置 HTML 属性。虽然看起来简单，但它的实现涉及到属性规范化、特殊属性处理、跨浏览器兼容等诸多细节。理解 `attr()` 的工作原理，能帮助我们在属性操作中避免常见的陷阱。

## 基本用法

```javascript
// 读取属性
const href = $('a').attr('href');
const id = $('div').attr('id');

// 设置单个属性
$('img').attr('src', 'image.jpg');

// 设置多个属性
$('img').attr({
    src: 'image.jpg',
    alt: '图片描述',
    title: '标题'
});

// 使用函数动态设置
$('a').attr('href', function(index, oldValue) {
    return oldValue + '?source=jquery';
});

// 移除属性
$('input').removeAttr('disabled');
```

## attr() 源码解析

```javascript
jQuery.fn.attr = function( name, value ) {
    return access( this, jQuery.attr, name, value, arguments.length > 1 );
};
```

**核心设计**：使用 `access` 函数统一处理读写模式。

### jQuery.attr 核心实现

```javascript
jQuery.attr = function( elem, name, value ) {
    var ret, hooks,
        nType = elem.nodeType;
    
    // 跳过文本、注释和属性节点
    if ( nType === 3 || nType === 8 || nType === 2 ) {
        return;
    }
    
    // 如果不支持 getAttribute，使用 prop
    if ( typeof elem.getAttribute === "undefined" ) {
        return jQuery.prop( elem, name, value );
    }
    
    // 非元素节点或非 HTML 文档，直接使用原生方法
    if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {
        hooks = jQuery.attrHooks[ name.toLowerCase() ] ||
            ( jQuery.expr.match.bool.test( name ) ? boolHook : undefined );
    }
    
    // 设置模式
    if ( value !== undefined ) {
        if ( value === null ) {
            jQuery.removeAttr( elem, name );
            return;
        }
        
        if ( hooks && "set" in hooks &&
            ( ret = hooks.set( elem, value, name ) ) !== undefined ) {
            return ret;
        }
        
        elem.setAttribute( name, value + "" );
        return value;
    }
    
    // 读取模式
    if ( hooks && "get" in hooks && ( ret = hooks.get( elem, name ) ) !== null ) {
        return ret;
    }
    
    ret = jQuery.find.attr( elem, name );
    return ret == null ? undefined : ret;
};
```

## access 模式的应用

```javascript
return access( this, jQuery.attr, name, value, arguments.length > 1 );
```

`access` 函数处理以下场景：

| 参数形式 | 行为 |
|----------|------|
| `attr('name')` | 读取第一个元素的属性 |
| `attr('name', 'value')` | 设置所有元素的属性 |
| `attr({...})` | 批量设置多个属性 |
| `attr('name', fn)` | 使用函数动态计算值 |

## attrHooks：特殊属性处理

某些属性需要特殊处理，jQuery 使用 `attrHooks` 机制：

```javascript
jQuery.attrHooks = {
    type: {
        set: function( elem, value ) {
            // 在某些条件下处理 type 属性
            if ( value === "radio" && elem.nodeName.toLowerCase() === "input" ) {
                var val = elem.value;
                elem.setAttribute( "type", value );
                if ( val ) {
                    elem.value = val;
                }
                return value;
            }
        }
    }
};
```

**为什么 type 需要特殊处理？**

在某些浏览器中，改变 `<input>` 的 `type` 属性会清除其 `value`。hook 确保值被保留。

## boolHook：布尔属性处理

HTML 中有一类特殊的布尔属性：

```html
<input type="checkbox" checked>
<button disabled>
<option selected>
```

这些属性的存在即表示 `true`，不存在表示 `false`。

```javascript
var boolHook = {
    set: function( elem, value, name ) {
        if ( value === false ) {
            // 值为 false 时移除属性
            jQuery.removeAttr( elem, name );
        } else {
            // 值为 true 时设置属性
            elem.setAttribute( name, name );
        }
        return name;
    }
};
```

**使用示例**：

```javascript
// 这两种写法等效
$('input').attr('checked', true);
$('input').attr('checked', 'checked');

// 移除属性
$('input').attr('checked', false);
// 等效于
$('input').removeAttr('checked');
```

## jQuery.find.attr：属性读取

读取属性时使用 Sizzle 的 `attr` 方法：

```javascript
ret = jQuery.find.attr( elem, name );
```

**为什么不直接用 getAttribute？**

Sizzle 的实现处理了一些边界情况，例如：
- 某些属性名需要规范化
- 处理 SVG 元素的属性

## removeAttr：移除属性

```javascript
jQuery.fn.removeAttr = function( name ) {
    return this.each( function() {
        jQuery.removeAttr( this, name );
    } );
};

jQuery.removeAttr = function( elem, value ) {
    var name,
        i = 0,
        // 支持空格分隔的多个属性名
        attrNames = value && value.match( rnothtmlwhite );
    
    if ( attrNames && elem.nodeType === 1 ) {
        while ( ( name = attrNames[ i++ ] ) ) {
            elem.removeAttribute( name );
        }
    }
};
```

**支持批量移除**：

```javascript
// 一次移除多个属性
$('input').removeAttr('disabled readonly');
```

## 属性名规范化

jQuery 处理属性名的大小写：

```javascript
// HTML 属性不区分大小写
$('div').attr('ID');        // 读取 id
$('div').attr('CLASS');     // 读取 class

// 但设置时保持一致性
hooks = jQuery.attrHooks[ name.toLowerCase() ];
```

## 实际应用场景

### 场景一：数据属性操作

```javascript
// 读取 data-* 属性
const userId = $('div').attr('data-user-id');

// 设置 data-* 属性
$('div').attr('data-status', 'active');

// 批量设置
$('div').attr({
    'data-id': 123,
    'data-type': 'user',
    'data-active': true
});
```

**注意**：`attr('data-*')` 和 `data()` 的区别：
- `attr()` 直接操作 DOM 属性
- `data()` 使用 jQuery 数据缓存，支持类型转换

### 场景二：表单控制

```javascript
// 禁用表单
$('form input').attr('disabled', true);

// 启用表单
$('form input').removeAttr('disabled');

// 设置必填
$('input[name="email"]').attr('required', true);
```

### 场景三：链接处理

```javascript
// 修改链接
$('a.external').attr({
    target: '_blank',
    rel: 'noopener noreferrer'
});

// 动态添加查询参数
$('a').attr('href', function(i, href) {
    if (href && !href.includes('?')) {
        return href + '?ref=site';
    }
    return href;
});
```

## 常见陷阱

### 陷阱一：value 属性

```javascript
// 这可能不是你想要的
$('input').attr('value', 'new value');

// 应该使用 val()
$('input').val('new value');
```

`attr('value')` 操作的是 HTML 属性（初始值），`val()` 操作的是 DOM 属性（当前值）。

### 陷阱二：checked/selected

```javascript
// 获取初始状态
$('input').attr('checked');  // "checked" 或 undefined

// 获取当前状态
$('input').prop('checked');  // true 或 false
```

### 陷阱三：href 的规范化

```javascript
// HTML: <a href="/path">
$('a').attr('href');  // "/path" (原始值)
$('a').prop('href');  // "http://example.com/path" (完整 URL)
```

## 与原生 API 的对比

```javascript
// jQuery
$('div').attr('id');
$('div').attr('id', 'new-id');

// 原生 JavaScript
element.getAttribute('id');
element.setAttribute('id', 'new-id');
```

**jQuery 的优势**：
1. 集合操作
2. 链式调用
3. 特殊属性自动处理
4. 布尔属性规范化
5. 函数参数支持

## 性能考量

```javascript
// 批量设置比多次调用更高效
// 较好
$('img').attr({
    src: 'image.jpg',
    alt: 'description',
    title: 'title'
});

// 较差
$('img').attr('src', 'image.jpg');
$('img').attr('alt', 'description');
$('img').attr('title', 'title');
```

## 设计智慧总结

1. **统一接口**：读写模式通过 `access` 统一处理
2. **Hook 机制**：`attrHooks` 处理特殊属性
3. **布尔规范化**：`boolHook` 正确处理布尔属性
4. **批量操作**：支持对象形式设置多个属性
5. **null 语义**：设置为 `null` 即移除属性
6. **集合操作**：设置时操作所有元素，读取时返回第一个

`attr()` 的实现展示了 jQuery 如何将复杂的属性操作封装成简洁的 API。下一章，我们将探索 `prop()` 方法——它与 `attr()` 看似相似，却有着本质的区别。
