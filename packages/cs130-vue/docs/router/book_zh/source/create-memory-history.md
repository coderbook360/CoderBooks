# createMemoryHistory 实现

`createMemoryHistory` 创建基于内存的路由历史管理器。它不依赖浏览器环境，完全在 JavaScript 内存中维护导航状态。这使它成为 SSR 和测试的理想选择。

## 设计目的

Memory History 的存在解决了两个核心问题：

1. **服务端渲染**：Node.js 环境没有 `window.history`，需要一种不依赖浏览器 API 的实现
2. **单元测试**：测试环境可能没有完整的 DOM，或者需要精确控制导航状态

## 函数签名

```typescript
function createMemoryHistory(base?: string): RouterHistory
```

和其他 history 实现一样，它返回符合 `RouterHistory` 接口的对象。

## 核心实现

```typescript
export function createMemoryHistory(base: string = ''): RouterHistory {
  // 历史记录队列
  let listeners: NavigationCallback[] = []
  let queue: HistoryLocation[] = [base]
  let position: number = 0

  // 规范化 base
  base = normalizeBase(base)

  function setLocation(location: HistoryLocation) {
    position++
    if (position === queue.length) {
      // 在末尾追加
      queue.push(location)
    } else {
      // 从当前位置截断，然后追加
      queue.splice(position)
      queue.push(location)
    }
  }

  function triggerListeners(
    to: HistoryLocation,
    from: HistoryLocation,
    { direction, delta }: Pick<NavigationInformation, 'direction' | 'delta'>
  ): void {
    const info: NavigationInformation = {
      direction,
      delta,
      type: NavigationType.pop,
    }
    for (const callback of listeners) {
      callback(to, from, info)
    }
  }

  const routerHistory: RouterHistory = {
    location: queue[position],
    state: {},
    base,

    createHref: createHref.bind(null, base),

    replace(to) {
      queue.splice(position, 1, to)
      this.location = to
    },

    push(to, data?: HistoryState) {
      setLocation(to)
      this.location = to
    },

    listen(callback) {
      listeners.push(callback)
      return () => {
        const index = listeners.indexOf(callback)
        if (index > -1) listeners.splice(index, 1)
      }
    },

    destroy() {
      listeners = []
      queue = [base]
      position = 0
    },

    go(delta, shouldTrigger = true) {
      const from = this.location
      const direction: NavigationDirection =
        delta < 0 ? NavigationDirection.back : NavigationDirection.forward
      
      // 计算新位置，确保在有效范围内
      position = Math.max(0, Math.min(position + delta, queue.length - 1))
      
      this.location = queue[position]

      if (shouldTrigger) {
        triggerListeners(this.location, from, { direction, delta })
      }
    },
  }

  // 使用 getter 让 location 保持响应
  Object.defineProperty(routerHistory, 'location', {
    enumerable: true,
    get: () => queue[position],
  })

  return routerHistory
}
```

## 队列结构

Memory History 使用数组作为历史记录栈：

```typescript
let queue: HistoryLocation[] = [base]
let position: number = 0
```

`queue` 存储访问过的路径，`position` 是当前在队列中的索引。

这与浏览器的历史栈概念类似：

```
初始状态:
queue: ['/']
position: 0
         ^

push('/about'):
queue: ['/', '/about']
position: 1
              ^

push('/users'):
queue: ['/', '/about', '/users']
position: 2
                       ^

go(-1):
queue: ['/', '/about', '/users']
position: 1
              ^

push('/contact'):
queue: ['/', '/about', '/contact']
position: 2
                       ^
```

注意最后一步：从 `/about` push 新路径时，`/users` 被丢弃。这模拟了浏览器的行为——如果后退后又导航到新页面，前面的历史会被覆盖。

## push 实现

```typescript
function setLocation(location: HistoryLocation) {
  position++
  if (position === queue.length) {
    queue.push(location)
  } else {
    queue.splice(position)
    queue.push(location)
  }
}

push(to, data?: HistoryState) {
  setLocation(to)
  this.location = to
}
```

`push` 调用 `setLocation`：

1. 增加 position
2. 如果已经在队列末尾，直接追加
3. 否则先截断后面的记录，再追加

这确保了行为与浏览器一致。

## replace 实现

```typescript
replace(to) {
  queue.splice(position, 1, to)
  this.location = to
}
```

`replace` 更简单——直接替换当前位置的记录，不改变 position。

## go 实现

```typescript
go(delta, shouldTrigger = true) {
  const from = this.location
  const direction: NavigationDirection =
    delta < 0 ? NavigationDirection.back : NavigationDirection.forward
  
  position = Math.max(0, Math.min(position + delta, queue.length - 1))
  
  this.location = queue[position]

  if (shouldTrigger) {
    triggerListeners(this.location, from, { direction, delta })
  }
}
```

`go` 移动 position 指针，使用 `Math.max` 和 `Math.min` 确保不会越界。

`shouldTrigger` 参数控制是否触发监听器。在某些场景下（如路由器内部调用），可能需要跳过监听器。

## 与浏览器 History 的对比

Memory History 和 Web History 的对比：

| 特性 | Web History | Memory History |
|------|-------------|----------------|
| 存储位置 | 浏览器历史栈 | JavaScript 数组 |
| URL 变化 | 是 | 否 |
| popstate 事件 | 是 | 模拟（手动触发） |
| 刷新后保持 | 是 | 否 |
| 环境依赖 | 浏览器 | 无 |

Memory History 不会改变浏览器的地址栏，适合在不需要真实 URL 的场景使用。

## 在 SSR 中使用

服务端渲染的典型用法：

```typescript
// server.js
import { createRouter, createMemoryHistory } from 'vue-router'

export async function render(url) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes
  })

  // 导航到请求的 URL
  router.push(url)
  await router.isReady()

  // 渲染应用
  const html = await renderToString(app)
  
  return html
}
```

每个请求创建新的 router 实例和 memory history，确保请求之间不会共享状态。

## 在测试中使用

单元测试的典型用法：

```typescript
import { createRouter, createMemoryHistory } from 'vue-router'
import { mount } from '@vue/test-utils'

describe('Navigation', () => {
  it('should navigate to about page', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: Home },
        { path: '/about', component: About }
      ]
    })

    router.push('/')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [router]
      }
    })

    await router.push('/about')

    expect(wrapper.html()).toContain('About')
    expect(router.currentRoute.value.path).toBe('/about')
  })
})
```

Memory History 让测试可以在没有浏览器的环境下运行，而且每个测试都有独立的状态。

## 初始 URL 支持

Memory History 支持通过 base 设置初始 URL：

```typescript
const history = createMemoryHistory('/initial/path')
// queue: ['/initial/path']
// position: 0
```

这在 SSR 中很有用——请求 URL 可以直接作为初始路径。

## 状态管理

注意 Memory History 的 state 是一个简单对象：

```typescript
state: {},
```

它不像 Web History 那样自动管理状态。如果需要在 push/replace 时保存状态：

```typescript
push(to, data?: HistoryState) {
  setLocation(to)
  this.location = to
  // data 目前被忽略
}
```

Vue Router 的当前实现没有在 Memory History 中保存自定义 state。如果你需要这个功能，可以自行扩展。

## 本章小结

`createMemoryHistory` 使用 JavaScript 数组模拟浏览器的历史栈：

1. `queue` 数组存储路径列表
2. `position` 指针追踪当前位置
3. `push` 在当前位置后追加，可能截断后面的记录
4. `replace` 替换当前位置
5. `go` 移动指针，触发监听器

它不依赖浏览器 API，适合 SSR 和测试。接口与 `createWebHistory` 相同，可以透明替换。这种设计让同一套应用代码可以在不同环境运行，只需切换 history 实现。
