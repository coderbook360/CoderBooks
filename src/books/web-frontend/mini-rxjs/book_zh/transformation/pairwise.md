---
sidebar_position: 40
title: "pairwise：成对发射"
---

# pairwise：成对发射

`pairwise` 将当前值与前一个值配对，以数组形式发射。

## 基本用法

```javascript
of(1, 2, 3, 4, 5).pipe(
  pairwise()
).subscribe(console.log)
// [1, 2]
// [2, 3]
// [3, 4]
// [4, 5]
```

注意：第一个值不会单独发射，因为没有前一个值可以配对。

## 实现 pairwise

```javascript
function pairwise() {
  return (source) => new Observable(subscriber => {
    let prev
    let hasPrev = false

    return source.subscribe({
      next(value) {
        if (hasPrev) {
          subscriber.next([prev, value])
        }
        prev = value
        hasPrev = true
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        subscriber.complete()
      }
    })
  })
}
```

## 边界情况

### 单值流

```javascript
of(1).pipe(pairwise()).subscribe(console.log)
// （无输出，只有一个值无法配对）
```

### 空流

```javascript
EMPTY.pipe(pairwise()).subscribe({
  next: v => console.log('Next:', v),
  complete: () => console.log('Complete')
})
// Complete（无输出）
```

## 实战示例

### 检测值变化

```javascript
source$.pipe(
  pairwise(),
  filter(([prev, curr]) => prev !== curr)
).subscribe(([prev, curr]) => {
  console.log(`Changed from ${prev} to ${curr}`)
})
```

### 计算差值

```javascript
// 计算相邻值的差
of(10, 15, 12, 20).pipe(
  pairwise(),
  map(([prev, curr]) => curr - prev)
).subscribe(console.log)
// 5, -3, 8
```

### 鼠标移动速度

```javascript
fromEvent(document, 'mousemove').pipe(
  map(e => ({ x: e.clientX, y: e.clientY, time: Date.now() })),
  pairwise(),
  map(([prev, curr]) => {
    const dx = curr.x - prev.x
    const dy = curr.y - prev.y
    const dt = curr.time - prev.time
    const distance = Math.sqrt(dx * dx + dy * dy)
    return distance / dt  // 像素/毫秒
  })
).subscribe(speed => {
  console.log('Speed:', speed.toFixed(2), 'px/ms')
})
```

### 手势方向检测

```javascript
fromEvent(element, 'touchmove').pipe(
  map(e => e.touches[0]),
  map(touch => ({ x: touch.clientX, y: touch.clientY })),
  pairwise(),
  map(([prev, curr]) => {
    const dx = curr.x - prev.x
    const dy = curr.y - prev.y
    
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left'
    } else {
      return dy > 0 ? 'down' : 'up'
    }
  })
).subscribe(direction => {
  console.log('Direction:', direction)
})
```

### 状态对比

```javascript
state$.pipe(
  pairwise()
).subscribe(([prevState, currState]) => {
  if (prevState.loading && !currState.loading) {
    console.log('Loading finished')
  }
  if (!prevState.error && currState.error) {
    console.log('Error occurred:', currState.error)
  }
})
```

## 与 buffer 对比

```javascript
// pairwise：滑动窗口（重叠）
// [1,2], [2,3], [3,4], [4,5]

// bufferCount(2)：不重叠
// [1,2], [3,4], [5]

// bufferCount(2, 1)：滑动窗口（等同 pairwise）
// [1,2], [2,3], [3,4], [4,5]

source$.pipe(bufferCount(2, 1))
// 与 pairwise() 效果相同，但会发射尾部不完整的缓冲
```

## startWith 配合

如果需要从第一个值就开始配对：

```javascript
source$.pipe(
  startWith(null),  // 添加初始值
  pairwise()
).subscribe(([prev, curr]) => {
  if (prev === null) {
    console.log('First value:', curr)
  } else {
    console.log(`${prev} -> ${curr}`)
  }
})
```

## TypeScript 类型

```typescript
function pairwise<T>(): OperatorFunction<T, [T, T]> {
  return (source: Observable<T>) => new Observable(subscriber => {
    let prev: T
    let hasPrev = false

    return source.subscribe({
      next(value) {
        if (hasPrev) {
          subscriber.next([prev, value])
        }
        prev = value
        hasPrev = true
      },
      error(err) { subscriber.error(err) },
      complete() { subscriber.complete() }
    })
  })
}
```

## 本章小结

- `pairwise` 将当前值与前一个值配对发射
- 第一个值不会发射（无前值可配对）
- 适合检测变化、计算差值、速度/方向检测
- 可用 `bufferCount(2, 1)` 实现类似效果

下一章开始实现过滤操作符，从 `filter` 开始。
