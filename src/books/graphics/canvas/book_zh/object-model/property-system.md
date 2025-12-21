# 属性系统与观察者模式

上一章我们设计了 `BaseObject` 基类。但遇到一个问题：**修改对象属性后，画布不会自动重绘**。

```javascript
const rect = new Rectangle({ left: 50, top: 50, fill: 'red' });
rect.draw(ctx);

// 修改属性
rect.fill = 'blue';

// 画布没有变化！需要手动重绘
ctx.clearRect(0, 0, canvas.width, canvas.height);
rect.draw(ctx);
```

如何在属性变化时**自动触发重绘**？答案是：**属性系统 + 观察者模式**。

---

## 1. 问题分析

直接修改属性有两个问题：
- **无感知**：对象不知道自己的属性被修改了
- **无联动**：属性变化不会触发任何动作（如重绘）

我们需要一个机制：**在属性被设置时，执行特定的逻辑**。

---

## 2. 观察者模式简介

**观察者模式**：当一个对象的状态改变时，所有依赖它的对象都会收到通知。

核心角色：
- **被观察者（Subject）**：发布事件
- **观察者（Observer）**：订阅事件，响应通知

类比：订阅报纸。报社发布新内容，所有订阅者自动收到。

---

## 3. 事件系统实现

先实现一个简单的事件系统：

```javascript
class EventEmitter {
  constructor() {
    this.events = {};
  }
  
  on(event, handler) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(handler);
  }
  
  off(event, handler) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(h => h !== handler);
  }
  
  emit(event, data) {
    if (!this.events[event]) return;
    this.events[event].forEach(handler => handler(data));
  }
}
```

使用：

```javascript
const emitter = new EventEmitter();

// 订阅
emitter.on('change', (data) => {
  console.log('属性变化:', data);
});

// 发布
emitter.emit('change', { key: 'fill', value: 'blue' });
// 输出：属性变化: { key: 'fill', value: 'blue' }
```

---

## 4. 属性拦截：使用 defineProperty

现在要拦截属性的设置操作。使用 `Object.defineProperty`：

```javascript
function defineReactiveProperty(obj, key, defaultValue) {
  let value = defaultValue;
  
  Object.defineProperty(obj, key, {
    get() {
      return value;
    },
    set(newValue) {
      if (value !== newValue) {
        const oldValue = value;
        value = newValue;
        
        // 发布属性变化事件
        obj.emit('property:changed', { key, oldValue, value: newValue });
        obj.setDirty();  // 标记需要重绘
      }
    }
  });
}
```

使用：

```javascript
class BaseObject extends EventEmitter {
  constructor() {
    super();
    
    defineReactiveProperty(this, 'fill', '#000000');
    defineReactiveProperty(this, 'left', 0);
    // ... 其他属性
  }
  
  setDirty() {
    console.log('对象被标记为脏');
    // 通知画布重绘
  }
}

const obj = new BaseObject();
obj.fill = 'red';  // 触发 setter，输出：对象被标记为脏
```

---

## 5. 脏标记机制

频繁重绘会影响性能。使用 **脏标记（Dirty Flag）** 优化：
- 属性变化时，只**标记**对象为"脏"
- 统一在 `requestAnimationFrame` 中批量重绘所有脏对象

```javascript
class Canvas {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.objects = [];
    this.renderRequested = false;
  }
  
  add(obj) {
    obj.canvas = this;  // 对象引用画布
    this.objects.push(obj);
    this.requestRender();
  }
  
  requestRender() {
    if (this.renderRequested) return;
    this.renderRequested = true;
    
    requestAnimationFrame(() => {
      this.render();
      this.renderRequested = false;
    });
  }
  
  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.objects.forEach(obj => {
      if (obj._dirty) {
        obj.draw(this.ctx);
        obj._dirty = false;
      } else {
        obj.draw(this.ctx);  // 简化版：每次都绘制
      }
    });
  }
}

class BaseObject extends EventEmitter {
  constructor() {
    super();
    this._dirty = true;
    this.canvas = null;
  }
  
  setDirty() {
    this._dirty = true;
    this.canvas?.requestRender();  // 通知画布重绘
  }
}
```

---

## 6. 完整属性系统集成

将属性系统集成到 `BaseObject`：

```javascript
class BaseObject extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.canvas = null;
    this._dirty = true;
    
    // 定义响应式属性
    this._defineReactiveProperties([
      'left', 'top', 'width', 'height',
      'rotation', 'scaleX', 'scaleY',
      'fill', 'stroke', 'strokeWidth', 'opacity',
      'visible', 'selectable'
    ]);
    
    // 设置初始值
    Object.assign(this, {
      left: 0,
      top: 0,
      width: 100,
      height: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      fill: '#000000',
      stroke: null,
      strokeWidth: 1,
      opacity: 1,
      visible: true,
      selectable: true,
      ...options
    });
  }
  
  _defineReactiveProperties(keys) {
    keys.forEach(key => {
      let value = this[key];
      
      Object.defineProperty(this, key, {
        get() {
          return value;
        },
        set(newValue) {
          if (value !== newValue) {
            const oldValue = value;
            value = newValue;
            this.emit('property:changed', { key, oldValue, value: newValue });
            this.setDirty();
          }
        }
      });
    });
  }
  
  setDirty() {
    this._dirty = true;
    this.canvas?.requestRender();
  }
  
  // 批量设置属性（避免多次重绘）
  set(props) {
    Object.keys(props).forEach(key => {
      this['_' + key] = props[key];  // 直接设置内部值，不触发 setter
    });
    this.setDirty();  // 最后统一标记脏区
  }
}
```

---

## 7. 使用示例

```javascript
const canvas = new Canvas(document.getElementById('canvas'));

const rect = new Rectangle({
  left: 50,
  top: 50,
  width: 100,
  height: 80,
  fill: 'red'
});

canvas.add(rect);

// 修改属性，自动重绘
setTimeout(() => {
  rect.fill = 'blue';  // 自动触发重绘
}, 1000);

setTimeout(() => {
  rect.rotation = Math.PI / 4;  // 自动触发重绘
}, 2000);

// 批量更新（只重绘一次）
setTimeout(() => {
  rect.set({
    fill: 'green',
    left: 150,
    scaleX: 1.5
  });
}, 3000);
```

---

## 8. 监听属性变化

外部可以监听对象的属性变化：

```javascript
rect.on('property:changed', (e) => {
  console.log(`属性 ${e.key} 从 ${e.oldValue} 变为 ${e.value}`);
});

rect.fill = 'yellow';
// 输出：属性 fill 从 blue 变为 yellow
```

---

## 9. 使用 Proxy 的简洁实现

`Proxy` 提供更简洁的属性拦截方式：

```javascript
class BaseObject extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.canvas = null;
    this._dirty = true;
    
    // 初始化属性
    Object.assign(this, {
      left: 0,
      top: 0,
      fill: '#000000',
      // ... 其他属性
      ...options
    });
    
    // 返回 Proxy 包装后的对象
    return new Proxy(this, {
      set(target, key, value) {
        const oldValue = target[key];
        if (oldValue !== value) {
          target[key] = value;
          target.emit('property:changed', { key, oldValue, value });
          target.setDirty();
        }
        return true;
      }
    });
  }
  
  setDirty() {
    this._dirty = true;
    this.canvas?.requestRender();
  }
}
```

**优点**：代码简洁，无需逐个定义属性
**缺点**：兼容性稍差（IE 不支持）

---

## 10. 属性验证

增强属性系统，添加验证逻辑：

```javascript
class BaseObject extends EventEmitter {
  constructor() {
    super();
    
    // 属性验证规则
    this._validators = {
      opacity: (value) => value >= 0 && value <= 1,
      scaleX: (value) => value > 0,
      scaleY: (value) => value > 0
    };
  }
  
  _defineReactiveProperties(keys) {
    keys.forEach(key => {
      let value = this[key];
      
      Object.defineProperty(this, key, {
        get() {
          return value;
        },
        set(newValue) {
          // 验证
          const validator = this._validators[key];
          if (validator && !validator(newValue)) {
            console.warn(`Invalid value for ${key}: ${newValue}`);
            return;
          }
          
          if (value !== newValue) {
            const oldValue = value;
            value = newValue;
            this.emit('property:changed', { key, oldValue, value: newValue });
            this.setDirty();
          }
        }
      });
    });
  }
}

// 使用
rect.opacity = 1.5;  // 警告：Invalid value for opacity: 1.5
```

---

## 11. 性能优化策略

### 防止无效更新

```javascript
set(newValue) {
  if (value === newValue) return;  // 关键：避免无效更新
  // ...
}
```

### 批量更新

```javascript
rect.set({
  fill: 'red',
  stroke: 'blue',
  strokeWidth: 2
});
// 只触发一次重绘，而不是三次
```

### 延迟重绘

使用 `requestAnimationFrame` 将多次重绘合并为一次：

```javascript
requestRender() {
  if (this.renderRequested) return;
  this.renderRequested = true;
  
  requestAnimationFrame(() => {
    this.render();
    this.renderRequested = false;
  });
}
```

---

## 12. 与 Vue.js 响应式系统的对比

Vue.js 2.x 也使用 `Object.defineProperty` 实现响应式：

```javascript
// Vue.js 的核心思想
data() {
  return {
    message: 'Hello'
  };
}
// 当 message 变化时，视图自动更新

// 我们的属性系统
rect.fill = 'red';  // 画布自动重绘
```

两者原理相同：**拦截属性设置，触发更新**。

---

## 本章小结

属性系统通过 **观察者模式** 实现了属性变化的自动响应：
- **事件系统**：发布订阅模式，解耦对象和画布
- **属性拦截**：`defineProperty` 或 `Proxy`，监听属性设置
- **脏标记**：批量重绘，优化性能
- **批量更新**：`set()` 方法，避免多次重绘

下一章，我们将实现对象的序列化与反序列化，让图形数据可以保存和加载。
