# actions 异步处理

异步 action 是 Pinia 的强大特性，可以直接在 Store 中处理 API 调用和其他异步操作。这一章分析异步 action 的实现和最佳实践。

## 基本用法

```typescript
const useUserStore = defineStore('user', {
  state: () => ({
    user: null as User | null,
    loading: false,
    error: null as string | null
  }),
  actions: {
    async fetchUser(id: string) {
      this.loading = true
      this.error = null
      
      try {
        this.user = await api.getUser(id)
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    }
  }
})
```

## Promise 检测

wrapAction 检测返回值是否为 Promise：

```typescript
let ret = action.apply(this, args)

if (ret instanceof Promise) {
  return ret
    .then((value) => {
      triggerSubscriptions(afterCallbackList, value)
      return value
    })
    .catch((error) => {
      triggerSubscriptions(onErrorCallbackList, error)
      return Promise.reject(error)
    })
}
```

关键点是使用 `instanceof Promise` 检测，而不是检查 then 方法。这确保了普通对象不会被误判。

## $onAction 的 after 回调

after 回调在异步操作完成后触发：

```typescript
store.$onAction(({ name, after, onError }) => {
  const startTime = Date.now()
  
  after((result) => {
    console.log(
      `${name} completed in ${Date.now() - startTime}ms`,
      'result:', result
    )
  })
  
  onError((error) => {
    console.error(`${name} failed:`, error)
  })
})

// 调用异步 action
await store.fetchUser('123')
// 输出：fetchUser completed in 150ms result: {...}
```

## 错误传播

异步 action 的错误会正确传播：

```typescript
actions: {
  async riskyOperation() {
    throw new Error('Something went wrong')
  }
}

try {
  await store.riskyOperation()
} catch (e) {
  console.error('Caught:', e.message)
}
// onError 回调也会触发
```

错误同时触发 onError 回调并重新抛出，调用者可以捕获。

## 状态更新时机

异步 action 中的状态更新是即时的：

```typescript
actions: {
  async fetchData() {
    this.loading = true  // 立即生效，UI 更新
    
    const data = await api.getData()
    
    this.data = data     // await 之后，立即生效
    this.loading = false // 立即生效
  }
}
```

每次赋值都立即触发响应式更新，不需要等 action 完成。

## 使用 $patch 批量更新

多个状态更新可以用 $patch 合并：

```typescript
actions: {
  async fetchData() {
    this.loading = true
    
    try {
      const data = await api.getData()
      
      // 批量更新，只触发一次订阅
      this.$patch({
        data,
        loading: false,
        error: null
      })
    } catch (e) {
      this.$patch({
        loading: false,
        error: e.message
      })
    }
  }
}
```

## 取消和竞态

异步 action 可能有竞态问题：

```typescript
// 用户快速切换
store.fetchUser('1')  // 请求 1 发出
store.fetchUser('2')  // 请求 2 发出
// 如果请求 1 后返回，会覆盖请求 2 的结果
```

解决方案一：请求标识

```typescript
actions: {
  async fetchUser(id: string) {
    const requestId = Symbol()
    this._currentRequest = requestId
    
    this.loading = true
    
    try {
      const user = await api.getUser(id)
      
      // 只有最新请求才更新状态
      if (this._currentRequest === requestId) {
        this.user = user
      }
    } finally {
      if (this._currentRequest === requestId) {
        this.loading = false
      }
    }
  }
}
```

解决方案二：AbortController

```typescript
actions: {
  async fetchUser(id: string) {
    // 取消之前的请求
    this._abortController?.abort()
    this._abortController = new AbortController()
    
    try {
      const user = await api.getUser(id, {
        signal: this._abortController.signal
      })
      this.user = user
    } catch (e) {
      if (e.name !== 'AbortError') {
        this.error = e.message
      }
    }
  }
}
```

## 并行和串行

并行执行多个请求：

```typescript
actions: {
  async fetchAll() {
    const [users, posts, comments] = await Promise.all([
      api.getUsers(),
      api.getPosts(),
      api.getComments()
    ])
    
    this.users = users
    this.posts = posts
    this.comments = comments
  }
}
```

串行执行依赖的请求：

```typescript
actions: {
  async fetchUserAndOrders(userId: string) {
    const user = await api.getUser(userId)
    this.user = user
    
    // 需要 user.id 来获取订单
    const orders = await api.getOrders(user.id)
    this.orders = orders
  }
}
```

## 返回值处理

异步 action 可以返回数据：

```typescript
actions: {
  async createPost(data: PostData): Promise<Post> {
    const post = await api.createPost(data)
    this.posts.push(post)
    return post  // 返回给调用者
  }
}

// 使用返回值
const newPost = await store.createPost({ title: 'Hello' })
console.log('Created:', newPost.id)
```

## 组合多个 action

action 可以调用其他 action：

```typescript
actions: {
  async fetchUserProfile(userId: string) {
    await this.fetchUser(userId)
    await this.fetchUserPosts(userId)
    await this.fetchUserFollowers(userId)
  },
  
  async fetchUser(userId: string) { ... },
  async fetchUserPosts(userId: string) { ... },
  async fetchUserFollowers(userId: string) { ... }
}
```

## 跨 Store 异步操作

异步 action 中访问其他 Store：

```typescript
actions: {
  async checkout() {
    const cartStore = useCartStore()
    const userStore = useUserStore()
    
    if (!userStore.isLoggedIn) {
      throw new Error('Please login first')
    }
    
    const order = await api.createOrder({
      userId: userStore.userId,
      items: cartStore.items
    })
    
    this.orders.push(order)
    cartStore.clearCart()
  }
}
```

## 测试异步 action

```typescript
import { setActivePinia, createPinia } from 'pinia'
import { vi } from 'vitest'

beforeEach(() => {
  setActivePinia(createPinia())
})

test('fetchUser updates state correctly', async () => {
  const store = useUserStore()
  
  // Mock API
  vi.spyOn(api, 'getUser').mockResolvedValue({ id: '1', name: 'Alice' })
  
  await store.fetchUser('1')
  
  expect(store.loading).toBe(false)
  expect(store.user).toEqual({ id: '1', name: 'Alice' })
  expect(store.error).toBeNull()
})

test('fetchUser handles errors', async () => {
  const store = useUserStore()
  
  vi.spyOn(api, 'getUser').mockRejectedValue(new Error('Not found'))
  
  await store.fetchUser('999')
  
  expect(store.loading).toBe(false)
  expect(store.user).toBeNull()
  expect(store.error).toBe('Not found')
})
```

## 常见模式

加载状态管理：

```typescript
state: () => ({
  loading: false,
  data: null,
  error: null
}),
actions: {
  async fetch() {
    this.loading = true
    this.error = null
    try {
      this.data = await api.getData()
    } catch (e) {
      this.error = e.message
    } finally {
      this.loading = false
    }
  }
}
```

乐观更新：

```typescript
actions: {
  async toggleLike(postId: string) {
    const post = this.posts.find(p => p.id === postId)
    
    // 乐观更新
    post.liked = !post.liked
    post.likeCount += post.liked ? 1 : -1
    
    try {
      await api.toggleLike(postId)
    } catch (e) {
      // 失败时回滚
      post.liked = !post.liked
      post.likeCount += post.liked ? 1 : -1
    }
  }
}
```

下一章我们将分析 actions 的上下文绑定。
