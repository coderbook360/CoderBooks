# toRef 与 toRefs：响应式解构的秘密

先来看一个很多人会踩的坑——从 `reactive` 对象解构属性后，响应式丢失了！

```javascript
const state = reactive({
  name: 'John',
  age: 30
})

// 解构
let { name, age } = state

effect(() => {
  console.log(name, age)  // 不会再次执行
})

state.name = 'Jane'  // 不触发 effect
name = 'Bob'         // 这只是修改局部变量
```

**为什么？** 这是 JavaScript 的基本特性——解构只是把值复制出来了，与原对象再无关系：

```javascript
let name = state.name  // 这只是 'John' 字符串
```

`toRef` 和 `toRefs` 解决这个问题。

## toRef 的作用

**解决思路是什么？** 既然解构会断开联系，那我们就创建一个"维持联系"的代理。

`toRef` 为响应式对象的属性创建一个 ref，这个 ref 和源对象的属性保持同步：

```javascript
const state = reactive({
  name: 'John',
  age: 30
})

const nameRef = toRef(state, 'name')

console.log(nameRef.value)  // 'John'

// 修改 nameRef 会修改 state
nameRef.value = 'Jane'
console.log(state.name)  // 'Jane'

// 修改 state 也会更新 nameRef
state.name = 'Bob'
console.log(nameRef.value)  // 'Bob'
```

## toRef 实现

核心思路：创建一个特殊的 ref，它不存储值，而是代理到源对象的属性：

```javascript
class ObjectRefImpl {
  public readonly __v_isRef = true
  
  constructor(
    private readonly _object,
    private readonly _key
  ) {}
  
  get value() {
    // 直接从源对象读取
    return this._object[this._key]
  }
  
  set value(newValue) {
    // 直接设置到源对象
    this._object[this._key] = newValue
  }
}

function toRef(object, key) {
  // 如果属性本身已经是 ref，直接返回
  const val = object[key]
  if (isRef(val)) {
    return val
  }
  
  return new ObjectRefImpl(object, key)
}
```

## ObjectRefImpl vs RefImpl

**这里有一个非常巧妙的设计。** 对比一下两种实现：

```javascript
// RefImpl：存储自己的值
class RefImpl {
  private _value  // 自己存储值
  
  get value() {
    trackRefValue(this)  // 追踪自己
    return this._value
  }
  
  set value(newValue) {
    this._value = newValue
    triggerRefValue(this)  // 触发自己的依赖
  }
}

// ObjectRefImpl：代理到源对象
class ObjectRefImpl {
  // 不存储值，只存储引用
  
  get value() {
    // 读取源对象的属性
    // 如果源对象是 reactive，会触发源对象的 track
    return this._object[this._key]
  }
  
  set value(newValue) {
    // 设置源对象的属性
    // 如果源对象是 reactive，会触发源对象的 trigger
    this._object[this._key] = newValue
  }
}
```

**关键区别**：`ObjectRefImpl` 不需要自己的 `track` 和 `trigger`，因为它操作的是源对象，源对象的响应式机制会处理这些。这是一个"偷懒"的设计——不重复造轮子，而是复用现有的响应式系统。

## toRefs 的作用

现在问第二个问题：**如果对象有很多属性，一个个调用 toRef 太繁琐了，怎么办？**

`toRefs` 将响应式对象的所有属性一次性转为 refs：

```javascript
const state = reactive({
  name: 'John',
  age: 30
})

const stateRefs = toRefs(state)
// {
//   name: ObjectRefImpl,
//   age: ObjectRefImpl
// }

// 现在可以安全解构
const { name, age } = stateRefs

// 保持响应式
effect(() => {
  console.log(name.value, age.value)
})

state.name = 'Jane'  // 触发 effect
name.value = 'Bob'   // 也触发 effect
```

## toRefs 实现

```javascript
function toRefs(object) {
  const ret = Array.isArray(object) 
    ? new Array(object.length) 
    : {}
  
  for (const key in object) {
    ret[key] = toRef(object, key)
  }
  
  return ret
}
```

## 在 Composables 中的应用

这是 `toRefs` 最常见的使用场景：

```javascript
// composable 返回响应式对象
function useMousePosition() {
  const state = reactive({
    x: 0,
    y: 0
  })
  
  onMounted(() => {
    window.addEventListener('mousemove', (e) => {
      state.x = e.clientX
      state.y = e.clientY
    })
  })
  
  // 返回 toRefs，让使用者可以解构
  return toRefs(state)
}

// 使用时可以安全解构
const { x, y } = useMousePosition()

// x 和 y 是 refs，保持响应式
watch([x, y], ([newX, newY]) => {
  console.log(newX, newY)
})
```

如果不用 `toRefs`：

```javascript
function useMousePosition() {
  const state = reactive({ x: 0, y: 0 })
  return state  // 返回 reactive
}

// 使用时解构会丢失响应式
const { x, y } = useMousePosition()  // ❌ x, y 不是响应式的
```

## toRef 的默认值支持

Vue 3.3+ 支持第三个参数作为默认值：

```javascript
const props = defineProps(['name'])

// 当 props.name 为 undefined 时，使用默认值
const nameRef = toRef(props, 'name', 'Default Name')
console.log(nameRef.value)  // 'Default Name'
```

实现：

```javascript
class ObjectRefImpl {
  constructor(
    private readonly _object,
    private readonly _key,
    private readonly _defaultValue?
  ) {}
  
  get value() {
    const val = this._object[this._key]
    return val === undefined ? this._defaultValue : val
  }
  
  set value(newValue) {
    this._object[this._key] = newValue
  }
}

function toRef(object, key, defaultValue) {
  const val = object[key]
  if (isRef(val)) return val
  
  return new ObjectRefImpl(object, key, defaultValue)
}
```

## toValue：Vue 3.3+ 新增

与 `toRef` 相反，`toValue` 用于"解开" ref：

```javascript
// 接受 ref 或普通值
function useFeature(maybeRef) {
  const value = toValue(maybeRef)  // 自动解包
  // 现在 value 是普通值
}

// 可以传入 ref
useFeature(ref(100))

// 也可以传入普通值
useFeature(100)

// 还可以传入 getter
useFeature(() => count.value * 2)
```

实现：

```javascript
function toValue(source) {
  return typeof source === 'function' 
    ? source() 
    : unref(source)
}
```

## 边界情况

### toRef 对普通对象也有效

```javascript
const plainObj = { count: 0 }
const countRef = toRef(plainObj, 'count')

countRef.value = 1
console.log(plainObj.count)  // 1
```

但这不会是响应式的，因为 `plainObj` 本身不是响应式的。

### toRef 只能用于第一层属性

```javascript
const state = reactive({
  nested: { value: 1 }
})

// 这样不行
const valueRef = toRef(state.nested, 'value')

// 因为 state.nested 已经是普通对象（被 reactive 包装后访问时才代理）
// 应该这样
const nestedRef = toRef(state, 'nested')
```

## 本章小结

- **解构问题**：从 reactive 解构会丢失响应式（JavaScript 的特性，与 Vue 无关）
- **toRef**：创建一个代理到源对象属性的 ref
- **toRefs**：批量转换所有属性
- **核心原理**：`ObjectRefImpl` 不存储值，而是代理到源对象，**复用源对象的响应式机制**

**实践建议**：在 Composables 中返回 `toRefs(state)` 是标准写法，让使用者能够安全解构同时保持响应式。

使用场景：

- Composables 返回值（最常见）
- Props 解构
- 需要传递响应式属性引用时

---

## 练习与思考

1. 实现 `toRef` 和 `toRefs`。

2. 为什么 `ObjectRefImpl` 不需要自己的 `track` 和 `trigger`？

3. 以下代码有什么问题？

```javascript
const state = reactive({ list: [1, 2, 3] })
const { list } = toRefs(state)

list.value.push(4)  // 这样对吗？
list.value = [5, 6] // 这样对吗？
```
