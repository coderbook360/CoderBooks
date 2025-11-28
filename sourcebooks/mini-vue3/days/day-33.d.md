# Day 33: 紧箍咒 - EffectScope 的概念与设计

你好，我是你的技术导师。

在 Vue 3 中，有一个相对低调但极其重要的 API，叫做 `effectScope`。
普通开发者可能很少直接用到它，但它却是 Vue 组件卸载时能够自动清理副作用的幕后功臣。

## 1. 为什么需要 EffectScope？

想象一下，你在一个组件的 `setup` 中创建了 10 个 `computed`，5 个 `watch`，还有 3 个 `effect`。
当这个组件被销毁（Unmount）时，我们需要手动停止这 18 个副作用，否则它们会一直占用内存，甚至在数据变化时报错。

如果没有 `effectScope`，你需要这样写：

```javascript
const runner1 = effect(() => ...)
const runner2 = effect(() => ...)
const stopWatch = watch(() => ...)

// 组件卸载时
onUnmounted(() => {
  stop(runner1)
  stop(runner2)
  stopWatch()
  // ... 手动停止所有 18 个
})
```

这简直是噩梦。
我们需要一个"容器"，能把这段时间内创建的所有副作用都收集起来。
当容器销毁时，一键停止容器内的所有副作用。

这就是 `EffectScope`。

## 2. EffectScope 的设计

`EffectScope` 的核心思想非常简单：
1.  有一个全局变量 `activeEffectScope`，指向当前正在激活的作用域。
2.  当 `new EffectScope().run(() => { ... })` 执行时，把自己设为 `activeEffectScope`。
3.  在这个回调函数里创建的 `effect`（包括 `computed`, `watch`），检测到有 `activeEffectScope`，就把自己添加到它的 `effects` 数组里。
4.  当调用 `scope.stop()` 时，遍历 `effects` 数组，依次停止它们。

## 3. 初步实现

虽然完整的 `EffectScope`（支持嵌套、分离模式等）比较复杂，但我们可以先实现一个核心版本。

在 `src/reactivity/effect.ts` 中：

```typescript
let activeEffectScope

export class EffectScope {
  private effects = []

  run(fn) {
    activeEffectScope = this
    const res = fn()
    activeEffectScope = undefined
    return res
  }

  stop() {
    this.effects.forEach(effect => effect.stop())
  }
  
  // 提供给 effect 调用的收集方法
  add(effect) {
    this.effects.push(effect)
  }
}
```

然后，我们需要修改 `ReactiveEffect` 的构造函数（或者 `effect` 函数），让它主动"投靠"组织。

```typescript
// src/reactivity/effect.ts

export class ReactiveEffect {
  constructor(fn, scheduler) {
    // ...
    // 如果当前有活跃的作用域，就把自己加进去
    if (activeEffectScope) {
      activeEffectScope.add(this)
    }
  }
}
```

## 4. 使用演示

```javascript
const scope = new EffectScope()

scope.run(() => {
  const counter = ref(0)
  
  // 这个 effect 会被自动收集到 scope 中
  effect(() => console.log(counter.value))
  
  // 这个 computed 也会（因为它内部也是 effect）
  const doubled = computed(() => counter.value * 2)
})

// 停止作用域
scope.stop()
// 此时，上面的 effect 和 computed 都停止了，不再响应数据变化
```

## 5. 总结

`EffectScope` 是 Vue 3 资源管理的关键机制。
它体现了**生命周期管理**的思想。
在 Vue 组件的初始化过程中，Vue 会为每个组件实例创建一个 `EffectScope`。
所以在 `setup()` 中定义的响应式副作用，都会自动归属到这个组件的作用域下。
当组件卸载时，Vue 只需要调用 `component.scope.stop()`，一切就都干干净净了。

明天，我们将编写一套完整的集成测试，把我们这四周实现的所有功能串起来溜一溜。
