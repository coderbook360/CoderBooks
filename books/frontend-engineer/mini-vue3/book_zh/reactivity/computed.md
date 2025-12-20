# computed 的实现：惰性求值与缓存机制

假设有一个派生值 `fullName = firstName + lastName`，每次访问都要重新计算吗？依赖变化时如何自动更新？

这就是 `computed` 要解决的问题。

## 首先要问的问题

**先思考一下**：computed 和普通函数有什么区别？

```javascript
// 普通函数
function getFullName() {
  return firstName.value + ' ' + lastName.value
}

// computed
const fullName = computed(() => {
  return firstName.value + ' ' + lastName.value
})
```

看起来差不多，但 computed 有几个特殊的行为：

1. **惰性求值**：不访问就不计算
2. **缓存**：多次访问只计算一次
3. **自动更新**：依赖变化后，下次访问会重新计算

**这三个特性是怎么实现的？** 让我们一步步来。

## computed 的核心特性

先用代码展示这三个特性：

```javascript
const firstName = ref('John')
const lastName = ref('Doe')

const fullName = computed(() => {
  console.log('computing...')  // 用来观察计算次数
  return firstName.value + ' ' + lastName.value
})
```

**特性一：惰性求值**

```javascript
// 此时 'computing...' 还没打印！
// computed 不会立即执行

console.log(fullName.value)
// 现在才打印 'computing...'，输出 'John Doe'
```

**有没有发现这个行为？** 只有真正访问 `.value` 时才会计算，不访问就不计算。这就是"惰性"的含义——懒得动，需要时才动。

**特性二：缓存**

```javascript
console.log(fullName.value)  // 直接返回缓存，没有打印 'computing...'
console.log(fullName.value)  // 还是缓存，没有打印
console.log(fullName.value)  // 依然是缓存
```

**多次访问，只计算一次！** 这就是缓存的威力。

**特性三：依赖变化时更新**

```javascript
firstName.value = 'Jane'  // 修改依赖

console.log(fullName.value)
// 打印 'computing...'，输出 'Jane Doe'
```

**依赖变了，再次访问时才重新计算。** 不是立即计算，而是"标记为需要重算"——这个设计非常聪明，我们马上就会看到它是怎么实现的。

## 从简单到完善

理解了目标，让我们一步步实现。这是典型的"迭代式开发"——先做最简单的版本，然后逐步发现问题、解决问题。

### 版本一：最简版本（无缓存）

```javascript
function computed(getter) {
  return {
    get value() {
      return getter()  // 每次都计算
    }
  }
}
```

这个版本没有缓存，每次访问都重新计算。**不满足需求。**

### 版本二：添加缓存

**怎么实现缓存？** 引入一个 `dirty` 标记：

```javascript
function computed(getter) {
  let value       // 缓存的值
  let dirty = true  // 是否需要重新计算（true = 脏了，需要重算）
  
  return {
    get value() {
      if (dirty) {
        value = getter()  // 计算
        dirty = false     // 标记为干净
      }
      return value  // 返回缓存
    }
  }
}
```

**`dirty` 这个命名很形象**——你可以把它理解为"这个值是不是过期了"。过期了就需要重新计算，没过期就直接用缓存。

现在有缓存了，**但问题是**：依赖变化后，`dirty` 不会自动变回 `true`。我们需要某种机制在依赖变化时"弄脏"缓存。

### 版本三：响应依赖变化

**这里就用到了之前实现的 effect 和 scheduler**：

```javascript
function computed(getter) {
  let value
  let dirty = true
  
  // 用 effect 追踪依赖
  const effectFn = effect(getter, {
    lazy: true,  // 新增：不立即执行
    scheduler() {
      // 新增：依赖变化时，不执行 getter，而是标记为脏
      if (!dirty) {
        dirty = true
      }
    }
  })
  
  return {
    get value() {
      if (dirty) {
        value = effectFn()  // 执行 effect 获取新值
        dirty = false
      }
      return value
    }
  }
}
```

**这里有两个关键点，务必理解**：

- `lazy: true`：effect 创建时不立即执行——实现惰性求值
- `scheduler`：依赖变化时不直接执行 getter，而是标记 `dirty = true`——实现"延迟重算"

**有没有感觉到设计的巧妙？** scheduler 把"执行时机"的控制权交给了使用者。computed 说"我来决定什么时候执行"，effect 说"好的，数据变了我只通知你，不自作主张"。

## lazy effect

需要修改 effect 支持 lazy 选项：

```javascript
function effect(fn, options = {}) {
  const effectFn = () => {
    cleanup(effectFn)
    
    effectStack.push(effectFn)
    activeEffect = effectFn
    
    const res = fn()  // 执行并保存返回值
    
    effectStack.pop()
    activeEffect = effectStack[effectStack.length - 1]
    
    return res  // 新增：返回执行结果
  }
  
  effectFn.deps = []
  effectFn.options = options
  
  // 新增：lazy 时不立即执行
  if (!options.lazy) {
    effectFn()
  }
  
  return effectFn  // 返回 effect 函数，可以手动调用
}
```

## scheduler 调度器

**还需要修改 trigger 支持调度器**：

```javascript
function trigger(target, key) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return
  
  const deps = depsMap.get(key)
  if (!deps) return
  
  const effectsToRun = new Set()
  deps.forEach(effect => {
    if (effect !== activeEffect) {
      effectsToRun.add(effect)
    }
  })
  
  effectsToRun.forEach(effect => {
    // 新增：如果有调度器，调用调度器
    if (effect.options?.scheduler) {
      effect.options.scheduler(effect)
    } else {
      // 否则直接执行
      effect()
    }
  })
}
```

**思考一下调度器的作用**：它让我们可以"拦截"effect 的执行，不是立即执行 getter，而是做其他事情（比如标记 dirty）。这是一个非常灵活的扩展点。

## computed 也能被追踪

**现在要问一个重要问题**：如果 effect 里面用到了 computed，computed 变化时应该触发 effect 吗？

```javascript
const doubled = computed(() => count.value * 2)

effect(() => {
  console.log(doubled.value)  // 这里应该建立依赖！
})

count.value++  // 应该触发上面的 effect
```

答案是：**应该！computed 也需要能被追踪。**

**这就需要 computed 在被访问时收集依赖，在值变化时触发更新**：

```javascript
// 版本四：支持被其他 effect 追踪
function computed(getter) {
  let value
  let dirty = true
  
  const effectFn = effect(getter, {
    lazy: true,
    scheduler() {
      if (!dirty) {
        dirty = true
        // 新增：通知依赖于 computed 的 effect
        trigger(obj, 'value')
      }
    }
  })
  
  const obj = {
    get value() {
      if (dirty) {
        value = effectFn()
        dirty = false
      }
      // 新增：computed 被读取时也要收集依赖
      track(obj, 'value')
      return value
    }
  }
  
  return obj
}
```

**这样，computed 就形成了一个链条**：

```
count 变化 → 触发 computed 的 scheduler → dirty = true，触发依赖于 computed 的 effect
                                                ↓
                                    effect 执行，访问 computed.value
                                                ↓
                                    dirty = true，重新计算 computed
```

## ComputedRefImpl 类

Vue 3 用类来实现 computed，结构更清晰：

```javascript
class ComputedRefImpl {
  constructor(getter) {
    this._dirty = true        // 是否需要重新计算
    this._value = undefined   // 缓存的值
    this.dep = new Set()      // 依赖于此 computed 的 effect
    this.__v_isRef = true     // 标记为 ref（computed 也是一种 ref）
    
    // 创建 effect，传入调度器
    this.effect = new ReactiveEffect(getter, () => {
      // scheduler：依赖变化时标记为脏，并触发依赖
      if (!this._dirty) {
        this._dirty = true
        triggerRefValue(this)
      }
    })
  }
  
  get value() {
    // 收集依赖（谁在读取这个 computed）
    trackRefValue(this)
    
    // 如果脏了，重新计算
    if (this._dirty) {
      this._dirty = false
      this._value = this.effect.run()
    }
    
    return this._value
  }
}

function computed(getter) {
  return new ComputedRefImpl(getter)
}
```

**注意 `__v_isRef = true`**——这意味着 computed 也是一种 ref！所以你可以在需要 ref 的地方使用 computed。

## 可写 computed

**你可能会问**：computed 能不能写入？

默认情况下 computed 是只读的，但也可以支持写入：

```javascript
const count = ref(0)

const doubled = computed({
  get: () => count.value * 2,
  set: (val) => {
    count.value = val / 2  // 反向推导
  }
})

doubled.value = 10
console.log(count.value)  // 5
```

**这种"双向 computed"在表单处理中很有用**，比如把"分"转换成"元"。

实现：

```javascript
class ComputedRefImpl {
  constructor(getter, setter) {
    this._getter = getter
    this._setter = setter
    // ... 其他逻辑
  }
  
  get value() {
    // 同上
  }
  
  // 新增：set 访问器
  set value(newValue) {
    if (this._setter) {
      this._setter(newValue)
    }
  }
}

function computed(getterOrOptions) {
  let getter, setter
  
  // 判断传入的是函数还是对象
  if (typeof getterOrOptions === 'function') {
    getter = getterOrOptions
  } else {
    getter = getterOrOptions.get
    setter = getterOrOptions.set
  }
  
  return new ComputedRefImpl(getter, setter)
}
```

## computed 嵌套

**一个有趣的问题**：computed 可以依赖另一个 computed 吗？

```javascript
const a = ref(1)
const b = computed(() => a.value * 2)
const c = computed(() => b.value + 1)

console.log(c.value)  // 3

a.value = 2
// a 变化 → b 变脏 → c 变脏
console.log(c.value)  // 5
```

**这自然就能工作！** 原因是：

- c 的 effect 依赖 b.value
- b 的 effect 依赖 a.value
- a 变化 → 触发 b 的 scheduler → b 变脏并触发 c 的依赖
- c 变脏 → 下次访问 c.value 时重新计算

**整个链条是自动建立的，不需要额外处理。** 这就是响应式系统的优雅之处。

## 完整实现

```javascript
class ComputedRefImpl {
  constructor(getter, setter) {
    this._dirty = true
    this._value = undefined
    this._setter = setter
    this.__v_isRef = true
    this.dep = new Set()
    
    this.effect = new ReactiveEffect(getter, () => {
      // scheduler：依赖变化时标记为脏，并通知依赖者
      if (!this._dirty) {
        this._dirty = true
        triggerRefValue(this)
      }
    })
  }
  
  get value() {
    // 收集依赖
    trackRefValue(this)
    
    // 如果脏了，重新计算
    if (this._dirty) {
      this._dirty = false
      this._value = this.effect.run()
    }
    
    return this._value
  }
  
  set value(newValue) {
    if (this._setter) {
      this._setter(newValue)
    } else if (__DEV__) {
      console.warn('Computed property was assigned to but it has no setter.')
    }
  }
}

function computed(getterOrOptions) {
  let getter, setter
  
  const onlyGetter = typeof getterOrOptions === 'function'
  if (onlyGetter) {
    getter = getterOrOptions
  } else {
    getter = getterOrOptions.get
    setter = getterOrOptions.set
  }
  
  return new ComputedRefImpl(getter, setter)
}
```

## 本章小结

这一章我们实现了 computed，它是一种**特殊的 ref**，具有：

- **惰性求值**：不访问就不计算——避免不必要的计算
- **缓存机制**：依赖不变时直接返回缓存——大幅提升性能
- **自动追踪**：依赖变化时标记为"脏"——延迟重算
- **可被追踪**：其他 effect 可以依赖 computed——形成响应链

**核心实现依赖于两个机制**：

- **lazy effect**：创建时不立即执行
- **scheduler**：自定义依赖变化时的行为（标记 dirty 而不是立即执行）

**computed 的精妙之处在于**：它把"惰性求值"和"响应式追踪"完美结合。既能缓存避免重复计算，又能在依赖变化时自动更新。

下一章我们实现 `watch`——观察响应式数据变化并执行回调。

---

## 练习与思考

1. 实现 computed 的 debug 选项：

```javascript
const doubled = computed(() => count.value * 2, {
  onTrack(e) { console.log('tracked:', e) },
  onTrigger(e) { console.log('triggered:', e) }
})
```

2. **思考这个问题**：computed 的缓存什么时候会成为问题？有没有场景需要禁用缓存？

3. 如果 computed 的 getter 抛出异常，dirty 应该怎么处理？尝试测试 Vue 3 的实际行为。