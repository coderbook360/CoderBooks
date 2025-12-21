# extend 方法：灵活的对象合并

`$.extend` 是 jQuery 中最重要的工具方法之一。它不仅用于合并对象，还是整个插件系统的基础。

## extend 的基本用法

```javascript
// 合并对象
const result = $.extend({ a: 1 }, { b: 2 }, { c: 3 });
// { a: 1, b: 2, c: 3 }

// 后面的属性覆盖前面的
const result2 = $.extend({ a: 1, b: 2 }, { b: 3, c: 4 });
// { a: 1, b: 3, c: 4 }
```

看起来很简单，和 `Object.assign` 差不多。但 jQuery 的 `extend` 更强大。

## 扩展到目标对象

`extend` 的第一个参数是目标对象，后面的对象都会合并到它上面：

```javascript
const target = { a: 1 };
$.extend(target, { b: 2 }, { c: 3 });

console.log(target);  // { a: 1, b: 2, c: 3 }
```

这意味着 `extend` 会**修改**第一个参数。如果你不想修改原对象，传一个空对象：

```javascript
const result = $.extend({}, obj1, obj2);  // obj1 和 obj2 都不会被修改
```

## 深拷贝 vs 浅拷贝

默认情况下，`extend` 是浅拷贝：

```javascript
const obj1 = { user: { name: 'John' } };
const obj2 = { user: { age: 30 } };
const result = $.extend({}, obj1, obj2);

console.log(result.user);  // { age: 30 }  - user 被完全覆盖了！
```

如果第一个参数是 `true`，则执行深拷贝：

```javascript
const result = $.extend(true, {}, obj1, obj2);
console.log(result.user);  // { name: 'John', age: 30 }  - user 被合并了！
```

## 扩展 jQuery 本身

`extend` 还有一个特殊用法：只传一个对象时，会将属性添加到 jQuery 本身：

```javascript
// 添加静态方法
$.extend({
  min: function(a, b) {
    return a < b ? a : b;
  },
  max: function(a, b) {
    return a > b ? a : b;
  }
});

console.log($.min(3, 5));  // 3
console.log($.max(3, 5));  // 5
```

同样的方式可以扩展 `$.fn`：

```javascript
// 添加实例方法（插件）
$.fn.extend({
  highlight: function() {
    return this.css('backgroundColor', 'yellow');
  },
  disable: function() {
    return this.attr('disabled', true);
  }
});

$('.item').highlight();
$('button').disable();
```

## 实现 extend

让我们一步步实现这个方法。

### 第一版：基础合并

```javascript
jQuery.extend = function() {
  const target = arguments[0] || {};
  
  for (let i = 1; i < arguments.length; i++) {
    const source = arguments[i];
    if (source != null) {
      for (const key in source) {
        target[key] = source[key];
      }
    }
  }
  
  return target;
};
```

测试：

```javascript
$.extend({ a: 1 }, { b: 2 });  // { a: 1, b: 2 } ✓
```

### 第二版：支持扩展 jQuery 自身

如果只传一个参数，扩展到 `this`（jQuery 或 jQuery.fn）：

```javascript
jQuery.extend = jQuery.fn.extend = function() {
  let target = arguments[0] || {};
  let i = 1;
  
  // 如果只有一个参数，扩展到 this
  if (arguments.length === 1) {
    target = this;
    i = 0;
  }
  
  for (; i < arguments.length; i++) {
    const source = arguments[i];
    if (source != null) {
      for (const key in source) {
        target[key] = source[key];
      }
    }
  }
  
  return target;
};
```

注意 `jQuery.extend = jQuery.fn.extend`，这样两者共用同一个函数：

- `$.extend({ ... })` — `this` 是 `jQuery`，扩展静态方法
- `$.fn.extend({ ... })` — `this` 是 `jQuery.fn`，扩展实例方法

### 第三版：支持深拷贝

如果第一个参数是布尔值 `true`，执行深拷贝：

```javascript
jQuery.extend = jQuery.fn.extend = function() {
  let target = arguments[0] || {};
  let i = 1;
  let deep = false;
  
  // 第一个参数是布尔值，表示是否深拷贝
  if (typeof target === 'boolean') {
    deep = target;
    target = arguments[1] || {};
    i = 2;
  }
  
  // 如果只有一个非布尔参数，扩展到 this
  if (i === arguments.length) {
    target = this;
    i--;
  }
  
  for (; i < arguments.length; i++) {
    const source = arguments[i];
    if (source != null) {
      for (const key in source) {
        const srcValue = source[key];
        
        // 防止循环引用
        if (target === srcValue) {
          continue;
        }
        
        // 深拷贝
        if (deep && srcValue && (jQuery.isPlainObject(srcValue) || Array.isArray(srcValue))) {
          const targetValue = target[key];
          
          // 确定拷贝的基础对象
          let clone;
          if (Array.isArray(srcValue)) {
            clone = Array.isArray(targetValue) ? targetValue : [];
          } else {
            clone = jQuery.isPlainObject(targetValue) ? targetValue : {};
          }
          
          // 递归合并
          target[key] = jQuery.extend(deep, clone, srcValue);
        } else if (srcValue !== undefined) {
          target[key] = srcValue;
        }
      }
    }
  }
  
  return target;
};
```

## 完整实现

```javascript
// 添加到 src/core/init.js

// 类型判断工具
jQuery.isPlainObject = function(obj) {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  // 检查是否是由 {} 或 new Object() 创建的
  const proto = Object.getPrototypeOf(obj);
  return proto === null || proto === Object.prototype;
};

// extend 方法
jQuery.extend = jQuery.fn.extend = function() {
  let target = arguments[0] || {};
  let i = 1;
  let deep = false;
  const length = arguments.length;
  
  // 处理深拷贝标志
  if (typeof target === 'boolean') {
    deep = target;
    target = arguments[1] || {};
    i = 2;
  }
  
  // 处理 target 不是对象的情况
  if (typeof target !== 'object' && typeof target !== 'function') {
    target = {};
  }
  
  // 如果只传了一个参数（或深拷贝时只传了两个），扩展到 this
  if (i === length) {
    target = this;
    i--;
  }
  
  for (; i < length; i++) {
    const source = arguments[i];
    
    if (source == null) continue;
    
    for (const key in source) {
      // 只处理自有属性
      if (!source.hasOwnProperty(key)) continue;
      
      const srcValue = source[key];
      
      // 防止循环引用
      if (target === srcValue) continue;
      
      // 深拷贝处理
      if (deep && srcValue && (jQuery.isPlainObject(srcValue) || Array.isArray(srcValue))) {
        const targetValue = target[key];
        
        let clone;
        if (Array.isArray(srcValue)) {
          clone = Array.isArray(targetValue) ? targetValue : [];
        } else {
          clone = jQuery.isPlainObject(targetValue) ? targetValue : {};
        }
        
        target[key] = jQuery.extend(deep, clone, srcValue);
      } else if (srcValue !== undefined) {
        target[key] = srcValue;
      }
    }
  }
  
  return target;
};
```

## 测试

```html
<script type="module">
  import $ from './src/index.js';
  
  // 基础合并
  const result1 = $.extend({ a: 1 }, { b: 2 });
  console.log('基础合并:', result1);  // { a: 1, b: 2 }
  
  // 多个对象合并
  const result2 = $.extend({ a: 1 }, { b: 2 }, { c: 3 });
  console.log('多对象合并:', result2);  // { a: 1, b: 2, c: 3 }
  
  // 属性覆盖
  const result3 = $.extend({ a: 1, b: 2 }, { b: 3 });
  console.log('属性覆盖:', result3);  // { a: 1, b: 3 }
  
  // 浅拷贝
  const obj1 = { user: { name: 'John' } };
  const obj2 = { user: { age: 30 } };
  const shallow = $.extend({}, obj1, obj2);
  console.log('浅拷贝:', shallow.user);  // { age: 30 }
  
  // 深拷贝
  const deep = $.extend(true, {}, obj1, obj2);
  console.log('深拷贝:', deep.user);  // { name: 'John', age: 30 }
  
  // 扩展 jQuery 静态方法
  $.extend({
    log: function(msg) {
      console.log('[jQuery]', msg);
    }
  });
  $.log('Hello!');  // [jQuery] Hello!
  
  // 扩展实例方法
  $.fn.extend({
    red: function() {
      return this.css('color', 'red');
    }
  });
  $('.item').red();
  
  // 验证实例方法
  console.log('$.fn.red:', typeof $.fn.red);  // function
</script>
```

## extend 的应用场景

### 1. 默认配置合并

```javascript
function ajax(options) {
  const defaults = {
    method: 'GET',
    timeout: 5000,
    headers: {}
  };
  
  const settings = $.extend({}, defaults, options);
  // 使用 settings...
}

ajax({ url: '/api/users' });
// settings = { method: 'GET', timeout: 5000, headers: {}, url: '/api/users' }
```

### 2. 插件开发

```javascript
$.fn.tooltip = function(options) {
  const defaults = {
    position: 'top',
    delay: 200,
    animation: true
  };
  
  const settings = $.extend({}, defaults, options);
  
  return this.each(function() {
    // 为每个元素创建 tooltip...
  });
};

$('.btn').tooltip({ position: 'bottom' });
```

### 3. 深度合并配置

```javascript
const userConfig = {
  theme: {
    primaryColor: 'blue'
  }
};

const fullConfig = $.extend(true, {
  theme: {
    primaryColor: 'black',
    secondaryColor: 'gray',
    fontSize: 14
  },
  api: {
    baseUrl: '/api'
  }
}, userConfig);

// fullConfig.theme = { primaryColor: 'blue', secondaryColor: 'gray', fontSize: 14 }
```

## 与 Object.assign 的区别

| 特性 | $.extend | Object.assign |
|------|----------|---------------|
| 深拷贝 | ✅ 支持（第一个参数传 true） | ❌ 不支持 |
| 扩展自身 | ✅ 只传一个参数时扩展 this | ❌ 不支持 |
| 跳过 undefined | ✅ 跳过 undefined 值 | ❌ 不跳过 |
| 循环引用检测 | ✅ 有 | ❌ 没有 |

## 本章小结

`$.extend` 是一个多功能的对象合并工具：

1. **基础合并**：`$.extend(target, src1, src2, ...)`
2. **深拷贝**：`$.extend(true, target, src1, src2, ...)`
3. **扩展 jQuery**：`$.extend({ ... })` 添加静态方法
4. **扩展 $.fn**：`$.fn.extend({ ... })` 添加实例方法

这个方法是 jQuery 插件系统的基础，理解它对于开发插件至关重要。

至此，我们完成了 jQuery 核心骨架的所有章节：

- ✅ $ 入口函数
- ✅ 无 new 调用
- ✅ 类数组结构
- ✅ 原型链设计
- ✅ 链式调用
- ✅ extend 方法

下一部分，我们将实现选择器引擎。

---

**思考题**：`$.extend` 在深拷贝时会递归处理嵌套对象，但如果对象层级很深（比如 1000 层），会有什么问题？如何优化？
