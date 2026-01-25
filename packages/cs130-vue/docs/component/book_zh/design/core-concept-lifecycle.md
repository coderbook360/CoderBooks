# 核心概念：组件生命周期

每个组件从创建到销毁，都会经历一系列的阶段。Vue 在这些关键节点提供了钩子函数，让开发者可以在适当的时机执行自定义逻辑。理解生命周期不仅是使用 Vue 的基础，更是理解组件系统内部运作的窗口。

## 生命周期的全景图

Vue 3 的组件生命周期可以分为四个主要阶段：创建、挂载、更新、卸载。每个阶段都有对应的钩子函数。

**创建阶段**是组件实例初始化的过程。在这个阶段，组件实例被创建，props 被解析，setup 函数被执行。Options API 提供了 `beforeCreate` 和 `created` 两个钩子，但在 Composition API 中，这两个钩子没有直接对应——`setup` 函数本身就运行在这个阶段。

**挂载阶段**是组件首次渲染并插入 DOM 的过程。`onBeforeMount` 在渲染发生前触发，`onMounted` 在组件被挂载到 DOM 后触发。这是访问 DOM 元素、初始化第三方库的最佳时机。

**更新阶段**在组件的响应式状态变化时触发。`onBeforeUpdate` 在 DOM 更新前调用，可以访问更新前的 DOM 状态。`onUpdated` 在 DOM 更新完成后调用。需要注意的是，这两个钩子只在组件自身状态变化导致重新渲染时触发，父组件的更新传递的新 props 也会触发。

**卸载阶段**是组件从 DOM 中移除的过程。`onBeforeUnmount` 在卸载开始前调用，此时组件仍然完全可用。`onUnmounted` 在组件被卸载后调用，是清理定时器、取消订阅、释放资源的最后机会。

```javascript
import { 
  onBeforeMount, 
  onMounted, 
  onBeforeUpdate, 
  onUpdated,
  onBeforeUnmount,
  onUnmounted 
} from 'vue'

export default {
  setup() {
    onBeforeMount(() => {
      console.log('组件即将挂载，DOM 还不存在')
    })
    
    onMounted(() => {
      console.log('组件已挂载，可以访问 DOM')
    })
    
    onBeforeUpdate(() => {
      console.log('组件即将更新，DOM 是旧的')
    })
    
    onUpdated(() => {
      console.log('组件已更新，DOM 是新的')
    })
    
    onBeforeUnmount(() => {
      console.log('组件即将卸载，仍然可用')
    })
    
    onUnmounted(() => {
      console.log('组件已卸载')
    })
  }
}
```

这段代码展示了主要生命周期钩子的使用方式。在 Composition API 中，钩子通过函数调用注册，可以在 setup 函数中的任意位置调用，甚至可以在组合式函数中调用。

## Options API 与 Composition API 的对照

Options API 和 Composition API 提供了相同的生命周期能力，只是调用方式不同：

| 阶段 | Options API | Composition API |
|------|-------------|-----------------|
| 创建前 | beforeCreate | — (use setup) |
| 创建后 | created | — (use setup) |
| 挂载前 | beforeMount | onBeforeMount |
| 挂载后 | mounted | onMounted |
| 更新前 | beforeUpdate | onBeforeUpdate |
| 更新后 | updated | onUpdated |
| 卸载前 | beforeUnmount | onBeforeUnmount |
| 卸载后 | unmounted | onUnmounted |

在 Composition API 中，`beforeCreate` 和 `created` 没有直接对应的钩子，因为 `setup` 函数本身就在这个时间段执行。需要在这两个时机执行的代码，直接写在 `setup` 函数体中即可。

理解这个对应关系有助于从 Options API 迁移到 Composition API。如果你的 `created` 钩子中初始化了某些数据，迁移时只需要把这些代码移到 `setup` 函数中。

## 生命周期的执行时机

让我们更精确地理解各个钩子的执行时机。这需要从渲染器的角度来看问题。

当组件首次挂载时，渲染器执行以下步骤：

```javascript
// 简化的组件挂载流程
function mountComponent(vnode, container) {
  // 1. 创建实例
  const instance = createComponentInstance(vnode)
  
  // 2. 设置组件（执行 setup，触发 beforeCreate/created）
  setupComponent(instance)
  
  // 3. 设置渲染副作用
  setupRenderEffect(instance, container)
}

function setupRenderEffect(instance, container) {
  // 创建响应式副作用
  instance.update = effect(() => {
    if (!instance.isMounted) {
      // --- 首次挂载 ---
      // 触发 beforeMount
      invokeHooks(instance.bm)
      
      // 渲染组件，生成 subTree
      const subTree = instance.render.call(instance.proxy)
      
      // 挂载 subTree 到 DOM
      patch(null, subTree, container)
      instance.subTree = subTree
      
      // 标记已挂载
      instance.isMounted = true
      
      // 触发 mounted（通过 queuePostFlushCb 异步执行）
      queuePostFlushCb(() => invokeHooks(instance.m))
      
    } else {
      // --- 更新 ---
      // 触发 beforeUpdate
      invokeHooks(instance.bu)
      
      // 渲染新的 subTree
      const nextTree = instance.render.call(instance.proxy)
      const prevTree = instance.subTree
      
      // diff 并更新 DOM
      patch(prevTree, nextTree, container)
      instance.subTree = nextTree
      
      // 触发 updated（异步）
      queuePostFlushCb(() => invokeHooks(instance.u))
    }
  })
}
```

这段代码揭示了几个重要的细节。首先，`mounted` 和 `updated` 钩子是通过 `queuePostFlushCb` 异步执行的，而不是在 patch 完成后立即执行。这确保了当钩子执行时，整个组件树的 DOM 都已经更新完毕，包括所有子组件。

其次，`beforeMount` 和 `beforeUpdate` 是同步执行的，此时可以在 DOM 操作发生前执行一些准备工作。

最后，更新是通过响应式副作用（effect）驱动的。当组件的响应式状态变化时，effect 会被重新执行，触发更新流程。

## setup 的特殊位置

`setup` 函数的执行发生在一个特殊的时间点——在 `beforeCreate` 之前。更准确地说，setup 执行时组件实例刚刚创建，props 已经被初始化，但其他选项（data、computed、methods 等）还没有被处理。

```javascript
export default {
  beforeCreate() {
    // 此时 this.count 还不存在
    console.log('beforeCreate', this.count) // undefined
  },
  data() {
    return { count: 0 }
  },
  setup() {
    // setup 在 beforeCreate 之前执行
    // 但此时 instance 已创建，props 已可用
    console.log('setup')
  },
  created() {
    // 此时 this.count 已可用
    console.log('created', this.count) // 0
  }
}
// 输出顺序：setup -> beforeCreate -> created
```

这个顺序看起来有些反直觉——setup 在 beforeCreate 之前执行。这是因为 Vue 3 的设计把 Composition API 放在优先位置：先执行 setup 获取组合式 API 的状态，然后再处理 Options API 的选项。

在 setup 中无法访问 `this`，因为此时组件实例的公开代理还没有创建。这不是设计缺陷，而是有意为之——Composition API 不依赖 `this`，状态通过闭包和响应式 API 管理。

## 特殊钩子

除了常规的生命周期钩子，Vue 还提供了几个特殊用途的钩子。

**onErrorCaptured** 用于捕获后代组件的错误：

```javascript
import { onErrorCaptured } from 'vue'

export default {
  setup() {
    onErrorCaptured((err, instance, info) => {
      console.error('捕获到错误:', err)
      console.log('发生错误的组件:', instance)
      console.log('错误信息:', info)
      
      // 返回 false 阻止错误继续传播
      return false
    })
  }
}
```

错误会沿着组件树向上冒泡，每个祖先组件都有机会捕获处理。这让你可以实现集中的错误处理，比如显示错误边界 UI。

**onRenderTracked** 和 **onRenderTriggered** 是调试用钩子：

```javascript
import { onRenderTracked, onRenderTriggered } from 'vue'

export default {
  setup() {
    onRenderTracked((event) => {
      // 当响应式依赖被追踪时触发
      console.log('依赖追踪:', event.target, event.key)
    })
    
    onRenderTriggered((event) => {
      // 当响应式依赖变化触发重新渲染时触发
      console.log('触发更新:', event.target, event.key, event.oldValue, event.newValue)
    })
  }
}
```

这两个钩子只在开发模式下可用，用于调试组件的响应式依赖。当你困惑于"为什么组件会重新渲染"时，它们非常有用。

**onActivated** 和 **onDeactivated** 是 KeepAlive 专用钩子：

```javascript
import { onActivated, onDeactivated } from 'vue'

export default {
  setup() {
    onActivated(() => {
      // 组件从缓存中被激活
      console.log('组件被激活')
    })
    
    onDeactivated(() => {
      // 组件被放入缓存（而非卸载）
      console.log('组件被停用')
    })
  }
}
```

当组件被 `<KeepAlive>` 包裹时，切换离开不会触发 `unmounted`，而是触发 `deactivated`；切换回来不会触发 `mounted`，而是触发 `activated`。这让缓存的组件可以在激活时刷新数据、在停用时暂停动画等。

## 钩子注册的内部机制

生命周期钩子的注册依赖于 `currentInstance` 全局变量。让我们看看 `onMounted` 是如何实现的：

```javascript
// 当前正在执行 setup 的组件实例
let currentInstance = null

export function setCurrentInstance(instance) {
  currentInstance = instance
}

export function onMounted(hook) {
  if (currentInstance) {
    // 将钩子添加到实例的 mounted 钩子数组
    const wrappedHook = () => {
      // 确保钩子执行时 currentInstance 正确
      setCurrentInstance(currentInstance)
      hook()
      setCurrentInstance(null)
    }
    ;(currentInstance.m || (currentInstance.m = [])).push(wrappedHook)
  } else if (__DEV__) {
    console.warn('onMounted must be called inside setup()')
  }
}
```

这段代码解释了为什么生命周期钩子必须在 setup 函数的同步执行过程中调用。`currentInstance` 只在 setup 执行期间有值，异步代码执行时它已经被清空。

同一个生命周期可以注册多个钩子，它们会按注册顺序依次执行。这让组合式函数可以各自注册自己的生命周期逻辑，而不会相互干扰。

## 父子组件的生命周期顺序

当存在嵌套组件时，生命周期的执行顺序遵循一定的规律。

挂载时，是"由外向内创建，由内向外完成"：

```
父 beforeCreate
父 created  
父 beforeMount
  子 beforeCreate
  子 created
  子 beforeMount
  子 mounted
父 mounted
```

父组件先开始挂载流程，但在渲染子组件时会递归进入子组件的挂载。子组件完全挂载后，父组件才完成挂载。这确保了 `mounted` 触发时，整个子树的 DOM 都已经就绪。

更新时，如果父组件更新导致子组件也需要更新：

```
父 beforeUpdate
  子 beforeUpdate
  子 updated
父 updated
```

卸载时，是"由外向内开始，由内向外完成"：

```
父 beforeUnmount
  子 beforeUnmount
  子 unmounted
父 unmounted
```

理解这个顺序对于处理组件间的协作逻辑很重要。比如，如果你需要在父组件 mounted 时访问子组件的 DOM，是可以的——此时子组件已经 mounted。

## 实践建议

根据生命周期的特点，这里有一些实践建议。

**数据获取**通常在 `onMounted` 中进行。虽然在 setup 函数中发起请求也可以，但在 onMounted 中可以确保组件已经渲染，可以显示加载状态：

```javascript
export default {
  setup() {
    const data = ref(null)
    const loading = ref(true)
    
    onMounted(async () => {
      try {
        data.value = await fetchData()
      } finally {
        loading.value = false
      }
    })
    
    return { data, loading }
  }
}
```

**DOM 操作和第三方库初始化**必须在 `onMounted` 之后，因为此时 DOM 元素才存在：

```javascript
export default {
  setup() {
    const chartRef = ref(null)
    let chartInstance = null
    
    onMounted(() => {
      chartInstance = new Chart(chartRef.value, { /* 配置 */ })
    })
    
    onUnmounted(() => {
      chartInstance?.destroy()
    })
    
    return { chartRef }
  }
}
```

**清理工作**应该在 `onUnmounted` 中完成。任何在 mounted 中创建的资源（定时器、事件监听、WebSocket 连接等）都应该在这里清理：

```javascript
export default {
  setup() {
    let timer = null
    
    onMounted(() => {
      timer = setInterval(() => {
        console.log('tick')
      }, 1000)
    })
    
    onUnmounted(() => {
      clearInterval(timer)
    })
  }
}
```

**避免在更新钩子中修改状态**。在 `onUpdated` 中修改响应式状态会触发新的更新，可能导致无限循环：

```javascript
// 危险！可能导致无限循环
onUpdated(() => {
  count.value++  // 触发新的更新
})
```

如果确实需要在更新后执行副作用，考虑使用 `watchEffect` 或带有适当条件判断的 watch。

## 小结

生命周期是组件与框架交互的关键接口。Vue 3 提供了完整的生命周期钩子覆盖创建、挂载、更新、卸载四个阶段，以及错误捕获、调试、KeepAlive 等特殊场景。

理解钩子的执行时机和内部机制，能帮助你在正确的时机执行正确的操作，避免常见的陷阱。在接下来的章节中，我们将深入探讨 Props 的设计思想——组件接收外部输入的核心机制。
