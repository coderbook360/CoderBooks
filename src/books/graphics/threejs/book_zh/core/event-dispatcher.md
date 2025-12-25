# EventDispatcher 事件系统

> "事件驱动是解耦组件的关键，让对象之间松散通信。"

## EventDispatcher 概述

Three.js 使用自定义事件系统实现组件间通信：
- 不依赖 DOM 事件
- 支持自定义事件类型
- 观察者模式实现

## 核心实现

```typescript
// src/core/EventDispatcher.ts
export interface Event {
  type: string;
  target?: unknown;
  [key: string]: unknown;
}

export type EventListener = (event: Event) => void;

export class EventDispatcher {
  private _listeners: Record<string, EventListener[]> | undefined;
  
  addEventListener(type: string, listener: EventListener): void {
    if (this._listeners === undefined) {
      this._listeners = {};
    }
    
    const listeners = this._listeners;
    
    if (listeners[type] === undefined) {
      listeners[type] = [];
    }
    
    if (listeners[type].indexOf(listener) === -1) {
      listeners[type].push(listener);
    }
  }
  
  hasEventListener(type: string, listener: EventListener): boolean {
    if (this._listeners === undefined) return false;
    
    const listeners = this._listeners;
    
    return listeners[type] !== undefined && 
           listeners[type].indexOf(listener) !== -1;
  }
  
  removeEventListener(type: string, listener: EventListener): void {
    if (this._listeners === undefined) return;
    
    const listeners = this._listeners;
    const listenerArray = listeners[type];
    
    if (listenerArray !== undefined) {
      const index = listenerArray.indexOf(listener);
      
      if (index !== -1) {
        listenerArray.splice(index, 1);
      }
    }
  }
  
  dispatchEvent(event: Event): void {
    if (this._listeners === undefined) return;
    
    const listeners = this._listeners;
    const listenerArray = listeners[event.type];
    
    if (listenerArray !== undefined) {
      event.target = this;
      
      // 复制数组，防止监听器在回调中被修改
      const array = listenerArray.slice(0);
      
      for (let i = 0; i < array.length; i++) {
        array[i].call(this, event);
      }
    }
  }
}
```

## 设计分析

### 延迟初始化

```typescript
// _listeners 只在需要时创建
if (this._listeners === undefined) {
  this._listeners = {};
}
```

好处：
- 节省内存（无监听器时不分配）
- 继承时不产生额外开销

### 防重复注册

```typescript
if (listeners[type].indexOf(listener) === -1) {
  listeners[type].push(listener);
}
```

同一监听器只能注册一次。

### 安全派发

```typescript
// 复制数组
const array = listenerArray.slice(0);
```

允许监听器在回调中：
- 移除自己
- 添加新监听器
- 移除其他监听器

## 应用场景

### Object3D 事件

```typescript
class Object3D extends EventDispatcher {
  add(object: Object3D): this {
    // ...添加逻辑
    
    object.dispatchEvent({ type: 'added' });
    this.dispatchEvent({ type: 'childadded', child: object });
    
    return this;
  }
  
  remove(object: Object3D): this {
    // ...移除逻辑
    
    object.dispatchEvent({ type: 'removed' });
    this.dispatchEvent({ type: 'childremoved', child: object });
    
    return this;
  }
}
```

### 使用示例

```typescript
const mesh = new Mesh(geometry, material);

// 监听添加事件
mesh.addEventListener('added', (event) => {
  console.log('Mesh added to scene');
});

// 监听移除事件
mesh.addEventListener('removed', (event) => {
  console.log('Mesh removed from scene');
  // 清理资源
});

scene.add(mesh);
```

### 材质事件

```typescript
class Material extends EventDispatcher {
  dispose(): void {
    this.dispatchEvent({ type: 'dispose' });
  }
}

// 渲染器监听材质销毁
material.addEventListener('dispose', (event) => {
  // 清理 GPU 资源
  deallocateMaterial(event.target);
});
```

### 几何体事件

```typescript
class BufferGeometry extends EventDispatcher {
  dispose(): void {
    this.dispatchEvent({ type: 'dispose' });
  }
}

// 清理缓冲区
geometry.addEventListener('dispose', (event) => {
  deallocateGeometry(event.target);
});
```

## 常见事件类型

### 生命周期事件

| 事件类型 | 触发时机 | 发送者 |
|---------|---------|--------|
| added | 添加到父对象 | Object3D |
| removed | 从父对象移除 | Object3D |
| dispose | 资源销毁 | Material, Geometry, Texture |

### 渲染事件

| 事件类型 | 触发时机 | 发送者 |
|---------|---------|--------|
| resize | 画布大小改变 | WebGLRenderer |
| contextlost | WebGL 上下文丢失 | WebGLRenderer |
| contextrestored | 上下文恢复 | WebGLRenderer |

### 控制器事件

| 事件类型 | 触发时机 | 发送者 |
|---------|---------|--------|
| change | 相机变化 | Controls |
| start | 开始交互 | Controls |
| end | 结束交互 | Controls |

## 扩展模式

### 自定义事件

```typescript
// 定义事件类型
interface DamageEvent extends Event {
  type: 'damage';
  amount: number;
  source: Object3D;
}

// 游戏对象
class Enemy extends Object3D {
  health = 100;
  
  takeDamage(amount: number, source: Object3D): void {
    this.health -= amount;
    
    this.dispatchEvent({
      type: 'damage',
      amount,
      source,
    } as DamageEvent);
    
    if (this.health <= 0) {
      this.dispatchEvent({ type: 'death' });
    }
  }
}

// 使用
enemy.addEventListener('damage', (event) => {
  const e = event as DamageEvent;
  console.log(`Took ${e.amount} damage from ${e.source.name}`);
});

enemy.addEventListener('death', () => {
  console.log('Enemy defeated!');
  scene.remove(enemy);
});
```

### 事件冒泡

Three.js 默认不支持冒泡，但可以实现：

```typescript
function dispatchEventWithBubble(object: Object3D, event: Event): void {
  let current: Object3D | null = object;
  
  while (current !== null) {
    current.dispatchEvent(event);
    
    if ((event as any).propagationStopped) break;
    
    current = current.parent;
  }
}

// 可停止冒泡的事件
interface StoppableEvent extends Event {
  propagationStopped?: boolean;
  stopPropagation(): void;
}

function createStoppableEvent(type: string): StoppableEvent {
  return {
    type,
    propagationStopped: false,
    stopPropagation() {
      this.propagationStopped = true;
    },
  };
}
```

### 一次性监听器

```typescript
function addOnceEventListener(
  dispatcher: EventDispatcher,
  type: string,
  listener: EventListener
): void {
  const onceWrapper: EventListener = (event) => {
    dispatcher.removeEventListener(type, onceWrapper);
    listener(event);
  };
  
  dispatcher.addEventListener(type, onceWrapper);
}

// 使用
addOnceEventListener(mesh, 'added', () => {
  console.log('This will only fire once');
});
```

### 类型安全事件

```typescript
// 定义事件映射
interface Object3DEventMap {
  added: { type: 'added' };
  removed: { type: 'removed' };
  childadded: { type: 'childadded'; child: Object3D };
  childremoved: { type: 'childremoved'; child: Object3D };
}

// 类型安全的 EventDispatcher
class TypedEventDispatcher<T extends Record<string, Event>> {
  private _listeners: {
    [K in keyof T]?: Array<(event: T[K]) => void>;
  } = {};
  
  addEventListener<K extends keyof T>(
    type: K,
    listener: (event: T[K]) => void
  ): void {
    if (!this._listeners[type]) {
      this._listeners[type] = [];
    }
    this._listeners[type]!.push(listener);
  }
  
  dispatchEvent<K extends keyof T>(event: T[K] & { type: K }): void {
    const listeners = this._listeners[event.type];
    if (listeners) {
      for (const listener of listeners) {
        listener(event);
      }
    }
  }
}
```

## 性能考虑

### 避免过多监听器

```typescript
// 不好：每帧添加监听器
function animate() {
  mesh.addEventListener('change', handleChange); // 泄漏！
  requestAnimationFrame(animate);
}

// 好：只添加一次
mesh.addEventListener('change', handleChange);
function animate() {
  requestAnimationFrame(animate);
}
```

### 及时移除监听器

```typescript
class MyComponent {
  private boundHandler: EventListener;
  
  constructor(private object: Object3D) {
    this.boundHandler = this.handleEvent.bind(this);
    object.addEventListener('change', this.boundHandler);
  }
  
  handleEvent(event: Event): void {
    // 处理事件
  }
  
  dispose(): void {
    this.object.removeEventListener('change', this.boundHandler);
  }
}
```

### 事件池

```typescript
class EventPool {
  private pool: Event[] = [];
  
  acquire(type: string): Event {
    let event = this.pool.pop();
    
    if (!event) {
      event = { type };
    } else {
      event.type = type;
    }
    
    return event;
  }
  
  release(event: Event): void {
    // 清理事件属性
    for (const key in event) {
      if (key !== 'type') {
        delete event[key];
      }
    }
    this.pool.push(event);
  }
}
```

## 本章小结

- EventDispatcher 实现观察者模式
- 延迟初始化节省内存
- 支持添加、移除、派发事件
- 复制数组确保安全派发
- 可扩展实现冒泡、一次性监听等功能
- 注意及时清理避免内存泄漏

下一章，我们将学习 Object3D 基类的完整实现。
