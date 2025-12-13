# readonly 与 shallowReadonly：只读代理的实现

组件的 props 不应该被修改，Vue 是如何保护它们的？

答案是 `readonly`——创建一个只读的响应式代理。**但这里有个问题值得思考：既然 JavaScript 没有真正的 const 对象，Vue 是怎么"伪造"出只读效果的？**

## readonly 的行为

```javascript
const original = { count: 0, nested: { value: 1 } }
const wrapped = readonly(original)

// 可以读取
console.log(wrapped.count)        // 0
console.log(wrapped.nested.value) // 1

// 不能修改
wrapped.count = 1
// ⚠️ 警告：Set operation on key "count" failed: target is readonly.

// 深层只读
wrapped.nested.value = 2
// ⚠️ 同样警告
```

## readonly 实现

核心思路：在 set 和 deleteProperty handler 中拦截修改操作。

```javascript
const readonlyMap = new WeakMap()

function readonly(obj) {
  return createReactiveObject(
    obj,
    readonlyHandlers,
    readonlyMap
  )
}

const readonlyHandlers = {
  get(target, key, receiver) {
    // 标识检查
    if (key === ReactiveFlags.IS_READONLY) {
      return true
    }
    if (key === ReactiveFlags.RAW) {
      return target
    }
    
    const result = Reflect.get(target, key, receiver)
    
    // 深层只读：嵌套对象也变成 readonly
    if (isObject(result)) {
      return readonly(result)
    }
    
    return result
  },
  
  set(target, key) {
    // 开发环境下发出警告
    if (__DEV__) {
      console.warn(
        `Set operation on key "${String(key)}" failed: target is readonly.`,
        target
      )
    }
    // 返回 true 表示"成功"，避免抛出 TypeError
    return true
  },
  
  deleteProperty(target, key) {
    if (__DEV__) {
      console.warn(
        `Delete operation on key "${String(key)}" failed: target is readonly.`,
        target
      )
    }
    return true
  }
}
```

## readonly 是否需要收集依赖？

这是一个非常经典的设计问题：**readonly 的数据不会变化，收集依赖有意义吗？**

```javascript
// 情况 1：独立使用 readonly
const config = readonly({ api: '/api/v1' })

effect(() => {
  console.log(config.api)  // 追踪了有什么用？config 不会变
})
```

这种情况下确实不需要追踪。但还有另一种情况：

```javascript
// 情况 2：readonly 包装 reactive
const state = reactive({ count: 0 })
const readonlyState = readonly(state)

effect(() => {
  console.log(readonlyState.count)  // 应该被追踪
})

state.count = 1  // 应该触发 effect
```

`readonly` 包装了 `reactive`，虽然不能通过 `readonlyState` 修改，但可以通过原始的 `state` 修改。这时候需要追踪。

Vue 的实际实现选择了**不追踪**，因为：

1. 独立使用 readonly 的场景更常见
2. readonly 包装 reactive 的场景可以直接追踪 reactive

```javascript
// 简化的 readonly get handler
get(target, key, receiver) {
  const result = Reflect.get(target, key, receiver)
  
  // 不调用 track()
  
  if (isObject(result)) {
    return readonly(result)
  }
  
  return result
}
```

## shallowReadonly 实现

和 `shallowReactive` 的思路一样，只处理第一层：

```javascript
function shallowReadonly(obj) {
  return createReactiveObject(
    obj,
    shallowReadonlyHandlers,
    shallowReadonlyMap
  )
}

const shallowReadonlyHandlers = {
  get(target, key, receiver) {
    if (key === ReactiveFlags.IS_READONLY) {
      return true
    }
    if (key === ReactiveFlags.IS_SHALLOW) {
      return true
    }
    if (key === ReactiveFlags.RAW) {
      return target
    }
    
    // 不递归，直接返回
    return Reflect.get(target, key, receiver)
  },
  
  set(target, key) {
    if (__DEV__) {
      console.warn(
        `Set operation on key "${String(key)}" failed: target is readonly.`
      )
    }
    return true
  },
  
  deleteProperty(target, key) {
    if (__DEV__) {
      console.warn(
        `Delete operation on key "${String(key)}" failed: target is readonly.`
      )
    }
    return true
  }
}
```

## shallowReadonly 的行为

```javascript
const state = shallowReadonly({
  count: 0,
  nested: { value: 1 }
})

// 顶层只读
state.count = 1  // ⚠️ 警告

// 嵌套对象可以修改！
state.nested.value = 2  // ✅ 可以修改
console.log(state.nested.value)  // 2
```

## isReadonly 工具函数

```javascript
function isReadonly(value) {
  return !!(value && value[ReactiveFlags.IS_READONLY])
}

// 使用
console.log(isReadonly(readonly({})))         // true
console.log(isReadonly(shallowReadonly({})))  // true
console.log(isReadonly(reactive({})))         // false
console.log(isReadonly({}))                   // false
```

## 在 Props 中的应用

Vue 组件的 props 使用 `shallowReadonly` 保护：

```javascript
function setupComponent(instance) {
  const { props } = instance.vnode
  
  // 使用 shallowReadonly 保护 props
  instance.props = shallowReadonly(props)
  
  // 组件内部不能修改 props
}
```

为什么用 `shallowReadonly` 而不是 `readonly`？**这是一个经典的权衡**：

1. **性能**：不需要递归代理所有嵌套对象
2. **语义**：props 的"只读"主要是防止组件意外修改父组件数据，嵌套对象的修改由开发者自行负责

**代价是什么？** 如果开发者真的修改了 props 的嵌套属性，Vue 无法阻止也无法警告。这是 Vue 相信开发者"知道自己在做什么"的设计哲学。

## readonly 与 reactive 的组合

```javascript
const state = reactive({ count: 0 })
const readonlyState = readonly(state)

effect(() => {
  console.log(readonlyState.count)
})

// 通过原始 reactive 修改
state.count = 1  // 触发 effect

// 通过 readonly 修改
readonlyState.count = 2  // 警告，不触发更新
```

这种模式常用于：

- 暴露只读的状态给组件外部
- 保护 store 状态不被意外修改

## 完整的工具函数

```javascript
const ReactiveFlags = {
  IS_REACTIVE: '__v_isReactive',
  IS_READONLY: '__v_isReadonly',
  IS_SHALLOW: '__v_isShallow',
  RAW: '__v_raw'
}

function isReactive(value) {
  return !!(value && value[ReactiveFlags.IS_REACTIVE])
}

function isReadonly(value) {
  return !!(value && value[ReactiveFlags.IS_READONLY])
}

function isShallow(value) {
  return !!(value && value[ReactiveFlags.IS_SHALLOW])
}

function isProxy(value) {
  return isReactive(value) || isReadonly(value)
}
```

## 本章小结

`readonly` 创建只读代理，核心思路是**通过 Proxy 拦截所有写操作，在开发环境发出警告**：

- **深层只读**：嵌套对象也是只读的（递归调用 readonly）
- **修改拦截**：set 和 deleteProperty 返回警告
- **不收集依赖**：readonly 的数据通常不会变化，追踪没有意义

`shallowReadonly` 只保护第一层：

- 嵌套对象可以修改
- 常用于 props 保护，**权衡了性能与安全性**

---

## 练习与思考

1. 为什么 `readonly` 的 set handler 返回 `true` 而不是 `false`？

2. 以下代码的输出是什么？

```javascript
const state = readonly({ a: { b: 1 } })
console.log(isReadonly(state))     // ?
console.log(isReadonly(state.a))   // ?
```

3. 思考：如果需要一个"深层只读但可追踪"的响应式对象，应该如何实现？
