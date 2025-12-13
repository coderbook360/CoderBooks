# 响应式系统的边界处理与常见陷阱

响应式系统很强大，但也有不少"坑"。**这些坑的存在不是 Vue 的设计缺陷，而是 JavaScript 语言特性带来的边界情况。**

几个问题先思考一下：
- 为什么数组的 `length` 变化能触发更新？
- 为什么 `Map`/`Set` 需要特殊处理？
- 为什么解构后响应式丢失了？

这一章梳理这些边界情况和常见陷阱，帮你避坑。

## 数组的特殊处理

### 索引赋值

```javascript
const arr = reactive([1, 2, 3])

effect(() => {
  console.log(arr.length)  // 追踪 length
})

arr[5] = 6  // 触发更新，length 变成 6
```

实现上需要在 set handler 中检测 length 变化：

```javascript
set(target, key, value, receiver) {
  const oldLength = Array.isArray(target) ? target.length : undefined
  const result = Reflect.set(target, key, value, receiver)
  
  if (Array.isArray(target)) {
    const newLength = target.length
    if (newLength !== oldLength) {
      trigger(target, 'length')
    }
  }
  
  return result
}
```

### 数组方法的追踪

```javascript
const arr = reactive([1, 2, 3])

effect(() => {
  console.log(arr.includes(2))
})
```

`includes` 会读取 `length` 和每个索引（0, 1, 2...）。这些都需要被追踪。

### 变异方法的问题

**这是一个非常常见的陷阱，理解它能帮你防止很多 bug：**

```javascript
const arr = reactive([1, 2, 3])

effect(() => {
  console.log(arr.length)
})

arr.push(4)
```

`push` 内部会读取和修改 `length`。如果不特殊处理，可能导致无限循环：

1. `push` 读取 `length`，触发追踪
2. `push` 修改 `length`，触发当前 effect
3. effect 执行，读取 `length`，再次触发追踪...

**Vue 的解决方案很巧妙——在调用这些方法时暂停追踪**：

```javascript
const arrayInstrumentations = {
  push(...args) {
    pauseTracking()
    const result = Array.prototype.push.apply(this, args)
    resetTracking()
    return result
  },
  // pop, shift, unshift, splice 类似
}
```

## Map 和 Set 的处理

### 为什么需要特殊处理？

**这是很多人不理解的地方。** 看这个例子：

```javascript
const map = reactive(new Map())

map.set('key', 'value')
```

**问题在哪？** Proxy 不能直接拦截 `Map` 的方法调用。

当你调用 `map.set()` 时，Proxy 的 `get` trap 会拦截对 `set` 方法的访问，但方法内部的 `this` 会指向 Proxy 而不是原始 Map，导致报错。

### 集合类型的 handlers

Vue 使用方法拦截的方式：

```javascript
const mutableCollectionHandlers = {
  get(target, key, receiver) {
    if (key === ReactiveFlags.IS_REACTIVE) return true
    if (key === ReactiveFlags.RAW) return target
    
    // 拦截集合方法
    return Reflect.get(
      hasOwn(instrumentations, key) ? instrumentations : target,
      key,
      receiver
    )
  }
}

const instrumentations = {
  get(key) {
    const target = toRaw(this)
    track(target, key)
    return wrap(target.get(key))
  },
  
  set(key, value) {
    const target = toRaw(this)
    const hadKey = target.has(key)
    const oldValue = target.get(key)
    const result = target.set(key, toRaw(value))
    
    if (!hadKey) {
      trigger(target, 'add', key)
    } else if (!Object.is(value, oldValue)) {
      trigger(target, 'set', key)
    }
    
    return this  // 返回 proxy 以支持链式调用
  },
  
  has(key) {
    const target = toRaw(this)
    track(target, key)
    return target.has(key)
  },
  
  delete(key) {
    const target = toRaw(this)
    const hadKey = target.has(key)
    const result = target.delete(key)
    
    if (hadKey) {
      trigger(target, 'delete', key)
    }
    
    return result
  },
  
  // forEach, keys, values, entries, size...
}
```

## 原始值的处理

```javascript
const str = reactive('hello')  // ❌ 不工作
```

原始值不能被 Proxy 代理。解决方案：

```javascript
// 方案 1：使用 ref
const str = ref('hello')

// 方案 2：放在对象里
const state = reactive({ str: 'hello' })
```

## 循环引用

**思考一下：循环引用会导致无限循环吗？**

```javascript
const obj = reactive({})
obj.self = obj

effect(() => {
  console.log(obj.self.self.self)  // 不会无限循环
})
```

为什么不会无限循环？因为 reactive 有缓存机制——**这就是 WeakMap 缓存的另一个价值**：

```javascript
const existingProxy = proxyMap.get(target)
if (existingProxy) return existingProxy
```

`obj.self` 返回的是同一个代理对象。

## NaN 的比较

**这是一个 JavaScript 经典坑。** 看这个例子：

```javascript
const state = reactive({ value: NaN })

effect(() => {
  console.log(state.value)
})

state.value = NaN  // 不应该触发更新（值没变）
```

问题：`NaN !== NaN`，普通比较会认为值变了。

解决：使用 `Object.is`：

```javascript
function hasChanged(value, oldValue) {
  return !Object.is(value, oldValue)
}

// Object.is(NaN, NaN) === true
```

## 原型链上的响应式

```javascript
const child = reactive({})
const parent = reactive({ foo: 1 })

Object.setPrototypeOf(child, parent)

effect(() => {
  console.log(child.foo)  // 读取原型上的属性
})

parent.foo = 2  // 应该触发更新吗？
```

这是一个边界情况。访问 `child.foo` 时：

1. 触发 `child` 的 get trap
2. `child` 上没有 `foo`，沿原型链找到 `parent.foo`

Vue 的处理方式是在 get handler 中检查属性是否在自身：

```javascript
get(target, key, receiver) {
  const result = Reflect.get(target, key, receiver)
  
  // 追踪
  track(target, key)
  
  // 如果结果是响应式对象，直接返回
  return isObject(result) ? reactive(result) : result
}
```

## 常见陷阱总结

### 陷阱 1：解构丢失响应式

```javascript
// ❌ 错误
const { count } = reactive({ count: 0 })

// ✅ 正确
const { count } = toRefs(reactive({ count: 0 }))
```

### 陷阱 2：替换整个响应式对象

```javascript
let state = reactive({ count: 0 })

effect(() => {
  console.log(state.count)  // 追踪了 state.count
})

state = reactive({ count: 1 })  // ❌ 原来的依赖丢失

// 应该这样
state.count = 1  // ✅
```

### 陷阱 3：async 函数中丢失上下文

```javascript
async function fetchData() {
  const state = reactive({ data: null })
  
  // 在 await 之后，当前组件可能已经卸载
  await fetch('/api')
  
  state.data = result  // 可能有问题
}
```

### 陷阱 4：在 effect 外部访问不触发追踪

```javascript
const state = reactive({ count: 0 })

// 这不会被追踪
console.log(state.count)

// 只有在 effect 内部访问才会追踪
effect(() => {
  console.log(state.count)  // ✅ 被追踪
})
```

### 陷阱 5：直接修改数组索引

```javascript
const list = reactive([1, 2, 3])

effect(() => {
  console.log(list[0])  // 追踪 index 0
})

list[0] = 100  // ✅ 触发更新
list.length = 0  // ✅ 也触发更新

// 但注意：
list[10] = 'new'  // 新增索引，会触发 length 变化
```

## 调试技巧

使用 `onTrack` 和 `onTrigger` 调试响应式：

```javascript
effect(
  () => {
    console.log(state.count)
  },
  {
    onTrack(e) {
      console.log('tracked:', e)
      // e.target: 被追踪的对象
      // e.key: 被追踪的 key
      // e.type: 追踪类型 (get, has, iterate)
    },
    onTrigger(e) {
      console.log('triggered:', e)
      // e.target: 触发的对象
      // e.key: 触发的 key
      // e.type: 操作类型 (set, add, delete)
      // e.newValue: 新值
      // e.oldValue: 旧值
    }
  }
)
```

在 computed 中：

```javascript
const doubled = computed(() => count.value * 2, {
  onTrack(e) {
    debugger  // 在这里打断点
  },
  onTrigger(e) {
    debugger
  }
})
```

## 本章小结

理解这些边界情况的价值在于：**当你遇到响应式"失效"时，能快速定位问题**。

边界情况：

- **数组**：变异方法需要暂停追踪（防止无限循环），索引赋值需要检测 length 变化
- **Map/Set**：需要方法拦截，不能直接用 Proxy（this 指向问题）
- **原始值**：不能代理，需要用 ref 包装
- **循环引用**：通过代理缓存解决
- **NaN**：使用 Object.is 比较（NaN === NaN 为 false）

常见陷阱：

- 解构丢失响应式 → 使用 toRefs
- 替换整个对象 → 修改属性
- 在 effect 外访问 → 确保在 effect 内部

调试技巧：

- 使用 onTrack/onTrigger
- Vue DevTools

---

## 练习与思考

1. 为什么 `push` 需要暂停追踪？写出可能导致无限循环的场景。

2. 实现一个简化版的 Map 响应式代理。

3. 以下代码的输出是什么？为什么？

```javascript
const state = reactive({ a: { b: 1 } })
const copy = { ...state }

effect(() => {
  console.log(copy.a.b)
})

state.a.b = 2  // 会触发 effect 吗？
```
