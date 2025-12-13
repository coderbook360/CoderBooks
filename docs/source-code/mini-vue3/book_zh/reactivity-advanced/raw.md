# toRaw 与 markRaw：逃离响应式

有时候我们需要"逃离"响应式系统。**为什么要逃离？** 因为不是所有对象都适合被代理——第三方库实例、大型静态数据、性能敏感的批量操作场景，都需要绕过响应式系统。

`toRaw` 和 `markRaw` 提供了两种逃离方式：

- `toRaw`：从已有代理"逃出去"，获取原始对象
- `markRaw`："预防"被代理，标记对象永不响应式

## toRaw 的作用

```javascript
const original = { count: 0 }
const proxy = reactive(original)

// 获取原始对象
const raw = toRaw(proxy)

console.log(raw === original)  // true
console.log(raw === proxy)     // false

// 原始对象不是响应式的
raw.count++  // 不触发更新
```

## toRaw 实现

还记得 `ReactiveFlags.RAW` 吗？在 reactive 的 get handler 中，访问这个属性会返回原始对象：

```javascript
get(target, key, receiver) {
  if (key === ReactiveFlags.RAW) {
    return target  // 返回原始对象
  }
  // ...
}
```

`toRaw` 利用这个机制：

```javascript
function toRaw(observed) {
  // 访问 __v_raw 获取原始对象
  const raw = observed && observed[ReactiveFlags.RAW]
  
  // 递归处理嵌套代理
  return raw ? toRaw(raw) : observed
}
```

**为什么要递归？** 这是一个很巧妙的设计。因为可能存在嵌套代理——一个对象先被 `reactive` 包装，再被 `readonly` 包装：

```javascript
const obj = {}
const proxy1 = reactive(obj)
const proxy2 = readonly(proxy1)

// proxy2 的 RAW 是 proxy1
// proxy1 的 RAW 是 obj
// toRaw(proxy2) 需要递归才能拿到真正的 obj
```

如果不递归，`toRaw(proxy2)` 只会返回 `proxy1`，而不是最原始的 `obj`。

## toRaw 的使用场景

### 场景 1：传递给第三方库

```javascript
const state = reactive({ data: [] })

// 某些库不支持 Proxy
thirdPartyLib.process(toRaw(state.data))
```

### 场景 2：性能敏感的批量操作

**这是一个非常实用的优化技巧**。想象一下，你要往数组里 push 10000 个元素，每次 push 都触发依赖收集和更新——完全没必要：

```javascript
const state = reactive({ list: [] })

// 批量操作时不希望触发追踪
const raw = toRaw(state)
for (let i = 0; i < 10000; i++) {
  raw.list.push(i)  // 不触发追踪，性能极佳
}
// 最后手动触发一次更新
state.list = [...raw.list]
```

**权衡**：你获得了性能，但失去了细粒度的响应式追踪。适合"批量写入、最后统一触发"的场景。

### 场景 3：比较对象引用

```javascript
const items = reactive([{ id: 1 }, { id: 2 }])
const target = { id: 1 }

// 直接比较会失败，因为 items[0] 是代理
items[0] === target  // false

// 使用 toRaw 比较原始对象
toRaw(items[0]) === target  // 取决于是否同一引用
```

## markRaw 的作用

现在问第二个问题：**如果我想让某个对象永远不被代理，怎么办？** 答案是 `markRaw`——它在对象上打一个标记，告诉响应式系统"别碰我"：

```javascript
const chart = markRaw(echarts.init(el))

// 即使放入 reactive 中，也不会被代理
const state = reactive({
  chart  // chart 仍然是原始对象
})

console.log(isReactive(state.chart))  // false
console.log(state.chart === chart)    // true
```

## markRaw 实现

```javascript
const ReactiveFlags = {
  SKIP: '__v_skip',  // 跳过响应式转换
  RAW: '__v_raw',
  IS_REACTIVE: '__v_isReactive',
  IS_READONLY: '__v_isReadonly'
}

function markRaw(value) {
  // 定义一个不可枚举的标记属性
  Object.defineProperty(value, ReactiveFlags.SKIP, {
    configurable: true,
    enumerable: false,
    value: true
  })
  return value
}
```

在 `createReactiveObject` 中检查这个标记：

```javascript
function createReactiveObject(target, handlers, proxyMap) {
  // 检查 SKIP 标记
  if (target[ReactiveFlags.SKIP]) {
    return target  // 直接返回原始对象
  }
  
  // 检查已有代理
  const existingProxy = proxyMap.get(target)
  if (existingProxy) return existingProxy
  
  const proxy = new Proxy(target, handlers)
  proxyMap.set(target, proxy)
  return proxy
}
```

在 reactive 的 get handler 中也要检查：

```javascript
get(target, key, receiver) {
  const result = Reflect.get(target, key, receiver)
  track(target, key)
  
  if (isObject(result)) {
    // 检查是否被 markRaw 标记
    if (result[ReactiveFlags.SKIP]) {
      return result  // 不转换
    }
    return reactive(result)
  }
  
  return result
}
```

## markRaw 的使用场景

### 场景 1：第三方库实例

```javascript
const map = markRaw(new Map())
const state = reactive({ map })

// Map 不会被代理，可以正常使用
state.map.set('key', 'value')
```

### 场景 2：不可变的配置对象

```javascript
const CONSTANTS = markRaw({
  API_URL: 'https://api.example.com',
  VERSION: '1.0.0'
})

// 放入 reactive 中也不会被代理
const app = reactive({
  config: CONSTANTS
})
```

### 场景 3：类实例

```javascript
class MyService {
  constructor() {
    // 在构造函数中标记
    markRaw(this)
  }
}

const service = new MyService()
const state = reactive({ service })
// service 不会被代理
```

### 场景 4：大型静态数据

```javascript
// 加载大量不需要响应式的数据
const geoData = markRaw(loadGeoJSON())
const state = reactive({ geoData })
// 节省大量代理开销
```

## __v_skip vs __v_raw

这两个标记的作用不同：

```javascript
// __v_raw：代理对象上的属性，指向原始对象
const obj = { count: 0 }
const proxy = reactive(obj)
proxy[ReactiveFlags.RAW] === obj  // true

// __v_skip：原始对象上的属性，标记不应被代理
markRaw(obj)
obj[ReactiveFlags.SKIP]  // true
reactive(obj) === obj    // true，直接返回原始对象
```

## 完整的 ReactiveFlags

```javascript
const ReactiveFlags = {
  SKIP: '__v_skip',           // markRaw 标记
  IS_REACTIVE: '__v_isReactive',
  IS_READONLY: '__v_isReadonly',
  IS_SHALLOW: '__v_isShallow',
  RAW: '__v_raw'              // 原始对象引用
}
```

## 注意事项

### markRaw 必须在放入 reactive 之前调用

```javascript
// 正确
const obj = markRaw({ data: [] })
const state = reactive({ obj })

// 错误
const state = reactive({ obj: { data: [] } })
markRaw(state.obj)  // 太晚了，obj 已经被代理
```

### markRaw 不可逆

```javascript
const obj = markRaw({ count: 0 })
// 无法"取消标记"，obj 永远不会被代理
```

### toRaw 对非代理对象也有效

```javascript
const plainObj = { count: 0 }
toRaw(plainObj) === plainObj  // true
```

## 本章小结

- **toRaw**：获取代理对象的原始对象，用于传递给第三方库或性能优化
- **markRaw**：标记对象永远不被代理，用于第三方库实例和大型静态数据

两者的核心区别——**一个是"治疗"，一个是"预防"**：

- `toRaw` 是从已有代理"逃出去"（事后补救）
- `markRaw` 是"预防"被代理（事前预防）

**使用建议**：如果你知道某个对象不需要响应式，优先使用 `markRaw` 预防；如果已经在响应式系统中需要临时逃离，使用 `toRaw`。

---

## 练习与思考

1. 实现 `toRaw` 和 `markRaw`。

2. 以下代码的输出是什么？

```javascript
const obj = { a: 1 }
const proxy = reactive(obj)
markRaw(obj)

console.log(reactive(obj) === obj)      // ?
console.log(reactive(proxy) === proxy)  // ?
```

3. 思考：为什么 echarts 实例应该使用 `markRaw`？不使用会有什么问题？
