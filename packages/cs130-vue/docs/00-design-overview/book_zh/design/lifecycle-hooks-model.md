# 生命周期钩子的统一模型

Vue3 重新设计了生命周期钩子系统，在保持 Options API 兼容的同时，为 Composition API 提供了新的钩子函数。

## 生命周期阶段

Vue 组件的生命周期分为几个阶段：

创建阶段：组件实例创建、初始化 props、执行 setup。

挂载阶段：渲染 VNode、创建真实 DOM、插入文档。

更新阶段：响应式数据变化、重新渲染、更新 DOM。

卸载阶段：从 DOM 移除、清理副作用、释放资源。

每个阶段前后都有对应的钩子，让开发者在适当时机执行代码。

## Options API 钩子

```javascript
export default {
  beforeCreate() {
    // 实例初始化之前，data 和 methods 还不可用
  },
  created() {
    // 实例创建完成，data 和 methods 可用，但 DOM 未创建
  },
  beforeMount() {
    // 挂载开始之前，render 函数首次被调用
  },
  mounted() {
    // 挂载完成，可以访问 DOM
  },
  beforeUpdate() {
    // 数据变化，DOM 更新之前
  },
  updated() {
    // DOM 更新完成
  },
  beforeUnmount() {
    // 卸载之前，实例仍然完全可用
  },
  unmounted() {
    // 卸载完成，所有绑定解除，监听器移除
  }
}
```

Vue3 将 beforeDestroy/destroyed 重命名为 beforeUnmount/unmounted，更准确地描述了这个过程。

## Composition API 钩子

Composition API 提供对应的钩子函数：

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
    // setup 替代 beforeCreate 和 created

    onBeforeMount(() => {
      console.log('before mount')
    })

    onMounted(() => {
      console.log('mounted')
    })

    onBeforeUpdate(() => {
      console.log('before update')
    })

    onUpdated(() => {
      console.log('updated')
    })

    onBeforeUnmount(() => {
      console.log('before unmount')
    })

    onUnmounted(() => {
      console.log('unmounted')
    })
  }
}
```

没有 onBeforeCreate 和 onCreated，因为 setup 本身就在这个阶段执行。

## 钩子的执行时机

mounted 在 DOM 渲染完成后执行，这时可以安全访问 DOM：

```javascript
onMounted(() => {
  const el = document.getElementById('my-element')
  el.focus()  // 安全
})
```

但要注意，mounted 不保证所有子组件都已挂载。如果需要等待整个组件树渲染完成：

```javascript
onMounted(async () => {
  await nextTick()
  // 现在整个组件树都已渲染
})
```

updated 在响应式数据变化导致 DOM 更新后执行：

```javascript
onUpdated(() => {
  console.log('DOM 已更新')
})
```

注意不要在 updated 中修改响应式数据，可能导致无限循环。

## 父子组件的执行顺序

父子组件的钩子执行顺序：

挂载时：父 beforeMount → 子 beforeMount → 子 mounted → 父 mounted

更新时：父 beforeUpdate → 子 beforeUpdate → 子 updated → 父 updated

卸载时：父 beforeUnmount → 子 beforeUnmount → 子 unmounted → 父 unmounted

这个顺序的逻辑是：父组件的挂载依赖子组件完成，所以子组件先完成挂载；同理，父组件卸载前，需要先卸载子组件。

## 特殊钩子

除了基本生命周期，还有一些特殊钩子：

```javascript
import {
  onActivated,
  onDeactivated,
  onErrorCaptured,
  onRenderTracked,
  onRenderTriggered
} from 'vue'

// keep-alive 相关
onActivated(() => {
  // 组件被 keep-alive 激活
})

onDeactivated(() => {
  // 组件被 keep-alive 停用
})

// 错误处理
onErrorCaptured((err, instance, info) => {
  console.error('捕获到错误:', err)
  return false  // 阻止错误向上传播
})

// 调试用
onRenderTracked((event) => {
  console.log('依赖被追踪:', event)
})

onRenderTriggered((event) => {
  console.log('渲染被触发:', event)
})
```

这些钩子服务于特定场景：keep-alive 的缓存组件激活/停用、错误边界、渲染调试。

## 在 Composables 中使用钩子

Composition API 的一个强大之处是钩子可以在 composables 中使用：

```javascript
// composables/useMouse.js
import { ref, onMounted, onUnmounted } from 'vue'

export function useMouse() {
  const x = ref(0)
  const y = ref(0)

  function update(event) {
    x.value = event.pageX
    y.value = event.pageY
  }

  onMounted(() => {
    window.addEventListener('mousemove', update)
  })

  onUnmounted(() => {
    window.removeEventListener('mousemove', update)
  })

  return { x, y }
}
```

使用这个 composable 的组件自动获得完整的生命周期管理，不需要额外处理。这种封装让代码复用更加方便。

## 设计统一性

无论使用 Options API 还是 Composition API，底层的生命周期模型是统一的。组件实例上维护着钩子函数的数组，在对应时机依次执行。

这种设计让两种 API 可以在同一个组件中混用，钩子按正确的顺序执行。开发者可以根据需要选择更合适的风格。
