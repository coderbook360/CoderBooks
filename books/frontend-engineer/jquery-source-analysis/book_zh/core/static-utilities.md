# 静态工具方法集：grep、merge、inArray

jQuery提供了一组静态工具方法，用于数组和类数组的常见操作。这些方法在jQuery内部广泛使用，也对外暴露供开发者使用。

本章分析 `grep`、`merge`、`inArray` 三个核心工具方法。

## $.grep：过滤数组

`$.grep` 类似于 `Array.prototype.filter`，但有一些特殊设计。

**源码实现**

```javascript
jQuery.grep = function( elems, callback, invert ) {
    var callbackInverse,
        matches = [],
        i = 0,
        length = elems.length,
        callbackExpect = !invert;

    for ( ; i < length; i++ ) {
        callbackInverse = !callback( elems[ i ], i );
        if ( callbackInverse !== callbackExpect ) {
            matches.push( elems[ i ] );
        }
    }

    return matches;
};
```

**参数说明**

- `elems`：要过滤的数组
- `callback`：过滤函数，返回 true 保留元素
- `invert`：反转结果，true 时保留回调返回 false 的元素

**使用示例**

```javascript
// 基本过滤
var nums = [1, 2, 3, 4, 5, 6];
var evens = $.grep(nums, function(val) {
    return val % 2 === 0;
});
// [2, 4, 6]

// 反转过滤
var odds = $.grep(nums, function(val) {
    return val % 2 === 0;
}, true);  // invert = true
// [1, 3, 5]
```

**invert参数的妙用**

`invert` 参数让一个过滤器能完成两种任务：

```javascript
function isDone(task) {
    return task.status === 'done';
}

var done = $.grep(tasks, isDone);          // 已完成
var notDone = $.grep(tasks, isDone, true); // 未完成
```

不需要写两个过滤函数。

**与Array.filter对比**

```javascript
// 原生
[1, 2, 3, 4, 5].filter(n => n > 2);

// jQuery
$.grep([1, 2, 3, 4, 5], n => n > 2);
```

区别：
- jQuery 有 invert 参数
- 回调参数顺序相同：`(value, index)`

## $.merge：合并数组

`$.merge` 将第二个数组的元素添加到第一个数组。

**源码实现**

```javascript
jQuery.merge = function( first, second ) {
    var len = +second.length,
        j = 0,
        i = first.length;

    for ( ; j < len; j++ ) {
        first[ i++ ] = second[ j ];
    }

    first.length = i;

    return first;
};
```

**关键点**

1. **修改第一个数组**：不创建新数组，直接在 first 上添加
2. **支持类数组**：通过索引赋值和修改 length，对类数组也有效
3. **返回第一个数组**：方便链式操作

**使用示例**

```javascript
var arr1 = [1, 2, 3];
var arr2 = [4, 5, 6];

$.merge(arr1, arr2);
console.log(arr1);  // [1, 2, 3, 4, 5, 6]

// 合并类数组
var divs = document.querySelectorAll('div');
var spans = document.querySelectorAll('span');
var combined = $.merge($.merge([], divs), spans);
// combined 是包含所有div和span的数组
```

**与Array.concat对比**

```javascript
// 原生 - 创建新数组
var result = arr1.concat(arr2);
// arr1 不变

// jQuery - 修改原数组
$.merge(arr1, arr2);
// arr1 被修改
```

**为什么修改原数组？**

jQuery的设计目标是性能。创建新数组需要额外的内存分配。在频繁操作大量DOM元素时，复用已有数组更高效。

需要保持原数组不变时：

```javascript
var result = $.merge([], arr1);  // 复制arr1
$.merge(result, arr2);           // 添加arr2
```

## $.inArray：查找索引

`$.inArray` 返回元素在数组中的索引。

**源码实现**

```javascript
jQuery.inArray = function( elem, arr, i ) {
    return arr == null ? -1 : Array.prototype.indexOf.call( arr, elem, i );
};
```

非常简洁——直接使用原生 `indexOf`。

**参数说明**

- `elem`：要查找的元素
- `arr`：数组
- `i`：开始搜索的索引

**使用示例**

```javascript
var fruits = ['apple', 'banana', 'cherry'];

$.inArray('banana', fruits);    // 1
$.inArray('grape', fruits);     // -1（不存在）
$.inArray('apple', fruits, 1);  // -1（从索引1开始找）

// 判断是否存在
if ($.inArray('apple', fruits) !== -1) {
    console.log('Found!');
}
```

**命名的历史**

为什么叫 `inArray` 而不是 `indexOf`？

这是jQuery早期的命名风格，强调"是否在数组中"的语义。现代建议直接使用 `Array.includes` 或 `Array.indexOf`：

```javascript
// 现代写法
fruits.includes('banana');     // true
fruits.indexOf('banana');      // 1
```

## $.makeArray：转换为数组

虽然不在标题中，但 `makeArray` 也是常用的工具方法。

**源码实现**

```javascript
jQuery.makeArray = function( arr, results ) {
    var ret = results || [];

    if ( arr != null ) {
        if ( isArrayLike( arr ) ) {
            jQuery.merge( ret, typeof arr === "string" ? [ arr ] : arr );
        } else {
            Array.prototype.push.call( ret, arr );
        }
    }

    return ret;
};
```

**使用示例**

```javascript
// NodeList转数组
var divs = document.querySelectorAll('div');
var arr = $.makeArray(divs);

// 现代替代
var arr = Array.from(divs);
// 或
var arr = [...divs];
```

## $.uniqueSort：去重并排序

用于DOM元素去重和按文档顺序排序。

**使用场景**

```javascript
var $parents = $('p').parent();  // 可能有重复
// 内部使用uniqueSort去重
```

**简化实现**

```javascript
jQuery.uniqueSort = function( results ) {
    var elem,
        duplicates = [],
        i = 0,
        j = 0;

    // 排序
    results.sort( sortOrder );  // 按DOM顺序排序

    // 去重（已排序，相邻比较）
    while ( ( elem = results[ i++ ] ) ) {
        if ( elem === results[ i ] ) {
            j = duplicates.push( i );
        }
    }
    while ( j-- ) {
        results.splice( duplicates[ j ], 1 );
    }

    return results;
};
```

## 工具方法设计原则

从这些工具方法中，我们可以总结设计原则：

**1. 功能单一**

每个方法只做一件事：
- grep：过滤
- merge：合并
- inArray：查找

**2. 支持类数组**

jQuery大量处理类数组（NodeList、jQuery对象等）。工具方法设计时考虑类数组兼容性。

**3. 实用优先**

`grep` 的 invert 参数、`merge` 修改原数组，都是基于实际使用场景的设计。

**4. 内部复用**

这些方法在jQuery内部被大量使用：
- `merge` 用于构建jQuery对象
- `grep` 用于实现 `filter`
- `inArray` 用于各种查找

## 现代替代方案

ES6+ 提供了对应的原生方法：

| jQuery | 原生替代 |
|--------|---------|
| $.grep | Array.filter |
| $.merge | concat / spread |
| $.inArray | indexOf / includes |
| $.makeArray | Array.from / spread |

```javascript
// jQuery
$.grep(arr, fn);
$.merge(arr1, arr2);
$.inArray(elem, arr);
$.makeArray(nodeList);

// 现代JavaScript
arr.filter(fn);
[...arr1, ...arr2];
arr.includes(elem);
[...nodeList];
```

## 小结

本章学习了jQuery的静态工具方法：

**$.grep**
- 过滤数组
- 支持 invert 反转
- 类似 Array.filter

**$.merge**
- 合并数组
- 修改第一个数组
- 支持类数组

**$.inArray**
- 查找索引
- 封装 indexOf
- 返回 -1 表示不存在

**$.makeArray**
- 类数组转数组
- 现代可用 Array.from

**设计原则**
- 功能单一
- 支持类数组
- 实用优先
- 内部复用

下一章，我们将学习 `noConflict` 方法，理解jQuery如何实现多库共存。
