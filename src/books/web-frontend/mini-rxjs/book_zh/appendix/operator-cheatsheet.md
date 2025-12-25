---
sidebar_position: 106
title: "操作符速查表"
---

# 操作符速查表

本章提供 Mini RxJS 所有操作符的快速参考。

## 创建操作符

| 操作符 | 说明 | 示例 |
|--------|------|------|
| `of` | 发射给定值 | `of(1, 2, 3)` |
| `from` | 从数组/Promise 创建 | `from([1, 2, 3])` |
| `fromEvent` | 从 DOM 事件创建 | `fromEvent(btn, 'click')` |
| `interval` | 定时发射数字 | `interval(1000)` |
| `timer` | 延迟后发射 | `timer(1000, 500)` |
| `range` | 发射数字范围 | `range(1, 10)` |
| `throwError` | 发射错误 | `throwError(() => new Error())` |
| `EMPTY` | 立即完成 | `EMPTY` |
| `NEVER` | 永不发射 | `NEVER` |
| `defer` | 延迟创建 | `defer(() => of(Date.now()))` |

### 使用示例

```typescript
// of - 发射固定值
of('a', 'b', 'c').subscribe(console.log)

// from - 转换数组或 Promise
from([1, 2, 3]).subscribe(console.log)
from(fetch('/api')).subscribe(console.log)

// interval - 每秒发射
interval(1000).pipe(take(5)).subscribe(console.log)

// timer - 延迟后发射
timer(2000).subscribe(() => console.log('2秒后'))

// defer - 每次订阅时创建新的
defer(() => of(Math.random())).subscribe(console.log)
```

## 转换操作符

| 操作符 | 说明 | 签名 |
|--------|------|------|
| `map` | 值转换 | `map(x => x * 2)` |
| `mapTo` | 映射为常量 | `mapTo('clicked')` |
| `pluck` | 提取属性 | `pluck('data', 'id')` |
| `scan` | 累积计算 | `scan((acc, x) => acc + x, 0)` |
| `reduce` | 归约（完成时发射） | `reduce((acc, x) => acc + x, 0)` |
| `toArray` | 收集到数组 | `toArray()` |
| `buffer` | 缓冲值 | `buffer(notifier$)` |
| `bufferCount` | 按数量缓冲 | `bufferCount(3)` |
| `bufferTime` | 按时间缓冲 | `bufferTime(1000)` |

### 使用示例

```typescript
// map - 基础转换
of(1, 2, 3).pipe(map(x => x * 2))
// 输出: 2, 4, 6

// scan - 累积状态
of(1, 2, 3).pipe(scan((acc, x) => acc + x, 0))
// 输出: 1, 3, 6

// bufferTime - 批量处理
clicks$.pipe(bufferTime(1000))
// 每秒收集一批点击
```

## 过滤操作符

| 操作符 | 说明 | 签名 |
|--------|------|------|
| `filter` | 条件过滤 | `filter(x => x > 0)` |
| `take` | 取前 N 个 | `take(5)` |
| `takeUntil` | 取到通知 | `takeUntil(stop$)` |
| `takeWhile` | 取到条件为假 | `takeWhile(x => x < 10)` |
| `skip` | 跳过前 N 个 | `skip(3)` |
| `skipUntil` | 跳过到通知 | `skipUntil(start$)` |
| `skipWhile` | 跳过到条件为假 | `skipWhile(x => x < 5)` |
| `first` | 第一个值 | `first()` |
| `last` | 最后一个值 | `last()` |
| `distinct` | 去重 | `distinct()` |
| `distinctUntilChanged` | 连续去重 | `distinctUntilChanged()` |
| `debounceTime` | 防抖 | `debounceTime(300)` |
| `throttleTime` | 节流 | `throttleTime(300)` |

### 使用示例

```typescript
// filter - 过滤偶数
of(1, 2, 3, 4).pipe(filter(x => x % 2 === 0))
// 输出: 2, 4

// take - 只取前 3 个
interval(100).pipe(take(3))
// 输出: 0, 1, 2

// takeUntil - 取到停止信号
source$.pipe(takeUntil(destroy$))

// distinctUntilChanged - 连续去重
of(1, 1, 2, 2, 1).pipe(distinctUntilChanged())
// 输出: 1, 2, 1

// debounceTime - 搜索防抖
input$.pipe(debounceTime(300))
```

## 组合操作符

| 操作符 | 说明 | 签名 |
|--------|------|------|
| `merge` | 合并流 | `merge(a$, b$)` |
| `concat` | 串联流 | `concat(a$, b$)` |
| `combineLatest` | 组合最新值 | `combineLatest([a$, b$])` |
| `forkJoin` | 等待全部完成 | `forkJoin([a$, b$])` |
| `zip` | 配对组合 | `zip(a$, b$)` |
| `race` | 竞争 | `race(a$, b$)` |
| `withLatestFrom` | 附加最新值 | `withLatestFrom(other$)` |
| `startWith` | 初始值 | `startWith(0)` |
| `endWith` | 结束值 | `endWith('done')` |

### 使用示例

```typescript
// merge - 合并多个流
merge(click$, touch$).subscribe(handleInput)

// combineLatest - 组合最新值
combineLatest([name$, age$]).pipe(
  map(([name, age]) => ({ name, age }))
)

// forkJoin - 并行请求
forkJoin({
  user: fetchUser(),
  posts: fetchPosts()
}).subscribe(({ user, posts }) => {})

// withLatestFrom - 附加当前状态
save$.pipe(
  withLatestFrom(formData$),
  map(([_, data]) => data)
)
```

## 高阶操作符

| 操作符 | 说明 | 特点 |
|--------|------|------|
| `switchMap` | 切换到新流 | 取消之前的内部流 |
| `mergeMap` | 合并内部流 | 并发执行 |
| `concatMap` | 串联内部流 | 顺序执行 |
| `exhaustMap` | 忽略新流 | 当前未完成时忽略 |

### 对比示例

```typescript
// switchMap - 搜索（取消旧请求）
searchInput$.pipe(
  switchMap(term => search(term))
)

// mergeMap - 并发下载
urls$.pipe(
  mergeMap(url => download(url), 3)  // 并发数 3
)

// concatMap - 顺序执行
queue$.pipe(
  concatMap(task => execute(task))
)

// exhaustMap - 防止重复提交
submit$.pipe(
  exhaustMap(() => saveForm())
)
```

## 错误处理操作符

| 操作符 | 说明 | 签名 |
|--------|------|------|
| `catchError` | 捕获错误 | `catchError(err => of(fallback))` |
| `retry` | 重试 | `retry(3)` |
| `retryWhen` | 条件重试 | `retryWhen(errors => errors.pipe(delay(1000)))` |
| `throwIfEmpty` | 空流抛错 | `throwIfEmpty(() => new Error())` |

### 使用示例

```typescript
// catchError - 错误恢复
api$.pipe(
  catchError(err => {
    console.error(err)
    return of(defaultValue)
  })
)

// retry - 简单重试
api$.pipe(
  retry(3),
  catchError(() => of(null))
)

// 指数退避重试
api$.pipe(
  retryWhen(errors => errors.pipe(
    scan((count, err) => {
      if (count >= 3) throw err
      return count + 1
    }, 0),
    delay(count => 1000 * Math.pow(2, count))
  ))
)
```

## 工具操作符

| 操作符 | 说明 | 签名 |
|--------|------|------|
| `tap` | 副作用 | `tap(x => console.log(x))` |
| `delay` | 延迟发射 | `delay(1000)` |
| `delayWhen` | 条件延迟 | `delayWhen(() => timer(1000))` |
| `finalize` | 完成/错误回调 | `finalize(() => cleanup())` |
| `timeout` | 超时错误 | `timeout(5000)` |
| `timeoutWith` | 超时切换 | `timeoutWith(5000, fallback$)` |

### 使用示例

```typescript
// tap - 调试日志
data$.pipe(
  tap(x => console.log('Before:', x)),
  map(x => x * 2),
  tap(x => console.log('After:', x))
)

// finalize - 清理资源
data$.pipe(
  finalize(() => {
    console.log('Done')
    hideLoading()
  })
)

// timeout - 超时处理
api$.pipe(
  timeout(5000),
  catchError(() => of('Timeout'))
)
```

## 多播操作符

| 操作符 | 说明 | 特点 |
|--------|------|------|
| `share` | 共享订阅 | 引用计数，自动取消 |
| `shareReplay` | 共享 + 重放 | 缓存最近的值 |
| `publish` | 转为 ConnectableObservable | 手动 connect |
| `refCount` | 自动连接 | 有订阅者时连接 |

### 使用示例

```typescript
// share - 共享 HTTP 请求
const data$ = http.get('/api').pipe(share())

// 多个订阅者共享同一请求
data$.subscribe(a => {})
data$.subscribe(b => {})

// shareReplay - 缓存配置
const config$ = fetchConfig().pipe(
  shareReplay(1)
)

// 后来的订阅者获取缓存值
setTimeout(() => {
  config$.subscribe(c => {})  // 立即获取缓存
}, 5000)
```

## Subject 类型

| 类型 | 说明 | 特点 |
|------|------|------|
| `Subject` | 基础多播 | 无初始值，无缓存 |
| `BehaviorSubject` | 行为主题 | 有当前值 |
| `ReplaySubject` | 重放主题 | 缓存指定数量 |
| `AsyncSubject` | 异步主题 | 只发射最后一个值 |

### 使用示例

```typescript
// Subject - 事件总线
const events$ = new Subject<Event>()
events$.next({ type: 'click' })

// BehaviorSubject - 状态管理
const count$ = new BehaviorSubject(0)
console.log(count$.getValue())  // 0
count$.next(1)

// ReplaySubject - 消息历史
const messages$ = new ReplaySubject<Message>(10)
// 新订阅者获取最近 10 条消息

// AsyncSubject - 异步结果
const result$ = new AsyncSubject<Result>()
result$.next(temp)
result$.next(final)
result$.complete()  // 只发射 final
```

## 快速选择指南

```
需要转换值？           → map
需要过滤值？           → filter
需要限制数量？         → take, first
需要去重？             → distinctUntilChanged
需要防抖？             → debounceTime
需要节流？             → throttleTime
需要合并多流？         → merge
需要组合最新值？       → combineLatest
需要等待全部完成？     → forkJoin
需要切换内部流？       → switchMap
需要并发内部流？       → mergeMap
需要顺序内部流？       → concatMap
需要错误恢复？         → catchError
需要重试？             → retry
需要共享订阅？         → share, shareReplay
需要调试？             → tap
需要清理？             → finalize
```

## 本章小结

本章提供了所有操作符的速查表，按功能分类便于快速查找。下一章介绍 Marble 图语法。
