# 内容操作：text/html/val

`text()`、`html()` 和 `val()` 是获取和设置元素内容的核心方法。这一章，我们实现这三个方法。

## text()：纯文本内容

`text()` 用于获取或设置元素的纯文本内容。

### 获取文本

```javascript
$('.content').text();  // 返回文本内容
```

获取时会：
- 返回所有匹配元素的合并文本
- 包含后代元素的文本
- 不包含 HTML 标签

### 设置文本

```javascript
$('.content').text('Hello World');
```

设置时会：
- 替换所有内容
- 自动转义 HTML 特殊字符（安全）

### 实现

```javascript
jQuery.fn.text = function(value) {
  // 获取模式
  if (value === undefined) {
    let result = '';
    this.each(function() {
      result += this.textContent || '';
    });
    return result;
  }
  
  // 设置模式
  return this.each(function(index) {
    // 处理函数参数
    const newValue = typeof value === 'function'
      ? value.call(this, index, this.textContent)
      : value;
    
    this.textContent = newValue == null ? '' : String(newValue);
  });
};
```

### 使用示例

```javascript
// 获取文本
$('p').text();  // "Hello World"

// 设置文本（HTML 被转义）
$('p').text('<script>alert(1)</script>');
// 显示为字面文本，不会执行

// 函数形式
$('p').text((index, oldText) => oldText.toUpperCase());
```

## html()：HTML 内容

`html()` 用于获取或设置元素的 HTML 内容。

### 获取 HTML

```javascript
$('.content').html();  // 返回内部 HTML
```

只返回**第一个**匹配元素的 innerHTML。

### 设置 HTML

```javascript
$('.content').html('<span>new content</span>');
```

### 实现

```javascript
jQuery.fn.html = function(value) {
  // 获取模式
  if (value === undefined) {
    const first = this[0];
    return first ? first.innerHTML : undefined;
  }
  
  // 设置模式
  return this.each(function(index) {
    // 处理函数参数
    const newValue = typeof value === 'function'
      ? value.call(this, index, this.innerHTML)
      : value;
    
    // 清理旧内容的数据
    // cleanData(this.querySelectorAll('*'));
    
    // 设置新内容
    if (typeof newValue === 'string') {
      this.innerHTML = newValue;
    } else if (newValue == null) {
      this.innerHTML = '';
    }
  });
};
```

### 安全注意事项

`html()` 会解析并执行 HTML：

```javascript
// 危险！不要用于用户输入
$('.content').html(userInput);

// 安全的做法是使用 text()
$('.content').text(userInput);

// 或者先清理
$('.content').html(sanitize(userInput));
```

## val()：表单值

`val()` 用于获取或设置表单元素的值。

### 获取值

```javascript
$('input').val();       // 输入框的值
$('select').val();      // 选中选项的值
$('textarea').val();    // 文本域的值
```

### 设置值

```javascript
$('input').val('new value');
$('select').val('option2');
```

### 特殊处理

不同表单元素需要不同处理：

- **input/textarea**：使用 `value` 属性
- **select**：需要找到并选中对应的 option
- **checkbox/radio**：可能返回数组

### 实现

```javascript
jQuery.fn.val = function(value) {
  // 获取模式
  if (value === undefined) {
    const elem = this[0];
    if (!elem) return undefined;
    
    const tag = elem.tagName;
    
    // select 元素
    if (tag === 'SELECT') {
      if (elem.multiple) {
        // 多选：返回数组
        return [...elem.selectedOptions].map(opt => opt.value);
      }
      // 单选：返回选中值
      const selected = elem.selectedOptions[0];
      return selected ? selected.value : '';
    }
    
    // 其他元素
    return elem.value || '';
  }
  
  // 设置模式
  return this.each(function(index) {
    // 只处理表单元素
    if (this.nodeType !== 1) return;
    
    // 处理函数参数
    let newValue = typeof value === 'function'
      ? value.call(this, index, this.value)
      : value;
    
    // null/undefined 转为空字符串
    if (newValue == null) {
      newValue = '';
    }
    
    const tag = this.tagName;
    
    // select 元素
    if (tag === 'SELECT') {
      const values = Array.isArray(newValue) ? newValue : [newValue];
      [...this.options].forEach(opt => {
        opt.selected = values.includes(opt.value);
      });
    }
    // checkbox/radio 
    else if (this.type === 'checkbox' || this.type === 'radio') {
      const values = Array.isArray(newValue) ? newValue : [String(newValue)];
      this.checked = values.includes(this.value);
    }
    // 其他
    else {
      this.value = newValue;
    }
  });
};
```

### 复选框和单选框

```javascript
// 获取选中的复选框值
$('input[type="checkbox"]:checked').map(function() {
  return this.value;
}).get();

// 设置复选框（通过 val）
$('input[type="checkbox"]').val(['option1', 'option3']);
// 选中 value 为 option1 和 option3 的复选框
```

## 完整实现

```javascript
// src/manipulation/text-html.js

export function installContentMethods(jQuery) {
  
  jQuery.fn.text = function(value) {
    if (value === undefined) {
      let result = '';
      this.each(function() {
        result += this.textContent || '';
      });
      return result;
    }
    
    return this.each(function(index) {
      const newValue = typeof value === 'function'
        ? value.call(this, index, this.textContent)
        : value;
      
      this.textContent = newValue == null ? '' : String(newValue);
    });
  };
  
  jQuery.fn.html = function(value) {
    if (value === undefined) {
      const first = this[0];
      return first?.innerHTML;
    }
    
    return this.each(function(index) {
      const newValue = typeof value === 'function'
        ? value.call(this, index, this.innerHTML)
        : value;
      
      // 清理旧数据（需要 cleanData 支持）
      
      if (newValue == null) {
        this.innerHTML = '';
      } else if (typeof newValue === 'string') {
        this.innerHTML = newValue;
      } else if (newValue.nodeType) {
        this.innerHTML = '';
        this.appendChild(newValue);
      }
    });
  };
  
  jQuery.fn.val = function(value) {
    if (value === undefined) {
      const elem = this[0];
      if (!elem) return undefined;
      
      if (elem.tagName === 'SELECT') {
        if (elem.multiple) {
          return [...elem.selectedOptions].map(opt => opt.value);
        }
        return elem.selectedOptions[0]?.value ?? '';
      }
      
      return elem.value ?? '';
    }
    
    return this.each(function(index) {
      if (this.nodeType !== 1) return;
      
      let newValue = typeof value === 'function'
        ? value.call(this, index, this.value)
        : value;
      
      if (newValue == null) newValue = '';
      
      if (this.tagName === 'SELECT') {
        const values = Array.isArray(newValue) ? newValue : [String(newValue)];
        [...this.options].forEach(opt => {
          opt.selected = values.includes(opt.value);
        });
      } else if (this.type === 'checkbox' || this.type === 'radio') {
        const values = Array.isArray(newValue) 
          ? newValue.map(String) 
          : [String(newValue)];
        this.checked = values.includes(this.value);
      } else {
        this.value = String(newValue);
      }
    });
  };
}
```

## 实际应用场景

### 场景 1：安全显示用户内容

```javascript
// 使用 text() 防止 XSS
$('.user-comment').text(comment);
```

### 场景 2：动态生成内容

```javascript
// 使用 html() 插入富文本
$('.article-body').html(articleContent);
```

### 场景 3：表单序列化

```javascript
// 收集表单数据
const data = {};
$('form').find('input, select, textarea').each(function() {
  if (this.name) {
    data[this.name] = $(this).val();
  }
});
```

### 场景 4：表单重置

```javascript
// 清空表单
$('form').find('input, textarea').val('');
$('form').find('select').val('');  // 选第一个
```

### 场景 5：实时预览

```javascript
$('#editor').on('input', function() {
  const content = $(this).val();
  $('.preview').html(marked(content)); // markdown 渲染
});
```

### 场景 6：批量设置

```javascript
// 给所有价格加上货币符号
$('.price').text(function(i, text) {
  return '¥' + parseFloat(text).toFixed(2);
});
```

## 三个方法的对比

| 方法 | 获取返回 | 设置内容 | 安全性 |
|------|----------|----------|--------|
| `text()` | 合并所有元素的文本 | 纯文本，HTML 被转义 | 安全 |
| `html()` | 第一个元素的 innerHTML | HTML，会被解析执行 | 不安全 |
| `val()` | 第一个元素的值 | 表单值 | 安全 |

## 本章小结

内容操作方法：

- **text()**：处理纯文本，自动转义，用于安全显示
- **html()**：处理 HTML，需要注意 XSS 风险
- **val()**：处理表单元素，支持各种输入类型

共同特点：

- 无参数时是 getter，有参数时是 setter
- setter 支持函数参数
- 返回 jQuery 对象以支持链式调用

## 表单序列化：serialize 与 serializeArray

表单提交是 Web 开发中的常见需求。jQuery 提供了两个方法来序列化表单数据。

### serializeArray()

返回表单数据的对象数组：

```javascript
$('form').serializeArray();
// [
//   { name: 'username', value: 'john' },
//   { name: 'password', value: '123456' },
//   { name: 'remember', value: 'on' }
// ]
```

实现：

```javascript
jQuery.fn.serializeArray = function() {
  const result = [];
  
  // 获取所有表单元素
  const elements = this[0].elements || this.find('input, select, textarea');
  
  [...elements].forEach(elem => {
    const name = elem.name;
    const type = elem.type;
    
    // 跳过没有 name 的元素
    if (!name) return;
    
    // 跳过禁用的元素
    if (elem.disabled) return;
    
    // 跳过未选中的 checkbox/radio
    if ((type === 'checkbox' || type === 'radio') && !elem.checked) return;
    
    // 跳过文件和按钮
    if (type === 'file' || type === 'submit' || type === 'reset' || type === 'button') return;
    
    // select-multiple 特殊处理
    if (type === 'select-multiple') {
      [...elem.selectedOptions].forEach(opt => {
        result.push({ name, value: opt.value });
      });
      return;
    }
    
    result.push({ name, value: elem.value });
  });
  
  return result;
};
```

### serialize()

返回 URL 编码的查询字符串：

```javascript
$('form').serialize();
// "username=john&password=123456&remember=on"
```

实现：

```javascript
jQuery.fn.serialize = function() {
  return this.serializeArray()
    .map(item => encodeURIComponent(item.name) + '=' + encodeURIComponent(item.value))
    .join('&');
};
```

### 使用场景

```javascript
// Ajax 表单提交
$('form').on('submit', function(e) {
  e.preventDefault();
  
  $.post('/api/login', $(this).serialize())
    .then(result => {
      console.log('Success:', result);
    });
});

// 获取表单数据对象
function getFormData($form) {
  const data = {};
  $form.serializeArray().forEach(item => {
    if (data[item.name]) {
      // 多值字段转为数组
      if (!Array.isArray(data[item.name])) {
        data[item.name] = [data[item.name]];
      }
      data[item.name].push(item.value);
    } else {
      data[item.name] = item.value;
    }
  });
  return data;
}
```

## 本章小结

内容操作方法：

- **text()**：处理纯文本，自动转义，用于安全显示
- **html()**：处理 HTML，需要注意 XSS 风险
- **val()**：处理表单元素，支持各种输入类型
- **serialize()**：将表单序列化为 URL 编码字符串
- **serializeArray()**：将表单序列化为对象数组

共同特点：

- 无参数时是 getter，有参数时是 setter
- setter 支持函数参数
- 返回 jQuery 对象以支持链式调用

至此，DOM 操作部分完成。下一部分，我们将实现属性和样式操作。

---

**思考题**：`$('.item').text()` 会合并所有元素的文本，但 `$('.item').html()` 只返回第一个元素的 HTML。为什么设计成这样？什么情况下这个区别很重要？
