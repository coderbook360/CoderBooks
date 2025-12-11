# shallowReactive 与 shallowRef：浅层响应式

`reactive` 默认会递归代理所有嵌套对象。**但这里有个问题需要思考**：如果对象层级很深，或者你只关心顶层属性的变化，这会带来不必要的性能开销。

`shallowReactive` 和 `shallowRef` 就是为解决这个问题而设计的。

## 首先理解 reactive 的深层行为

```javascript
const state = reactive({
  user: {
    name: 'John',
    address: {
      city: 'Beijing'
    }
  }
})

console.log(isReactive(state))              // true
console.log(isReactive(state.user))         // true
console.log(isReactive(state.user.address)) // true
```

每一层嵌套对象都被代理了。如果有 100 层嵌套，就会创建 100 个 Proxy。**想象一下，一个配置对象有几十层嵌套，但你只关心顶层的变化——为每一层都创建代理，是不是很浪费？**

## shallowReactive 的行为

**shallowReactive 只代理根对象**：

```javascript
const state = shallowReactive({
  user: {
    name: 'John',
    address: {
      city: 'Beijing'
    }
  }
})

console.log(isReactive(state))              // true
console.log(isReactive(state.user))         // false！
console.log(isReactive(state.user.address)) // false！
```

只有根对象是响应式的，嵌套对象保持原样。

### 什么会触发更新？

```javascript
// 替换根级属性 - 触发更新
state.user = { name: 'Jane' }  // ✅

// 修改嵌套属性 - 不触发更新
state.user.name = 'Jane'       // ❌

// 添加根级属性 - 触发更新
state.newProp = 'value'        // ✅

// 修改嵌套对象的属性 - 不触发更新
state.user.address.city = 'Shanghai'  // ❌
```

## shallowReactive 实现

关键在 get handler：

```javascript
// reactive 的 get handler
get(target, key, receiver) {
  const result = Reflect.get(target, key, receiver)
  track(target, key)
  
  // 如果是对象，递归代理
  if (isObject(result)) {
    return reactive(result)  // 深层响应式
  }
  
  return result
}

// shallowReactive 的 get handler
get(target, key, receiver) {
  const result = Reflect.get(target, key, receiver)
  track(target, key)
  
  // 直接返回，不递归
  return result  // 浅层响应式
}
```

完整实现：

```javascript
const shallowReactiveMap = new WeakMap()

function shallowReactive(obj) {
  return createReactiveObject(
    obj,
    shallowReactiveHandlers,
    shallowReactiveMap
  )
}

const shallowReactiveHandlers = {
  get(target, key, receiver) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true
    }
    if (key === ReactiveFlags.IS_SHALLOW) {
      return true
    }
    if (key === ReactiveFlags.RAW) {
      return target
    }
    
    const result = Reflect.get(target, key, receiver)
    track(target, key)
    
    // 关键：直接返回，不调用 reactive()
    return result
  },
  
  set(target, key, value, receiver) {
    const oldValue = target[key]
    const result = Reflect.set(target, key, value, receiver)
    
    if (!Object.is(oldValue, value)) {
      trigger(target, key)
    }
    
    return result
  },
  
  deleteProperty(target, key) {
    const hadKey = hasOwn(target, key)
    const result = Reflect.deleteProperty(target, key)
    
    if (result && hadKey) {
      trigger(target, key)
    }
    
    return result
  }
}
```

## shallowRef 的行为

现在问第二个问题：**`ref` 和 `shallowRef` 有什么区别？**

`ref` 会对 `.value` 进行深层响应式转换：

```javascript
const normalRef = ref({
  user: { name: 'John' }
})

console.log(isReactive(normalRef.value))  // true

// 修改嵌套属性会触发更新
normalRef.value.user.name = 'Jane'  // ✅ 触发更新
```

`shallowRef` 不会：

```javascript
const shallow = shallowRef({
  user: { name: 'John' }
})

console.log(isReactive(shallow.value))  // false

// 只有替换 .value 才触发更新
shallow.value = { user: { name: 'Jane' } }  // ✅ 触发更新

// 修改内部属性不触发更新
shallow.value.user.name = 'Jane'  // ❌ 不触发更新
```

## shallowRef 实现

```javascript
class ShallowRefImpl {
  public readonly __v_isRef = true
  public readonly __v_isShallow = true
  public dep = new Set()
  
  private _value
  
  constructor(value) {
    // 关键：不用 reactive 包装
    this._value = value
  }
  
  get value() {
    trackRefValue(this)
    return this._value
  }
  
  set value(newValue) {
    if (!Object.is(newValue, this._value)) {
      this._value = newValue
      triggerRefValue(this)
    }
  }
}

function shallowRef(value) {
  return new ShallowRefImpl(value)
}
```

对比 `ref`：

```javascript
class RefImpl {
  constructor(value) {
    // ref 会用 reactive 包装对象
    this._value = isObject(value) ? reactive(value) : value
  }
  
  set value(newValue) {
    if (!Object.is(newValue, this._value)) {
      // 设置新值时也会转换
      this._value = isObject(newValue) ? reactive(newValue) : newValue
      triggerRefValue(this)
    }
  }
}
```

## triggerRef：手动触发

如果修改了 `shallowRef` 内部的属性，需要手动触发更新。**这是一个权衡：你选择了 shallowRef 来获得性能，那么就需要承担手动触发的责任**：

```javascript
const state = shallowRef({ count: 0 })

state.value.count++  // 不会触发更新

// 手动触发
triggerRef(state)    // 触发更新
```

实现很简单：

```javascript
function triggerRef(ref) {
  triggerRefValue(ref)
}
```

## 使用场景

### 场景 1：大型不可变数据

```javascript
// 从 API 获取的数据，只需要整体替换，不需要追踪内部变化
const apiData = shallowRef(null)

async function fetchData() {
  apiData.value = await fetch('/api/large-data').then(r => r.json())
  // 整体替换会触发更新
}
```

### 场景 2：第三方库实例

```javascript
// echarts 实例不应该被代理
const chart = shallowRef(null)

onMounted(() => {
  chart.value = echarts.init(el.value)
  // 不会尝试代理 echarts 内部结构
})
```

### 场景 3：性能敏感的列表

```javascript
// 只关心列表本身的变化（添加、删除），不关心每项内部的变化
const items = shallowReactive([])

items.push(newItem)       // ✅ 触发更新
items[0].name = 'updated' // ❌ 不触发更新
```

## 与 readonly 结合

```javascript
const state = shallowReadonly({
  user: { name: 'John' }
})

// 顶层只读
state.user = {}  // ⚠️ 警告

// 嵌套对象可以修改
state.user.name = 'Jane'  // ✅ 可以修改，不警告
```

## 本章小结

浅层响应式是一种**用控制换性能**的优化手段：

- **shallowReactive**：只代理对象的第一层属性
- **shallowRef**：不对 `.value` 进行深层响应式转换
- **triggerRef**：手动触发 shallowRef 的更新

**核心权衡**：深层响应式让你"无脑用"，浅层响应式让你"省内存"——选择哪种，取决于数据的复杂度和你对变化追踪的精细度需求。

适用场景：

- 大型不可变数据
- 第三方库实例
- 只关心顶层变化的数据

权衡：使用浅层响应式意味着放弃了嵌套属性的自动追踪，需要根据实际需求选择。

---

## 练习与思考

1. `shallowReactive` 和 `reactive` 的 handler 有什么区别？

2. 以下代码会触发几次更新？

```javascript
const state = shallowReactive({ list: [] })

state.list.push(1)       // ?
state.list = [1, 2, 3]   // ?
state.list[0] = 100      // ?
```

3. 思考：如果需要对某个嵌套属性进行响应式追踪，应该怎么做？
