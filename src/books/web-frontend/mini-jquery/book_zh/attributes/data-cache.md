# 数据缓存系统实现

上一章介绍了 `data()` 方法的用法，这一章深入实现完整的数据缓存系统。

## 缓存系统的设计目标

1. **无内存泄漏**：元素删除时数据自动清理
2. **类型保持**：存取数据保持原始类型
3. **命名空间**：避免不同模块的数据冲突
4. **高性能**：快速存取

## WeakMap 方案

```javascript
const dataStore = new WeakMap();

function getData(elem) {
  if (!dataStore.has(elem)) {
    dataStore.set(elem, Object.create(null));
  }
  return dataStore.get(elem);
}
```

WeakMap 的优势：

- 键是弱引用，元素被垃圾回收时数据自动清理
- O(1) 存取性能
- 原生支持，无需手动管理

## 完整的缓存类

```javascript
// src/data/DataCache.js

export class DataCache {
  constructor() {
    this.cache = new WeakMap();
  }
  
  // 获取元素的数据对象
  get(elem) {
    return this.cache.get(elem);
  }
  
  // 设置数据
  set(elem, key, value) {
    let data = this.cache.get(elem);
    
    if (!data) {
      data = Object.create(null);
      this.cache.set(elem, data);
    }
    
    data[key] = value;
    return value;
  }
  
  // 获取特定键的值
  access(elem, key, value) {
    // 只有 key，读取
    if (value === undefined) {
      const data = this.cache.get(elem);
      return data ? data[key] : undefined;
    }
    
    // 有 value，写入
    return this.set(elem, key, value);
  }
  
  // 删除数据
  remove(elem, key) {
    const data = this.cache.get(elem);
    if (!data) return;
    
    if (key === undefined) {
      // 删除所有
      this.cache.delete(elem);
    } else if (Array.isArray(key)) {
      // 删除多个键
      key.forEach(k => delete data[k]);
    } else {
      // 删除单个键
      delete data[key];
    }
  }
  
  // 检查是否有数据
  hasData(elem) {
    const data = this.cache.get(elem);
    return data ? Object.keys(data).length > 0 : false;
  }
}

// 创建全局实例
export const dataUser = new DataCache();
export const dataPriv = new DataCache();
```

## 公共数据 vs 私有数据

jQuery 内部使用两个缓存：

```javascript
// 用户数据 - 通过 .data() 存取
export const dataUser = new DataCache();

// 私有数据 - 内部使用（事件、动画队列等）
export const dataPriv = new DataCache();
```

分离的好处：

- 用户数据不会与内部数据冲突
- 内部可以使用任意键名
- 清理时可以分别处理

## 数据属性解析

从 `data-*` 属性读取数据：

```javascript
function parseDataAttributes(elem) {
  const data = Object.create(null);
  
  if (elem.nodeType !== 1) return data;
  
  // 获取所有 data-* 属性
  for (const attr of elem.attributes) {
    if (attr.name.startsWith('data-')) {
      const key = camelCase(attr.name.slice(5));
      data[key] = parseDataValue(attr.value);
    }
  }
  
  return data;
}

function camelCase(str) {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function parseDataValue(value) {
  // 尝试解析为 JSON
  try {
    // 布尔值
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    
    // 数字
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return parseFloat(value);
    }
    
    // JSON 对象或数组
    if (/^[\[{]/.test(value)) {
      return JSON.parse(value);
    }
    
    return value;
  } catch {
    return value;
  }
}
```

## 整合到 data 方法

```javascript
// src/data/data.js

import { dataUser } from './DataCache.js';

export function installDataMethods(jQuery) {
  
  jQuery.fn.data = function(key, value) {
    const elem = this[0];
    
    // 无参数：获取所有数据
    if (key === undefined) {
      if (!elem) return undefined;
      
      let data = dataUser.get(elem);
      
      // 首次访问，解析 data-* 属性
      if (!data) {
        data = parseDataAttributes(elem);
        dataUser.cache.set(elem, data);
      }
      
      return { ...data };
    }
    
    // 对象形式：设置多个
    if (typeof key === 'object') {
      return this.each(function() {
        for (const k in key) {
          dataUser.set(this, k, key[k]);
        }
      });
    }
    
    // 获取模式
    if (value === undefined) {
      if (!elem) return undefined;
      
      // 先查缓存
      let data = dataUser.access(elem, key);
      if (data !== undefined) return data;
      
      // 再查 data-* 属性
      const attrName = 'data-' + kebabCase(key);
      const attrValue = elem.getAttribute(attrName);
      
      if (attrValue !== null) {
        data = parseDataValue(attrValue);
        // 缓存以提高后续访问速度
        dataUser.set(elem, key, data);
        return data;
      }
      
      return undefined;
    }
    
    // 设置模式
    return this.each(function() {
      dataUser.set(this, key, value);
    });
  };
  
  jQuery.fn.removeData = function(key) {
    return this.each(function() {
      dataUser.remove(this, key);
    });
  };
}

function kebabCase(str) {
  return str.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
}
```

## 清理机制

当元素被移除时，需要清理关联的数据：

```javascript
jQuery.fn.remove = function() {
  return this.each(function() {
    // 清理数据
    dataUser.remove(this);
    dataPriv.remove(this);
    
    // 移除元素
    this.parentNode?.removeChild(this);
  });
};
```

## 内部数据使用示例

事件系统使用私有缓存：

```javascript
// 存储事件处理函数
dataPriv.set(elem, 'events', {
  click: [...handlers]
});

// 读取
const events = dataPriv.access(elem, 'events');
```

动画队列使用私有缓存：

```javascript
// 存储动画队列
dataPriv.set(elem, 'fxqueue', [...animations]);

// 读取
const queue = dataPriv.access(elem, 'fxqueue') || [];
```

## 性能考虑

### WeakMap vs 属性

```javascript
// WeakMap 方式（推荐）
const cache = new WeakMap();
cache.set(elem, data);

// 属性方式（不推荐）
elem.__data__ = data;  // 污染元素
```

WeakMap 不会污染 DOM 元素，也不会出现在 `for...in` 循环中。

### 惰性解析

```javascript
// 不要立即解析所有 data-* 属性
// 而是在首次访问特定键时才解析

jQuery.fn.data = function(key) {
  // 只解析需要的属性
  const attrName = 'data-' + kebabCase(key);
  const value = elem.getAttribute(attrName);
  // ...
};
```

## 本章小结

数据缓存系统要点：

- **WeakMap 存储**：避免内存泄漏
- **双缓存设计**：分离用户数据和内部数据
- **惰性解析**：按需读取 data-* 属性
- **类型转换**：自动解析 JSON、数字、布尔值

实现细节：

- `DataCache` 类封装存取逻辑
- `dataUser` 供用户使用
- `dataPriv` 供内部使用
- 元素删除时清理数据

下一章，我们实现类名操作方法。

---

**思考题**：如果用 `data()` 存储了大量数据，会不会影响页面性能？如何优化？
