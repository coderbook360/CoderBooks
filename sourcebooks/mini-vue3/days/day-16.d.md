# Day 16: computed 的惰性计算和缓存机制

你好，我是你的技术导师。

昨天，我们实现了 `computed` 的基础功能。
今天，我们要深入挖掘它的灵魂 —— **惰性（Laziness）**。

在编程世界里，"懒"往往是一个褒义词。
懒加载、懒求值、懒初始化... 所有的"懒"，都是为了性能。

`computed` 就是一个极致的"懒人"。

## 1. 什么是惰性计算？

想象一下，你有一个非常耗时的计算任务：

```javascript
function heavyTask() {
  console.log('开始繁重的计算...')
  // 假设这里耗时 1 秒
  return Math.random()
}
```

如果你直接调用它，它会立即执行。
但如果你把它包装成 `computed`：

```javascript
const result = computed(heavyTask)
console.log('computed 创建完毕')
```

你会发现，控制台什么都没打印。
这就是**惰性**：你不问，它不算。

只有当你真正访问 `result.value` 时，它才会慢吞吞地开始计算。

## 2. 缓存的艺术：Dirty Flag

除了懒，`computed` 还很"抠门"。
算过一次的结果，它会像宝贝一样存起来，绝不轻易重算。

它是怎么做到的？全靠一个布尔值：`_dirty`。

### 2.1 生命周期的演变

让我们跟踪一下 `_dirty` 的一生：

1.  **出生（Init）**：`_dirty = true`。
    -   刚生下来，还没算过，当然是脏的。

2.  **初次访问（First Access）**：
    -   发现是脏的 (`true`)。
    -   执行计算 (`run()`)。
    -   洗澡，变干净 (`_dirty = false`)。
    -   返回结果。

3.  **再次访问（Second Access）**：
    -   发现是干净的 (`false`)。
    -   直接把口袋里的缓存拿给你。
    -   **完全不执行计算逻辑**。

4.  **依赖变化（Dependency Change）**：
    -   依赖的响应式数据变了。
    -   触发 `scheduler`。
    -   把自己弄脏 (`_dirty = true`)。
    -   **注意：此时依然不计算！**

5.  **再次访问（Access After Change）**：
    -   发现又是脏的 (`true`)。
    -   重新计算。
    -   变干净 (`_dirty = false`)。

### 2.2 代码实现的精髓

```typescript
class ComputedRefImpl {
  constructor(getter) {
    this._effect = new ReactiveEffect(getter, () => {
      // 调度器：只有依赖变了才会执行这里
      if (!this._dirty) {
        this._dirty = true
        // 通知别人：我变脏了，你们看着办
        trigger(this, 'value')
      }
    })
  }

  get value() {
    // 收集依赖：谁在用我？
    track(this, 'value')
    
    if (this._dirty) {
      // 只有脏的时候才干活
      this._dirty = false
      this._value = this._effect.run()
    }
    
    return this._value
  }
}
```

## 3. 嵌套计算：连锁反应

`computed` 最强大的地方在于它可以嵌套。

```javascript
const count = ref(1)
const double = computed(() => count.value * 2)
const quadruple = computed(() => double.value * 2)
```

当 `count` 变化时，会发生什么？

1.  `count` 通知 `double` 的 effect：你脏了。
2.  `double` 的 scheduler 执行：
    -   把自己标记为脏。
    -   通知 `quadruple` 的 effect：我也脏了（虽然我还没算，但我知道我肯定变了）。
3.  `quadruple` 的 scheduler 执行：
    -   把自己标记为脏。

注意，在这个过程中，**没有发生任何计算**。
只是脏标记在传递。

直到你访问 `quadruple.value`：
1.  `quadruple` 发现自己脏了，执行计算。
2.  计算需要 `double.value`。
3.  `double` 发现自己也脏了，执行计算。
4.  计算需要 `count.value`。
5.  拿到 `count`，算出 `double`，算出 `quadruple`。

这就是**响应式链路**的魅力。

## 4. 总结

今天我们深入剖析了 `computed` 的惰性机制。

1.  **懒加载**：通过 `lazy` 选项，推迟了 effect 的执行。
2.  **缓存**：通过 `_dirty` 标记，避免了不必要的重复计算。
3.  **调度**：通过 `scheduler`，实现了依赖变化时的状态重置。

`computed` 是 Vue 性能优化的基石。理解了它，你就理解了 Vue "高效" 的秘密。

明天，我们将进入响应式系统的最后一个模块 —— **Ref**。
虽然我们一直在用它，但它的内部实现还有很多有趣的细节等待我们去挖掘。

明天见！
