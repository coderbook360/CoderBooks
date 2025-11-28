# Day 23: ref 的实现原理 - 给基本类型穿上"马甲"

你好，我是你的技术导师。

在前面的章节中，我们通过 `Proxy` 实现了强大的 `reactive`，它可以拦截对象的所有操作。
但是，你有没有发现一个问题？`Proxy` 只能代理对象。
如果我们想让一个数字 `0`，或者一个字符串 `"Hello"` 变成响应式的，该怎么办？

```javascript
const count = reactive(0) // ❌ 报错或无效，Proxy 无法代理基本类型
```

这就引出了今天的主角 —— `ref`。

## 1. 为什么需要 ref？

### 1.1 reactive 的软肋
JavaScript 的基本类型（Number, String, Boolean, Symbol, null, undefined）是按值传递的，不是引用传递。
这意味着我们无法直接拦截对它们的读写操作。

### 1.2 解决方案：对象包裹
既然基本类型无法拦截，那我们就把它包裹在一个对象里。
只要我们访问这个对象的属性（比如 `.value`），我们就能拦截到了。

这就是 `ref` 的本质：**Reference（引用）**。
它把一个基本类型的值，变成了一个对象引用。

## 2. 实现 RefImpl

我们不使用 `Proxy`，而是使用 ES6 的 `class` 和访问器属性（getter/setter）来实现。
因为我们只需要拦截 `.value` 这一个属性。

### 2.1 基础结构

在 `src/reactivity/ref.ts` 中（如果没有这个文件请创建）：

```typescript
import { track, trigger } from './effect'
import { reactive } from './reactive'
import { hasChanged, isObject } from '../shared'

class RefImpl {
  private _value: any
  public dep: Set<any>
  public __v_isRef = true // 标记这是一个 ref 对象

  constructor(value) {
    // 如果传入的是对象，需要用 reactive 包裹
    // 如果是基本类型，直接使用
    this._value = isObject(value) ? reactive(value) : value
    this.dep = new Set()
  }

  get value() {
    // 收集依赖
    track(this, 'value') // 注意：这里我们复用了 track，但 target 是 ref 实例本身
    return this._value
  }

  set value(newVal) {
    // 只有值发生改变才触发
    if (hasChanged(newVal, this._value)) {
      this._value = newVal
      // 触发依赖
      trigger(this, 'value')
    }
  }
}

export function ref(value) {
  return new RefImpl(value)
}
```

**注意**：
上面的代码中，`track` 和 `trigger` 的调用方式可能需要根据你之前的 `effect.ts` 实现稍作调整。
在 Vue 3 源码中，`ref` 的依赖收集是独立的（因为它不是 Proxy），但为了简化，我们可以复用现有的 `track/trigger` 系统，只要保证 `target` 是唯一的即可。
或者，更标准的做法是，`RefImpl` 内部维护自己的 `dep`，直接调用 `trackEffects` 和 `triggerEffects`（如果你之前拆分了这两个函数）。

为了保持教程的连贯性，假设我们之前的 `track` 接收 `(target, key)`。
这里我们将 `ref` 实例本身作为 `target`，`'value'` 作为 `key`。

### 2.2 处理对象类型

你可能会问：`ref` 可以接收对象吗？
答案是肯定的。
如果 `ref` 接收一个对象，它内部会自动调用 `reactive`。

```javascript
const state = ref({ count: 1 })
// state.value 是一个 Proxy
state.value.count++ 
```

我们在构造函数中已经处理了：
`this._value = isObject(value) ? reactive(value) : value`

但是，在 `set value` 中也需要处理：

```typescript
  set value(newVal) {
    if (hasChanged(newVal, this._value)) {
      // 如果新值是对象，也需要转换
      this._value = isObject(newVal) ? reactive(newVal) : newVal
      trigger(this, 'value')
    }
  }
```

*修正：比较 `hasChanged` 时，应该拿新值和旧值的原始值（raw value）比较，还是和代理后的值比较？*
Vue 3 的做法是保存一份 `_rawValue` 用于比较和后续的赋值（如果新值也是 ref 等情况）。
为了简化，我们先只比较当前存储的值。

## 3. 完善 RefImpl

让我们把代码写得更完整一点。

```typescript
// src/reactivity/ref.ts

import { trackEffects, triggerEffects, isTracking, activeEffect } from './effect'
import { reactive } from './reactive'
import { hasChanged, isObject } from '../shared'

class RefImpl {
  private _value: any
  private _rawValue: any
  public dep
  public __v_isRef = true

  constructor(value) {
    this._rawValue = value
    // 如果是对象，_value 存 Proxy，_rawValue 存原始对象
    this._value = convert(value)
    this.dep = new Set()
  }

  get value() {
    // 收集依赖
    trackRefValue(this)
    return this._value
  }

  set value(newVal) {
    // 比较原始值
    if (hasChanged(newVal, this._rawValue)) {
      this._rawValue = newVal
      this._value = convert(newVal)
      triggerRefValue(this)
    }
  }
}

function convert(value) {
  return isObject(value) ? reactive(value) : value
}

function trackRefValue(ref) {
  if (isTracking()) {
    trackEffects(ref.dep)
  }
}

function triggerRefValue(ref) {
  triggerEffects(ref.dep)
}

export function ref(value) {
  return new RefImpl(value)
}

export function isRef(ref) {
  return !!(ref && ref.__v_isRef)
}

export function unref(ref) {
  return isRef(ref) ? ref.value : ref
}
```

**关键点解析**：
1.  **`_rawValue`**：我们需要保存原始值。因为如果 `_value` 变成了 Proxy，直接拿新来的 `newVal`（普通对象）和 `Proxy` 比较可能会有问题（虽然 Proxy 也可以比较，但为了严谨）。
2.  **`trackEffects` / `triggerEffects`**：这是我们在 `effect.ts` 中应该抽离出来的底层函数。它们只负责操作 `dep` 集合，不关心 `targetMap`。
    -   如果你之前的 `effect.ts` 没有导出这两个函数，你需要去修改一下 `effect.ts`，把依赖收集和触发的核心逻辑抽离出来。

### 补充：修改 effect.ts (如果需要)

```typescript
// src/reactivity/effect.ts

// ... existing code ...

export function trackEffects(dep) {
  if (activeEffect) {
    dep.add(activeEffect)
    activeEffect.deps.push(dep)
  }
}

export function triggerEffects(dep) {
  for (const effect of dep) {
    if (effect.scheduler) {
      effect.scheduler()
    } else {
      effect.run()
    }
  }
}
```

## 4. 实现 shallowRef

`shallowRef` 很简单，它不进行深层响应式转换。也就是说，如果传入对象，它不会调用 `reactive`。

```typescript
class ShallowRefImpl {
  private _value: any
  public dep
  public __v_isRef = true

  constructor(value) {
    this._value = value
    this.dep = new Set()
  }

  get value() {
    trackRefValue(this)
    return this._value
  }

  set value(newVal) {
    if (hasChanged(newVal, this._value)) {
      this._value = newVal
      triggerRefValue(this)
    }
  }
}

export function shallowRef(value) {
  return new ShallowRefImpl(value)
}
```

## 5. 测试驱动

让我们写个测试来看看 `ref` 是否工作正常。
创建 `test/reactivity/ref.spec.ts`。

```typescript
import { effect } from '../../src/reactivity/effect'
import { ref } from '../../src/reactivity/ref'

describe('ref', () => {
  it('should hold a value', () => {
    const a = ref(1)
    expect(a.value).toBe(1)
    a.value = 2
    expect(a.value).toBe(2)
  })

  it('should be reactive', () => {
    const a = ref(1)
    let dummy
    let calls = 0
    effect(() => {
      calls++
      dummy = a.value
    })
    expect(calls).toBe(1)
    expect(dummy).toBe(1)
    
    a.value = 2
    expect(calls).toBe(2)
    expect(dummy).toBe(2)
    
    // 相同的值不应该触发
    a.value = 2
    expect(calls).toBe(2)
    expect(dummy).toBe(2)
  })

  it('should make nested properties reactive', () => {
    const a = ref({
      count: 1
    })
    let dummy
    effect(() => {
      dummy = a.value.count
    })
    expect(dummy).toBe(1)
    
    a.value.count = 2
    expect(dummy).toBe(2)
  })
})
```

## 6. 总结

今天我们填补了响应式系统的最后一块拼图 —— 基本类型的响应式。

-   **Ref** 是一个对象包裹器。
-   它通过 `get value` 收集依赖。
-   它通过 `set value` 触发依赖。
-   如果值是对象，它内部会借用 `reactive` 的力量。

至此，我们的响应式系统（Reactivity System）已经非常完整了。
它包含了：
-   `reactive` / `readonly` / `shallowReactive` / `shallowReadonly`
-   `effect` / `track` / `trigger` / `scheduler`
-   `computed`
-   `ref` / `shallowRef`

下一节，我们将学习 `ref` 的一些高级用法，比如 `proxyRefs`，它是 Vue 3 模板中不需要写 `.value` 的秘密。
