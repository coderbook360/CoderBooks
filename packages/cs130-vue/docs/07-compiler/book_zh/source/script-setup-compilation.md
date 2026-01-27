# script setup 编译

script setup 是 Vue 3 引入的语法糖，让组件编写更简洁。编译器将这种简化的语法转换为标准的 Options API 形式。

## 语法特点

script setup 的简洁来源于：
- 顶层变量自动暴露给模板
- 导入的组件自动注册
- 宏替代显式定义（defineProps、defineEmits 等）
- 无需显式 return

```vue
<script setup>
import { ref } from 'vue'
import MyComponent from './MyComponent.vue'

const count = ref(0)
const increment = () => count.value++
</script>

<template>
  <MyComponent :count="count" @click="increment" />
</template>
```

## 编译流程

```typescript
function compileScriptSetup(ctx: ScriptCompileContext) {
  // 1. 解析 AST
  const ast = parseScript(ctx.scriptSetup.content, {
    sourceType: 'module',
    plugins: ctx.isTS ? ['typescript'] : []
  })
  
  // 2. 第一遍：收集声明
  for (const node of ast.body) {
    collectDeclarations(ctx, node)
  }
  
  // 3. 第二遍：处理宏
  for (const node of ast.body) {
    processMacros(ctx, node)
  }
  
  // 4. 生成输出
  return generateOutput(ctx)
}
```

## 自动暴露

顶层声明自动加入 setup 返回值：

```typescript
function collectReturns(ctx) {
  const returns = []
  
  for (const [name, binding] of Object.entries(ctx.bindings)) {
    // 排除类型导入
    if (binding !== BindingTypes.SETUP_TYPE_IMPORT) {
      returns.push(name)
    }
  }
  
  return returns
}
```

生成：

```javascript
return { count, increment, MyComponent }
```

## 组件自动注册

导入的 .vue 文件自动可用：

```typescript
import MyComponent from './MyComponent.vue'
// 无需 components: { MyComponent }
```

编译器标记这些导入：

```typescript
if (source.endsWith('.vue')) {
  ctx.bindings[local] = BindingTypes.SETUP_CONST
  // 组件在模板中直接使用
}
```

## 宏处理

### defineProps

```typescript
const props = defineProps(['msg', 'count'])
// 或
const props = defineProps<{ msg: string; count: number }>()
```

处理：

```typescript
function processDefineProps(ctx, node) {
  // 提取运行时声明
  if (node.arguments.length) {
    ctx.propsRuntimeDecl = generateCode(node.arguments[0])
  }
  
  // 提取类型声明（TypeScript）
  if (node.typeParameters) {
    ctx.propsTypeDecl = node.typeParameters.params[0]
    ctx.propsRuntimeDecl = extractRuntimeProps(ctx.propsTypeDecl)
  }
  
  // 移除宏调用
  ctx.removedNodes.push(node)
}
```

### defineEmits

```typescript
const emit = defineEmits(['change', 'update'])
// 或
const emit = defineEmits<{
  (e: 'change', id: number): void
  (e: 'update', value: string): void
}>()
```

### defineExpose

```typescript
defineExpose({
  publicMethod,
  publicRef
})
```

控制哪些内容对 ref 可见。

## 普通 script 合并

可以同时使用普通 script 和 script setup：

```vue
<script>
export const metadata = { version: '1.0' }
</script>

<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>
```

合并策略：

```typescript
function mergeScripts(normalScript, setupScript) {
  // 普通 script 的导出保留
  // setup 的内容包装在 setup() 中
  // 两者的导入合并
}
```

## 生成的代码结构

```javascript
import { defineComponent as _defineComponent } from 'vue'
import { ref } from 'vue'
import MyComponent from './MyComponent.vue'

export default /*#__PURE__*/ _defineComponent({
  __name: 'ComponentName',
  props: {
    msg: String,
    count: Number
  },
  emits: ['change', 'update'],
  setup(__props, { expose: __expose, emit: __emit }) {
    __expose()
    
    const count = ref(0)
    const increment = () => count.value++
    
    return { count, increment, MyComponent }
  }
})
```

## ref 自动解包

模板中使用 ref 不需要 .value：

```vue
<script setup>
const count = ref(0)
</script>

<template>
  <!-- 自动解包 -->
  <span>{{ count }}</span>
</template>
```

这通过 bindings 实现：

```typescript
// bindings: { count: 'setup-ref' }
// 模板编译时知道 count 是 ref，但模板语法不需要 .value
```

## await 支持

script setup 支持顶层 await：

```vue
<script setup>
const data = await fetch('/api').then(r => r.json())
</script>
```

编译为 async setup：

```javascript
async setup() {
  const data = await fetch('/api').then(r => r.json())
  return { data }
}
```

需要配合 Suspense 使用。

## 类型推导

TypeScript 类型用于运行时验证：

```typescript
defineProps<{
  msg: string
  count?: number
  items: string[]
}>()
```

提取为：

```javascript
props: {
  msg: { type: String, required: true },
  count: { type: Number, required: false },
  items: { type: Array, required: true }
}
```

## 限制

script setup 有一些限制：
- 不能使用 `this`
- 不能使用 Options API 选项（data、methods 等）
- 某些宏只能在顶层使用

## 开发体验

script setup 带来更好的 IDE 支持：
- 类型推导更准确
- 重构更可靠
- 代码更简洁

## 小结

script setup 编译将简化的语法转换为标准组件定义。顶层声明自动暴露，导入的组件自动注册，宏被转换为运行时选项。编译器分析绑定类型，帮助模板正确处理 ref 解包。这种设计大幅减少了样板代码，同时保持了完整的功能和类型安全。
