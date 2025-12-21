# 事件命名空间

命名空间让我们能够组织和批量管理事件，特别适合插件开发和组件化场景。

## 基本语法

```javascript
// 绑定带命名空间的事件
$('.btn').on('click.myPlugin', handler);

// 解绑特定命名空间
$('.btn').off('click.myPlugin');

// 解绑命名空间下的所有事件
$('.btn').off('.myPlugin');
```

## 命名空间的作用

### 1. 插件事件管理

```javascript
// 插件初始化
function myPlugin(elem) {
  $(elem).on('click.myPlugin', handleClick);
  $(elem).on('resize.myPlugin', handleResize);
  $(window).on('scroll.myPlugin', handleScroll);
}

// 插件销毁
function destroyPlugin(elem) {
  $(elem).off('.myPlugin');
  $(window).off('.myPlugin');
}
```

### 2. 避免误删其他事件

```javascript
// 不使用命名空间
$('.btn').on('click', handler1);  // 业务代码
$('.btn').on('click', handler2);  // 插件代码
$('.btn').off('click');  // 全部删除了！

// 使用命名空间
$('.btn').on('click', handler1);
$('.btn').on('click.plugin', handler2);
$('.btn').off('click.plugin');  // 只删除插件的
```

### 3. 多层级命名空间

```javascript
$('.btn').on('click.myPlugin.v2', handler);
$('.btn').off('.myPlugin');  // 匹配
$('.btn').off('.v2');        // 也匹配
```

## 命名空间解析

```javascript
function parseEventType(typeString) {
  const dotIndex = typeString.indexOf('.');
  
  if (dotIndex === -1) {
    return { type: typeString, namespace: '' };
  }
  
  return {
    type: typeString.slice(0, dotIndex),
    namespace: typeString.slice(dotIndex + 1)
  };
}

// 示例
parseEventType('click');
// { type: 'click', namespace: '' }

parseEventType('click.myPlugin');
// { type: 'click', namespace: 'myPlugin' }

parseEventType('click.myPlugin.v2');
// { type: 'click', namespace: 'myPlugin.v2' }
```

## 命名空间匹配逻辑

移除时，指定的命名空间的每个部分都必须存在：

```javascript
function matchNamespace(handlerNs, removeNs) {
  // 没有指定要移除的命名空间，匹配所有
  if (!removeNs) return true;
  
  // 处理函数没有命名空间，不匹配
  if (!handlerNs) return false;
  
  // 检查每个部分
  const removeParts = removeNs.split('.');
  const handlerParts = handlerNs.split('.');
  
  return removeParts.every(part => handlerParts.includes(part));
}
```

匹配示例：

```javascript
// 绑定的命名空间: 'myPlugin.v2'

matchNamespace('myPlugin.v2', 'myPlugin')    // true
matchNamespace('myPlugin.v2', 'v2')          // true
matchNamespace('myPlugin.v2', 'myPlugin.v2') // true
matchNamespace('myPlugin.v2', 'other')       // false
matchNamespace('myPlugin.v2', 'myPlugin.v3') // false
```

## 只移除命名空间

```javascript
// 移除所有 .myPlugin 命名空间的事件，不限类型
$('.btn').off('.myPlugin');
```

实现：

```javascript
jQuery.fn.off = function(types, selector, handler) {
  // ...
  
  // 只有命名空间
  if (types.startsWith('.')) {
    const namespace = types.slice(1);
    
    return this.each(function() {
      const data = getData(this);
      
      // 遍历所有事件类型
      for (const type in data.handlers) {
        removeHandlers(this, type, handler, selector, namespace);
      }
    });
  }
  
  // ...
};
```

## 触发带命名空间的事件

```javascript
// 只触发特定命名空间的处理函数
$('.btn').trigger('click.myPlugin');
```

## 完整实现

在我们的事件系统中整合命名空间：

```javascript
// src/events/events.js

function parseEventType(typeString) {
  const dotIndex = typeString.indexOf('.');
  if (dotIndex === -1) {
    return { type: typeString, namespace: '' };
  }
  return {
    type: typeString.slice(0, dotIndex),
    namespace: typeString.slice(dotIndex + 1)
  };
}

function matchNamespace(handlerNs, removeNs) {
  if (!removeNs) return true;
  if (!handlerNs) return false;
  
  const removeParts = removeNs.split('.');
  const handlerParts = handlerNs.split('.');
  
  return removeParts.every(part => handlerParts.includes(part));
}

jQuery.fn.on = function(types, selector, data, handler) {
  // ... 参数规范化
  
  const typeList = types.trim().split(/\s+/);
  
  return this.each(function() {
    typeList.forEach(typeNs => {
      const { type, namespace } = parseEventType(typeNs);
      
      if (!type) return;
      
      addHandler(this, type, {
        handler,
        selector: selector || null,
        namespace,  // 保存命名空间
        data,
        once: false
      });
      
      bindMainHandler(this, type);
    });
  });
};

jQuery.fn.off = function(types, selector, handler) {
  // 参数规范化
  if (typeof selector === 'function') {
    handler = selector;
    selector = undefined;
  }
  
  // 无参数：移除所有
  if (types === undefined) {
    return this.each(function() {
      const data = getData(this);
      for (const type in data.handlers) {
        unbindMainHandler(this, type);
      }
      data.handlers = {};
    });
  }
  
  // 只有命名空间
  if (types.startsWith('.')) {
    const namespace = types.slice(1);
    return this.each(function() {
      const data = getData(this);
      for (const type in data.handlers) {
        removeHandlers(this, type, handler, selector, namespace);
      }
    });
  }
  
  // 解析事件类型
  const typeList = types.trim().split(/\s+/);
  
  return this.each(function() {
    typeList.forEach(typeNs => {
      const { type, namespace } = parseEventType(typeNs);
      removeHandlers(this, type, handler, selector, namespace);
    });
  });
};
```

## 实际应用场景

### 场景 1：插件开发

```javascript
$.fn.slider = function(options) {
  return this.each(function() {
    const $el = $(this);
    const ns = '.slider' + $.guid++;  // 唯一命名空间
    
    // 绑定事件
    $el.on('mousedown' + ns, startDrag);
    $(document)
      .on('mousemove' + ns, drag)
      .on('mouseup' + ns, endDrag);
    
    // 保存销毁方法
    $el.data('slider-destroy', function() {
      $el.off(ns);
      $(document).off(ns);
    });
  });
};
```

### 场景 2：组件生命周期

```javascript
class Modal {
  constructor(element) {
    this.id = 'modal-' + Date.now();
    this.$el = $(element);
    this.ns = '.' + this.id;
    this.bindEvents();
  }
  
  bindEvents() {
    this.$el.on('click' + this.ns, '.close', () => this.close());
    this.$el.on('click' + this.ns, '.overlay', () => this.close());
    $(document).on('keydown' + this.ns, e => {
      if (e.key === 'Escape') this.close();
    });
  }
  
  destroy() {
    this.$el.off(this.ns);
    $(document).off(this.ns);
    this.$el.remove();
  }
}
```

### 场景 3：功能模块

```javascript
// 模块 A
$('.element').on('click.moduleA', handleA);
$(window).on('resize.moduleA', resizeA);

// 模块 B
$('.element').on('click.moduleB', handleB);
$(window).on('resize.moduleB', resizeB);

// 禁用模块 A，不影响模块 B
$('.element').off('.moduleA');
$(window).off('.moduleA');
```

### 场景 4：版本管理

```javascript
// 旧版本处理
$('.btn').on('click.handler.v1', oldHandler);

// 升级到新版本
$('.btn').off('.v1');
$('.btn').on('click.handler.v2', newHandler);
```

### 场景 5：调试

```javascript
// 临时添加调试事件
$('.btn').on('click.debug', function(e) {
  console.log('Clicked:', this, e);
});

// 调试完成后移除
$('.btn').off('.debug');
```

## 最佳实践

### 1. 为插件使用唯一命名空间

```javascript
const PLUGIN_NS = '.myAwesomePlugin';

function init($elem) {
  $elem.on('click' + PLUGIN_NS, handler);
}

function destroy($elem) {
  $elem.off(PLUGIN_NS);
}
```

### 2. 避免过长的命名空间链

```javascript
// 不推荐
$('.btn').on('click.a.b.c.d.e', handler);

// 推荐
$('.btn').on('click.myPlugin', handler);
```

### 3. 命名空间命名规范

```javascript
// 使用有意义的名称
'click.tooltip'
'resize.layout'
'scroll.lazyload'

// 避免通用名称
'click.handler'  // 太通用
'click.temp'     // 含义不明
```

## 本章小结

命名空间的价值：

- **事件分组**：按功能模块组织事件
- **批量管理**：一次性移除相关事件
- **避免冲突**：不同模块的事件互不干扰

实现要点：

- 点号分隔类型和命名空间
- 部分匹配机制
- 只用命名空间移除

使用场景：

- 插件开发
- 组件生命周期
- 模块化开发

下一章，我们实现 `trigger()` 方法。

---

**思考题**：命名空间 'a.b' 和 'b.a' 是否等价？在匹配时有什么区别？
