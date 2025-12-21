# 数据存储：data 方法

`data()` 方法用于在元素上存储任意数据。这比使用自定义属性更强大、更安全。

## 为什么需要 data()

### 问题 1：属性只能存字符串

```javascript
element.setAttribute('data-config', { key: 'value' });
// 实际存储的是 "[object Object]"
```

### 问题 2：数据与 DOM 耦合

```javascript
element.dataset.largeData = hugeJSONString;
// 数据会反映在 HTML 中，影响性能
```

### jQuery data() 的优势

```javascript
$('#element').data('config', { key: 'value', items: [1, 2, 3] });
// 存储原生 JavaScript 对象，不受类型限制
// 不反映在 HTML 中
```

## 基本用法

### 存储数据

```javascript
$('#user').data('info', { name: 'John', age: 30 });
$('#user').data('score', 100);
```

### 获取数据

```javascript
$('#user').data('info');   // { name: 'John', age: 30 }
$('#user').data('score');  // 100
$('#user').data();         // 返回所有数据的对象
```

### 移除数据

```javascript
$('#user').removeData('score');
$('#user').removeData();  // 移除所有数据
```

## 数据存储实现

使用 WeakMap 存储数据，这样当元素被移除时，数据会自动垃圾回收：

```javascript
// 内部数据存储
const dataStore = new WeakMap();

function getData(elem) {
  if (!dataStore.has(elem)) {
    dataStore.set(elem, {});
  }
  return dataStore.get(elem);
}
```

## 完整实现

```javascript
jQuery.fn.data = function(key, value) {
  // 没有参数：获取所有数据
  if (key === undefined) {
    const elem = this[0];
    if (!elem) return undefined;
    
    // 合并 data-* 属性和存储的数据
    const stored = getData(elem);
    const attrs = getDataAttrs(elem);
    return { ...attrs, ...stored };
  }
  
  // 对象参数：批量设置
  if (typeof key === 'object' && key !== null) {
    return this.each(function() {
      const data = getData(this);
      Object.assign(data, key);
    });
  }
  
  // 字符串 key，无 value：获取
  if (value === undefined) {
    const elem = this[0];
    if (!elem) return undefined;
    
    const data = getData(elem);
    
    // 先查找存储的数据
    if (key in data) {
      return data[key];
    }
    
    // 再查找 data-* 属性
    return getDataAttr(elem, key);
  }
  
  // 设置数据
  return this.each(function() {
    const data = getData(this);
    data[key] = value;
  });
};

jQuery.fn.removeData = function(key) {
  return this.each(function() {
    const data = getData(this);
    
    if (key === undefined) {
      // 清空所有数据
      dataStore.delete(this);
    } else if (typeof key === 'string') {
      // 支持空格分隔的多个键
      key.split(/\s+/).forEach(k => {
        delete data[k];
      });
    } else if (Array.isArray(key)) {
      key.forEach(k => delete data[k]);
    }
  });
};
```

## 读取 data-* 属性

jQuery 会自动读取 HTML 中的 `data-*` 属性：

```html
<div id="element" data-user-id="123" data-config='{"theme":"dark"}'></div>
```

```javascript
$('#element').data('userId');  // 123（自动转为数字）
$('#element').data('config');  // { theme: 'dark' }（自动解析 JSON）
```

### 实现

```javascript
function getDataAttr(elem, key) {
  if (elem.nodeType !== 1) return undefined;
  
  // 转换 camelCase 到 kebab-case
  const attrName = 'data-' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
  const value = elem.getAttribute(attrName);
  
  if (value === null) return undefined;
  
  return parseDataValue(value);
}

function parseDataValue(value) {
  // 尝试解析各种类型
  
  // null
  if (value === 'null') return null;
  
  // boolean
  if (value === 'true') return true;
  if (value === 'false') return false;
  
  // number（包括小数、负数）
  if (/^-?\d+\.?\d*$/.test(value)) {
    const num = Number(value);
    // 确保不是 NaN 且不会丢失精度
    if (String(num) === value) return num;
  }
  
  // JSON（对象或数组）
  if (/^[\[{]/.test(value)) {
    try {
      return JSON.parse(value);
    } catch (e) {}
  }
  
  // 字符串
  return value;
}

function getDataAttrs(elem) {
  if (elem.nodeType !== 1) return {};
  
  const result = {};
  
  [...elem.attributes].forEach(attr => {
    if (attr.name.startsWith('data-')) {
      // 转换为 camelCase
      const key = attr.name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      result[key] = parseDataValue(attr.value);
    }
  });
  
  return result;
}
```

## 静态方法

jQuery 还提供静态方法直接操作元素数据：

```javascript
// 使用静态方法
$.data(element, 'key', value);
$.data(element, 'key');
$.removeData(element, 'key');
```

### 实现

```javascript
jQuery.data = function(elem, key, value) {
  if (!elem) return undefined;
  
  if (value === undefined && typeof key === 'string') {
    // 获取
    const data = getData(elem);
    return key in data ? data[key] : getDataAttr(elem, key);
  }
  
  // 设置
  const data = getData(elem);
  if (typeof key === 'object') {
    Object.assign(data, key);
  } else {
    data[key] = value;
  }
  
  return value;
};

jQuery.removeData = function(elem, key) {
  if (!elem) return;
  
  if (key === undefined) {
    dataStore.delete(elem);
  } else {
    const data = getData(elem);
    delete data[key];
  }
};
```

## 完整模块

```javascript
// src/data/data.js

const dataStore = new WeakMap();

function getData(elem) {
  if (!dataStore.has(elem)) {
    dataStore.set(elem, {});
  }
  return dataStore.get(elem);
}

function parseDataValue(value) {
  if (value === 'null') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  
  if (/^-?\d+\.?\d*$/.test(value) && !isNaN(Number(value))) {
    return Number(value);
  }
  
  if (/^[\[{]/.test(value)) {
    try { return JSON.parse(value); } catch {}
  }
  
  return value;
}

function getDataAttr(elem, key) {
  const name = 'data-' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
  const value = elem.getAttribute?.(name);
  return value === null ? undefined : parseDataValue(value);
}

function getDataAttrs(elem) {
  if (!elem.attributes) return {};
  
  const result = {};
  for (const attr of elem.attributes) {
    if (attr.name.startsWith('data-')) {
      const key = attr.name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      result[key] = parseDataValue(attr.value);
    }
  }
  return result;
}

export function installDataMethods(jQuery) {
  
  jQuery.fn.data = function(key, value) {
    if (key === undefined) {
      const elem = this[0];
      if (!elem) return undefined;
      return { ...getDataAttrs(elem), ...getData(elem) };
    }
    
    if (typeof key === 'object' && key !== null) {
      return this.each(function() {
        Object.assign(getData(this), key);
      });
    }
    
    if (value === undefined) {
      const elem = this[0];
      if (!elem) return undefined;
      
      const data = getData(elem);
      return key in data ? data[key] : getDataAttr(elem, key);
    }
    
    return this.each(function() {
      getData(this)[key] = value;
    });
  };
  
  jQuery.fn.removeData = function(key) {
    return this.each(function() {
      if (key === undefined) {
        dataStore.delete(this);
      } else {
        const data = getData(this);
        (typeof key === 'string' ? key.split(/\s+/) : key)
          .forEach(k => delete data[k]);
      }
    });
  };
  
  jQuery.data = function(elem, key, value) {
    if (arguments.length < 3 && typeof key === 'string') {
      const data = getData(elem);
      return key in data ? data[key] : getDataAttr(elem, key);
    }
    
    const data = getData(elem);
    if (typeof key === 'object') {
      Object.assign(data, key);
    } else {
      data[key] = value;
    }
    return value;
  };
  
  jQuery.removeData = function(elem, key) {
    if (key === undefined) {
      dataStore.delete(elem);
    } else {
      const data = getData(elem);
      delete data[key];
    }
  };
}
```

## 实际应用场景

### 场景 1：存储组件实例

```javascript
// 存储组件实例
$('.carousel').each(function() {
  $(this).data('instance', new Carousel(this));
});

// 获取实例并调用方法
$('.carousel').data('instance').next();
```

### 场景 2：存储状态

```javascript
$('.toggle').on('click', function() {
  const isActive = $(this).data('active') || false;
  $(this).data('active', !isActive);
  $(this).toggleClass('active');
});
```

### 场景 3：传递配置

```html
<div class="widget" data-config='{"autoplay":true,"delay":3000}'></div>
```

```javascript
$('.widget').each(function() {
  const config = $(this).data('config');
  initWidget(this, config);
});
```

### 场景 4：关联数据

```javascript
// 存储关联数据
$('.item').each(function() {
  const id = $(this).data('id');
  $(this).data('fullData', fetchedData[id]);
});

// 使用
$('.item').on('click', function() {
  const data = $(this).data('fullData');
  showDetails(data);
});
```

## data() 与 data-* 属性的关系

- **读取**：`data()` 会读取 `data-*` 属性作为初始值
- **写入**：`data()` 设置的值不会反映到 HTML 属性
- **优先级**：存储的数据优先于 `data-*` 属性

```javascript
// HTML: <div data-count="5">
$('div').data('count');      // 5（来自属性）
$('div').data('count', 10);  // 存储新值
$('div').data('count');      // 10（来自存储）
$('div').attr('data-count'); // "5"（属性未变）
```

## 本章小结

`data()` 的核心特点：

- **类型保持**：可存储任意 JavaScript 值
- **不污染 DOM**：数据不反映在 HTML 中
- **自动读取**：会读取 `data-*` 属性并自动类型转换
- **内存安全**：使用 WeakMap，不会内存泄漏

实现要点：

- 使用 WeakMap 存储数据
- 解析 `data-*` 属性值的类型
- 驼峰和短横线的转换

下一章，我们实现类操作方法：`addClass()`、`removeClass()`、`toggleClass()`。

---

**思考题**：为什么 jQuery 使用 WeakMap 而不是普通对象来存储数据？如果使用普通对象会有什么问题？
