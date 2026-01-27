# getActivePinia 获取活跃实例

上一章我们分析了 setActivePinia，了解了活跃实例的设置机制。这一章将深入分析 getActivePinia 的实现，以及它在不同场景下的行为。

## getActivePinia 的职责

getActivePinia 的职责是返回当前应该使用的 Pinia 实例。这看似简单，但实际上需要考虑多种情况：组件内调用、组件外调用、SSR 场景、多 app 场景等。

## 源码实现

让我们看看 getActivePinia 的完整实现：

```typescript
import { getCurrentInstance, inject } from 'vue'
import { piniaSymbol } from './symbols'

let activePinia: Pinia | undefined

export function getActivePinia(): Pinia | undefined {
  // 检查是否有 Vue 组件实例
  const instance = getCurrentInstance()
  
  // 在组件上下文中，尝试通过 inject 获取
  if (instance) {
    const pinia = inject(piniaSymbol, undefined)
    if (pinia) {
      return pinia
    }
  }
  
  // 返回模块级的活跃实例
  return activePinia
}
```

这个实现揭示了 Pinia 获取实例的优先级：首先尝试从组件上下文 inject，其次使用模块级的 activePinia。

## 组件上下文优先

为什么优先使用 inject 而不是直接返回 activePinia？

考虑一个微前端场景，主应用和子应用各自有独立的 Vue app 和 Pinia 实例：

```typescript
// 主应用
const mainApp = createApp(MainApp)
const mainPinia = createPinia()
mainApp.use(mainPinia)

// 子应用
const subApp = createApp(SubApp)
const subPinia = createPinia()
subApp.use(subPinia)
```

如果只使用 activePinia，最后设置的那个会覆盖之前的，导致某个 app 的组件可能使用错误的 Pinia 实例。

通过 inject，每个组件从自己的 app 上下文获取 Pinia 实例，确保了正确性。activePinia 只作为后备，用于组件外的场景。

## getCurrentInstance 的使用

getCurrentInstance 是 Vue 的内部 API，返回当前正在执行的组件实例：

```typescript
import { getCurrentInstance } from 'vue'

// 在组件的 setup 中
setup() {
  const instance = getCurrentInstance()  // 返回当前组件实例
}

// 在普通函数中（非组件上下文）
function helper() {
  const instance = getCurrentInstance()  // 返回 null
}
```

getActivePinia 利用这个 API 判断是否在组件上下文中。如果 `getCurrentInstance()` 返回了实例，说明代码正在某个组件的 setup 中执行，可以使用 inject。

需要注意的是，getCurrentInstance 只在以下时机有效：组件的 setup 函数执行期间；生命周期钩子回调中；computed/watch 的回调中。

在异步操作中（如 setTimeout、fetch 回调），getCurrentInstance 返回 null：

```typescript
setup() {
  const instance = getCurrentInstance()  // ✅ 有效
  
  setTimeout(() => {
    const instance2 = getCurrentInstance()  // ❌ null
  }, 100)
}
```

这就是为什么在异步操作中使用 Store 有时需要注意——需要在同步阶段获取 Store 引用。

## 开发环境警告

在开发环境中，getActivePinia 会检查是否成功获取实例，如果失败会给出警告：

```typescript
export function getActivePinia(): Pinia {
  const instance = getCurrentInstance()
  
  // 尝试从组件上下文获取
  let pinia: Pinia | undefined
  if (instance) {
    pinia = inject(piniaSymbol, undefined)
  }
  
  // 使用模块级实例
  pinia = pinia || activePinia
  
  // 开发环境警告
  if (__DEV__ && !pinia) {
    throw new Error(
      '[🍍]: getActivePinia was called with no active Pinia. ' +
      'Did you forget to install pinia?\n' +
      'const pinia = createPinia()\n' +
      'app.use(pinia)'
    )
  }
  
  return pinia!
}
```

这个警告帮助开发者快速定位问题——通常是忘记安装 Pinia 或在 Pinia 安装前就尝试使用 Store。

## 在 Store 内部的使用

当一个 Store 需要访问另一个 Store 时，内部会使用 getActivePinia：

```typescript
const useOrderStore = defineStore('order', {
  actions: {
    async checkout() {
      // useCartStore 内部调用 getActivePinia()
      const cartStore = useCartStore()
      
      // 因为这是在 action 中（响应组件调用）
      // getActivePinia 能正确返回实例
      return { items: cartStore.items }
    }
  }
})
```

这个场景能正常工作，因为：当组件调用 `orderStore.checkout()` 时，activePinia 已经在之前的 useOrderStore 调用中被设置；checkout 是同步执行的（虽然它是 async 函数，但同步部分会立即执行）。

## SSR 场景

在 SSR 中，每个请求需要独立的 Pinia 实例。正确的做法是在请求处理开始时设置 activePinia：

```typescript
// server entry
export async function render(req: Request) {
  const pinia = createPinia()
  setActivePinia(pinia)
  
  const app = createSSRApp(App)
  app.use(pinia)
  
  // 预获取数据
  const userStore = useUserStore()
  await userStore.fetchUser()
  
  // 渲染
  const html = await renderToString(app)
  
  return {
    html,
    state: pinia.state.value
  }
}
```

这里 `setActivePinia` 确保了后续的 Store 调用使用正确的 Pinia 实例。在多请求并发的情况下，Node.js 的单线程模型保证每个请求串行执行同步代码，不会冲突。

但如果有异步操作交叉执行，可能会有问题。推荐的做法是尽可能在组件内使用 Store，让 inject 机制确保正确性。

## 测试场景

在单元测试中，通常每个测试用例需要独立的 Pinia 实例：

```typescript
import { setActivePinia, createPinia } from 'pinia'
import { useCounterStore } from '@/stores/counter'

describe('Counter Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  
  it('increments count', () => {
    const store = useCounterStore()
    store.increment()
    expect(store.count).toBe(1)
  })
  
  it('starts fresh', () => {
    const store = useCounterStore()
    // 因为 beforeEach 创建了新的 pinia
    // 这里 count 是 0，不是上一个测试的 1
    expect(store.count).toBe(0)
  })
})
```

每个 beforeEach 创建新的 Pinia 并设置为活跃，测试之间完全隔离。

## 总结

getActivePinia 的设计体现了几个原则。

优先级清晰：组件上下文 inject 优先于全局 activePinia，确保多 app 场景的正确性。

透明性：普通开发者不需要关心这个机制，在组件中正常调用 useStore 即可。

可调试性：开发环境提供清晰的错误信息，帮助定位问题。

灵活性：通过 setActivePinia 支持 SSR 和测试场景的特殊需求。

下一章我们将进入 Store 定义与创建的核心逻辑，分析 defineStore 的实现。
