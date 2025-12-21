# 字符串工具：trim、camelCase

字符串处理是日常开发中的常见需求。jQuery 提供了几个实用的字符串工具。

## $.trim

去除字符串两端空白：

```javascript
$.trim('  hello world  ')  // 'hello world'
$.trim('\n\t text \n')     // 'text'
```

### 实现

```javascript
function trim(str) {
  return str == null ? '' : String(str).trim();
}
```

现代浏览器都支持原生 `trim()`，这个方法主要是做空值保护。

## camelCase

将连字符命名转为驼峰命名：

```javascript
camelCase('margin-top')     // 'marginTop'
camelCase('background-color')  // 'backgroundColor'
camelCase('-webkit-transform') // 'WebkitTransform'
```

### 实现

```javascript
function camelCase(str) {
  return str.replace(/-([a-z])/g, (match, letter) => {
    return letter.toUpperCase();
  });
}
```

## kebabCase

驼峰转连字符：

```javascript
kebabCase('marginTop')      // 'margin-top'
kebabCase('backgroundColor') // 'background-color'
```

### 实现

```javascript
function kebabCase(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}
```

## 完整实现

```javascript
// src/utilities/string-utilities.js

export function installStringUtilities(jQuery) {
  
  // 去除首尾空白
  jQuery.trim = function(str) {
    return str == null ? '' : String(str).trim();
  };
  
  // 连字符转驼峰
  jQuery.camelCase = function(str) {
    // 处理 CSS 厂商前缀
    return str.replace(/^-ms-/, 'ms-')
              .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  };
  
  // 驼峰转连字符
  jQuery.kebabCase = function(str) {
    return str
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
      .toLowerCase();
  };
  
  // 首字母大写
  jQuery.capitalize = function(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };
  
  // HTML 转义
  jQuery.escapeHtml = function(str) {
    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return String(str).replace(/[&<>"']/g, char => escapeMap[char]);
  };
  
  // HTML 反转义
  jQuery.unescapeHtml = function(str) {
    const unescapeMap = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'"
    };
    return String(str).replace(/&(?:amp|lt|gt|quot|#39);/g, 
      entity => unescapeMap[entity] || entity);
  };
  
  // 正则转义
  jQuery.escapeRegex = function(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };
  
  // 截断字符串
  jQuery.truncate = function(str, length, suffix = '...') {
    if (!str || str.length <= length) {
      return str;
    }
    return str.slice(0, length - suffix.length) + suffix;
  };
  
  // 填充字符串
  jQuery.pad = function(str, length, char = ' ', position = 'end') {
    str = String(str);
    if (str.length >= length) return str;
    
    const padding = char.repeat(Math.ceil((length - str.length) / char.length))
                        .slice(0, length - str.length);
    
    return position === 'start' ? padding + str : str + padding;
  };
  
  // 重复字符串
  jQuery.repeat = function(str, times) {
    return String(str).repeat(times);
  };
  
  // 模板替换
  jQuery.template = function(str, data) {
    return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data.hasOwnProperty(key) ? data[key] : match;
    });
  };
  
  // 单词计数
  jQuery.wordCount = function(str) {
    if (!str) return 0;
    return str.trim().split(/\s+/).filter(Boolean).length;
  };
  
  // 是否包含
  jQuery.contains = function(str, substring) {
    return String(str).includes(substring);
  };
  
  // 是否以指定字符串开头
  jQuery.startsWith = function(str, prefix) {
    return String(str).startsWith(prefix);
  };
  
  // 是否以指定字符串结尾
  jQuery.endsWith = function(str, suffix) {
    return String(str).endsWith(suffix);
  };
}
```

## 使用示例

### CSS 属性名转换

```javascript
// DOM 操作中常用
function setStyle(elem, prop, value) {
  elem.style[$.camelCase(prop)] = value;
}

setStyle(div, 'margin-top', '10px');
// 等同于 div.style.marginTop = '10px'
```

### HTML 安全输出

```javascript
function renderComment(comment) {
  return `<div class="comment">
    <p>${$.escapeHtml(comment.text)}</p>
    <span>${$.escapeHtml(comment.author)}</span>
  </div>`;
}

// 防止 XSS
const malicious = '<script>alert("XSS")</script>';
$.escapeHtml(malicious);
// '&lt;script&gt;alert("XSS")&lt;/script&gt;'
```

### 简单模板

```javascript
const template = 'Hello, {{name}}! You have {{count}} messages.';

$.template(template, { name: 'John', count: 5 });
// 'Hello, John! You have 5 messages.'
```

### 正则构建

```javascript
function searchExact(text, keyword) {
  // 转义特殊字符，避免正则错误
  const escaped = $.escapeRegex(keyword);
  const regex = new RegExp(escaped, 'gi');
  return text.match(regex);
}

searchExact('price is $100', '$100');
// 正确匹配，不会把 $ 当作行尾
```

### 文本截断

```javascript
function formatTitle(title) {
  return $.truncate(title, 50);
}

formatTitle('This is a very long title that needs to be truncated');
// 'This is a very long title that needs to be tr...'
```

### 数字填充

```javascript
function formatId(id) {
  return $.pad(id, 6, '0', 'start');
}

formatId(42);    // '000042'
formatId(12345); // '012345'
```

## 实际应用

### 解析数据属性

```javascript
// data-my-attr -> myAttr
function parseDataAttributes(elem) {
  const result = {};
  
  for (const attr of elem.attributes) {
    if (attr.name.startsWith('data-')) {
      const key = $.camelCase(attr.name.slice(5));
      result[key] = attr.value;
    }
  }
  
  return result;
}
```

### CSS 类名生成

```javascript
function createBemClass(block, element, modifier) {
  let className = $.kebabCase(block);
  
  if (element) {
    className += '__' + $.kebabCase(element);
  }
  
  if (modifier) {
    className += '--' + $.kebabCase(modifier);
  }
  
  return className;
}

createBemClass('SearchBox', 'Input', 'Focused');
// 'search-box__input--focused'
```

### 输入验证

```javascript
function validateInput(value) {
  const trimmed = $.trim(value);
  
  if (!trimmed) {
    return { valid: false, error: '不能为空' };
  }
  
  if ($.wordCount(trimmed) < 3) {
    return { valid: false, error: '至少输入3个词' };
  }
  
  return { valid: true, value: trimmed };
}
```

## 本章小结

字符串工具：

- **$.trim()**：去除首尾空白
- **$.camelCase()**：转驼峰命名
- **$.kebabCase()**：转连字符命名
- **$.escapeHtml()**：HTML 转义
- **$.escapeRegex()**：正则转义
- **$.template()**：简单模板替换
- **$.truncate()**：截断字符串

应用场景：

- CSS 属性名转换
- 防止 XSS 攻击
- 动态正则构建
- 文本格式化
- 输入清理

下一章，我们实现 noConflict 多库共存。

---

**思考题**：为什么 `$.camelCase` 要特别处理 `-ms-` 前缀？`-ms-transform` 应该转成 `msTransform` 还是 `MsTransform`？
