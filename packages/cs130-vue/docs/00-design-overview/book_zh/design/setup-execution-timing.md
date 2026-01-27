# Setup 函数的运行时机与上下文

setup 是 Composition API 的入口点，理解它的执行时机和可用上下文，对正确使用 Composition API 至关重要。

## 执行时机

setup 在组件创建过程中执行，具体位置是：

```
解析 props
    ↓
创建组件实例
    ↓
初始化 props
    ↓
**执行 setup** ← 这里
    ↓
处理 template/render
    ↓
挂载 DOM
```

setup 在 beforeCreate 和 created 钩子之间执行，但实际上它替代了这两个钩子的功能：

```javascript
export default {
  beforeCreate() {
    // setup 执行前
  },
  setup() {
    // 在这里做初始化工作
  },
  created() {
    // setup 执行后
  }
}
```

使用 Composition API 时，通常不需要 beforeCreate 和 created，直接在 setup 中完成初始化。

## setup 的参数

setup 接收两个参数：props 和 context。

```javascript
export default {
  props: {
    title: String,
    count: Number
  },
  setup(props, context) {
    // props 是响应式的，可以 watch
    watch(() => props.count, (newVal) => {
      console.log('count changed:', newVal)
    })

    // 解构 context
    const { attrs, slots, emit, expose } = context
  }
}
```

props 参数是响应式的，但不能解构：

```javascript
// 错误：解构后失去响应式
setup({ count }) {
  watch(count, ...)  // 不会工作
}

// 正确：使用 props.count 或 toRefs
setup(props) {
  watch(() => props.count, ...)  // 工作

  const { count } = toRefs(props)
  watch(count, ...)  // 也工作
}
```

context 包含非响应式的辅助工具：

```javascript
const { attrs, slots, emit, expose } = context

// attrs: 非 props 的属性
console.log(attrs.class)

// slots: 插槽函数
const defaultSlot = slots.default?.()

// emit: 触发事件
emit('update', newValue)

// expose: 暴露给父组件的公开属性
expose({ focus: focusMethod })
```

## 返回值

setup 的返回值暴露给模板：

```javascript
setup() {
  const count = ref(0)
  const double = computed(() => count.value * 2)

  function increment() {
    count.value++
  }

  return {
    count,
    double,
    increment
  }
}
```

模板中可以直接使用：

```vue
<template>
  <div>{{ count }} x 2 = {{ double }}</div>
  <button @click="increment">+1</button>
</template>
```

ref 在模板中自动解包，不需要 .value。

setup 也可以直接返回渲染函数：

```javascript
import { h, ref } from 'vue'

export default {
  setup() {
    const count = ref(0)

    // 返回渲染函数
    return () => h('div', count.value)
  }
}
```

这种方式常用于不需要模板的函数式组件。

## 注意事项

setup 中没有 this。Options API 中通过 this 访问组件实例，Composition API 不用这种方式。

```javascript
// Options API
export default {
  data: () => ({ count: 0 }),
  methods: {
    increment() {
      this.count++  // 通过 this
    }
  }
}

// Composition API
export default {
  setup() {
    const count = ref(0)

    function increment() {
      count.value++  // 直接访问
    }

    return { count, increment }
  }
}
```

setup 只执行一次。不像 render 函数每次更新都执行，setup 只在组件初始化时执行一次。响应式更新是通过 effect 机制实现的。

```javascript
setup() {
  console.log('setup 执行')  // 只打印一次

  const count = ref(0)

  watchEffect(() => {
    console.log('effect 执行:', count.value)  // 每次变化都打印
  })

  return { count }
}
```

异步 setup 需要 Suspense：

```javascript
// 异步 setup
async setup() {
  const data = await fetchData()
  return { data }
}
```

使用异步 setup 的组件需要包裹在 Suspense 中，否则不会渲染。这是因为 setup 返回 Promise，没有同步返回值给模板使用。
