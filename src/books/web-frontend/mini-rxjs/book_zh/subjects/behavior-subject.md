---
sidebar_position: 79
title: "BehaviorSubject 实现"
---

# BehaviorSubject 实现

BehaviorSubject 始终保持一个当前值，新订阅者立即收到最新值。

## 为什么需要 BehaviorSubject

Subject 的问题是订阅前的值会丢失：

```javascript
const subject = new Subject()
subject.next(1)

subject.subscribe(console.log)  // 收不到 1
subject.next(2)  // 2
```

BehaviorSubject 解决这个问题：

```javascript
const behavior = new BehaviorSubject(0)  // 初始值 0
behavior.next(1)

behavior.subscribe(console.log)  // 立即收到 1（当前值）
behavior.next(2)  // 2
```

## 基本用法

```javascript
// 必须提供初始值
const count$ = new BehaviorSubject(0)

// 订阅立即收到当前值
count$.subscribe(v => console.log('A:', v))  // A: 0

count$.next(1)  // A: 1

// 新订阅者也立即收到当前值
count$.subscribe(v => console.log('B:', v))  // B: 1

count$.next(2)  // A: 2, B: 2

// 同步获取当前值
console.log(count$.getValue())  // 2
```

## 实现 BehaviorSubject

```javascript
class BehaviorSubject extends Subject {
  constructor(initialValue) {
    super()
    this._value = initialValue
  }
  
  // 获取当前值
  getValue() {
    if (this.hasError) {
      throw this.thrownError
    }
    if (this.closed) {
      throw new Error('BehaviorSubject is closed')
    }
    return this._value
  }
  
  // 重写 next：保存值
  next(value) {
    this._value = value
    super.next(value)
  }
  
  // 重写 subscribe：立即发送当前值
  subscribe(observerOrNext) {
    const observer = typeof observerOrNext === 'function'
      ? { next: observerOrNext }
      : observerOrNext
    
    // 如果已经出错
    if (this.hasError) {
      observer.error?.(this.thrownError)
      return { unsubscribe: () => {} }
    }
    
    // 如果已经完成
    if (this.isStopped) {
      observer.next?.(this._value)
      observer.complete?.()
      return { unsubscribe: () => {} }
    }
    
    // 立即发送当前值
    observer.next?.(this._value)
    
    // 添加到订阅者列表
    this.observers.push(observer)
    
    return {
      unsubscribe: () => {
        const index = this.observers.indexOf(observer)
        if (index !== -1) {
          this.observers.splice(index, 1)
        }
      }
    }
  }
  
  // 重写 error：清除值
  error(err) {
    this._value = undefined
    super.error(err)
  }
  
  // 只读属性
  get value() {
    return this.getValue()
  }
}
```

## 与 Subject 的区别

```javascript
// Subject: 不缓存值
const subject = new Subject()
subject.next('A')
subject.subscribe(console.log)  // 无输出
subject.next('B')  // B

// BehaviorSubject: 缓存最新值
const behavior = new BehaviorSubject('初始值')
behavior.next('A')
behavior.subscribe(console.log)  // A（当前值）
behavior.next('B')  // B
```

## 实战示例

### 用户状态管理

```javascript
class AuthService {
  private currentUser$ = new BehaviorSubject(null)
  
  // 登录
  async login(credentials) {
    const user = await api.login(credentials)
    this.currentUser$.next(user)
  }
  
  // 登出
  logout() {
    this.currentUser$.next(null)
  }
  
  // 获取当前用户
  getCurrentUser() {
    return this.currentUser$.getValue()
  }
  
  // 订阅用户变化
  get user$() {
    return this.currentUser$.asObservable()
  }
  
  // 是否已登录
  get isLoggedIn$() {
    return this.currentUser$.pipe(
      map(user => user !== null)
    )
  }
}

// 使用
const auth = new AuthService()

// 组件立即获取当前状态
auth.user$.subscribe(user => {
  if (user) {
    showUserProfile(user)
  } else {
    showLoginForm()
  }
})

// 路由守卫
auth.isLoggedIn$.pipe(
  filter(isLoggedIn => !isLoggedIn),
  take(1)
).subscribe(() => {
  router.navigate('/login')
})
```

### 主题/配置切换

```javascript
class ThemeService {
  private theme$ = new BehaviorSubject('light')
  
  toggleTheme() {
    const current = this.theme$.getValue()
    this.theme$.next(current === 'light' ? 'dark' : 'light')
  }
  
  setTheme(theme) {
    this.theme$.next(theme)
  }
  
  get currentTheme$() {
    return this.theme$.asObservable()
  }
  
  // 同步获取主题
  get currentTheme() {
    return this.theme$.getValue()
  }
}

// 使用
const theme = new ThemeService()

// 新组件立即应用当前主题
theme.currentTheme$.subscribe(t => {
  document.body.className = `theme-${t}`
})

// 切换按钮
toggleBtn.onclick = () => theme.toggleTheme()
```

### 加载状态

```javascript
class LoadingService {
  private loading$ = new BehaviorSubject(false)
  
  show() {
    this.loading$.next(true)
  }
  
  hide() {
    this.loading$.next(false)
  }
  
  get isLoading$() {
    return this.loading$.asObservable()
  }
  
  // 包装异步操作
  wrap(operation$) {
    return defer(() => {
      this.show()
      return operation$.pipe(
        finalize(() => this.hide())
      )
    })
  }
}

// 使用
const loading = new LoadingService()

// 显示加载状态
loading.isLoading$.subscribe(isLoading => {
  spinner.style.display = isLoading ? 'block' : 'none'
})

// 自动管理加载状态
loading.wrap(
  ajax.getJSON('/api/data')
).subscribe(data => {
  displayData(data)
})
```

### 表单状态

```javascript
class FormState {
  constructor(initialValues) {
    this.values$ = new BehaviorSubject(initialValues)
    this.errors$ = new BehaviorSubject({})
    this.touched$ = new BehaviorSubject({})
  }
  
  // 更新字段值
  setValue(field, value) {
    const current = this.values$.getValue()
    this.values$.next({ ...current, [field]: value })
  }
  
  // 批量更新
  setValues(values) {
    this.values$.next({ ...this.values$.getValue(), ...values })
  }
  
  // 标记为已触碰
  touch(field) {
    const current = this.touched$.getValue()
    this.touched$.next({ ...current, [field]: true })
  }
  
  // 设置错误
  setError(field, error) {
    const current = this.errors$.getValue()
    this.errors$.next({ ...current, [field]: error })
  }
  
  // 重置
  reset(initialValues) {
    this.values$.next(initialValues)
    this.errors$.next({})
    this.touched$.next({})
  }
  
  // 是否有效
  get isValid$() {
    return this.errors$.pipe(
      map(errors => Object.keys(errors).length === 0)
    )
  }
  
  // 获取特定字段
  field$(name) {
    return combineLatest([
      this.values$.pipe(map(v => v[name])),
      this.errors$.pipe(map(e => e[name])),
      this.touched$.pipe(map(t => t[name]))
    ]).pipe(
      map(([value, error, touched]) => ({ value, error, touched }))
    )
  }
}

// 使用
const form = new FormState({ name: '', email: '' })

// 绑定到输入框
nameInput.addEventListener('input', e => {
  form.setValue('name', e.target.value)
})

nameInput.addEventListener('blur', () => {
  form.touch('name')
})

// 显示错误
form.field$('name').subscribe(({ error, touched }) => {
  nameError.textContent = touched && error ? error : ''
})
```

### 多级缓存

```javascript
class CacheService {
  private cache = new Map()
  
  get(key, fetch$) {
    // 检查缓存
    if (!this.cache.has(key)) {
      // 创建 BehaviorSubject 作为缓存
      const subject = new BehaviorSubject(null)
      
      // 加载数据
      fetch$.subscribe({
        next: data => subject.next(data),
        error: err => subject.error(err)
      })
      
      this.cache.set(key, subject)
    }
    
    return this.cache.get(key).pipe(
      filter(v => v !== null)  // 过滤初始空值
    )
  }
  
  // 更新缓存
  update(key, data) {
    if (this.cache.has(key)) {
      this.cache.get(key).next(data)
    }
  }
  
  // 清除缓存
  invalidate(key) {
    this.cache.delete(key)
  }
}
```

### 分页状态

```javascript
class PaginationState {
  private state$ = new BehaviorSubject({
    page: 1,
    pageSize: 10,
    total: 0
  })
  
  get current$() {
    return this.state$.asObservable()
  }
  
  setPage(page) {
    const current = this.state$.getValue()
    this.state$.next({ ...current, page })
  }
  
  setPageSize(pageSize) {
    const current = this.state$.getValue()
    this.state$.next({ ...current, pageSize, page: 1 })  // 重置到第一页
  }
  
  setTotal(total) {
    const current = this.state$.getValue()
    this.state$.next({ ...current, total })
  }
  
  get totalPages$() {
    return this.state$.pipe(
      map(({ total, pageSize }) => Math.ceil(total / pageSize))
    )
  }
  
  get hasNext$() {
    return combineLatest([this.state$, this.totalPages$]).pipe(
      map(([{ page }, total]) => page < total)
    )
  }
  
  get hasPrev$() {
    return this.state$.pipe(
      map(({ page }) => page > 1)
    )
  }
}
```

## getValue() 的使用场景

```javascript
// ✅ 正确：在同步代码中获取当前值
function handleClick() {
  const currentUser = user$.getValue()
  if (!currentUser) {
    showLoginDialog()
    return
  }
  processAction(currentUser)
}

// ✅ 正确：在订阅外初始化状态
const initialValue = state$.getValue()
render(initialValue)

// ❌ 错误：在管道中使用 getValue
state$.pipe(
  map(() => state$.getValue())  // 应该直接用上游的值
)

// ❌ 错误：用 getValue 代替订阅
// 这会错过后续更新
const value = state$.getValue()
display(value)

// 正确做法
state$.subscribe(value => display(value))
```

## 常见陷阱

### 忘记初始值

```javascript
// 错误：BehaviorSubject 必须有初始值
const bs = new BehaviorSubject()  // undefined 也算初始值

// 正确
const bs = new BehaviorSubject(null)
const bs = new BehaviorSubject([])
const bs = new BehaviorSubject({})
```

### 直接修改对象

```javascript
// 错误：直接修改不会触发更新
const state$ = new BehaviorSubject({ count: 0 })
const current = state$.getValue()
current.count++  // 不会触发订阅者

// 正确：创建新对象
state$.next({ ...state$.getValue(), count: 1 })
```

### 循环依赖

```javascript
// 错误：可能导致无限循环
a$.subscribe(val => {
  b$.next(transform(val))
})

b$.subscribe(val => {
  a$.next(reverseTransform(val))  // 触发 a$ 订阅，又触发 b$...
})

// 正确：添加去重
a$.pipe(
  distinctUntilChanged()
).subscribe(val => {
  b$.next(transform(val))
})
```

## TypeScript 类型

```typescript
class BehaviorSubject<T> extends Subject<T> {
  constructor(initialValue: T)
  
  getValue(): T
  
  get value(): T
  
  next(value: T): void
}
```

## 本章小结

- BehaviorSubject 必须有初始值
- 新订阅者立即收到当前值
- 使用 `getValue()` 同步获取值
- 适合状态管理、配置、表单等场景
- 注意不要直接修改引用类型

下一章实现 `ReplaySubject`——缓存多个历史值。
