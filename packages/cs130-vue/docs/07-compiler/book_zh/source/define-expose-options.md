# defineExpose 与 defineOptions

defineExpose 和 defineOptions 是 script setup 中的辅助宏，分别用于控制组件暴露和定义组件选项。

## defineExpose

### 问题背景

script setup 中的变量默认不对外暴露。父组件通过 ref 获取子组件实例时，默认只能访问到空对象：

```vue
<!-- Child.vue -->
<script setup>
const count = ref(0)
const increment = () => count.value++
</script>

<!-- Parent.vue -->
<script setup>
const childRef = ref()
// childRef.value.count -> undefined
// childRef.value.increment -> undefined
</script>
<template>
  <Child ref="childRef" />
</template>
```

### 使用 defineExpose

```vue
<script setup>
const count = ref(0)
const increment = () => count.value++
const internalState = ref('private')

// 选择性暴露
defineExpose({
  count,
  increment
  // internalState 不暴露
})
</script>
```

### 编译处理

```typescript
function processDefineExpose(ctx, node) {
  if (ctx.hasDefineExposeCall) {
    ctx.error('duplicate defineExpose()', node)
  }
  ctx.hasDefineExposeCall = true
  
  // 提取暴露的对象
  const arg = node.arguments[0]
  ctx.exposeRuntimeDecl = arg ? ctx.getString(arg) : null
  
  // 标记需要 expose 参数
  ctx.needsExpose = true
  
  // 移除宏调用
  ctx.s.remove(node.start, node.end)
}
```

生成的代码：

```javascript
setup(__props, { expose: __expose }) {
  __expose({
    count,
    increment
  })
  
  const count = ref(0)
  const increment = () => count.value++
  const internalState = ref('private')
  
  return { count, increment, internalState }
}
```

### 不调用 defineExpose

如果没有调用 defineExpose，默认暴露所有顶层绑定（Vue 3.2 之前）或不暴露任何内容（Vue 3.2+）。

```javascript
// Vue 3.2+，无 defineExpose 时
setup(__props, { expose: __expose }) {
  __expose()  // 空调用，不暴露任何内容
  // ...
}
```

## defineOptions

### 问题背景

script setup 中无法使用某些组件选项：

```vue
<script setup>
// 如何设置 name？
// 如何设置 inheritAttrs？
</script>
```

### 使用 defineOptions

```vue
<script setup>
defineOptions({
  name: 'MyComponent',
  inheritAttrs: false,
  customOption: 'value'
})
</script>
```

### 支持的选项

```typescript
// 可以使用的选项
defineOptions({
  name: 'ComponentName',           // 组件名
  inheritAttrs: false,             // 是否继承 attrs
  // 自定义选项（插件用）
  __hmrId: 'xxx',
  __file: 'xxx'
})

// 不能使用的选项（会报错）
defineOptions({
  props: {},     // 用 defineProps
  emits: [],     // 用 defineEmits
  setup: () => {},  // 已经是 setup
  data: () => ({}),  // 不支持
  computed: {},  // 不支持
  methods: {}    // 不支持
})
```

### 编译处理

```typescript
function processDefineOptions(ctx, node) {
  if (ctx.hasDefineOptionsCall) {
    ctx.error('duplicate defineOptions()', node)
  }
  ctx.hasDefineOptionsCall = true
  
  const arg = node.arguments[0]
  if (!arg || arg.type !== 'ObjectExpression') {
    ctx.error('defineOptions() requires an object literal', node)
    return
  }
  
  // 检查禁止的选项
  for (const prop of arg.properties) {
    const key = resolveKey(prop)
    if (FORBIDDEN_OPTIONS.includes(key)) {
      ctx.error(`defineOptions() cannot set ${key}`, prop)
    }
  }
  
  ctx.optionsRuntimeDecl = ctx.getString(arg)
  ctx.s.remove(node.start, node.end)
}

const FORBIDDEN_OPTIONS = [
  'props', 'emits', 'expose', 'slots',
  'setup', 'render', 'data',
  'computed', 'methods', 'watch'
]
```

生成的代码：

```javascript
export default /*#__PURE__*/ _defineComponent({
  name: 'MyComponent',
  inheritAttrs: false,
  customOption: 'value',
  setup(__props) {
    // ...
  }
})
```

## 结合普通 script

另一种方式是使用普通 script：

```vue
<script>
export default {
  name: 'MyComponent',
  inheritAttrs: false
}
</script>

<script setup>
// setup 代码
</script>
```

defineOptions 更简洁，适合只需设置少量选项的情况。

## TypeScript 类型

```typescript
// defineExpose 类型
function defineExpose<Exposed extends Record<string, any> = Record<string, any>>(
  exposed?: Exposed
): void

// defineOptions 类型
function defineOptions<T extends ComponentOptionsBase>(options?: T): void
```

## 错误检测

```typescript
// 重复调用
defineExpose({})
defineExpose({})  // Error

// 非对象参数
defineOptions('invalid')  // Error

// 禁止的选项
defineOptions({
  props: {}  // Error: cannot set props
})
```

## 实际场景

### 暴露表单方法

```vue
<script setup>
const formRef = ref()
const validate = () => formRef.value.validate()
const reset = () => formRef.value.reset()

defineExpose({
  validate,
  reset
})
</script>
```

### 设置调试名称

```vue
<script setup>
defineOptions({
  name: 'UserProfileCard'  // DevTools 中显示
})
</script>
```

### 禁用 attrs 继承

```vue
<script setup>
defineOptions({
  inheritAttrs: false
})

const attrs = useAttrs()
</script>

<template>
  <div>
    <input v-bind="attrs" />
  </div>
</template>
```

## 小结

defineExpose 控制组件通过 ref 暴露的内容，默认不暴露任何内容，需要显式声明。defineOptions 设置无法在 script setup 中直接使用的组件选项，如 name 和 inheritAttrs。两者都是编译时宏，最终转换为组件定义的一部分。这些宏补充了 script setup 的功能，使其能够完全替代 Options API。
