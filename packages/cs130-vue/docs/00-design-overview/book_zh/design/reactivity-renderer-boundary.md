# 响应式与渲染器的协作边界

响应式系统和渲染器是 Vue 的两大核心模块。它们各自有明确的职责，通过定义良好的接口协作。理解这种协作关系，有助于把握 Vue 的整体架构。

## 职责划分

响应式系统的职责是追踪数据依赖、在数据变化时发出通知。它不知道也不关心数据被用来做什么。

渲染器的职责是将组件渲染为 DOM、处理更新和卸载。它不知道也不关心数据是如何变化的。

这种分离让两个系统可以独立演进。响应式系统可以用于任何需要依赖追踪的场景，不限于渲染；渲染器可以接受任何形式的更新通知，不限于响应式触发。

## effect 作为连接点

`effect` 是连接响应式系统和渲染器的桥梁。组件的渲染函数被包装在一个 effect 中，当响应式数据变化时，effect 重新执行，触发组件更新。

```javascript
// 简化的组件挂载逻辑
function mountComponent(instance) {
  // 创建渲染 effect
  instance.effect = new ReactiveEffect(
    () => {
      // 执行渲染函数，访问响应式数据会建立依赖
      const vnode = instance.render.call(instance.proxy)
      // 执行 patch，更新 DOM
      patch(instance.subTree, vnode, container)
      instance.subTree = vnode
    },
    // 调度器：将更新任务加入队列
    () => queueJob(instance.update)
  )

  // 首次执行，完成挂载
  instance.update = instance.effect.run.bind(instance.effect)
  instance.update()
}
```

当组件依赖的响应式数据变化时，effect 的调度器被调用，将更新任务加入异步队列。在下一个微任务中，渲染器执行实际的更新操作。

## 调度器的缓冲作用

调度器在响应式系统和渲染器之间起到缓冲作用。它将同步的响应式变化转换为异步的批量更新。

```javascript
const state = reactive({ a: 1, b: 2, c: 3 })

// 组件依赖 a、b、c
effect(() => {
  render(state.a, state.b, state.c)
})

// 连续修改多个属性
state.a = 10
state.b = 20
state.c = 30

// 只触发一次渲染，而不是三次
```

没有调度器，每次属性修改都会触发一次渲染，造成性能浪费。调度器将多次触发合并为一次执行，这是 Vue 性能优化的重要一环。

## 接口设计

响应式系统向外暴露的核心接口包括：

```typescript
// 创建响应式对象
function reactive<T extends object>(target: T): T

// 创建 ref
function ref<T>(value: T): Ref<T>

// 创建副作用
function effect<T>(fn: () => T, options?: ReactiveEffectOptions): ReactiveEffectRunner<T>

// 计算属性
function computed<T>(getter: () => T): ComputedRef<T>

// 监听
function watch(source, callback, options?): WatchStopHandle
```

渲染器不直接使用这些 API，而是通过组件系统间接使用。组件的 setup 函数返回响应式数据，组件系统将其与渲染 effect 关联。

这种间接性让用户不需要手动管理 effect 的生命周期。组件创建时 effect 自动建立，组件销毁时 effect 自动停止。

## 独立使用场景

响应式系统可以独立于渲染器使用。`@vue/reactivity` 是一个独立的包，可以在任何 JavaScript 环境中使用。

```javascript
import { reactive, effect } from '@vue/reactivity'

// 不使用 Vue 渲染器
const state = reactive({ count: 0 })

effect(() => {
  // 可以用于任何副作用，不限于渲染
  document.title = `Count: ${state.count}`
})

setInterval(() => state.count++, 1000)
```

这种模块化设计体现了 Vue3 的架构理念：核心功能解耦、按需组合。开发者可以根据需要使用 Vue 的部分能力，而不必接受整个框架。
