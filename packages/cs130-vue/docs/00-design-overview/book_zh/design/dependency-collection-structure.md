# 依赖收集的数据结构设计

Vue3 响应式系统使用精心设计的数据结构来存储依赖关系。这套设计在性能和内存使用之间取得了良好的平衡。

## 三层结构设计

Vue3 使用 WeakMap → Map → Set 的三层结构：

```javascript
// 第一层：WeakMap，存储对象到其依赖映射的关系
const targetMap = new WeakMap<object, Map<string | symbol, Set<ReactiveEffect>>>()

// 使用示例
targetMap.set(target, depsMap)  // 对象 -> 属性依赖映射
depsMap.set(key, dep)           // 属性名 -> effect 集合
dep.add(activeEffect)           // effect 集合
```

这种分层设计让依赖查找变得高效。给定一个对象和属性名，可以在 O(1) 时间内找到所有依赖该属性的 effect。

## 为什么使用 WeakMap

第一层使用 WeakMap 而不是普通 Map，是为了防止内存泄漏。

WeakMap 的 key 是弱引用。当一个对象不再被应用代码引用时，它可以被垃圾回收器回收，同时 WeakMap 中对应的条目也会自动消失。

```javascript
let obj = reactive({ count: 0 })
effect(() => console.log(obj.count))

// 假设之后 obj 不再被使用
obj = null

// 使用 WeakMap，原对象可以被垃圾回收
// 对应的依赖记录也会自动清理
```

如果使用普通 Map，即使应用代码不再引用某个对象，它仍然被 Map 的 key 引用，无法被回收。这在长时间运行的应用中会导致内存持续增长。

## 为什么使用 Set

最内层使用 Set 存储 effect，有两个原因。

首先是自动去重。同一个 effect 可能在执行过程中多次访问同一个属性，使用 Set 可以自动去重，避免重复触发。

```javascript
effect(() => {
  // 两次访问 count，但只应该收集一次依赖
  console.log(state.count + state.count)
})
```

其次是快速查找。Set 的 has、add、delete 操作都是 O(1) 复杂度，在依赖清理时非常高效。

## 依赖清理机制

Vue3 引入了依赖清理机制，解决了 Vue2 中的一个潜在问题。

考虑这样的场景：

```javascript
const state = reactive({ flag: true, a: 1, b: 2 })

effect(() => {
  if (state.flag) {
    console.log(state.a)
  } else {
    console.log(state.b)
  }
})
```

当 flag 为 true 时，effect 依赖 flag 和 a。当 flag 变为 false 后，effect 应该只依赖 flag 和 b，不再依赖 a。

Vue3 在每次 effect 执行前，会先清理它之前收集的所有依赖，然后在执行过程中重新收集。这确保了依赖关系始终是最新的。

```javascript
class ReactiveEffect {
  deps: Set<ReactiveEffect>[] = []  // 记录自己被哪些 dep 收集

  run() {
    // 清理旧依赖
    cleanupEffect(this)
    // 设置为当前活跃 effect
    activeEffect = this
    // 执行副作用函数，过程中收集新依赖
    return this.fn()
  }
}

function cleanupEffect(effect: ReactiveEffect) {
  for (const dep of effect.deps) {
    dep.delete(effect)  // 从每个 dep 中移除自己
  }
  effect.deps.length = 0
}
```

这个机制增加了一些运行时开销，但保证了依赖关系的正确性，避免了不必要的更新。

## 性能特点

这套数据结构的性能特点是：

依赖收集（track）：O(1) - 查找 dep 并添加 effect
触发更新（trigger）：O(n) - 遍历 dep 中的所有 effect，n 是依赖数量
依赖清理：O(m) - 遍历 effect 的所有 deps，m 是 effect 依赖的属性数量

在实际应用中，n 和 m 通常都很小（一个属性被少数几个组件依赖，一个组件依赖少数几个属性），所以整体性能表现很好。

这种设计是 Vue3 响应式系统高性能的基础之一。
