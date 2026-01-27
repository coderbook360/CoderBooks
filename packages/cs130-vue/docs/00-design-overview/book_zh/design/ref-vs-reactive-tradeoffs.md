# ref 与 reactive 的设计取舍

Vue3 提供了 ref 和 reactive 两种创建响应式数据的方式。这不是设计失误，而是针对不同场景的有意为之。

## 为什么需要两种 API

Proxy 只能代理对象，不能代理原始值。

```javascript
// 这是无效的
const proxy = new Proxy(1, { get() {}, set() {} })
// TypeError: Cannot create proxy with a non-object as target
```

但应用开发中大量使用原始值：计数器是数字，开关是布尔，输入框内容是字符串。这些都需要响应式。

ref 通过对象包装解决这个问题：

```javascript
function ref(value) {
  return reactive({ value })
}

const count = ref(0)
count.value++  // 通过 .value 访问和修改
```

## ref 的权衡

ref 的代价是需要通过 .value 访问。这增加了一些冗余，尤其在 JavaScript 代码中：

```javascript
const count = ref(0)
const double = computed(() => count.value * 2)  // 需要 .value

function increment() {
  count.value++  // 需要 .value
}
```

Vue3 在模板中自动解包 ref，减轻了这个负担：

```vue
<template>
  <!-- 不需要 .value -->
  <div>{{ count }}</div>
  <button @click="count++">+1</button>
</template>
```

但在 JavaScript 中，.value 是不可避免的。这是 Vue 社区曾经讨论过的 "ref 语法糖" 提案的背景。

## reactive 的限制

reactive 不需要 .value，用起来更自然：

```javascript
const state = reactive({ count: 0, name: 'Vue' })
state.count++  // 直接访问
```

但 reactive 有自己的限制。

不能替换整个对象：

```javascript
let state = reactive({ count: 0 })
state = reactive({ count: 1 })  // 失去响应式！新对象和原来的没有关联
```

解构会失去响应式：

```javascript
const state = reactive({ count: 0 })
const { count } = state  // count 是普通数字
count++  // 不会触发更新

// 需要使用 toRefs
const { count } = toRefs(state)
count.value++  // 这样才行
```

## 使用指南

Vue 官方的建议是：使用 ref 作为默认选择。

ref 更加一致：原始值和对象都可以用 ref 包装，API 统一。

```javascript
const count = ref(0)       // 原始值
const user = ref({ name: 'Alice' })  // 对象也可以
```

ref 可以安全替换：

```javascript
const data = ref(null)
data.value = fetchedData  // 安全
```

ref 可以安全传递：

```javascript
const count = ref(0)
useCounter(count)  // 函数内部修改 count.value 会影响这里
```

reactive 适合的场景是：固定结构的状态对象，不需要替换或传递。

```javascript
// reactive 适合这种场景
const formState = reactive({
  username: '',
  password: '',
  rememberMe: false
})
```

## 底层实现的统一

虽然 API 不同，但 ref 和 reactive 的底层是统一的。当 ref 包装对象时，内部会使用 reactive：

```javascript
function ref(value) {
  return createRef(value)
}

function createRef(rawValue) {
  if (isRef(rawValue)) {
    return rawValue
  }
  return new RefImpl(rawValue)
}

class RefImpl {
  private _value: any

  constructor(value) {
    // 如果是对象，用 reactive 处理
    this._value = isObject(value) ? reactive(value) : value
  }

  get value() {
    track(this, 'value')
    return this._value
  }

  set value(newVal) {
    if (hasChanged(newVal, this._value)) {
      this._value = isObject(newVal) ? reactive(newVal) : newVal
      trigger(this, 'value')
    }
  }
}
```

这种设计让 ref 和 reactive 可以无缝配合，用户可以根据场景选择最合适的方式。
