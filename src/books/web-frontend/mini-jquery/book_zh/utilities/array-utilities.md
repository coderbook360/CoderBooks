# 数组工具：each、map、grep

jQuery 提供了一套独立于原型的数组操作工具，既可用于数组，也可用于对象。

## 为什么需要 $.each

原生数组方法是原型方法：

```javascript
[1, 2, 3].forEach(fn)  // 只能用于数组
```

jQuery 的工具函数：

```javascript
$.each([1, 2, 3], fn)  // 数组
$.each({a: 1}, fn)     // 对象也行
$.each(nodeList, fn)   // 类数组也行
```

## $.each

遍历数组或对象：

```javascript
// 数组
$.each([1, 2, 3], function(index, value) {
  console.log(index, value);
});
// 0, 1
// 1, 2
// 2, 3

// 对象
$.each({a: 1, b: 2}, function(key, value) {
  console.log(key, value);
});
// 'a', 1
// 'b', 2
```

### 实现

```javascript
function each(obj, callback) {
  if (isArrayLike(obj)) {
    // 类数组
    for (let i = 0; i < obj.length; i++) {
      // 回调返回 false 则停止
      if (callback.call(obj[i], i, obj[i]) === false) {
        break;
      }
    }
  } else {
    // 对象
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (callback.call(obj[key], key, obj[key]) === false) {
          break;
        }
      }
    }
  }
  return obj;
}
```

### 中断遍历

```javascript
$.each([1, 2, 3, 4, 5], function(i, v) {
  console.log(v);
  if (v === 3) {
    return false;  // 停止遍历
  }
});
// 输出: 1, 2, 3
```

## $.map

映射数组或对象为新数组：

```javascript
// 数组
const doubled = $.map([1, 2, 3], function(value, index) {
  return value * 2;
});
// [2, 4, 6]

// 对象
const values = $.map({a: 1, b: 2}, function(value, key) {
  return value;
});
// [1, 2]
```

### 实现

```javascript
function map(obj, callback) {
  const result = [];
  
  if (isArrayLike(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const value = callback(obj[i], i);
      if (value != null) {
        result.push(value);
      }
    }
  } else {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = callback(obj[key], key);
        if (value != null) {
          result.push(value);
        }
      }
    }
  }
  
  // 扁平化一层
  return result.flat();
}
```

### 返回数组展开

```javascript
$.map([1, 2], function(v) {
  return [v, v * 2];
});
// [1, 2, 2, 4]  - 结果被展开
```

### 返回 null 跳过

```javascript
$.map([1, 2, 3, 4], function(v) {
  if (v % 2 === 0) {
    return v;
  }
  // 奇数返回 undefined，被跳过
});
// [2, 4]
```

## $.grep

过滤数组：

```javascript
const evens = $.grep([1, 2, 3, 4, 5], function(value, index) {
  return value % 2 === 0;
});
// [2, 4]

// 反向过滤
const odds = $.grep([1, 2, 3, 4, 5], function(value) {
  return value % 2 === 0;
}, true);  // 第三个参数表示反向
// [1, 3, 5]
```

### 实现

```javascript
function grep(array, callback, invert) {
  const result = [];
  
  for (let i = 0; i < array.length; i++) {
    const match = !!callback(array[i], i);
    
    if (match !== invert) {
      result.push(array[i]);
    }
  }
  
  return result;
}
```

## $.inArray

查找元素索引：

```javascript
$.inArray(2, [1, 2, 3])     // 1
$.inArray(4, [1, 2, 3])     // -1
$.inArray(2, [1, 2, 3], 2)  // -1 (从索引 2 开始找)
```

### 实现

```javascript
function inArray(elem, array, fromIndex = 0) {
  return array.indexOf(elem, fromIndex);
}
```

## $.makeArray

将类数组转为真正的数组：

```javascript
const arr = $.makeArray(document.querySelectorAll('div'));
// NodeList → Array
```

### 实现

```javascript
function makeArray(arrayLike) {
  return Array.from(arrayLike);
}
```

## $.merge

合并两个数组：

```javascript
const arr1 = [1, 2];
const arr2 = [3, 4];
$.merge(arr1, arr2);
// arr1 现在是 [1, 2, 3, 4]
```

### 实现

```javascript
function merge(first, second) {
  const len = second.length;
  let j = first.length;
  
  for (let i = 0; i < len; i++) {
    first[j++] = second[i];
  }
  
  first.length = j;
  return first;
}
```

## $.unique (去重)

```javascript
const arr = [1, 2, 2, 3, 3, 3];
$.unique(arr);  // [1, 2, 3]
```

### 实现

```javascript
function unique(array) {
  return [...new Set(array)];
}
```

## 完整实现

```javascript
// src/utilities/array-utilities.js

export function installArrayUtilities(jQuery) {
  
  // 遍历
  jQuery.each = function(obj, callback) {
    if (jQuery.isArrayLike(obj)) {
      for (let i = 0; i < obj.length; i++) {
        if (callback.call(obj[i], i, obj[i]) === false) {
          break;
        }
      }
    } else {
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
  
  // 映射
  jQuery.map = function(obj, callback) {
    const result = [];
    
    if (jQuery.isArrayLike(obj)) {
      for (let i = 0; i < obj.length; i++) {
        const value = callback(obj[i], i);
        if (value != null) {
          if (Array.isArray(value)) {
            result.push(...value);
          } else {
            result.push(value);
          }
        }
      }
    } else {
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const value = callback(obj[key], key);
          if (value != null) {
            if (Array.isArray(value)) {
              result.push(...value);
            } else {
              result.push(value);
            }
          }
        }
      }
    }
    
    return result;
  };
  
  // 过滤
  jQuery.grep = function(array, callback, invert = false) {
    const result = [];
    
    for (let i = 0; i < array.length; i++) {
      const match = !!callback(array[i], i);
      if (match !== invert) {
        result.push(array[i]);
      }
    }
    
    return result;
  };
  
  // 查找索引
  jQuery.inArray = function(elem, array, fromIndex = 0) {
    if (!array) return -1;
    return Array.prototype.indexOf.call(array, elem, fromIndex);
  };
  
  // 类数组转数组
  jQuery.makeArray = function(arrayLike, result = []) {
    if (arrayLike == null) {
      return result;
    }
    
    if (jQuery.isArrayLike(arrayLike)) {
      jQuery.merge(result, 
        typeof arrayLike === 'string' ? [arrayLike] : arrayLike
      );
    } else {
      result.push(arrayLike);
    }
    
    return result;
  };
  
  // 合并数组
  jQuery.merge = function(first, second) {
    const len = second.length;
    let j = first.length;
    
    for (let i = 0; i < len; i++) {
      first[j++] = second[i];
    }
    
    first.length = j;
    return first;
  };
  
  // 去重
  jQuery.unique = function(array) {
    return [...new Set(array)];
  };
  
  // 去重 DOM 元素（保持文档顺序）
  jQuery.uniqueSort = function(elements) {
    const seen = new Set();
    const result = [];
    
    for (const elem of elements) {
      if (!seen.has(elem)) {
        seen.add(elem);
        result.push(elem);
      }
    }
    
    // 按文档顺序排序
    return result.sort((a, b) => {
      if (a === b) return 0;
      const position = a.compareDocumentPosition(b);
      return position & 4 ? -1 : 1;
    });
  };
}
```

## 使用示例

### 数据转换

```javascript
const users = [
  { id: 1, name: 'John', active: true },
  { id: 2, name: 'Jane', active: false },
  { id: 3, name: 'Bob', active: true }
];

// 获取活跃用户名
const activeNames = $.map(
  $.grep(users, u => u.active),
  u => u.name
);
// ['John', 'Bob']
```

### 对象遍历

```javascript
const config = {
  host: 'localhost',
  port: 3000,
  debug: true
};

$.each(config, function(key, value) {
  console.log(`${key} = ${value}`);
});
```

### DOM 批量操作

```javascript
$.each($('.item'), function(index, elem) {
  $(elem).text('Item ' + (index + 1));
});
```

### 数据分组

```javascript
function groupBy(array, key) {
  const groups = {};
  
  $.each(array, function(_, item) {
    const groupKey = item[key];
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
  });
  
  return groups;
}
```

## 本章小结

数组工具方法：

- **$.each()**：遍历数组或对象
- **$.map()**：映射为新数组
- **$.grep()**：过滤数组
- **$.inArray()**：查找索引
- **$.makeArray()**：类数组转数组
- **$.merge()**：合并数组
- **$.unique()**：去重

特点：

- 可用于数组、对象、类数组
- 回调返回 false 可中断 each
- map 返回 null 跳过，返回数组展开

下一章，我们实现对象工具函数。

---

**思考题**：`$.each` 和 `$.map` 的回调参数顺序是 `(index, value)`，而原生数组方法是 `(value, index)`。这个设计有什么考虑？
