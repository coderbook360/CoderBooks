# 理解高阶 Observable

高阶 Observable 是 RxJS 中的高级概念，理解它是掌握 `mergeMap`、`switchMap` 等操作符的关键。

## 什么是高阶 Observable？

首先要问一个问题：**Observable 能发射什么类型的值？**

答案是：**任何类型的值，包括另一个 Observable。**

```typescript
// 普通 Observable：发射数字
const numbers$ = of(1, 2, 3)

// 高阶 Observable：发射 Observable
const observables$ = of(
  of(1, 2, 3),
  of(4, 5, 6),
  of(7, 8, 9)
)
```

**定义**：高阶 Observable 是一个发射 Observable 的 Observable，类型为 `Observable<Observable<T>>`。

## 为什么需要高阶 Observable？

现在我要问第二个问题：**什么场景会产生高阶 Observable？**

### 场景1：映射到异步操作

```typescript
// 用户输入流
const searchInput$ = fromEvent(input, 'input')

// 每次输入都触发一个 HTTP 请求
const searchResults$ = searchInput$.pipe(
  map(event => {
    const query = event.target.value
    return ajax(`/api/search?q=${query}`) // 返回 Observable
  })
)

// searchResults$ 的类型：Observable<Observable<Response>>
```

### 场景2：动态创建流

```typescript
const userIds$ = of(1, 2, 3)

const userDetails$ = userIds$.pipe(
  map(id => ajax(`/api/users/${id}`)) // 每个 id 映射到请求
)

// userDetails$ 类型：Observable<Observable<User>>
```

### 场景3：事件触发的定时器

```typescript
const clicks$ = fromEvent(button, 'click')

const timers$ = clicks$.pipe(
  map(() => interval(1000)) // 每次点击创建一个定时器
)

// timers$ 类型：Observable<Observable<number>>
```

## 高阶 Observable 的问题

**思考一下，如何订阅高阶 Observable？**

```typescript
const observables$ = of(
  of(1, 2, 3),
  of(4, 5, 6)
)

// 外层订阅
observables$.subscribe(inner$ => {
  console.log('收到:', inner$) // Observable 对象
  
  // 需要再订阅内层
  inner$.subscribe(value => {
    console.log('内层值:', value)
  })
})
```

**问题**：
1. 需要嵌套订阅，代码复杂
2. 订阅管理困难
3. 无法控制并发行为

## 扁平化操作符

**扁平化**：将高阶 Observable 转换为普通 Observable。

```
Observable<Observable<T>> → Observable<T>
```

### 四种扁平化策略

| 操作符 | 策略 | 说明 |
|--------|------|------|
| mergeAll | 并行订阅 | 同时订阅所有内层 Observable |
| concatAll | 顺序订阅 | 前一个完成再订阅下一个 |
| switchAll | 切换订阅 | 新的到来时取消前一个 |
| exhaustAll | 忽略新订阅 | 有活动订阅时忽略新的 |

## 可视化理解

### 高阶 Observable 的结构

```
外层时间线:
    ---A$-------B$-------C$----|

内层 Observable:
A$: ---1---2---3-|
B$: ---4---5-|
C$: ---6---7---8---9-|
```

### mergeAll：并行

```
mergeAll:
    ---1---2-4-3-5-6---7---8---9-|
       └A$ └B$ └C$
```

### concatAll：顺序

```
concatAll:
    ---1---2---3-4---5-6---7---8---9-|
       └─A$完成─┘└B$┘└────C$────┘
```

### switchAll：切换

```
switchAll:
    ---1---2---4---5-6---7---8---9-|
       └A$被取消 └B$被取消 └──C$──┘
```

### exhaustAll：忽略

```
exhaustAll:
    ---1---2---3-|
       └───A$───┘（B$和C$被忽略）
```

## 实战示例

### 示例1：搜索自动补全

```typescript
const searchInput$ = fromEvent(input, 'input')

// 产生高阶 Observable
const searchResults$ = searchInput$.pipe(
  debounceTime(300),
  map(event => {
    const query = event.target.value
    return ajax(`/api/search?q=${query}`) // Observable
  }),
  // 使用 switchAll 扁平化
  switchAll()
)

searchResults$.subscribe(displayResults)
```

**为什么用 switchAll？**
- 新搜索时取消旧请求
- 避免结果乱序
- 节省网络资源

### 示例2：批量请求

```typescript
const userIds$ = of(1, 2, 3, 4, 5)

const userDetails$ = userIds$.pipe(
  map(id => ajax(`/api/users/${id}`)),
  // 使用 mergeAll 并发请求
  mergeAll(3) // 最多3个并发
)

userDetails$.subscribe(console.log)
```

**为什么用 mergeAll？**
- 并发请求提高速度
- 控制并发数避免过载

### 示例3：顺序执行任务

```typescript
const tasks$ = of(
  () => ajax('/api/task1'),
  () => ajax('/api/task2'),
  () => ajax('/api/task3')
)

const results$ = tasks$.pipe(
  map(taskFn => taskFn()),
  // 使用 concatAll 顺序执行
  concatAll()
)

results$.subscribe(console.log)
```

**为什么用 concatAll？**
- 保证执行顺序
- 前一个完成再执行下一个

## 高阶 Observable 的类型

TypeScript 中的类型表示：

```typescript
// 一阶 Observable
type Order1 = Observable<number>

// 二阶 Observable（高阶）
type Order2 = Observable<Observable<number>>

// 三阶 Observable
type Order3 = Observable<Observable<Observable<number>>>

// 扁平化
function flatten<T>(
  source: Observable<Observable<T>>
): Observable<T> {
  // 实现扁平化逻辑
}
```

## map + 扁平化 = 高阶操作符

常用的高阶操作符实际上是 `map` + 扁平化的组合：

```typescript
// mergeMap = map + mergeAll
mergeMap(fn) = map(fn) + mergeAll()

// concatMap = map + concatAll
concatMap(fn) = map(fn) + concatAll()

// switchMap = map + switchAll
switchMap(fn) = map(fn) + switchAll()

// exhaustMap = map + exhaustAll
exhaustMap(fn) = map(fn) + exhaustAll()
```

**示例**：

```typescript
// 写法1：分步
source.pipe(
  map(value => ajax(`/api/${value}`)),
  switchAll()
)

// 写法2：合并（推荐）
source.pipe(
  switchMap(value => ajax(`/api/${value}`))
)
```

## 嵌套层级

理论上可以无限嵌套：

```typescript
// 三阶 Observable
Observable<Observable<Observable<T>>>

// 需要多次扁平化
source.pipe(
  mergeAll(), // Observable<Observable<T>>
  mergeAll()  // Observable<T>
)
```

但实践中很少超过二阶。

## 常见陷阱

### 陷阱1：忘记扁平化

```typescript
// ❌ 错误
searchInput$.pipe(
  map(event => ajax(`/api/search?q=${event.target.value}`))
).subscribe(result => {
  console.log(result) // Observable 对象，不是数据
})

// ✅ 正确
searchInput$.pipe(
  map(event => ajax(`/api/search?q=${event.target.value}`)),
  switchAll() // 扁平化
).subscribe(result => {
  console.log(result) // 数据
})
```

### 陷阱2：选错扁平化策略

```typescript
// ❌ 搜索用 mergeAll，结果可能乱序
searchInput$.pipe(
  map(event => ajax(`/api/search?q=${event.target.value}`)),
  mergeAll() // 所有请求并发，可能后发先至
)

// ✅ 应该用 switchAll
searchInput$.pipe(
  map(event => ajax(`/api/search?q=${event.target.value}`)),
  switchAll() // 新请求时取消旧请求
)
```

### 陷阱3：过度嵌套

```typescript
// ❌ 难以理解和维护
source$.pipe(
  map(a => of(a).pipe(
    map(b => of(b).pipe(
      map(c => of(c))
    ))
  ))
)

// ✅ 保持扁平
source$.pipe(
  switchMap(a =>
    of(a).pipe(
      switchMap(b =>
        of(b).pipe(
          map(c => c)
        )
      )
    )
  )
)
```

## 调试技巧

```typescript
// 查看高阶 Observable 结构
const higher$ = source$.pipe(
  map(value => {
    console.log('映射值:', value)
    const inner$ = ajax(`/api/${value}`)
    console.log('创建内层 Observable:', inner$)
    return inner$
  }),
  tap(inner$ => {
    console.log('外层发射:', inner$)
    // 手动订阅查看内层
    inner$.subscribe(v => console.log('  内层值:', v))
  }),
  switchAll()
)
```

## 总结

**高阶 Observable**：
- 发射 Observable 的 Observable
- 类型：`Observable<Observable<T>>`
- 常见于 map 到异步操作

**产生场景**：
- 映射到 HTTP 请求
- 动态创建定时器
- 事件触发的异步操作

**扁平化策略**：
- mergeAll：并行订阅
- concatAll：顺序订阅
- switchAll：切换订阅
- exhaustAll：忽略新订阅

**选择依据**：
- 搜索自动补全：switchAll
- 批量请求：mergeAll
- 顺序任务：concatAll
- 防止重复触发：exhaustAll

理解高阶 Observable 是掌握 RxJS 高级特性的关键，它让异步操作的组合变得优雅而强大。
