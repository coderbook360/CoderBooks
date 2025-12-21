# 迭代方法：each/map

迭代方法用于遍历和转换集合中的元素。这一章，我们实现两个核心迭代方法。

## each()：遍历元素

`each()` 对每个元素执行回调函数：

```javascript
$('li').each(function(index, element) {
  console.log(index, element.textContent);
});
```

### 基础实现

```javascript
jQuery.fn.each = function(callback) {
  for (let i = 0; i < this.length; i++) {
    // 回调返回 false 时停止遍历
    const result = callback.call(this[i], i, this[i]);
    if (result === false) {
      break;
    }
  }
  return this; // 返回自身以支持链式调用
};
```

### 回调函数的参数

```javascript
$('.item').each(function(index, element) {
  // this === element（当前 DOM 元素）
  // index：当前索引
  // element：当前元素（与 this 相同）
  
  console.log(this === element); // true
});
```

jQuery 同时传递 `index` 和 `element`，让你可以选择使用：

```javascript
// 只需要索引
$('.item').each(function(i) {
  $(this).text(`Item ${i + 1}`);
});

// 只需要元素
$('.item').each(function(_, el) {
  el.dataset.processed = 'true';
});
```

### 提前终止遍历

返回 `false` 可以终止遍历：

```javascript
$('.item').each(function() {
  if ($(this).hasClass('stop')) {
    return false; // 停止遍历
  }
  // 处理元素
});

// 注意：return（无值）或 return true 会继续遍历
$('.item').each(function() {
  if ($(this).hasClass('skip')) {
    return; // 跳过当前，继续下一个
  }
  // 处理元素
});
```

## map()：转换元素

`map()` 将每个元素映射为新值：

```javascript
const texts = $('li').map(function(index, element) {
  return $(this).text();
}).get(); // 注意：需要 .get() 转为数组
```

### 基础实现

```javascript
jQuery.fn.map = function(callback) {
  const result = [];
  
  for (let i = 0; i < this.length; i++) {
    const value = callback.call(this[i], i, this[i]);
    
    // null 和 undefined 会被忽略
    if (value != null) {
      // 数组会被展开
      if (Array.isArray(value)) {
        result.push(...value);
      } else {
        result.push(value);
      }
    }
  }
  
  return this.pushStack(result);
};
```

### 返回值处理

`map()` 对返回值有特殊处理：

```javascript
// 返回 null/undefined 会被忽略
$('li').map(function() {
  const text = $(this).text();
  return text.length > 5 ? text : null;
});

// 返回数组会被展开
$('li').map(function() {
  return [$(this).text(), $(this).data('id')];
});
// 结果：['text1', 'id1', 'text2', 'id2', ...]
```

### map() 返回 jQuery 对象

注意 `map()` 返回的是 jQuery 对象：

```javascript
$('li').map(function() {
  return $(this).text();
});
// 返回 jQuery 对象，类数组结构

// 要得到真正的数组，需要 .get()
$('li').map(function() {
  return $(this).text();
}).get();
// 返回 ['item1', 'item2', ...]
```

## $.each()：通用遍历

jQuery 还提供静态方法 `$.each()` 遍历任意对象：

```javascript
// 遍历数组
$.each(['a', 'b', 'c'], function(index, value) {
  console.log(index, value);
});

// 遍历对象
$.each({ name: 'John', age: 30 }, function(key, value) {
  console.log(key, value);
});
```

### 实现

```javascript
jQuery.each = function(obj, callback) {
  if (Array.isArray(obj) || obj.length !== undefined) {
    // 数组或类数组
    for (let i = 0; i < obj.length; i++) {
      if (callback.call(obj[i], i, obj[i]) === false) {
        break;
      }
    }
  } else {
    // 普通对象
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (callback.call(obj[key], key, obj[key]) === false) {
          break;
        }
      }
    }
  }
  return obj;
};
```

## $.map()：通用映射

```javascript
// 映射数组
$.map([1, 2, 3], function(value, index) {
  return value * 2;
});
// 返回 [2, 4, 6]

// 映射对象
$.map({ a: 1, b: 2 }, function(value, key) {
  return value * 2;
});
// 返回 [2, 4]
```

### 实现

```javascript
jQuery.map = function(obj, callback) {
  const result = [];
  
  if (Array.isArray(obj) || obj.length !== undefined) {
    for (let i = 0; i < obj.length; i++) {
      const value = callback(obj[i], i);
      if (value != null) {
        result.push(...(Array.isArray(value) ? value : [value]));
      }
    }
  } else {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = callback(obj[key], key);
        if (value != null) {
          result.push(...(Array.isArray(value) ? value : [value]));
        }
      }
    }
  }
  
  return result;
};
```

注意参数顺序的区别：

- `$().map(index, element)` - 索引在前
- `$.map(value, index)` - 值在前（与原生 Array.map 一致）

## 完整的迭代模块

```javascript
// src/core/iteration.js

export function installIterationMethods(jQuery) {
  
  // 实例方法 each
  jQuery.fn.each = function(callback) {
    for (let i = 0; i < this.length; i++) {
      if (callback.call(this[i], i, this[i]) === false) {
        break;
      }
    }
    return this;
  };
  
  // 实例方法 map
  jQuery.fn.map = function(callback) {
    const result = [];
    
    for (let i = 0; i < this.length; i++) {
      const value = callback.call(this[i], i, this[i]);
      if (value != null) {
        if (Array.isArray(value)) {
          result.push(...value);
        } else {
          result.push(value);
        }
      }
    }
    
    return this.pushStack(result);
  };
  
  // 静态方法 each
  jQuery.each = function(obj, callback) {
    const isArrayLike = Array.isArray(obj) || 
      (obj.length !== undefined && typeof obj !== 'function');
    
    if (isArrayLike) {
      for (let i = 0; i < obj.length; i++) {
        if (callback.call(obj[i], i, obj[i]) === false) break;
      }
    } else {
      for (const key in obj) {
        if (Object.hasOwn(obj, key)) {
          if (callback.call(obj[key], key, obj[key]) === false) break;
        }
      }
    }
    
    return obj;
  };
  
  // 静态方法 map
  jQuery.map = function(obj, callback) {
    const result = [];
    const isArrayLike = Array.isArray(obj) || 
      (obj.length !== undefined && typeof obj !== 'function');
    
    if (isArrayLike) {
      for (let i = 0; i < obj.length; i++) {
        const value = callback(obj[i], i);
        if (value != null) {
          result.push(...(Array.isArray(value) ? value : [value]));
        }
      }
    } else {
      for (const key in obj) {
        if (Object.hasOwn(obj, key)) {
          const value = callback(obj[key], key);
          if (value != null) {
            result.push(...(Array.isArray(value) ? value : [value]));
          }
        }
      }
    }
    
    return result;
  };
}
```

## 实际应用场景

### 场景 1：批量初始化

```javascript
$('.accordion').each(function() {
  new Accordion(this);
});
```

### 场景 2：收集表单数据

```javascript
const formData = {};

$('form input').each(function() {
  formData[this.name] = this.value;
});

// 或者用 map
const values = $('form input').map(function() {
  return { name: this.name, value: this.value };
}).get();
```

### 场景 3：提取数据

```javascript
// 获取所有链接的 href
const urls = $('a').map(function() {
  return this.href;
}).get();

// 获取所有选中复选框的值
const selected = $('input:checked').map(function() {
  return this.value;
}).get();
```

### 场景 4：条件处理

```javascript
$('.item').each(function(i) {
  if (i >= 10) {
    return false; // 只处理前 10 个
  }
  $(this).addClass('processed');
});
```

### 场景 5：异步操作收集

```javascript
const promises = $('.async-item').map(function() {
  return fetch($(this).data('url'));
}).get();

Promise.all(promises).then(results => {
  console.log('全部加载完成');
});
```

## 与原生方法的对比

### forEach vs each

```javascript
// 原生 forEach
document.querySelectorAll('li').forEach((el, i) => {
  console.log(i, el);
});

// jQuery each
$('li').each(function(i, el) {
  console.log(i, el);
});

// 区别：
// 1. forEach 不能提前终止
// 2. each 的 this 是当前元素
// 3. each 返回 jQuery 对象
```

### Array.map vs $.map

```javascript
// 原生 map
[1, 2, 3].map((v, i) => v * 2);
// [2, 4, 6]

// jQuery map
$.map([1, 2, 3], (v, i) => v * 2);
// [2, 4, 6]

// 区别：
// 1. 参数顺序不同
// 2. jQuery map 会展开数组返回值
// 3. jQuery map 会忽略 null/undefined
```

## 性能考虑

```javascript
// 如果只是遍历，for 循环最快
for (let i = 0; i < elements.length; i++) {
  // ...
}

// each() 有函数调用开销
$elements.each(function() {
  // ...
});

// 但通常差异可忽略，可读性更重要
```

## 本章小结

迭代方法对比：

| 方法 | 用途 | 返回值 |
|------|------|--------|
| `$().each()` | 遍历元素 | 原 jQuery 对象 |
| `$().map()` | 转换元素 | 新 jQuery 对象 |
| `$.each()` | 遍历任意对象 | 原对象 |
| `$.map()` | 转换任意对象 | 数组 |

关键特点：

- `each()` 支持 `return false` 终止
- `map()` 忽略 `null/undefined`
- `map()` 展开数组返回值
- 实例方法和静态方法参数顺序不同

至此，DOM 遍历部分完成。下一部分，我们将实现 DOM 操作方法。

---

**思考题**：如何实现一个 `reduce()` 方法，类似数组的 reduce？例如 `$('li').reduce((sum, el) => sum + $(el).height(), 0)` 计算所有 li 的高度总和。
