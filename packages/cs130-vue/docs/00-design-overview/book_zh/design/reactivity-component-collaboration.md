# 响应式与组件的协作

响应式系统和组件系统是 Vue 的两大核心模块。响应式系统管理数据的依赖追踪和变化通知，组件系统管理 UI 的组织和渲染。两者的协作是 Vue 工作的基础。

## 协作的基本模式

组件通过响应式数据驱动渲染。当组件的 setup 或 render 函数执行时，它访问的响应式数据会被追踪。当这些数据变化时，组件自动重新渲染。

```javascript
export default {
  setup() {
    const count = ref(0)
    
    // 返回响应式数据
    return { count }
  }
}
```

```vue
<template>
  <!-- 模板中访问 count，建立依赖 -->
  <div>{{ count }}</div>
</template>
```

这种协作是隐式的。开发者只需要声明响应式数据并在模板中使用，Vue 自动处理依赖追踪和更新调度。

## 渲染 Effect

在 Vue 内部，组件的渲染函数被包装在一个 Effect 中：

```javascript
// 简化的组件挂载逻辑
function mountComponent(instance) {
  const effect = new ReactiveEffect(
    () => {
      // 渲染函数在 effect 中执行
      const vnode = instance.render.call(instance.proxy)
      patch(instance.subTree, vnode, container)
      instance.subTree = vnode
    },
    // 调度器
    () => queueJob(instance.update)
  )
  
  instance.update = effect.run.bind(effect)
  instance.update()
}
```

渲染函数执行时，访问的所有响应式属性都会被追踪。当任何依赖变化时，effect 的调度器被调用，将更新任务加入队列。

这种设计让响应式系统和组件系统保持解耦。响应式系统不知道 Effect 是用于渲染还是其他目的，组件系统不关心响应式追踪的具体实现。

## Props 的响应式

父组件传给子组件的 props 是响应式的：

```vue
<!-- 父组件 -->
<ChildComponent :count="parentCount" />
```

```vue
<!-- 子组件 -->
<template>
  <div>{{ count }}</div>
</template>

<script setup>
const props = defineProps(['count'])
// props.count 是响应式的
</script>
```

当父组件的 `parentCount` 变化时，子组件会自动更新。这是通过将 props 对象包装为 shallowReactive 实现的。

```javascript
// 内部实现简化
instance.props = shallowReactive(rawProps)
```

使用 shallowReactive 而不是 reactive 是有意为之。Props 是从父组件传入的，子组件不应该修改它。浅层响应式确保只追踪 props 对象本身的属性，而不是深层嵌套的值。

## Computed 与组件

Computed 属性是响应式系统提供的缓存机制，在组件中广泛使用：

```javascript
const count = ref(0)
const doubled = computed(() => count.value * 2)
```

Computed 的惰性求值对性能很重要。只有在被访问时才计算，而且结果会被缓存，直到依赖变化。

在组件的渲染过程中，computed 的行为与普通响应式值一致。访问 computed 会触发追踪，computed 依赖的值变化时会触发重新计算和组件更新。

```javascript
// 简化的 computed 实现
class ComputedRefImpl {
  constructor(getter) {
    this._value = undefined
    this._dirty = true
    
    this.effect = new ReactiveEffect(getter, () => {
      // 依赖变化时，标记为脏
      this._dirty = true
      // 通知依赖这个 computed 的 effect
      triggerRefValue(this)
    })
  }
  
  get value() {
    if (this._dirty) {
      this._value = this.effect.run()
      this._dirty = false
    }
    trackRefValue(this)
    return this._value
  }
}
```

## Watch 与组件生命周期

Watch 是响应式系统提供的监听机制，在组件中使用时会与组件生命周期绑定：

```javascript
import { watch, onUnmounted } from 'vue'

export default {
  setup() {
    const count = ref(0)
    
    // 这个 watch 在组件卸载时自动清理
    watch(count, (newVal) => {
      console.log('count changed:', newVal)
    })
    
    return { count }
  }
}
```

在 setup 中创建的 watch 会在组件卸载时自动停止。这是通过将 effect 注册到组件实例实现的：

```javascript
// 简化的实现
function watch(source, callback) {
  const effect = new ReactiveEffect(...)
  
  // 注册到当前组件实例
  if (currentInstance) {
    currentInstance.scope.effects.push(effect)
  }
  
  // 组件卸载时，scope 中的所有 effect 会被清理
}
```

## 响应式上下文

Vue 3 引入了 EffectScope，让响应式效果的管理更加灵活：

```javascript
import { effectScope, ref, computed, watch } from 'vue'

const scope = effectScope()

scope.run(() => {
  const count = ref(0)
  const doubled = computed(() => count.value * 2)
  
  watch(count, () => { ... })
})

// 一次性清理所有效果
scope.stop()
```

每个组件实例都有自己的 EffectScope。组件卸载时，scope 停止，所有在 setup 中创建的响应式效果（computed、watch、effect）都会被清理。

这种设计避免了手动管理每个效果的生命周期，减少了内存泄漏的风险。

## 边界与约定

响应式系统和组件系统的边界是清晰的：

响应式系统的职责：
- 追踪数据访问
- 检测数据变化
- 通知依赖方

组件系统的职责：
- 管理组件实例的创建和销毁
- 调度渲染任务
- 协调 DOM 更新

两者通过 Effect 接口连接。组件将渲染函数包装为 Effect，响应式系统通过 Effect 的调度器通知组件更新。

这种分层设计让每个系统可以独立演进。响应式系统可以被单独使用（如 @vue/reactivity 包），组件系统的渲染逻辑可以独立优化。

## 性能考量

响应式与组件的协作有几个性能关键点：

依赖收集的粒度：Vue 3 追踪到属性级别，比 Vue 2 的对象级别更精确，减少了不必要的更新。

更新合并：调度器将同步的多个更新合并为一次渲染，避免重复工作。

惰性计算：Computed 的缓存避免了重复计算。

Effect 清理：旧依赖的清理确保了准确性，但也有开销。

理解这些机制有助于编写更高效的组件代码。
