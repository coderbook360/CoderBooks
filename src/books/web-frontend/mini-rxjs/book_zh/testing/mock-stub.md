---
sidebar_position: 93
title: "Mock 与 Stub 技术"
---

# Mock 与 Stub 技术

本章介绍如何在 RxJS 测试中使用 Mock 和 Stub。

## 概念区分

### Stub

返回预定义数据的简单替代品：

```javascript
// Stub: 返回固定数据
const stubApi = {
  getUser: () => of({ id: 1, name: 'Test User' })
}
```

### Mock

可以验证调用的替代品：

```javascript
// Mock: 可以检查调用情况
const mockApi = {
  getUser: jest.fn().mockReturnValue(of({ id: 1, name: 'Test User' }))
}

// 测试后验证
expect(mockApi.getUser).toHaveBeenCalledWith(1)
expect(mockApi.getUser).toHaveBeenCalledTimes(1)
```

### Spy

包装真实对象，记录调用：

```javascript
// Spy: 监视真实调用
const spy = jest.spyOn(realApi, 'getUser')

// 使用真实实现，但记录调用
realApi.getUser(1)

expect(spy).toHaveBeenCalledWith(1)
```

## 创建 Observable Stub

### 简单 Stub

```javascript
function createStubObservable(values) {
  return of(...values)
}

// 使用
const stub$ = createStubObservable([1, 2, 3])
```

### 带延迟的 Stub

```javascript
function createDelayedStub(values, delayMs) {
  return of(...values).pipe(delay(delayMs))
}

// 使用
const stub$ = createDelayedStub([1, 2, 3], 100)
```

### 可控 Stub

```javascript
function createControllableStub() {
  const subject = new Subject()
  
  return {
    observable$: subject.asObservable(),
    emit: (value) => subject.next(value),
    complete: () => subject.complete(),
    error: (err) => subject.error(err)
  }
}

// 使用
const stub = createControllableStub()

someService.data$ = stub.observable$

// 测试中控制数据流
stub.emit({ id: 1 })
stub.emit({ id: 2 })
stub.complete()
```

### 序列 Stub

```javascript
function createSequenceStub(responses) {
  let callCount = 0
  
  return () => {
    const response = responses[callCount] || responses[responses.length - 1]
    callCount++
    return of(response)
  }
}

// 使用：不同调用返回不同数据
const getUser = createSequenceStub([
  { id: 1, name: 'First' },
  { id: 2, name: 'Second' }
])

getUser().subscribe(console.log)  // { id: 1, name: 'First' }
getUser().subscribe(console.log)  // { id: 2, name: 'Second' }
```

## 创建 Service Mock

### HTTP Service Mock

```javascript
class MockHttpService {
  private responses = new Map()
  
  // 设置响应
  when(url, method = 'GET') {
    return {
      respond: (data) => {
        this.responses.set(`${method}:${url}`, { data, error: null })
      },
      error: (err) => {
        this.responses.set(`${method}:${url}`, { data: null, error: err })
      }
    }
  }
  
  // 模拟 GET
  get(url) {
    return this.getResponse('GET', url)
  }
  
  // 模拟 POST
  post(url, body) {
    return this.getResponse('POST', url)
  }
  
  private getResponse(method, url) {
    const key = `${method}:${url}`
    const response = this.responses.get(key)
    
    if (!response) {
      return throwError(() => new Error(`No mock for ${key}`))
    }
    
    if (response.error) {
      return throwError(() => response.error)
    }
    
    return of(response.data)
  }
}

// 使用
const mockHttp = new MockHttpService()
mockHttp.when('/api/user').respond({ id: 1, name: 'Test' })
mockHttp.when('/api/fail').error(new Error('Server error'))

mockHttp.get('/api/user').subscribe(console.log)  // { id: 1, name: 'Test' }
```

### WebSocket Mock

```javascript
class MockWebSocket {
  private messages$ = new Subject()
  private sentMessages = []
  
  // 模拟接收消息
  receive(message) {
    this.messages$.next(message)
  }
  
  // 发送消息（记录）
  send(message) {
    this.sentMessages.push(message)
  }
  
  // 获取消息流
  get messages() {
    return this.messages$.asObservable()
  }
  
  // 验证发送的消息
  getSentMessages() {
    return this.sentMessages
  }
  
  // 模拟关闭
  close() {
    this.messages$.complete()
  }
  
  // 模拟错误
  error(err) {
    this.messages$.error(err)
  }
}

// 测试
it('should send and receive messages', () => {
  const ws = new MockWebSocket()
  const received = []
  
  ws.messages.subscribe(msg => received.push(msg))
  
  ws.receive({ type: 'chat', text: 'Hello' })
  ws.send({ type: 'chat', text: 'Hi' })
  
  expect(received).toEqual([{ type: 'chat', text: 'Hello' }])
  expect(ws.getSentMessages()).toEqual([{ type: 'chat', text: 'Hi' }])
})
```

### Event Emitter Mock

```javascript
class MockEventEmitter {
  private subjects = new Map()
  private emitHistory = []
  
  on(event) {
    if (!this.subjects.has(event)) {
      this.subjects.set(event, new Subject())
    }
    return this.subjects.get(event).asObservable()
  }
  
  emit(event, data) {
    this.emitHistory.push({ event, data, time: Date.now() })
    
    if (this.subjects.has(event)) {
      this.subjects.get(event).next(data)
    }
  }
  
  getEmitHistory(event) {
    return event
      ? this.emitHistory.filter(e => e.event === event)
      : this.emitHistory
  }
  
  clear() {
    this.emitHistory = []
    this.subjects.clear()
  }
}
```

## 依赖注入模式

### 接口定义

```typescript
interface IUserService {
  getUser(id: number): Observable<User>
  updateUser(user: User): Observable<User>
  deleteUser(id: number): Observable<void>
}

interface IAuthService {
  login(credentials: Credentials): Observable<Token>
  logout(): Observable<void>
  currentUser$: Observable<User | null>
}
```

### 真实实现

```javascript
class UserService implements IUserService {
  constructor(private http: HttpClient) {}
  
  getUser(id) {
    return this.http.get(`/api/users/${id}`)
  }
  
  updateUser(user) {
    return this.http.put(`/api/users/${user.id}`, user)
  }
  
  deleteUser(id) {
    return this.http.delete(`/api/users/${id}`)
  }
}
```

### Mock 实现

```javascript
class MockUserService implements IUserService {
  private users = new Map()
  public getUser = jest.fn()
  public updateUser = jest.fn()
  public deleteUser = jest.fn()
  
  constructor() {
    // 默认实现
    this.getUser.mockImplementation((id) => {
      const user = this.users.get(id)
      return user
        ? of(user)
        : throwError(() => new Error('Not found'))
    })
    
    this.updateUser.mockImplementation((user) => {
      this.users.set(user.id, user)
      return of(user)
    })
    
    this.deleteUser.mockImplementation((id) => {
      this.users.delete(id)
      return of(undefined)
    })
  }
  
  // 测试辅助方法
  setUser(user) {
    this.users.set(user.id, user)
  }
  
  reset() {
    this.users.clear()
    jest.clearAllMocks()
  }
}
```

### 使用 Mock

```javascript
describe('UserProfile', () => {
  let mockUserService: MockUserService
  let component: UserProfile
  
  beforeEach(() => {
    mockUserService = new MockUserService()
    mockUserService.setUser({ id: 1, name: 'Test' })
    
    component = new UserProfile(mockUserService)
  })
  
  afterEach(() => {
    mockUserService.reset()
  })
  
  it('should load user', async () => {
    await component.loadUser(1)
    
    expect(mockUserService.getUser).toHaveBeenCalledWith(1)
    expect(component.user).toEqual({ id: 1, name: 'Test' })
  })
  
  it('should handle not found', async () => {
    await expect(component.loadUser(999)).rejects.toThrow('Not found')
  })
})
```

## Jest Mock 集成

### 模块 Mock

```javascript
// __mocks__/api.js
export const getUser = jest.fn(() => of({ id: 1, name: 'Mock User' }))
export const getPosts = jest.fn(() => of([]))

// 测试文件
jest.mock('./api')
import * as api from './api'

it('should use mocked api', () => {
  api.getUser().subscribe(user => {
    expect(user.name).toBe('Mock User')
  })
})
```

### 自动 Mock

```javascript
// 自动 mock 返回 Observable
jest.mock('./user-service', () => ({
  UserService: jest.fn().mockImplementation(() => ({
    getUser: jest.fn(() => of({ id: 1 })),
    updateUser: jest.fn(() => of({ id: 1 }))
  }))
}))
```

### 部分 Mock

```javascript
// 只 mock 部分方法
const realService = new UserService()
jest.spyOn(realService, 'getUser').mockReturnValue(of({ id: 1, name: 'Mocked' }))

// updateUser 仍然是真实实现
```

## 时间相关 Mock

### 使用 Jest Fake Timers

```javascript
beforeEach(() => {
  jest.useFakeTimers()
})

afterEach(() => {
  jest.useRealTimers()
})

it('should debounce', () => {
  const values = []
  const source = new Subject()
  
  source.pipe(debounceTime(1000)).subscribe(v => values.push(v))
  
  source.next('a')
  jest.advanceTimersByTime(500)
  source.next('b')
  jest.advanceTimersByTime(500)
  source.next('c')
  jest.advanceTimersByTime(1000)
  
  expect(values).toEqual(['c'])
})
```

### 使用 TestScheduler

```javascript
it('should delay emission', () => {
  testScheduler.run(({ cold, expectObservable }) => {
    const source = cold('-a|')
    const expected =    '---a|'  // 延迟 2 帧
    
    expectObservable(source.pipe(delay(2))).toBe(expected)
  })
})
```

## 错误场景 Mock

### 网络错误

```javascript
const mockHttp = {
  get: jest.fn(() => throwError(() => new Error('Network error')))
}

it('should handle network error', async () => {
  const service = new DataService(mockHttp)
  
  await expect(
    firstValueFrom(service.fetchData())
  ).rejects.toThrow('Network error')
})
```

### 超时错误

```javascript
function createTimeoutMock(delayMs) {
  return () => new Observable(subscriber => {
    const id = setTimeout(() => {
      subscriber.next('data')
      subscriber.complete()
    }, delayMs)
    
    return () => clearTimeout(id)
  })
}

it('should timeout', () => {
  jest.useFakeTimers()
  
  const slowApi = createTimeoutMock(5000)
  const values = []
  
  slowApi().pipe(
    timeout(1000)
  ).subscribe({
    next: v => values.push(v),
    error: err => values.push(err.name)
  })
  
  jest.advanceTimersByTime(1000)
  
  expect(values).toEqual(['TimeoutError'])
  
  jest.useRealTimers()
})
```

### 重试场景

```javascript
function createFlakeyMock(failTimes, successValue) {
  let callCount = 0
  
  return () => {
    callCount++
    if (callCount <= failTimes) {
      return throwError(() => new Error(`Fail ${callCount}`))
    }
    return of(successValue)
  }
}

it('should retry and succeed', async () => {
  const flakeyApi = createFlakeyMock(2, 'success')
  
  const result = await firstValueFrom(
    defer(flakeyApi).pipe(retry(3))
  )
  
  expect(result).toBe('success')
})
```

## 最佳实践

### 1. 保持 Mock 简单

```javascript
// ✅ 简单 Mock
const mockService = {
  getData: () => of([1, 2, 3])
}

// ❌ 过度复杂
const mockService = {
  getData: () => {
    if (someCondition) { ... }
    else if (otherCondition) { ... }
    // 太多逻辑
  }
}
```

### 2. 重置 Mock 状态

```javascript
beforeEach(() => {
  jest.clearAllMocks()
})

afterEach(() => {
  subject.complete()
  mockService.reset()
})
```

### 3. 验证调用

```javascript
it('should call api with correct params', () => {
  const mockApi = jest.fn(() => of({}))
  
  service.fetchUser(123)
  
  expect(mockApi).toHaveBeenCalledWith('/users/123')
  expect(mockApi).toHaveBeenCalledTimes(1)
})
```

## 本章小结

- Stub 返回固定数据，Mock 可验证调用
- 使用可控 Subject 创建灵活的 Mock
- 依赖注入模式便于测试替换
- Jest Mock 提供强大的模拟能力
- 重置 Mock 状态保持测试隔离

下一章学习测试最佳实践。
