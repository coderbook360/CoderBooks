---
sidebar_position: 64
title: "expand"
---

# expand

`expand` 递归地将每个值映射为 Observable，用于递归数据获取。

## 基本用法

```javascript
// 递归获取分页数据
of({ page: 1 }).pipe(
  expand(response => {
    if (response.nextPage) {
      return fetchPage(response.nextPage)
    }
    return EMPTY  // 停止递归
  })
)
```

时间线：

```
初始:    {page:1}
             |
expand:  {page:1}-->fetchPage(2)-->{page:2}-->fetchPage(3)-->{page:3}-->EMPTY
             |                          |                        |
输出:    {page:1}                   {page:2}                 {page:3}
```

## 实现 expand

```javascript
function expand(project, concurrent = Infinity) {
  return (source) => new Observable(subscriber => {
    const buffer = []
    const subscriptions = []
    let active = 0
    let sourceComplete = false
    let index = 0

    function subscribeToInner(value) {
      // 先发射当前值
      subscriber.next(value)
      
      active++
      const innerObservable = project(value, index++)
      
      const innerSubscription = innerObservable.subscribe({
        next(innerValue) {
          // 递归：对每个内部值也执行 expand
          if (active < concurrent) {
            subscribeToInner(innerValue)
          } else {
            buffer.push(innerValue)
          }
        },
        error(err) {
          subscriber.error(err)
        },
        complete() {
          active--
          // 处理缓冲区
          while (buffer.length > 0 && active < concurrent) {
            subscribeToInner(buffer.shift())
          }
          // 检查完成
          if (sourceComplete && active === 0 && buffer.length === 0) {
            subscriber.complete()
          }
        }
      })

      subscriptions.push(innerSubscription)
    }

    const sourceSubscription = source.subscribe({
      next(value) {
        if (active < concurrent) {
          subscribeToInner(value)
        } else {
          buffer.push(value)
        }
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        sourceComplete = true
        if (active === 0 && buffer.length === 0) {
          subscriber.complete()
        }
      }
    })

    return () => {
      subscriptions.forEach(s => s.unsubscribe())
      sourceSubscription.unsubscribe()
    }
  })
}
```

## 实战示例

### 递归获取分页数据

```javascript
function fetchAllPages(startUrl) {
  return ajax(startUrl).pipe(
    expand(response => {
      if (response.data.nextPage) {
        return ajax(response.data.nextPage)
      }
      return EMPTY
    }),
    map(response => response.data.items),
    reduce((acc, items) => [...acc, ...items], [])
  )
}

fetchAllPages('/api/items?page=1').subscribe(allItems => {
  console.log(`Total items: ${allItems.length}`)
})
```

### 递归遍历目录

```javascript
function listAllFiles(path) {
  return readDirectory(path).pipe(
    mergeMap(entries => from(entries)),
    expand(entry => {
      if (entry.isDirectory) {
        return readDirectory(entry.path).pipe(
          mergeMap(entries => from(entries))
        )
      }
      return EMPTY
    }),
    filter(entry => !entry.isDirectory),
    map(entry => entry.path)
  )
}

listAllFiles('/root').subscribe(filePath => {
  console.log(filePath)
})
```

### 递归搜索（BFS）

```javascript
function bfsSearch(startNode, target) {
  return of(startNode).pipe(
    expand(node => {
      if (node.value === target) {
        return EMPTY  // 找到了，停止
      }
      if (!node.children || node.children.length === 0) {
        return EMPTY  // 叶节点，停止
      }
      return from(node.children)  // 继续搜索子节点
    }),
    find(node => node.value === target)
  )
}

bfsSearch(rootNode, 'target').subscribe(found => {
  console.log('Found:', found)
})
```

### 链式 API 请求

```javascript
// 获取用户的所有关注者的关注者...
function getFollowersChain(userId, depth = 3) {
  return of({ userId, depth }).pipe(
    expand(({ userId, depth }) => {
      if (depth <= 0) {
        return EMPTY
      }
      return fetchFollowers(userId).pipe(
        mergeMap(followers => from(followers)),
        map(follower => ({ userId: follower.id, depth: depth - 1 }))
      )
    }),
    map(({ userId }) => userId),
    distinct()  // 去重
  )
}
```

### WebSocket 重连

```javascript
function createReconnectingWebSocket(url) {
  const connect$ = defer(() => createWebSocket(url))
  
  return connect$.pipe(
    expand(ws => 
      ws.messages$.pipe(
        ignoreElements(),
        catchError(() => {
          // 连接断开，等待后重连
          console.log('Disconnected, reconnecting...')
          return timer(3000).pipe(
            switchMap(() => connect$)
          )
        })
      )
    ),
    mergeMap(ws => ws.messages$)
  )
}
```

## 并发控制

```javascript
// 限制并发数
of(rootNode).pipe(
  expand(
    node => from(node.children || []),
    2  // 最多同时处理2个分支
  )
)
```

## expand vs mergeMap 递归

```javascript
// 使用 expand（推荐）
of(start).pipe(
  expand(x => next(x) || EMPTY)
)

// 使用 mergeMap 递归（不推荐，容易栈溢出）
function recursiveMergeMap(value) {
  return of(value).pipe(
    mergeMap(x => {
      const nextVal = next(x)
      return nextVal 
        ? concat(of(x), recursiveMergeMap(nextVal))
        : of(x)
    })
  )
}
```

expand 的优势：
- 非递归实现，不会栈溢出
- 支持并发控制
- 可以处理无限递归
- 更好的内存管理

## 常见陷阱

### 无限递归

```javascript
// 危险：永远不返回 EMPTY
of(1).pipe(
  expand(x => of(x + 1))  // 无限递归！
)

// 解决：添加终止条件
of(1).pipe(
  expand(x => x < 100 ? of(x + 1) : EMPTY),
  take(10)  // 额外保险
)
```

### 值发射顺序

```javascript
// expand 先发射当前值，再发射内部值
of(1).pipe(
  expand(x => x < 3 ? of(x + 1) : EMPTY)
).subscribe(console.log)
// 1, 2, 3
```

## TypeScript 类型

```typescript
function expand<T, R>(
  project: (value: T, index: number) => ObservableInput<R>,
  concurrent?: number
): OperatorFunction<T, T | R>

function expand<T>(
  project: (value: T, index: number) => ObservableInput<T>,
  concurrent?: number
): OperatorFunction<T, T>
```

## 本章小结

- `expand` 递归处理每个值
- 返回 `EMPTY` 停止递归
- 适合分页、目录遍历、图搜索
- 并发参数控制同时处理的分支数

下一章实现 `groupBy` 操作符。
