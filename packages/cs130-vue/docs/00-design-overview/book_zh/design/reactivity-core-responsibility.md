# 响应式系统的核心职责

响应式系统是 Vue 的基石。理解它的核心职责，有助于把握整个框架的运作方式。

## 追踪依赖

响应式系统的第一个核心职责是追踪数据与副作用函数之间的依赖关系。当一个副作用函数（如渲染函数）执行时，系统会记录它访问了哪些响应式数据。

```javascript
import { reactive, effect } from '@vue/reactivity'

const state = reactive({ count: 0 })

// 这个 effect 会被追踪
effect(() => {
  console.log(state.count)  // 访问 count，建立依赖关系
})
```

当 `effect` 执行时，访问 `state.count` 会触发 Proxy 的 get 拦截器。拦截器调用 `track` 函数，将当前正在执行的 effect 与 `count` 属性关联起来。

这种追踪是自动的、隐式的。开发者不需要手动声明依赖关系，只需要在副作用函数中正常访问数据即可。

## 触发更新

响应式系统的第二个核心职责是在数据变化时触发相关的副作用函数重新执行。

```javascript
state.count++  // 触发 set 拦截器

// 之前注册的 effect 会自动重新执行
// 控制台输出新的 count 值
```

修改 `state.count` 会触发 Proxy 的 set 拦截器。拦截器调用 `trigger` 函数，找到所有依赖 `count` 的 effect，并重新执行它们。

触发是精确的。只有依赖被修改属性的 effect 才会执行，其他 effect 不受影响。这是 Vue 响应式系统的性能优势来源。

## 与渲染器的协作

在 Vue 应用中，组件的渲染函数就是一个特殊的副作用函数。它被包装在 `ReactiveEffect` 中，当组件依赖的响应式数据变化时，渲染函数会重新执行。

```javascript
// 简化的组件更新流程
const effect = new ReactiveEffect(
  () => {
    const vnode = component.render()  // 渲染函数
    patch(prevVnode, vnode)           // 更新 DOM
  },
  () => queueJob(instance.update)    // 调度器
)
```

响应式系统只负责追踪依赖和触发更新，不关心更新的具体内容。渲染器负责执行实际的 DOM 操作。这种分工让两个系统保持独立，各自可以独立演进和优化。

调度器在其中起到缓冲作用。当多个响应式数据在同步代码中连续变化时，调度器会将更新任务合并，只在下一个微任务中执行一次渲染。

```javascript
state.a = 1
state.b = 2
state.c = 3
// 只会触发一次渲染，而不是三次
```

## 数据结构的选择

Vue3 使用 WeakMap + Map + Set 的三层结构存储依赖关系：

```javascript
// targetMap: 对象 -> 属性依赖映射
const targetMap = new WeakMap()

// depsMap: 属性名 -> 依赖集合
// const depsMap = targetMap.get(target)  // Map

// dep: 依赖该属性的 effect 集合
// const dep = depsMap.get(key)  // Set
```

WeakMap 用于存储对象到其属性依赖映射的关系。使用 WeakMap 是因为它不会阻止对象被垃圾回收，当对象不再被引用时，相关的依赖记录也会自动清理。

Map 用于存储属性名到依赖集合的映射。Set 用于存储依赖某个属性的所有 effect，自动去重。

这种设计让依赖查找和更新的时间复杂度都是 O(1)，性能优秀。

## 边界与限制

响应式系统有明确的职责边界。它只处理数据层面的依赖追踪，不涉及：

- DOM 操作（渲染器的职责）
- 组件生命周期（组件系统的职责）
- 路由状态（路由库的职责）
- 全局状态（状态管理库的职责）

这种清晰的边界让响应式系统保持简单和高效。`@vue/reactivity` 包可以独立使用，不依赖 Vue 的其他部分，这也是模块化设计的体现。
