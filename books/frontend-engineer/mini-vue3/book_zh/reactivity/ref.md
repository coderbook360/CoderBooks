# ref 的实现：处理原始值的响应式包装

`reactive` 可以让对象变成响应式，但 JavaScript 中还有另一类值：原始值（primitive values）。

**首先要问的问题是**：`let count = 0` 这样的原始值，怎么变成响应式？

## 为什么需要 ref

**让我们先试一下直接用 Proxy 代理原始值**：

```javascript
const proxy = new Proxy(1, {})  // TypeError: Cannot create proxy with a non-object as target
```

报错了！`Proxy` 只能代理对象。

原始值（string、number、boolean、null、undefined、symbol、bigint）不是对象，无法被 `Proxy` 拦截。

**这下麻烦了。** 难道原始值就不能响应式了？

**但是，办法总比困难多**。既然 Proxy 只能代理对象，那我们就用对象来"包装"原始值：

```javascript
// 原始值
const count = 0

// 包装成对象
const wrapper = { value: 0 }

// 现在可以代理了！
const proxy = new Proxy(wrapper, {
  get(target, key) {
    track(target, key)
    return target[key]
  },
  set(target, key, value) {
    target[key] = value
    trigger(target, key)
    return true
  }
})

proxy.value = 1  // 触发更新！
```

**有没有发现这个"包装"的思路？** 这就是 `ref` 的核心思想：**用一个对象包装原始值，通过 `.value` 属性访问**。

这也解释了为什么 ref 需要用 `.value` 访问——因为实际的值存在对象的 `value` 属性里。

## 基础实现

最简单的 `ref` 实现：

```javascript
// 版本一：用 reactive 包装
function ref(value) {
  const wrapper = {
    value
  }
  
  // 标记为 ref，方便后续判断
  Object.defineProperty(wrapper, '__v_isRef', {
    value: true,
    enumerable: false  // 不可枚举，不会出现在 for...in 中
  })
  
  return reactive(wrapper)
}
```

使用：

```javascript
const count = ref(0)
console.log(count.value)  // 0

count.value++
console.log(count.value)  // 1
```

**很简单对吧？** 就是把原始值包在对象里，然后用 reactive 代理这个对象。但这只是概念验证版本。

## 用类实现

**但是，Vue 3 实际上用类来实现 `ref`，而不是简单地调用 reactive。** 这是为什么呢？

答案有两个：

1. **性能更好**——不需要完整的 Proxy 拦截，只需要拦截 `value` 属性
2. **控制更精细**——可以添加标记、处理特殊情况

```javascript
// 版本二：用类实现
class RefImpl {
  constructor(value) {
    this._rawValue = value  // 保存原始值，用于比较
    // 如果 value 是对象，用 reactive 包装（实现深层响应式）
    this._value = isObject(value) ? reactive(value) : value
  }
  
  get value() {
    // 读取时收集依赖
    trackRefValue(this)
    return this._value
  }
  
  set value(newValue) {
    // 值变化时触发更新
    if (hasChanged(newValue, this._rawValue)) {
      this._rawValue = newValue
      this._value = isObject(newValue) ? reactive(newValue) : newValue
      triggerRefValue(this)
    }
  }
}

// 添加标记
RefImpl.prototype.__v_isRef = true

function ref(value) {
  return new RefImpl(value)
}
```

**思考一下**：为什么要同时保存 `_rawValue` 和 `_value`？

答案是：`_value` 如果是对象会变成 reactive 代理，而 `_rawValue` 保存原始值用于比较。比较时应该用原始值，否则比较的是代理对象。

## 依赖管理

**你可能注意到了 `trackRefValue` 和 `triggerRefValue`**——ref 的依赖管理比 reactive 简单：

```javascript
function trackRefValue(ref) {
  if (!activeEffect) return
  
  // ref 只有一个 value 属性，所以直接在 ref 实例上存储依赖
  if (!ref.dep) {
    ref.dep = new Set()
  }
  
  // 添加当前 effect
  if (!ref.dep.has(activeEffect)) {
    ref.dep.add(activeEffect)
    activeEffect.deps.push(ref.dep)  // 反向记录
  }
}

function triggerRefValue(ref) {
  if (!ref.dep) return
  
  const effectsToRun = new Set()
  ref.dep.forEach(effect => {
    if (effect !== activeEffect) {
      effectsToRun.add(effect)
    }
  })
  
  effectsToRun.forEach(effect => effect.run())
}
```

**为什么 ref 的依赖管理比 reactive 简单？**

reactive 需要三层结构（targetMap > depsMap > deps）是因为一个对象有多个属性，需要区分"哪个属性的依赖"。

但 ref 只有一个 `value` 属性，**不需要区分，直接在 ref 实例上存储依赖即可**。这也是用类实现的好处之一——可以在实例上直接存储 `dep`。

## isRef 与 unref

两个常用的辅助函数：

```javascript
function isRef(value) {
  return !!(value && value.__v_isRef === true)
}

function unref(ref) {
  return isRef(ref) ? ref.value : ref
}
```

**`unref` 在你不确定一个值是不是 ref 时特别有用**：

```javascript
function doSomething(maybeRef) {
  // 无论传入的是 ref 还是普通值，都能正确获取
  const value = unref(maybeRef)
  // ...
}
```

## 自动解包

**可能很多人在想**：每次都写 `.value` 太烦了！有没有办法省略？

Vue 在某些场景下会自动解包 ref，让你不用写 `.value`。

### 在 reactive 中自动解包

```javascript
const count = ref(0)
const state = reactive({ count })

console.log(state.count)  // 0，不需要 .value！
state.count++             // 直接修改，不需要 .value！
```

**有没有发现很神奇？** ref 放进 reactive 后，访问时自动解包了。

怎么实现的？修改 reactive 的 handler：

```javascript
// 在 get 中处理
get(target, key, receiver) {
  const result = Reflect.get(target, key, receiver)
  
  // 新增：如果值是 ref，自动返回 .value
  if (isRef(result)) {
    return result.value
  }
  
  // 正常逻辑...
  return result
}

// 在 set 中处理
set(target, key, value, receiver) {
  const oldValue = target[key]
  
  // 新增：如果旧值是 ref 且新值不是 ref，设置到 ref.value
  if (isRef(oldValue) && !isRef(value)) {
    oldValue.value = value
    return true
  }
  
  // 正常逻辑...
  return Reflect.set(target, key, value, receiver)
}
```

**但是注意**：数组中的 ref 不会自动解包：

```javascript
const arr = reactive([ref(0)])
console.log(arr[0].value)  // 需要 .value！
```

**为什么数组不自动解包？** 因为数组经常会被遍历和索引访问，如果自动解包会影响性能，而且可能导致一些边界情况的 bug。

### 在模板中自动解包

在 Vue 模板中使用 ref 也不需要 `.value`：

```vue
<template>
  <div>{{ count }}</div>  <!-- 直接用 count，不是 count.value -->
</template>

<script setup>
const count = ref(0)
</script>
```

这是因为模板编译时会生成特殊的处理。setup 返回的对象会被 `proxyRefs` 包装：

```javascript
function proxyRefs(objectWithRefs) {
  return new Proxy(objectWithRefs, {
    get(target, key, receiver) {
      // 自动解包 ref
      return unref(Reflect.get(target, key, receiver))
    },
    set(target, key, value, receiver) {
      const oldValue = target[key]
      // 如果旧值是 ref，设置到它的 .value
      if (isRef(oldValue) && !isRef(value)) {
        oldValue.value = value
        return true
      }
      return Reflect.set(target, key, value, receiver)
    }
  })
}
```

## shallowRef

**有时候你不希望 ref 的值被深层代理**。比如你存储了一个很大的对象，不想让 Vue 递归代理它的每一层：

```javascript
const state = shallowRef({ count: 0 })

// state.value 是普通对象，不是 reactive
state.value.count = 1  // 不会触发更新！

// 必须整体替换才能触发
state.value = { count: 1 }  // 触发更新！
```

实现很简单，只是不对 value 调用 reactive：

```javascript
function shallowRef(value) {
  return new RefImpl(value, true)  // 标记为 shallow
}

class RefImpl {
  constructor(value, isShallow = false) {
    this._rawValue = value
    // 区别在这里：shallow 时不转换为 reactive
    this._value = isShallow ? value : toReactive(value)
    this._isShallow = isShallow
  }
  
  // ...
}

function toReactive(value) {
  return isObject(value) ? reactive(value) : value
}
```

**shallowRef 的使用场景**：

- 存储第三方库的实例（不希望 Vue 代理它）
- 性能优化（避免深层代理的开销）
- 只需要知道"整体变了"，不关心内部变化

## 完整实现

```javascript
class RefImpl {
  constructor(value, isShallow = false) {
    this.__v_isRef = true
    this._isShallow = isShallow
    // 保存原始值用于比较
    this._rawValue = isShallow ? value : toRaw(value)
    // 实际存储的值（可能被 reactive 包装）
    this._value = isShallow ? value : toReactive(value)
    this.dep = undefined  // 依赖集合
  }
  
  get value() {
    trackRefValue(this)
    return this._value
  }
  
  set value(newValue) {
    // 获取原始值用于比较
    const rawNewValue = this._isShallow ? newValue : toRaw(newValue)
    
    if (hasChanged(rawNewValue, this._rawValue)) {
      this._rawValue = rawNewValue
      this._value = this._isShallow ? newValue : toReactive(newValue)
      triggerRefValue(this)
    }
  }
}

function ref(value) {
  return new RefImpl(value)
}

function shallowRef(value) {
  return new RefImpl(value, true)
}

function hasChanged(value, oldValue) {
  // 使用 Object.is 比较，能正确处理 NaN
  return !Object.is(value, oldValue)
}
```

## 本章小结

这一章我们解决了一个核心问题：**原始值无法被 Proxy 代理，怎么办？**

答案是"包装"——用对象包裹原始值，通过 `.value` 访问。

`ref` 的核心要点：

- **包装机制**：用对象包装原始值，绕过 Proxy 的限制
- **标记识别**：`__v_isRef` 属性标识一个值是否为 ref
- **自动解包**：在 reactive 和模板中自动访问 `.value`，减少心智负担
- **浅层变体**：`shallowRef` 不对 value 进行深层代理，用于性能优化

**现在你应该明白为什么 ref 需要 `.value` 了**——这不是设计失误，而是 JavaScript 语言限制下的必然选择。

下一章我们实现 `computed`——一种特殊的 ref，具有惰性求值和缓存能力。

---

## 练习与思考

1. 实现 `triggerRef`，手动触发 ref 的更新：

```javascript
const shallow = shallowRef({ count: 0 })
shallow.value.count = 1  // 不触发更新
triggerRef(shallow)      // 手动触发更新
```

2. **思考这个问题**：为什么数组中的 ref 不自动解包？如果自动解包会有什么问题？

3. `ref` 和 `reactive` 应该如何选择？列举几个适合用 `ref` 的场景。