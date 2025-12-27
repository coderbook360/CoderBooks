# exhaustAll：忽略新订阅

`exhaustAll` 将高阶 Observable 扁平化，在有活动订阅时忽略新的内层 Observable。

## 基本概念

```typescript
const clicks$ = fromEvent(button, 'click')

clicks$.pipe(
  map(() => interval(1000).pipe(take(3))),
  exhaustAll()
).subscribe(console.log)

// 第1次点击：创建定时器，输出 0, 1, 2
// 在定时器运行期间点击：被忽略
// 定时器完成后点击：创建新定时器
```

时间线：

```
外层: ---A$--B$----C$-D$-|

内层:
A$: ---1---2---3-|
B$: (忽略)
C$: (忽略)
D$:              ---4---5-|

exhaustAll:
    ---1---2---3-4---5-|
       └A$运行中,忽略B$和C$ └D$
```

## 实现 exhaustAll

```typescript
function exhaustAll<T>() {
  return (source: Observable<Observable<T>>) => {
    return new Observable<T>(subscriber => {
      let innerSubscription: Subscription | null = null
      let outerComplete = false
      
      const outerSub = source.subscribe({
        next: inner$ => {
          // 如果有活动订阅，忽略新的
          if (innerSubscription) {
            return
          }
          
          // 订阅新的
          innerSubscription = inner$.subscribe({
            next: value => subscriber.next(value),
            error: err => subscriber.error(err),
            complete: () => {
              innerSubscription = null
              
              if (outerComplete) {
                subscriber.complete()
              }
            }
          })
        },
        error: err => subscriber.error(err),
        complete: () => {
          outerComplete = true
          if (!innerSubscription) {
            subscriber.complete()
          }
        }
      })
      
      return () => {
        outerSub.unsubscribe()
        innerSubscription?.unsubscribe()
      }
    })
  }
}
```

## 核心特性：忽略机制

**思考一下，什么场景需要忽略新的订阅？**

答案：**防止重复触发或并发冲突**

```typescript
// 登录按钮
const loginClick$ = fromEvent(loginBtn, 'click')

loginClick$.pipe(
  map(() => login()), // 返回 Observable
  exhaustAll() // 登录进行中时忽略新点击
).subscribe()
```

## 实战场景

### 场景1：防止重复提交

```typescript
const submitBtn = document.querySelector('#submit')

fromEvent(submitBtn, 'click').pipe(
  map(() => submitForm()), // 返回异步操作
  exhaustAll() // 提交进行中时忽略新点击
).subscribe(
  result => showSuccess(result),
  error => showError(error)
)
```

### 场景2：防止重复登录

```typescript
const loginBtn = document.querySelector('#login')

fromEvent(loginBtn, 'click').pipe(
  map(() => ajax({
    url: '/api/login',
    method: 'POST',
    body: getCredentials()
  })),
  exhaustAll() // 登录进行中时忽略重复点击
).subscribe(handleLoginResult)
```

### 场景3：限制刷新频率

```typescript
const refreshBtn = document.querySelector('#refresh')

fromEvent(refreshBtn, 'click').pipe(
  map(() => fetchData()), // 获取数据
  exhaustAll() // 数据加载中时忽略刷新请求
).subscribe(updateUI)
```

### 场景4：游戏操作冷却

```typescript
const skillBtn = document.querySelector('#skill')

fromEvent(skillBtn, 'click').pipe(
  map(() => {
    // 技能动画持续3秒
    return interval(100).pipe(
      take(30),
      tap(frame => animateSkill(frame))
    )
  }),
  exhaustAll() // 技能动画期间忽略新点击
).subscribe()
```

## 与其他操作符对比

### exhaustAll vs switchAll

```typescript
const clicks$ = fromEvent(button, 'click')

// exhaustAll：第一个完成前忽略后续点击
clicks$.pipe(
  map(() => interval(1000).pipe(take(3))),
  exhaustAll()
)
// 点击1: 0, 1, 2
// 点击2-5: 被忽略
// 点击6: 0, 1, 2

// switchAll：新点击取消旧的
clicks$.pipe(
  map(() => interval(1000).pipe(take(3))),
  switchAll()
)
// 点击1: 0
// 点击2: 0, 1
// 点击3: 0, 1, 2
```

### exhaustAll vs mergeAll

```typescript
// exhaustAll：一次只执行一个
clicks$.pipe(
  map(() => ajax('/api/data')),
  exhaustAll() // 请求进行中时忽略
)

// mergeAll：并发执行所有
clicks$.pipe(
  map(() => ajax('/api/data')),
  mergeAll() // 每次点击都发起请求
)
```

### 四种扁平化策略对比

| 操作符 | 行为 | 场景 |
|--------|------|------|
| mergeAll | 并发订阅 | 批量请求 |
| concatAll | 顺序订阅 | 有依赖的任务 |
| switchAll | 取消旧的 | 搜索自动补全 |
| exhaustAll | 忽略新的 | 防止重复提交 |

## 禁用按钮的替代方案

```typescript
// 方案1：使用 exhaustAll（推荐）
fromEvent(btn, 'click').pipe(
  map(() => submitForm()),
  exhaustAll()
)

// 方案2：手动禁用按钮
fromEvent(btn, 'click').pipe(
  tap(() => btn.disabled = true),
  switchMap(() => submitForm()),
  finalize(() => btn.disabled = false)
)
```

**exhaustAll 的优势**：
- 代码更简洁
- 无需手动管理状态
- 自动处理错误情况

## 完整示例：防抖动表单提交

```typescript
class FormSubmitter {
  private form = document.querySelector('#form')
  private submitBtn = document.querySelector('#submit')
  
  init() {
    fromEvent(this.submitBtn, 'click').pipe(
      // 防止快速重复点击
      exhaustMap(() => {
        // 显示加载状态
        this.setLoading(true)
        
        // 提交表单
        return ajax({
          url: '/api/submit',
          method: 'POST',
          body: new FormData(this.form)
        }).pipe(
          // 无论成功失败都取消加载
          finalize(() => this.setLoading(false))
        )
      })
    ).subscribe(
      response => this.showSuccess(response),
      error => this.showError(error)
    )
  }
  
  setLoading(loading: boolean) {
    this.submitBtn.disabled = loading
    this.submitBtn.textContent = loading ? '提交中...' : '提交'
  }
}
```

## 错误处理

```typescript
fromEvent(btn, 'click').pipe(
  map(() => ajax('/api/submit')),
  exhaustAll()
).subscribe({
  next: result => console.log('成功', result),
  error: err => {
    console.error('失败', err)
    // 错误后，exhaustAll 会接受新的订阅
  }
})
```

## 性能考虑

```typescript
// ✅ exhaustAll 自动防抖，无需额外优化
fromEvent(btn, 'click').pipe(
  map(() => expensiveOperation()),
  exhaustAll()
)

// ❌ mergeAll 需要额外的防抖措施
fromEvent(btn, 'click').pipe(
  debounceTime(300), // 必须手动防抖
  map(() => expensiveOperation()),
  mergeAll(1) // 限制并发
)
```

## 常见陷阱

### 陷阱1：误用 exhaustAll

```typescript
// ❌ 搜索场景不应该用 exhaustAll
searchInput$.pipe(
  debounceTime(300),
  map(query => ajax(`/api/search?q=${query}`)),
  exhaustAll() // 第一个请求完成前，新搜索被忽略
)

// ✅ 应该用 switchAll
searchInput$.pipe(
  debounceTime(300),
  map(query => ajax(`/api/search?q=${query}`)),
  switchAll() // 新搜索取消旧请求
)
```

### 陷阱2：内层 Observable 永不完成

```typescript
// ❌ interval 永不完成，exhaustAll 永远忽略新的
clicks$.pipe(
  map(() => interval(1000)), // 永不完成
  exhaustAll()
)

// ✅ 使用 take 限制
clicks$.pipe(
  map(() => interval(1000).pipe(take(5))),
  exhaustAll()
)
```

## 调试技巧

```typescript
clicks$.pipe(
  tap(() => console.log('点击')),
  map(() => ajax('/api/data')),
  tap(obs$ => console.log('创建 Observable')),
  exhaustAll(),
  tap(result => console.log('接收结果', result))
).subscribe()

// 可以看到哪些点击被忽略
```

## 总结

**exhaustAll**：
- 有活动订阅时忽略新的
- 适合防止重复触发
- 自动串行化操作

**使用场景**：
- 防止重复提交表单
- 防止重复登录
- 限制操作频率
- 游戏技能冷却

**关键特性**：
- 忽略机制：保护第一个完成
- 无需手动状态管理
- 自动串行化并发操作

**选择依据**：
- 需要防止重复触发 → exhaustAll
- 需要最新结果 → switchAll
- 需要所有结果 → mergeAll
- 需要顺序执行 → concatAll
