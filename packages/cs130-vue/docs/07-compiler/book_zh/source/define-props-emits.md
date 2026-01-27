# defineProps 与 defineEmits

defineProps 和 defineEmits 是 script setup 中定义组件接口的核心宏。它们在编译时被转换，运行时不存在。

## defineProps

### 运行时声明

```typescript
const props = defineProps({
  msg: String,
  count: {
    type: Number,
    default: 0
  },
  items: {
    type: Array as PropType<string[]>,
    required: true
  }
})
```

### 类型声明

```typescript
const props = defineProps<{
  msg: string
  count?: number
  items: string[]
}>()
```

### 编译处理

```typescript
function processDefineProps(ctx, node, declId) {
  if (ctx.hasDefinePropsCall) {
    ctx.error('duplicate defineProps()', node)
  }
  ctx.hasDefinePropsCall = true
  ctx.propsIdentifier = declId?.name
  
  // 运行时声明
  if (node.arguments.length) {
    const arg = node.arguments[0]
    if (arg.type === 'ObjectExpression') {
      ctx.propsRuntimeDecl = ctx.getString(arg)
      // 分析每个 prop
      for (const prop of arg.properties) {
        const key = resolveKey(prop)
        ctx.propsBindings[key] = BindingTypes.PROPS
      }
    }
  }
  
  // 类型声明
  if (node.typeParameters) {
    ctx.propsTypeDecl = node.typeParameters.params[0]
    // 从类型提取运行时验证
    const runtimeProps = resolvePropsTypeToRuntimeDecl(ctx.propsTypeDecl)
    ctx.propsRuntimeDecl = runtimeProps
  }
  
  // 移除宏调用（用魔法注释替换）
  ctx.s.overwrite(
    node.start,
    node.end,
    `__props`
  )
}
```

### 类型到运行时转换

```typescript
function resolvePropsTypeToRuntimeDecl(type) {
  const props = {}
  
  for (const member of type.members) {
    const key = member.key.name
    const typeAnnotation = member.typeAnnotation
    const required = !member.optional
    
    props[key] = {
      type: resolveType(typeAnnotation),
      required
    }
  }
  
  return props
}

function resolveType(typeAnnotation) {
  switch (typeAnnotation.type) {
    case 'TSStringKeyword':
      return 'String'
    case 'TSNumberKeyword':
      return 'Number'
    case 'TSBooleanKeyword':
      return 'Boolean'
    case 'TSArrayType':
      return 'Array'
    case 'TSObjectKeyword':
      return 'Object'
    // ...
  }
}
```

### withDefaults

为类型声明的 props 提供默认值：

```typescript
const props = withDefaults(defineProps<{
  msg: string
  count?: number
}>(), {
  count: 0
})
```

处理：

```typescript
function processWithDefaults(ctx, node) {
  const defaults = node.arguments[1]
  ctx.propsRuntimeDefaults = ctx.getString(defaults)
  
  // 合并到运行时声明
  for (const [key, value] of Object.entries(defaults)) {
    ctx.propsRuntimeDecl[key].default = value
  }
}
```

## defineEmits

### 运行时声明

```typescript
const emit = defineEmits(['change', 'update'])
// 或
const emit = defineEmits({
  change: (id: number) => true,
  update: (value: string) => value.length > 0
})
```

### 类型声明

```typescript
const emit = defineEmits<{
  (e: 'change', id: number): void
  (e: 'update', value: string): void
}>()

// Vue 3.3+ 简化语法
const emit = defineEmits<{
  change: [id: number]
  update: [value: string]
}>()
```

### 编译处理

```typescript
function processDefineEmits(ctx, node, declId) {
  if (ctx.hasDefineEmitsCall) {
    ctx.error('duplicate defineEmits()', node)
  }
  ctx.hasDefineEmitsCall = true
  ctx.emitIdentifier = declId?.name
  
  // 运行时声明
  if (node.arguments.length) {
    ctx.emitsRuntimeDecl = ctx.getString(node.arguments[0])
  }
  
  // 类型声明
  if (node.typeParameters) {
    ctx.emitsTypeDecl = node.typeParameters.params[0]
    ctx.emitsRuntimeDecl = resolveEmitsType(ctx.emitsTypeDecl)
  }
  
  // 替换为 __emit
  ctx.s.overwrite(node.start, node.end, `__emit`)
}
```

## 生成的代码

输入：

```vue
<script setup lang="ts">
const props = defineProps<{
  msg: string
  count?: number
}>()

const emit = defineEmits<{
  (e: 'change', value: number): void
}>()

const handleClick = () => {
  emit('change', props.count ?? 0)
}
</script>
```

输出：

```javascript
import { defineComponent as _defineComponent } from 'vue'

export default /*#__PURE__*/ _defineComponent({
  props: {
    msg: { type: String, required: true },
    count: { type: Number, required: false }
  },
  emits: ['change'],
  setup(__props, { emit: __emit }) {
    const props = __props
    const emit = __emit
    
    const handleClick = () => {
      emit('change', props.count ?? 0)
    }
    
    return { handleClick }
  }
})
```

## props 解构

Vue 3.5+ 支持响应式解构：

```typescript
const { msg, count = 0 } = defineProps<{
  msg: string
  count?: number
}>()
```

编译处理保持响应性：

```typescript
function processPropsDestructure(ctx, pattern) {
  for (const prop of pattern.properties) {
    const key = prop.key.name
    const local = prop.value.name
    
    // 生成响应式 getter
    ctx.propsDestructuredBindings[local] = key
  }
}
```

生成：

```javascript
// 内部使用 getter 保持响应性
const msg = __props.msg
const count = __props.count ?? 0
```

## 错误检测

编译器检测常见错误：

```typescript
// 重复定义
defineProps()
defineProps()  // Error: duplicate defineProps()

// 非顶层使用
if (condition) {
  defineProps()  // Error: must be at top level
}

// 无效的运行时声明
defineProps(dynamicValue)  // Error: argument must be a literal
```

## 与模板的关系

defineProps 的结果影响模板编译：

```typescript
// bindings
{
  msg: BindingTypes.PROPS,
  count: BindingTypes.PROPS
}
```

模板中使用时：

```html
{{ msg }}  <!-- 生成 __props.msg -->
```

## 小结

defineProps 和 defineEmits 是 script setup 定义组件接口的宏。支持运行时声明和类型声明两种形式。类型声明在编译时被转换为运行时验证代码。withDefaults 为类型声明提供默认值。编译器将宏调用替换为运行时变量引用，在 setup 函数中通过参数传入。这种设计兼顾了简洁的语法、完整的类型支持和正确的运行时行为。
