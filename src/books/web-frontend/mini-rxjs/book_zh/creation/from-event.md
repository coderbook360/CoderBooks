---
sidebar_position: 27
title: "fromEvent：DOM 事件转 Observable"
---

# fromEvent：DOM 事件转 Observable

`fromEvent` 将 DOM 事件转换为 Observable，是前端开发中最常用的创建操作符之一。

## 基本用法

```javascript
const clicks$ = fromEvent(document, 'click')

clicks$.subscribe(event => {
  console.log('Clicked at:', event.clientX, event.clientY)
})
```

## 实现 fromEvent

```javascript
function fromEvent(target, eventName, options) {
  return new Observable(subscriber => {
    // 事件处理函数
    const handler = (event) => {
      subscriber.next(event)
    }

    // 添加事件监听
    target.addEventListener(eventName, handler, options)

    // 返回清理函数
    return () => {
      target.removeEventListener(eventName, handler, options)
    }
  })
}
```

## 支持多种事件源

### DOM 元素

```javascript
const button = document.querySelector('button')
fromEvent(button, 'click').subscribe(console.log)
```

### Window 和 Document

```javascript
fromEvent(window, 'resize').subscribe(event => {
  console.log('Window size:', window.innerWidth, window.innerHeight)
})

fromEvent(document, 'keydown').subscribe(event => {
  console.log('Key pressed:', event.key)
})
```

### Node.js EventEmitter

```javascript
function fromEvent(target, eventName) {
  return new Observable(subscriber => {
    const handler = (event) => subscriber.next(event)

    // 检测事件源类型
    if (typeof target.addEventListener === 'function') {
      // DOM 事件
      target.addEventListener(eventName, handler)
      return () => target.removeEventListener(eventName, handler)
    }

    if (typeof target.on === 'function') {
      // Node.js EventEmitter
      target.on(eventName, handler)
      return () => target.off(eventName, handler)
    }

    throw new Error('Unsupported event target')
  })
}
```

## 事件选项支持

```javascript
// 捕获阶段
fromEvent(element, 'click', { capture: true })

// 只触发一次
fromEvent(element, 'click', { once: true })

// 被动模式（提升滚动性能）
fromEvent(element, 'touchmove', { passive: true })
```

完善实现：

```javascript
function fromEvent(target, eventName, options) {
  return new Observable(subscriber => {
    const handler = (event) => subscriber.next(event)

    const useCapture = typeof options === 'boolean' ? options : options?.capture
    
    target.addEventListener(eventName, handler, options)

    return () => {
      target.removeEventListener(eventName, handler, options)
    }
  })
}
```

## 实战示例

### 鼠标移动追踪

```javascript
fromEvent(document, 'mousemove').pipe(
  map(e => ({ x: e.clientX, y: e.clientY })),
  throttleTime(100)
).subscribe(pos => {
  console.log(`Mouse at (${pos.x}, ${pos.y})`)
})
```

### 输入框搜索

```javascript
const input = document.querySelector('input')

fromEvent(input, 'input').pipe(
  map(e => e.target.value),
  debounceTime(300),
  distinctUntilChanged(),
  filter(term => term.length >= 2)
).subscribe(term => {
  console.log('Search:', term)
})
```

### 键盘快捷键

```javascript
fromEvent(document, 'keydown').pipe(
  filter(e => e.ctrlKey && e.key === 's'),
  tap(e => e.preventDefault())
).subscribe(() => {
  console.log('Save triggered')
})
```

### 拖拽实现

```javascript
const element = document.querySelector('.draggable')

const mousedown$ = fromEvent(element, 'mousedown')
const mousemove$ = fromEvent(document, 'mousemove')
const mouseup$ = fromEvent(document, 'mouseup')

mousedown$.pipe(
  switchMap(start => {
    const startX = start.clientX - element.offsetLeft
    const startY = start.clientY - element.offsetTop

    return mousemove$.pipe(
      map(move => ({
        x: move.clientX - startX,
        y: move.clientY - startY
      })),
      takeUntil(mouseup$)
    )
  })
).subscribe(pos => {
  element.style.left = pos.x + 'px'
  element.style.top = pos.y + 'px'
})
```

## fromEventPattern

对于非标准事件 API，使用 `fromEventPattern`：

```javascript
function fromEventPattern(addHandler, removeHandler) {
  return new Observable(subscriber => {
    const handler = (...args) => subscriber.next(args.length === 1 ? args[0] : args)
    
    addHandler(handler)
    
    return () => removeHandler(handler)
  })
}
```

使用：

```javascript
// 自定义事件系统
const customEvent$ = fromEventPattern(
  handler => customEmitter.addListener('event', handler),
  handler => customEmitter.removeListener('event', handler)
)

// jQuery
const jqClick$ = fromEventPattern(
  handler => $(button).on('click', handler),
  handler => $(button).off('click', handler)
)
```

## 内存管理

`fromEvent` 返回的 Observable 是 **无限的**，需要手动取消订阅：

```javascript
const subscription = fromEvent(button, 'click').subscribe(console.log)

// 组件销毁时
subscription.unsubscribe()
```

配合 takeUntil：

```javascript
const destroy$ = new Subject()

fromEvent(button, 'click').pipe(
  takeUntil(destroy$)
).subscribe(console.log)

// 组件销毁时
destroy$.next()
destroy$.complete()
```

## 本章小结

- `fromEvent` 将事件监听转换为 Observable
- 返回清理函数确保事件监听正确移除
- 支持 DOM 元素、window、document 和 EventEmitter
- `fromEventPattern` 处理非标准事件 API
- 记得取消订阅，避免内存泄漏

下一章实现 `fromPromise`，专门处理 Promise 转换。
