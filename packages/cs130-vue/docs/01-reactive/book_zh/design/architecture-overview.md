# 响应式系统架构全景

经过前面十七章的探索，我们已经深入理解了 Vue3 响应式系统的各个组成部分。现在是时候退后一步，从宏观角度审视整个系统的架构，把这些知识点串联成一个完整的图景。

## 三个核心层次

Vue3 响应式系统可以分为三个层次：数据层、追踪层和调度层。

数据层负责将普通 JavaScript 对象转换为响应式对象。这一层的核心是 Proxy，它拦截对对象的各种操作（读取、写入、删除、遍历等），为上层提供感知数据变化的能力。reactive、ref、shallowReactive、shallowRef 等 API 都属于这一层。它们解决的问题是"如何让数据变化可被感知"。

追踪层负责建立和管理"数据"与"副作用"之间的依赖关系。当响应式数据被读取时，追踪层记录"谁在读取"；当数据被修改时，追踪层找出"谁需要被通知"。track 和 trigger 函数是这一层的核心，而 targetMap（WeakMap → Map → Set）数据结构是依赖关系的载体。这一层解决的问题是"如何知道谁依赖谁"。

调度层负责决定"何时"以及"如何"执行那些被触发的副作用。它不是简单地立即执行所有被触发的 effect，而是进行排队、去重、排序，然后在合适的时机批量执行。scheduler、queueJob、nextTick 等机制属于这一层。这一层解决的问题是"如何高效地响应变化"。

这三层协同工作，形成了一个完整的响应式循环：用户修改数据 → 数据层拦截修改 → 追踪层找出依赖者 → 调度层安排执行 → 副作用执行并可能再次读取数据 → 追踪层更新依赖。

## 核心数据流

让我们用一个具体的例子来追踪数据流。假设有这样的代码：

```javascript
const state = reactive({ count: 0 })
const doubled = computed(() => state.count * 2)

watchEffect(() => {
  console.log(`Count: ${state.count}, Doubled: ${doubled.value}`)
})

state.count = 1
```

当 `state.count = 1` 执行时，会发生什么？

首先，Proxy 的 set 拦截器被触发。它检查新值是否和旧值不同（1 !== 0，确实不同），然后调用 Reflect.set 设置新值，最后调用 trigger。

trigger 函数根据 targetMap 找到 state 对象的依赖映射，再根据 'count' 这个 key 找到依赖这个属性的所有 effect。在我们的例子中，有两个：computed 内部的 effect 和 watchEffect 创建的 effect。

但这些 effect 不会立即执行。调度器会把它们加入队列。computed 有特殊的调度策略——它只是被标记为"脏"，不会立即重新计算。watchEffect 的 effect 会被加入异步队列。

当同步代码执行完毕，微任务队列开始执行时，调度器处理 effect 队列。watchEffect 的 effect 执行，它读取 `state.count`（触发 track）和 `doubled.value`。

读取 `doubled.value` 时，computed 发现自己是"脏"的，于是重新执行 getter（`state.count * 2`），这个过程中读取 `state.count` 触发 track，更新 computed 的依赖。计算结果被缓存，computed 标记为"干净"。

最终，console.log 输出 "Count: 1, Doubled: 2"。

## 依赖图的结构

响应式系统维护的依赖关系形成一个有向图。节点是响应式属性和 effect，边表示"依赖"关系。

在我们的例子中，依赖图大致如下：watchEffect 的 effect 依赖 `state.count` 和 `doubled.value`。computed 内部的 effect 依赖 `state.count`。computed 作为一个 ref，当它重新计算时会触发依赖它的 effect。

这个图是动态的。每次 effect 重新执行，它的依赖可能会变化（因为条件分支可能导致访问不同的属性）。Vue3 采用"先清除旧依赖，再收集新依赖"的策略来保持依赖关系的准确性。

依赖图可能形成链式结构。A 依赖 B，B 依赖 C，修改 C 会依次触发 B 和 A。调度器需要正确处理这种传递性更新，确保更新顺序正确且没有冗余执行。

## 各模块职责

让我们梳理一下各个核心模块的职责：

`reactive.ts` 负责创建响应式对象。它维护原始对象到 Proxy 的映射（reactiveMap、readonlyMap 等），确保同一个对象只创建一个 Proxy。它定义了如何处理不同类型的对象（普通对象、数组、Map、Set 等）。

`ref.ts` 负责创建 ref。ref 用一个包装对象来持有值，通过 getter/setter 实现 value 属性的响应式。它也处理 toRef、toRefs 等转换函数。

`effect.ts` 负责副作用的管理。ReactiveEffect 类是 effect 的载体，它记录自己的依赖、调度器、作用域等信息。track 和 trigger 函数也在这个模块。

`computed.ts` 负责计算属性。它创建一个带有特殊调度策略的 effect，配合脏检查和缓存机制实现惰性计算。

`watch.ts` 负责 watch 和 watchEffect。它们是对 effect 的封装，添加了深度遍历、回调处理、清理函数等高级功能。

`effectScope.ts` 负责作用域管理。EffectScope 可以收集多个 effect，并在需要时统一停止它们，避免内存泄漏。

`baseHandlers.ts` 和 `collectionHandlers.ts` 定义了 Proxy 的拦截器。前者处理普通对象和数组，后者处理 Map、Set 等集合类型。

## 与渲染系统的集成

在 Vue 组件中使用时，响应式系统和渲染系统紧密配合。

每个组件实例有一个渲染 effect。这个 effect 的 fn 是组件的渲染函数（或编译后的 template）。当响应式数据变化时，渲染 effect 被触发，组件重新渲染。

渲染 effect 使用了调度器来实现批量更新。多个状态变化在同一个事件循环中只会触发一次渲染。这是通过 queueJob 机制实现的——渲染 effect 被加入队列而不是立即执行，队列在 nextTick 时清空。

setup 函数中创建的 computed、watch、watchEffect 等会被自动收集到组件的 effectScope 中。当组件卸载时，effectScope.stop() 会停止所有这些 effect，避免内存泄漏。

模板编译器会进行静态分析，标记那些永远不会变化的节点，这些节点在更新时会被跳过。这是对响应式更新的进一步优化。

## 模块间的协作

理解模块间如何协作，可以帮助我们更好地理解系统的整体设计。

当调用 `reactive(obj)` 时，reactive 模块检查 obj 是否已经有对应的 Proxy（从 reactiveMap 查找）。如果没有，创建一个新的 Proxy，使用 baseHandlers 中定义的拦截器。如果 obj 是 Map 或 Set，使用 collectionHandlers 中的拦截器。

当访问 `proxyObj.foo` 时，Proxy 的 get 拦截器被调用。如果当前有活跃的 effect（由 effect 模块的 activeEffect 变量追踪），get 拦截器调用 track 函数，将 (target, 'foo') 和当前 effect 关联起来。

当调用 `effect(fn)` 时，effect 模块创建一个 ReactiveEffect 实例，将其设为 activeEffect，然后执行 fn。fn 执行过程中访问的所有响应式属性都会被 track。执行完毕后，activeEffect 恢复为之前的值（支持嵌套 effect）。

当修改 `proxyObj.foo = newValue` 时，Proxy 的 set 拦截器被调用。它先用 Reflect.set 设置新值，然后调用 trigger 函数。trigger 从 targetMap 找出所有依赖这个属性的 effect，调用它们的 scheduler（如果有）或直接调用 run 方法。

computed 创建的 effect 有一个特殊的 scheduler。当依赖变化时，scheduler 不会重新执行 getter，只是标记 dirty = true。只有当 computed.value 被读取时，才检查 dirty 标记，决定是否重新计算。

watchEffect 创建的 effect 通常使用 queueJob 作为 scheduler。这意味着 effect 不会立即执行，而是被加入一个队列。队列会在下一个微任务（nextTick）时被处理。

## 核心设计决策

回顾整个架构，有几个核心的设计决策值得注意。

采用 Proxy 而非 getter/setter，获得了更全面的拦截能力（新增属性、删除属性、数组索引等），但放弃了对 IE11 的支持。这在 Vue3 的目标用户群体中是可接受的权衡。

采用细粒度依赖追踪，每个属性独立追踪依赖，而不是整个对象级别。这提高了更新效率，但增加了实现复杂度和内存占用。

采用惰性依赖收集，只有被访问的属性才会被追踪。这减少了不必要的开销，但意味着条件分支中的依赖可能不完整（直到那个分支被执行）。

采用同步追踪 + 异步更新，依赖在同步代码中立即收集，但 effect 的执行被推迟到微任务。这提供了批量更新的机会，提高了性能。

采用双向清理机制，effect 记录它依赖哪些属性，属性也记录被哪些 effect 依赖。这使得清理无效依赖和停止 effect 都变得高效。

## 学习路径建议

从这个架构全景出发，进入源码学习可以有不同的路径。

如果想了解"数据如何变成响应式的"，可以从 reactive.ts 和 baseHandlers.ts 入手，看 Proxy 是如何创建和配置的。

如果想了解"依赖是如何追踪的"，可以聚焦 effect.ts 中的 track 和 trigger 函数，理解 targetMap 数据结构。

如果想了解"更新是如何调度的"，可以研究 scheduler 的使用方式，以及 runtime-core 中的 queueJob 和 nextTick。

如果想了解"computed 为什么是惰性的"，computed.ts 中的脏检查和缓存机制是关键。

如果想了解"watch 如何实现深度监听"，watch.ts 中的 traverse 函数值得研究。

## 小结

Vue3 响应式系统是一个精心设计的架构，分为数据层、追踪层和调度层三个层次。各模块职责清晰、协作紧密，共同实现了自动依赖追踪、细粒度更新、批量调度等特性。

理解这个架构，不仅有助于我们更好地使用 Vue3，也为阅读源码提供了指导。在接下来的第二部分中，我们将深入源码，逐行分析这些设计是如何实现的。

这一章标志着"设计思想"部分的结束。我们从响应式编程的基本概念出发，探索了 Vue 响应式系统的演进、核心概念、数据结构、调度机制、各种 API 的设计，讨论了边界、限制和权衡，最后形成了这个架构全景。带着这些理解，我们将进入源码的世界。

