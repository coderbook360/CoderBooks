# 属性操作：attr/prop 的区别

`attr()` 和 `prop()` 都用于操作元素属性，但它们针对不同层面的属性。理解这个区别是使用 jQuery 的关键。

## HTML 属性 vs DOM 属性

首先要理解两个层面：

### HTML 属性（Attribute）

HTML 源代码中写的属性：

```html
<input type="text" value="initial" checked>
```

这里 `type`、`value`、`checked` 都是 HTML 属性。

### DOM 属性（Property）

JavaScript 中 DOM 对象的属性：

```javascript
const input = document.querySelector('input');
input.value;   // DOM 属性
input.checked; // DOM 属性
```

## 区别示例

看这个例子：

```html
<input type="checkbox" checked value="hello">
```

用户清空输入框后：

```javascript
// HTML 属性（初始值）
input.getAttribute('value');  // "hello"

// DOM 属性（当前值）
input.value;  // ""（用户清空了）
```

所以：

- **HTML 属性**：记录初始值
- **DOM 属性**：反映当前状态

## attr()：操作 HTML 属性

```javascript
// 获取
$('input').attr('value');  // 初始值

// 设置
$('input').attr('value', 'new value');

// 多个属性
$('img').attr({
  src: 'image.jpg',
  alt: 'An image'
});
```

### 实现

```javascript
jQuery.fn.attr = function(name, value) {
  // 获取模式
  if (typeof name === 'string' && value === undefined) {
    const elem = this[0];
    return elem?.getAttribute(name);
  }
  
  // 设置模式
  return this.each(function(index) {
    // 对象形式
    if (typeof name === 'object') {
      Object.keys(name).forEach(key => {
        this.setAttribute(key, name[key]);
      });
      return;
    }
    
    // 处理函数值
    const newValue = typeof value === 'function'
      ? value.call(this, index, this.getAttribute(name))
      : value;
    
    // null 表示移除
    if (newValue === null) {
      this.removeAttribute(name);
    } else {
      this.setAttribute(name, newValue);
    }
  });
};
```

## prop()：操作 DOM 属性

```javascript
// 获取
$('input[type="checkbox"]').prop('checked');  // true/false

// 设置
$('input[type="checkbox"]').prop('checked', true);
```

### 实现

```javascript
jQuery.fn.prop = function(name, value) {
  // 获取模式
  if (typeof name === 'string' && value === undefined) {
    const elem = this[0];
    return elem ? elem[name] : undefined;
  }
  
  // 设置模式
  return this.each(function(index) {
    // 对象形式
    if (typeof name === 'object') {
      Object.keys(name).forEach(key => {
        this[key] = name[key];
      });
      return;
    }
    
    // 处理函数值
    const newValue = typeof value === 'function'
      ? value.call(this, index, this[name])
      : value;
    
    this[name] = newValue;
  });
};
```

## removeAttr()：移除属性

```javascript
$('input').removeAttr('disabled');
```

### 实现

```javascript
jQuery.fn.removeAttr = function(name) {
  return this.each(function() {
    // 支持空格分隔的多个属性
    name.split(/\s+/).forEach(attr => {
      this.removeAttribute(attr);
    });
  });
};
```

## removeProp()：移除 DOM 属性

```javascript
$('input').removeProp('customProp');
```

注意：不能用 `removeProp` 移除原生属性如 `checked`，应该用 `prop('checked', false)`。

### 实现

```javascript
jQuery.fn.removeProp = function(name) {
  return this.each(function() {
    try {
      delete this[name];
    } catch (e) {
      // 某些属性无法删除
    }
  });
};
```

## 什么时候用 attr，什么时候用 prop

### 使用 prop()

处理这些 DOM 属性时：

```javascript
// 布尔属性
$('input').prop('checked');
$('input').prop('disabled');
$('input').prop('selected');
$('input').prop('readonly');

// 当前值
$('input').prop('value');

// 原生属性
$('element').prop('tagName');
$('element').prop('nodeName');
```

### 使用 attr()

处理这些情况时：

```javascript
// 自定义属性
$('div').attr('data-id', '123');

// HTML 属性
$('img').attr('src', 'image.jpg');
$('a').attr('href', '/page');

// 初始值
$('input').attr('value');  // 原始值
```

### 速记

```javascript
// 布尔类型用 prop
$('input').prop('checked', true);
$('input').prop('disabled', false);

// 字符串类型用 attr
$('img').attr('src', 'image.jpg');
$('input').attr('placeholder', 'Enter text');
```

## 完整实现

```javascript
// src/attributes/attr.js

export function installAttrMethods(jQuery) {
  
  jQuery.fn.attr = function(name, value) {
    // getter
    if (typeof name === 'string' && value === undefined) {
      const elem = this[0];
      return elem?.getAttribute(name) ?? undefined;
    }
    
    // setter
    return this.each(function(index) {
      if (this.nodeType !== 1) return;
      
      if (typeof name === 'object' && name !== null) {
        // 对象形式
        Object.entries(name).forEach(([key, val]) => {
          if (val === null) {
            this.removeAttribute(key);
          } else {
            this.setAttribute(key, val);
          }
        });
      } else {
        // 单个属性
        const newValue = typeof value === 'function'
          ? value.call(this, index, this.getAttribute(name))
          : value;
        
        if (newValue === null) {
          this.removeAttribute(name);
        } else {
          this.setAttribute(name, newValue);
        }
      }
    });
  };
  
  jQuery.fn.removeAttr = function(name) {
    return this.each(function() {
      if (this.nodeType !== 1) return;
      
      name.split(/\s+/).forEach(attr => {
        if (attr) this.removeAttribute(attr);
      });
    });
  };
  
  jQuery.fn.prop = function(name, value) {
    // getter
    if (typeof name === 'string' && value === undefined) {
      const elem = this[0];
      return elem?.[name];
    }
    
    // setter
    return this.each(function(index) {
      if (typeof name === 'object' && name !== null) {
        Object.entries(name).forEach(([key, val]) => {
          this[key] = val;
        });
      } else {
        const newValue = typeof value === 'function'
          ? value.call(this, index, this[name])
          : value;
        
        this[name] = newValue;
      }
    });
  };
  
  jQuery.fn.removeProp = function(name) {
    return this.each(function() {
      try {
        delete this[name];
      } catch (e) {}
    });
  };
}
```

## 实际应用场景

### 场景 1：表单状态

```javascript
// 禁用/启用按钮
$('#submit').prop('disabled', !isValid);

// 全选/取消全选
$('#selectAll').on('change', function() {
  $('input[type="checkbox"]').prop('checked', this.checked);
});
```

### 场景 2：动态链接

```javascript
// 修改链接
$('a.download').attr('href', function(i, href) {
  return href + '?token=' + authToken;
});
```

### 场景 3：图片懒加载

```javascript
// 用 data-src 存储真实地址
$('img[data-src]').each(function() {
  $(this).attr('src', $(this).attr('data-src'));
});
```

### 场景 4：ARIA 属性

```javascript
// 可访问性属性
$('.menu').attr('aria-expanded', 'true');
$('.tab').attr({
  'role': 'tab',
  'aria-selected': 'false'
});
```

## 常见错误

```javascript
// ❌ 错误：用 attr 操作布尔状态
$('input').attr('checked', true);  // 可能不生效

// ✅ 正确：用 prop
$('input').prop('checked', true);

// ❌ 错误：用 prop 操作自定义属性
$('div').prop('data-id', '123');  // 不会反映到 HTML

// ✅ 正确：用 attr
$('div').attr('data-id', '123');
```

## 本章小结

attr 和 prop 的区别：

| 方面 | attr() | prop() |
|------|--------|--------|
| 操作层面 | HTML 属性 | DOM 属性 |
| 布尔值 | 字符串或 null | true/false |
| 当前值 | 初始值 | 实时值 |
| 适用场景 | 自定义属性、HTML 属性 | 状态属性、原生属性 |

记忆口诀：

- **布尔用 prop**：checked、disabled、selected
- **其他用 attr**：href、src、data-*、自定义属性

下一章，我们实现数据存储方法：`data()`。

---

**思考题**：`$('a').attr('href')` 和 `$('a').prop('href')` 返回的值有什么不同？（提示：相对路径 vs 绝对路径）
