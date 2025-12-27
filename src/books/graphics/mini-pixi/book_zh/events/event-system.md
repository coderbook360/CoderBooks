# EventSystem 事件系统

PixiJS 的事件系统使场景图中的对象能够响应用户交互。它实现了类似 DOM 的事件模型，支持冒泡、捕获、事件委托等特性。本章解析事件系统的核心设计。

## 为什么需要自己的事件系统？

Canvas/WebGL 渲染的内容只是像素，浏览器不知道画布上有哪些"对象"。

**问题**：
- 点击画布时，浏览器只知道点击了 Canvas 元素
- 不知道点击的是哪个精灵
- 无法自动分发事件给具体对象

**解决方案**：自己实现事件系统，通过命中测试确定事件目标。

```
浏览器事件流：                     PixiJS 事件流：
┌──────────────────┐             ┌──────────────────┐
│  点击 Canvas     │             │  点击 Canvas     │
│       ↓          │             │       ↓          │
│  Canvas.onclick  │             │  EventSystem     │
│       ↓          │  转换为      │       ↓          │
│       ？         │ ────────►   │  命中测试        │
│  (不知道点了谁)   │             │       ↓          │
└──────────────────┘             │  分发给精灵      │
                                 └──────────────────┘
```

## 事件系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                      EventSystem                             │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │ EventBoundary │  │ FederatedEvent│  │ EventEmitter    │  │
│  │ (事件边界)     │  │ (统一事件)    │  │ (发布订阅)      │  │
│  └───────────────┘  └───────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                      HitTest                                 │
│            (命中测试 - 确定事件目标)                          │
└─────────────────────────────────────────────────────────────┘
```

## EventEmitter 基础

首先，我们需要一个发布订阅模式的实现：

```typescript
// src/events/EventEmitter.ts

type EventListener = (...args: any[]) => void;

/**
 * 事件发射器
 * 实现发布订阅模式
 */
export class EventEmitter {
  // 事件名 -> 监听器列表
  private _events: Map<string, EventListener[]> = new Map();
  
  /**
   * 添加事件监听器
   */
  public on(event: string, listener: EventListener): this {
    let listeners = this._events.get(event);
    
    if (!listeners) {
      listeners = [];
      this._events.set(event, listeners);
    }
    
    listeners.push(listener);
    return this;
  }
  
  /**
   * 添加一次性监听器
   */
  public once(event: string, listener: EventListener): this {
    const wrapper = (...args: any[]) => {
      this.off(event, wrapper);
      listener.apply(this, args);
    };
    
    return this.on(event, wrapper);
  }
  
  /**
   * 移除事件监听器
   */
  public off(event: string, listener: EventListener): this {
    const listeners = this._events.get(event);
    
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
    
    return this;
  }
  
  /**
   * 触发事件
   */
  public emit(event: string, ...args: any[]): boolean {
    const listeners = this._events.get(event);
    
    if (!listeners || listeners.length === 0) {
      return false;
    }
    
    // 复制数组，防止在遍历时修改
    for (const listener of [...listeners]) {
      listener.apply(this, args);
    }
    
    return true;
  }
  
  /**
   * 移除所有监听器
   */
  public removeAllListeners(event?: string): this {
    if (event) {
      this._events.delete(event);
    } else {
      this._events.clear();
    }
    return this;
  }
}
```

## FederatedEvent 统一事件

将浏览器的各种事件（MouseEvent、TouchEvent、PointerEvent）统一为一种格式：

```typescript
// src/events/FederatedEvent.ts

/**
 * 统一事件对象
 * 类似 DOM 的 PointerEvent，但适用于 PixiJS 场景
 */
export class FederatedEvent {
  // 原始浏览器事件
  public readonly nativeEvent: Event;
  
  // 事件类型
  public readonly type: string;
  
  // 事件目标（最内层的对象）
  public target: Container | null = null;
  
  // 当前处理事件的对象
  public currentTarget: Container | null = null;
  
  // 事件坐标（相对于画布）
  public readonly global: Point = new Point();
  
  // 事件坐标（相对于当前对象）
  public readonly local: Point = new Point();
  
  // 指针 ID（支持多点触控）
  public readonly pointerId: number;
  
  // 按钮状态
  public readonly button: number;
  public readonly buttons: number;
  
  // 修饰键
  public readonly altKey: boolean;
  public readonly ctrlKey: boolean;
  public readonly shiftKey: boolean;
  public readonly metaKey: boolean;
  
  // 事件流控制
  public propagationStopped: boolean = false;
  public propagationImmediatelyStopped: boolean = false;
  public defaultPrevented: boolean = false;
  
  // 事件阶段
  public eventPhase: number = 0;  // 0: none, 1: capture, 2: target, 3: bubble
  
  constructor(type: string, nativeEvent: Event) {
    this.type = type;
    this.nativeEvent = nativeEvent;
    
    // 从原生事件提取信息
    if (nativeEvent instanceof PointerEvent) {
      this.pointerId = nativeEvent.pointerId;
      this.button = nativeEvent.button;
      this.buttons = nativeEvent.buttons;
    } else if (nativeEvent instanceof MouseEvent) {
      this.pointerId = 0;
      this.button = nativeEvent.button;
      this.buttons = nativeEvent.buttons;
    } else {
      this.pointerId = 0;
      this.button = 0;
      this.buttons = 0;
    }
    
    this.altKey = (nativeEvent as any).altKey ?? false;
    this.ctrlKey = (nativeEvent as any).ctrlKey ?? false;
    this.shiftKey = (nativeEvent as any).shiftKey ?? false;
    this.metaKey = (nativeEvent as any).metaKey ?? false;
  }
  
  /**
   * 停止冒泡
   */
  public stopPropagation(): void {
    this.propagationStopped = true;
  }
  
  /**
   * 立即停止冒泡（包括当前元素的其他监听器）
   */
  public stopImmediatePropagation(): void {
    this.propagationImmediatelyStopped = true;
    this.propagationStopped = true;
  }
  
  /**
   * 阻止默认行为
   */
  public preventDefault(): void {
    this.defaultPrevented = true;
    this.nativeEvent.preventDefault();
  }
  
  /**
   * 获取相对于指定对象的本地坐标
   */
  public getLocalPosition(target: Container): Point {
    const local = new Point();
    target.worldTransform.applyInverse(this.global, local);
    return local;
  }
}
```

## EventSystem 核心实现

```typescript
// src/events/EventSystem.ts

/**
 * 事件系统
 * 连接浏览器事件和 PixiJS 场景
 */
export class EventSystem {
  // 渲染器引用
  private _renderer: Renderer;
  
  // 事件边界（处理事件分发）
  private _eventBoundary: EventBoundary;
  
  // 绑定的 DOM 元素
  private _domElement: HTMLElement | null = null;
  
  // 当前追踪的指针
  private _activePointers: Map<number, PointerTracker> = new Map();
  
  // 事件类型映射
  private static readonly POINTER_EVENTS = [
    'pointerdown', 'pointermove', 'pointerup', 'pointerover', 'pointerout',
    'pointerenter', 'pointerleave', 'pointercancel'
  ];
  
  constructor(renderer: Renderer) {
    this._renderer = renderer;
    this._eventBoundary = new EventBoundary(renderer.stage);
  }
  
  /**
   * 设置事件根节点
   */
  public setTargetElement(element: HTMLElement): void {
    // 解绑旧元素
    if (this._domElement) {
      this.removeListeners();
    }
    
    this._domElement = element;
    
    // 绑定新元素
    if (element) {
      this.addListeners();
    }
  }
  
  /**
   * 添加 DOM 事件监听
   */
  private addListeners(): void {
    const element = this._domElement!;
    
    for (const type of EventSystem.POINTER_EVENTS) {
      element.addEventListener(type, this.onPointerEvent, {
        passive: false,
        capture: true,
      });
    }
    
    // 全局事件（用于处理指针离开窗口的情况）
    globalThis.addEventListener('pointermove', this.onGlobalMove);
    globalThis.addEventListener('pointerup', this.onGlobalUp);
  }
  
  /**
   * 处理指针事件
   */
  private onPointerEvent = (nativeEvent: PointerEvent): void => {
    // 转换坐标到画布空间
    const global = this.mapToCanvas(nativeEvent);
    
    // 创建统一事件
    const event = new FederatedEvent(nativeEvent.type, nativeEvent);
    event.global.copyFrom(global);
    
    // 交给事件边界处理
    this._eventBoundary.mapEvent(event);
  };
  
  /**
   * 将屏幕坐标映射到画布坐标
   */
  private mapToCanvas(nativeEvent: PointerEvent): Point {
    const rect = this._domElement!.getBoundingClientRect();
    
    return new Point(
      (nativeEvent.clientX - rect.left) * this._renderer.resolution,
      (nativeEvent.clientY - rect.top) * this._renderer.resolution
    );
  }
  
  /**
   * 销毁事件系统
   */
  public destroy(): void {
    this.removeListeners();
    this._eventBoundary.destroy();
    this._activePointers.clear();
  }
}
```

## EventBoundary 事件边界

EventBoundary 负责事件的命中测试和分发：

```typescript
// src/events/EventBoundary.ts

/**
 * 事件边界
 * 管理一个场景的事件处理
 */
export class EventBoundary {
  // 根容器
  public rootTarget: Container;
  
  // 当前鼠标悬停的对象
  private _overTargets: Container[] = [];
  
  constructor(root: Container) {
    this.rootTarget = root;
  }
  
  /**
   * 映射并分发事件
   */
  public mapEvent(event: FederatedEvent): void {
    // 1. 命中测试 - 找到事件目标
    const target = this.hitTest(event.global.x, event.global.y);
    event.target = target;
    
    // 2. 根据事件类型分发
    switch (event.type) {
      case 'pointermove':
        this.handlePointerMove(event);
        break;
      case 'pointerdown':
        this.dispatchEvent(event, 'pointerdown');
        break;
      case 'pointerup':
        this.dispatchEvent(event, 'pointerup');
        this.dispatchEvent(event, 'click');
        break;
      // ... 其他事件类型
    }
  }
  
  /**
   * 处理指针移动（包括 enter/leave 事件）
   */
  private handlePointerMove(event: FederatedEvent): void {
    // 获取新的悬停路径
    const newPath = this.getEventPath(event.target);
    const oldPath = this._overTargets;
    
    // 找出离开的对象
    for (const target of oldPath) {
      if (!newPath.includes(target)) {
        this.dispatchLeaveEvent(target, event);
      }
    }
    
    // 找出进入的对象
    for (const target of newPath) {
      if (!oldPath.includes(target)) {
        this.dispatchEnterEvent(target, event);
      }
    }
    
    // 分发 move 事件
    this.dispatchEvent(event, 'pointermove');
    
    // 更新悬停列表
    this._overTargets = newPath;
  }
  
  /**
   * 分发事件（包括捕获和冒泡阶段）
   */
  private dispatchEvent(event: FederatedEvent, type: string): void {
    if (!event.target) return;
    
    // 获取事件传播路径
    const path = this.getEventPath(event.target);
    
    // 捕获阶段：从根到目标
    event.eventPhase = 1;
    for (let i = path.length - 1; i >= 0; i--) {
      if (event.propagationStopped) break;
      
      event.currentTarget = path[i];
      this.notifyTarget(path[i], type + 'capture', event);
    }
    
    // 目标阶段
    if (!event.propagationStopped) {
      event.eventPhase = 2;
      event.currentTarget = event.target;
      this.notifyTarget(event.target, type, event);
    }
    
    // 冒泡阶段：从目标到根
    event.eventPhase = 3;
    for (let i = 1; i < path.length; i++) {
      if (event.propagationStopped) break;
      
      event.currentTarget = path[i];
      this.notifyTarget(path[i], type, event);
    }
  }
  
  /**
   * 获取从目标到根的路径
   */
  private getEventPath(target: Container | null): Container[] {
    const path: Container[] = [];
    let current = target;
    
    while (current) {
      path.push(current);
      current = current.parent;
    }
    
    return path;
  }
  
  /**
   * 通知目标对象
   */
  private notifyTarget(
    target: Container,
    type: string,
    event: FederatedEvent
  ): void {
    target.emit(type, event);
  }
  
  /**
   * 命中测试
   */
  public hitTest(x: number, y: number): Container | null {
    return this.recursiveHitTest(this.rootTarget, x, y);
  }
  
  private recursiveHitTest(
    target: Container,
    x: number,
    y: number
  ): Container | null {
    // 不可交互则跳过
    if (!target.interactive && !target.interactiveChildren) {
      return null;
    }
    
    // 先检查子对象（后添加的在上层）
    for (let i = target.children.length - 1; i >= 0; i--) {
      const hit = this.recursiveHitTest(target.children[i], x, y);
      if (hit) return hit;
    }
    
    // 检查自身
    if (target.interactive && target.containsPoint(x, y)) {
      return target;
    }
    
    return null;
  }
}
```

## 使用示例

```typescript
// 创建可交互的精灵
const button = new Sprite(buttonTexture);
button.interactive = true;  // 启用交互

// 监听事件
button.on('pointerdown', (event) => {
  console.log('按下!', event.global);
});

button.on('pointerup', (event) => {
  console.log('释放!');
});

button.on('pointerover', () => {
  button.tint = 0xFFFF00;  // 悬停时变色
});

button.on('pointerout', () => {
  button.tint = 0xFFFFFF;  // 恢复原色
});

// 一次性监听
button.once('click', () => {
  console.log('只触发一次');
});

// 阻止冒泡
button.on('pointerdown', (event) => {
  event.stopPropagation();
});
```

## 小结

EventSystem 的核心设计：

1. **桥接浏览器事件**：将 DOM 事件转换为 PixiJS 事件
2. **统一事件格式**：FederatedEvent 统一处理鼠标、触摸、Pointer
3. **命中测试**：确定事件目标
4. **事件传播**：支持捕获和冒泡阶段

这使得 Canvas 渲染的内容也能像 DOM 元素一样响应用户交互。
