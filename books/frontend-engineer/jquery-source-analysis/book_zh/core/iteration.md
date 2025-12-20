# each与map遍历方法

遍历是编程中最常见的操作。jQuery提供了 `each` 和 `map` 两个遍历方法，它们有相似之处，但用途不同。

```javascript
// each - 遍历执行，返回原对象
$('div').each(function(i, elem) {
    console.log(i, elem);
});

// map - 遍历转换，返回新数组
var ids = $('div').map(function(i, elem) {
    return elem.id;
}).get();
```

本章深入分析这两个方法的实现。

## each：遍历执行

`$.each` 是jQuery中使用最频繁的工具函数之一。

**静态方法：$.each()**

```javascript
jQuery.each = function( obj, callback ) {
    var length, i = 0;

    if ( isArrayLike( obj ) ) {
        // 数组或类数组
        length = obj.length;
        for ( ; i < length; i++ ) {
            if ( callback.call( obj[ i ], i, obj[ i ] ) === false ) {
                break;
            }
        }
    } else {
        // 对象
        for ( i in obj ) {
            if ( callback.call( obj[ i ], i, obj[ i ] ) === false ) {
                break;
            }
        }
    }

    return obj;
};
```

关键点：

**1. 区分数组和对象**

类数组使用 for 循环，普通对象使用 for-in。

**2. callback.call()**

```javascript
callback.call( obj[ i ], i, obj[ i ] )
```

- `this` 指向当前元素
- 第一个参数是索引/键名
- 第二个参数是值

**3. 中断遍历**

```javascript
if ( callback.call( ... ) === false ) {
    break;
}
```

回调返回 `false` 时中断遍历。这是jQuery的约定。

**4. 返回原对象**

```javascript
return obj;
```

返回传入的对象，虽然通常不用这个返回值。

**实例方法：$().each()**

```javascript
jQuery.fn.each = function( callback ) {
    return jQuery.each( this, callback );
};
```

实例方法直接调用静态方法，只是 `this` 作为第一个参数。

**使用示例**

```javascript
// 遍历数组
$.each([1, 2, 3], function(i, val) {
    console.log(i, val);
});
// 0 1
// 1 2
// 2 3

// 遍历对象
$.each({ a: 1, b: 2 }, function(key, val) {
    console.log(key, val);
});
// a 1
// b 2

// 遍历jQuery对象
$('div').each(function(i, elem) {
    $(this).addClass('item-' + i);
});

// 中断遍历
$.each([1, 2, 3, 4, 5], function(i, val) {
    console.log(val);
    if (val === 3) return false;  // 遇到3时停止
});
// 1
// 2
// 3
```

## map：遍历转换

`map` 用于遍历并收集返回值，生成新数组。

**静态方法：$.map()**

```javascript
jQuery.map = function( elems, callback, arg ) {
    var length, value,
        i = 0,
        ret = [];

    // 类数组
    if ( isArrayLike( elems ) ) {
        length = elems.length;
        for ( ; i < length; i++ ) {
            value = callback( elems[ i ], i, arg );
            if ( value != null ) {
                ret.push( value );
            }
        }

    // 对象
    } else {
        for ( i in elems ) {
            value = callback( elems[ i ], i, arg );
            if ( value != null ) {
                ret.push( value );
            }
        }
    }

    // 展平结果
    return ret.flat();
};
```

关键点：

**1. 收集返回值**

```javascript
value = callback( elems[ i ], i, arg );
if ( value != null ) {
    ret.push( value );
}
```

只收集非 `null`/`undefined` 的返回值。

**2. 展平结果**

```javascript
return ret.flat();
```

如果回调返回数组，会展平成一维数组。

**3. 回调参数顺序不同**

```javascript
// each: callback(index, value)
// map:  callback(value, index)
```

注意：`$.map` 的回调参数顺序是 `(value, index)`，与 `$.each` 相反！

这是jQuery的历史设计，与原生 `Array.prototype.map` 一致。

**实例方法：$().map()**

```javascript
jQuery.fn.map = function( callback ) {
    return this.pushStack( jQuery.map( this, function( elem, i ) {
        return callback.call( elem, i, elem );
    }));
};
```

实例版的特点：
- 回调中 `this` 指向当前元素
- 返回jQuery对象（通过pushStack）
- 回调参数顺序改为 `(index, elem)`，与 `$.fn.each` 一致

**使用示例**

```javascript
// 静态方法 - 参数顺序是(value, index)
var doubled = $.map([1, 2, 3], function(val, i) {
    return val * 2;
});
// [2, 4, 6]

// 过滤（返回null/undefined会被忽略）
var filtered = $.map([1, 2, 3, 4, 5], function(val) {
    return val > 2 ? val : null;
});
// [3, 4, 5]

// 展平
var flat = $.map([[1, 2], [3, 4]], function(arr) {
    return arr;
});
// [1, 2, 3, 4]

// 实例方法 - 参数顺序是(index, elem)
var ids = $('div').map(function(i, elem) {
    return elem.id;
}).get();
// ['div1', 'div2', ...]
```

## each vs map

| 特性 | each | map |
|------|------|-----|
| 目的 | 遍历执行 | 遍历转换 |
| 返回值 | 原对象/jQuery对象 | 新数组/jQuery对象 |
| 回调返回值 | 用于中断 | 收集为结果 |
| 中断 | return false | 不支持 |
| 修改 | 原地修改 | 生成新集合 |

**选择指南**

```javascript
// 需要遍历执行操作 - 用 each
$('div').each(function() {
    $(this).addClass('visited');
});

// 需要提取/转换数据 - 用 map
var texts = $('p').map(function() {
    return $(this).text();
}).get();
```

## 与原生方法对比

**Array.prototype.forEach**

```javascript
// 原生
[1, 2, 3].forEach(function(val, i, arr) {
    console.log(val);
});

// jQuery
$.each([1, 2, 3], function(i, val) {
    console.log(val);
});
```

区别：
- 参数顺序不同
- jQuery支持中断
- jQuery支持遍历对象

**Array.prototype.map**

```javascript
// 原生
[1, 2, 3].map(function(val, i, arr) {
    return val * 2;
});

// jQuery
$.map([1, 2, 3], function(val, i) {
    return val * 2;
});
```

区别：
- jQuery过滤 null/undefined
- jQuery展平返回的数组
- jQuery支持遍历对象

## 性能考虑

**for循环 vs forEach vs $.each**

在现代JavaScript引擎中，三者性能差异很小。选择应该基于代码可读性：

```javascript
// 最快，但代码较长
for (let i = 0; i < arr.length; i++) {
    doSomething(arr[i]);
}

// 现代风格，推荐
arr.forEach(item => doSomething(item));

// jQuery对象使用
$elements.each(function() {
    doSomething(this);
});
```

**批量操作 vs 遍历**

```javascript
// 不好 - 多次DOM操作
$('div').each(function() {
    $(this).addClass('item');
});

// 好 - 利用jQuery的隐式迭代
$('div').addClass('item');
```

jQuery的内置方法已经内部使用了遍历，不需要再包一层 each。

## 小结

本章学习了jQuery的遍历方法：

**$.each / $().each**
- 遍历执行操作
- 回调：`function(index, value)`
- `this` 指向当前元素
- `return false` 中断遍历
- 返回原对象

**$.map / $().map**
- 遍历收集返回值
- 静态方法回调：`function(value, index)`
- 实例方法回调：`function(index, elem)`
- 过滤 null/undefined
- 展平数组结果

**实现要点**
- 区分数组和对象
- 使用 call 绑定 this
- 支持遍历中断（each）

下一章，我们将学习更多静态工具方法：grep、merge、inArray。
