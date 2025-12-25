---
sidebar_position: 59
title: "高阶 Observable 概念"
---

# 高阶 Observable 概念

高阶 Observable 是指发射 Observable 的 Observable。理解它是掌握 RxJS 的关键。

## 什么是高阶 Observable

普通 Observable 发射值：

```javascript
const numbers$ = of(1, 2, 3)
// 发射: 1, 2, 3
```

高阶 Observable 发射 Observable：

```javascript
const higherOrder$ = of(
  of(1, 2),
  of(3, 4),
  of(5, 6)
)
// 发射: Observable, Observable, Observable
```

## 为什么需要高阶 Observable

典型场景：搜索功能

```javascript
const search$ = fromEvent(input, 'input').pipe(
  map(e => e.target.value),
  map(term => ajax(`/api/search?q=${term}`))  // 返回 Observable
)

search$.subscribe(result$ => {
  // result$ 是一个 Observable，需要再订阅
  result$.subscribe(data => console.log(data))
})
```

问题：
1. 嵌套订阅难以管理
2. 无法自动取消之前的请求
3. 内存泄漏风险

## 扁平化操作符

将高阶 Observable "压平" 的操作符：

```javascript
// 嵌套订阅
search$.subscribe(result$ => {
  result$.subscribe(...)
})

// 扁平化
search$.pipe(
  switchMap(term => ajax(`/api/search?q=${term}`))
).subscribe(data => {
  // 直接得到数据
})
```

### 四种扁平化策略

```javascript
const clicks$ = fromEvent(document, 'click')
const makeRequest = () => ajax('/api/data')

// 1. mergeMap: 并发执行所有
clicks$.pipe(
  mergeMap(() => makeRequest())
)
// 点3次 = 3个并发请求

// 2. switchMap: 取消之前的，执行新的
clicks$.pipe(
  switchMap(() => makeRequest())
)
// 快速点3次 = 只有最后1个请求完成

// 3. concatMap: 排队执行
clicks$.pipe(
  concatMap(() => makeRequest())
)
// 点3次 = 3个请求串行执行

// 4. exhaustMap: 忽略新的，直到当前完成
clicks$.pipe(
  exhaustMap(() => makeRequest())
)
// 快速点3次 = 只执行第1个请求
```

时间线对比：

```
点击:      c----c----c---->
请求:      |--A--|  (每个请求耗时)

mergeMap:  |--A--|
               |--B--|
                    |--C--|
输出:      ----A----B----C-->

switchMap: |--A  (取消)
               |--B  (取消)
                    |--C--|
输出:      -----------C-->

concatMap: |--A--|--B--|--C--|
输出:      ----A------B------C-->

exhaustMap:|--A--|
               (忽略)
                    (忽略)
输出:      ----A-->
```

## 选择哪个策略

| 场景 | 操作符 |
|------|--------|
| 搜索建议 | `switchMap` |
| 批量提交 | `concatMap` |
| 并行下载 | `mergeMap` |
| 防重复点击 | `exhaustMap` |

### 详细场景分析

**switchMap**：只关心最新结果
- 搜索输入建议
- 路由切换加载
- 拖拽实时更新

**concatMap**：保证顺序执行
- 顺序上传文件
- 按序发送消息
- 事务操作队列

**mergeMap**：并行处理
- 批量下载
- 并行 API 调用
- 多用户操作

**exhaustMap**：防止重复
- 表单提交按钮
- 防止重复登录
- 确认对话框操作

## 理解 map vs xxxMap

```javascript
// map: 同步转换
of(1, 2, 3).pipe(
  map(x => x * 2)
)
// 2, 4, 6

// mergeMap: 异步转换 + 扁平化
of(1, 2, 3).pipe(
  mergeMap(x => of(x * 2))
)
// 2, 4, 6 (看起来一样，但内部是 Observable)
```

关键区别：

```javascript
// map 返回普通值
source$.pipe(
  map(id => fetchUser(id))  // 返回 Observable<User>
)
// 结果: Observable<Observable<User>>  需要嵌套订阅

// mergeMap 返回 Observable 并扁平化
source$.pipe(
  mergeMap(id => fetchUser(id))  // 返回 Observable<User>
)
// 结果: Observable<User>  直接订阅即可
```

## 实战：搜索功能完整实现

```javascript
const searchInput$ = fromEvent(input, 'input')

searchInput$.pipe(
  map(e => e.target.value),
  debounceTime(300),           // 防抖
  distinctUntilChanged(),      // 去重
  switchMap(term => {          // 取消之前的请求
    if (!term) {
      return of([])            // 空输入返回空数组
    }
    return ajax(`/api/search?q=${term}`).pipe(
      map(res => res.response),
      catchError(() => of([]))  // 错误返回空数组
    )
  })
).subscribe(results => {
  renderResults(results)
})
```

这段代码解决了：
1. 输入防抖（300ms）
2. 避免重复请求（相同内容）
3. 取消过时请求（switchMap）
4. 错误处理（catchError）

## 本章小结

- 高阶 Observable 发射 Observable
- 需要扁平化操作符来处理
- 四种策略：merge、switch、concat、exhaust
- 选择取决于业务需求

下一章深入实现 `switchMap` 操作符。
