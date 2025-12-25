---
sidebar_position: 25
title: Actions 异步处理与错误捕获
---

# Actions 异步处理与错误捕获

现代前端应用中，异步操作无处不在：API 请求、定时器、文件读取等。本章深入探讨如何在 Actions 中正确处理异步逻辑，以及如何实现健壮的错误捕获机制。

## 异步 Action 基础

Pinia 的 Action 天然支持异步，使用 `async/await` 即可：

```javascript
actions: {
  async fetchUser(id) {
    const response = await fetch(`/api/users/${id}`)
    this.user = await response.json()
  }
}
```

与 Vuex 不同，不需要通过 commit mutation 修改 state：

```javascript
// Vuex 方式（繁琐）
actions: {
  async fetchUser({ commit }, id) {
    commit('setLoading', true)
    try {
      const user = await api.getUser(id)
      commit('setUser', user)
    } finally {
      commit('setLoading', false)
    }
  }
}

// Pinia 方式（简洁）
actions: {
  async fetchUser(id) {
    this.loading = true
    try {
      this.user = await api.getUser(id)
    } finally {
      this.loading = false
    }
  }
}
```

## 异步 Action 的包装

上一章的 action 包装器需要正确处理 Promise：

```javascript
function wrapAction(name, action, store) {
  return function (...args) {
    const afterCallbacks = []
    const errorCallbacks = []
    
    // 触发订阅
    store._actionSubscribers.forEach((sub) => {
      sub({
        name,
        store,
        args,
        after: (cb) => afterCallbacks.push(cb),
        onError: (cb) => errorCallbacks.push(cb)
      })
    })
    
    let result
    try {
      result = action.apply(store, args)
    } catch (error) {
      // 同步执行阶段的错误
      errorCallbacks.forEach((cb) => cb(error))
      throw error
    }
    
    // 关键：检测是否为 Promise
    if (result instanceof Promise) {
      return result
        .then((value) => {
          // 异步成功
          afterCallbacks.forEach((cb) => cb(value))
          return value
        })
        .catch((error) => {
          // 异步失败
          errorCallbacks.forEach((cb) => cb(error))
          throw error  // 重新抛出，让调用者也能捕获
        })
    }
    
    // 同步 action
    afterCallbacks.forEach((cb) => cb(result))
    return result
  }
}
```

这个实现确保：

1. 同步错误立即触发 `onError` 回调
2. 异步成功后触发 `after` 回调
3. 异步失败触发 `onError` 回调
4. 错误被重新抛出，调用者可以 catch

## 错误处理模式

### 模式一：try-catch 包裹

最基本的错误处理方式：

```javascript
actions: {
  async fetchData() {
    this.loading = true
    this.error = null
    
    try {
      const data = await api.getData()
      this.data = data
    } catch (error) {
      this.error = error.message
      // 可选：上报错误
      reportError(error)
    } finally {
      this.loading = false
    }
  }
}
```

### 模式二：统一错误处理

使用 `$onAction` 统一处理错误：

```javascript
// 全局错误处理插件
function errorHandlerPlugin({ store }) {
  store.$onAction(({ name, onError }) => {
    onError((error) => {
      console.error(`Action ${name} failed:`, error)
      
      // 统一错误处理
      if (error.response?.status === 401) {
        // 跳转登录
        router.push('/login')
      } else if (error.response?.status === 500) {
        // 显示服务器错误提示
        toast.error('服务器错误，请稍后重试')
      }
      
      // 上报错误
      errorReporter.capture(error, {
        store: store.$id,
        action: name
      })
    })
  }, true)  // detached: true，不随组件卸载
}

// 使用
const pinia = createPinia()
pinia.use(errorHandlerPlugin)
```

### 模式三：返回结果对象

不抛出错误，返回结果对象：

```javascript
actions: {
  async fetchUser(id) {
    this.loading = true
    
    try {
      const user = await api.getUser(id)
      this.user = user
      return { success: true, data: user }
    } catch (error) {
      this.error = error.message
      return { success: false, error }
    } finally {
      this.loading = false
    }
  }
}

// 使用
const result = await store.fetchUser(123)
if (result.success) {
  console.log('User:', result.data)
} else {
  console.log('Error:', result.error)
}
```

## 取消异步操作

长时间运行的异步操作需要支持取消：

### 使用 AbortController

```javascript
actions: {
  async fetchData() {
    // 取消之前的请求
    if (this._abortController) {
      this._abortController.abort()
    }
    
    // 创建新的 AbortController
    this._abortController = new AbortController()
    
    this.loading = true
    
    try {
      const response = await fetch('/api/data', {
        signal: this._abortController.signal
      })
      this.data = await response.json()
    } catch (error) {
      if (error.name === 'AbortError') {
        // 请求被取消，忽略
        console.log('Request aborted')
        return
      }
      throw error
    } finally {
      this.loading = false
    }
  },
  
  cancelFetch() {
    if (this._abortController) {
      this._abortController.abort()
      this._abortController = null
    }
  }
}
```

### 使用标志位

```javascript
actions: {
  async fetchData() {
    // 生成请求 ID
    const requestId = ++this._lastRequestId
    
    this.loading = true
    
    try {
      const data = await api.getData()
      
      // 检查是否为最新请求
      if (requestId !== this._lastRequestId) {
        // 有新请求，忽略此结果
        return
      }
      
      this.data = data
    } finally {
      if (requestId === this._lastRequestId) {
        this.loading = false
      }
    }
  }
}
```

## 并发控制

### 防止重复请求

```javascript
actions: {
  async fetchData() {
    // 如果正在加载，直接返回
    if (this.loading) {
      return this._pendingPromise
    }
    
    this.loading = true
    
    // 保存 Promise 以便复用
    this._pendingPromise = (async () => {
      try {
        const data = await api.getData()
        this.data = data
        return data
      } finally {
        this.loading = false
        this._pendingPromise = null
      }
    })()
    
    return this._pendingPromise
  }
}

// 多次调用返回同一个 Promise
const promise1 = store.fetchData()
const promise2 = store.fetchData()
console.log(promise1 === promise2)  // true
```

### 队列执行

```javascript
actions: {
  _queue: [],
  _processing: false,
  
  async processQueue() {
    if (this._processing) return
    this._processing = true
    
    while (this._queue.length > 0) {
      const task = this._queue.shift()
      try {
        await task()
      } catch (error) {
        console.error('Task failed:', error)
      }
    }
    
    this._processing = false
  },
  
  enqueue(task) {
    this._queue.push(task)
    this.processQueue()
  }
}
```

## 重试机制

```javascript
actions: {
  async fetchWithRetry(url, maxRetries = 3) {
    let lastError
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        return await response.json()
      } catch (error) {
        lastError = error
        console.log(`Attempt ${attempt} failed:`, error.message)
        
        if (attempt < maxRetries) {
          // 指数退避
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000)
          await new Promise(r => setTimeout(r, delay))
        }
      }
    }
    
    throw lastError
  },
  
  async fetchData() {
    this.loading = true
    try {
      this.data = await this.fetchWithRetry('/api/data')
    } catch (error) {
      this.error = '加载失败，请稍后重试'
    } finally {
      this.loading = false
    }
  }
}
```

## 乐观更新

先更新 UI，失败后回滚：

```javascript
actions: {
  async toggleLike(postId) {
    // 保存当前状态
    const previousLiked = this.likedPosts.has(postId)
    
    // 乐观更新
    if (previousLiked) {
      this.likedPosts.delete(postId)
    } else {
      this.likedPosts.add(postId)
    }
    
    try {
      // 发送请求
      await api.toggleLike(postId)
    } catch (error) {
      // 失败，回滚
      if (previousLiked) {
        this.likedPosts.add(postId)
      } else {
        this.likedPosts.delete(postId)
      }
      throw error
    }
  }
}
```

使用 `$patch` 实现更复杂的回滚：

```javascript
actions: {
  async updateProfile(updates) {
    // 保存当前状态快照
    const snapshot = { ...this.$state.user }
    
    // 乐观更新
    this.$patch({ user: { ...this.user, ...updates } })
    
    try {
      await api.updateProfile(updates)
    } catch (error) {
      // 回滚到快照
      this.$patch({ user: snapshot })
      throw error
    }
  }
}
```

## 错误类型定义

定义清晰的错误类型：

```typescript
// 自定义错误类型
class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

class NetworkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NetworkError'
  }
}

class ValidationError extends Error {
  constructor(
    message: string,
    public fields: Record<string, string>
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

// 在 action 中使用
actions: {
  async submitForm(data) {
    try {
      await api.submit(data)
    } catch (error) {
      if (error instanceof ValidationError) {
        this.fieldErrors = error.fields
      } else if (error instanceof NetworkError) {
        this.error = '网络错误，请检查连接'
      } else if (error instanceof ApiError) {
        this.error = error.message
      } else {
        this.error = '未知错误'
        throw error  // 未知错误重新抛出
      }
    }
  }
}
```

## 测试异步 Action

```javascript
describe('Async Actions', () => {
  test('successful async action', async () => {
    const useStore = defineStore('test', {
      state: () => ({ data: null, loading: false }),
      actions: {
        async fetchData() {
          this.loading = true
          try {
            this.data = await mockApi.getData()
          } finally {
            this.loading = false
          }
        }
      }
    })
    
    const store = useStore()
    
    expect(store.loading).toBe(false)
    
    const promise = store.fetchData()
    expect(store.loading).toBe(true)
    
    await promise
    expect(store.loading).toBe(false)
    expect(store.data).toBeDefined()
  })
  
  test('failed async action', async () => {
    const useStore = defineStore('test', {
      state: () => ({ error: null }),
      actions: {
        async fetchData() {
          throw new Error('API Error')
        }
      }
    })
    
    const store = useStore()
    
    await expect(store.fetchData()).rejects.toThrow('API Error')
  })
  
  test('$onAction error callback', async () => {
    const useStore = defineStore('test', {
      actions: {
        async failingAction() {
          throw new Error('Test Error')
        }
      }
    })
    
    const store = useStore()
    const errors = []
    
    store.$onAction(({ onError }) => {
      onError((error) => errors.push(error))
    })
    
    try {
      await store.failingAction()
    } catch {}
    
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toBe('Test Error')
  })
})
```

## 本章小结

本章深入探讨了异步 Action 的处理：

- **基础用法**：async/await 直接使用
- **包装器实现**：正确处理 Promise 的 then/catch
- **错误处理模式**：try-catch、统一处理、结果对象
- **取消操作**：AbortController、标志位
- **并发控制**：防重复、队列执行
- **重试机制**：指数退避重试
- **乐观更新**：先更新后验证，失败回滚
- **错误类型**：定义清晰的错误层次

至此，第四部分 Options Store 实现完成。下一章进入第五部分，实现 Setup Store。
