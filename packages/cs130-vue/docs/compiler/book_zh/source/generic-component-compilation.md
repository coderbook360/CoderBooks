# 泛型组件编译

Vue 3.3 引入了泛型组件支持，允许在 script setup 中声明类型参数。

## 基本语法

```vue
<script setup lang="ts" generic="T">
defineProps<{
  items: T[]
  selected: T
}>()
</script>
```

## 编译识别

```typescript
function parseScriptSetup(ctx: ScriptCompileContext) {
  const { attrs } = ctx.descriptor.scriptSetup!

  // 检查 generic 属性
  if (attrs.generic) {
    ctx.hasGeneric = true
    ctx.genericDecl = attrs.generic as string
  }
}
```

## 泛型解析

```typescript
function parseGenericDecl(decl: string): GenericParam[] {
  // 解析泛型参数
  // "T" -> [{ name: 'T' }]
  // "T extends Item" -> [{ name: 'T', constraint: 'Item' }]
  // "T, U extends T" -> [{ name: 'T' }, { name: 'U', constraint: 'T' }]

  const params: GenericParam[] = []
  const ast = parseTypeParameters(`<${decl}>`)

  for (const param of ast.params) {
    params.push({
      name: param.name.name,
      constraint: param.constraint
        ? generateCode(param.constraint)
        : undefined,
      default: param.default
        ? generateCode(param.default)
        : undefined
    })
  }

  return params
}
```

## 编译结果

```vue
<script setup lang="ts" generic="T extends string | number">
const props = defineProps<{
  value: T
  list: T[]
}>()

const emit = defineEmits<{
  change: [value: T]
}>()
</script>
```

```typescript
// 类型定义
interface __VLS_GenericProps<T extends string | number> {
  value: T
  list: T[]
}

// 组件定义（运行时擦除泛型）
export default defineComponent({
  props: {
    value: null,
    list: Array
  },
  emits: ['change'],
  setup(__props) {
    return { }
  }
})
```

## Props 类型处理

```typescript
function genPropsType(ctx: ScriptCompileContext): string {
  if (ctx.hasGeneric) {
    // 泛型组件使用接口定义
    const generics = ctx.genericDecl
    return `interface __VLS_Props<${generics}> ${
      generateCode(ctx.propsTypeDecl)
    }`
  }

  return `type __VLS_Props = ${generateCode(ctx.propsTypeDecl)}`
}
```

## 多个泛型参数

```vue
<script setup lang="ts" generic="K extends string, V">
defineProps<{
  entries: [K, V][]
  getKey: (item: V) => K
}>()
</script>
```

## 默认类型参数

```vue
<script setup lang="ts" generic="T = string">
defineProps<{
  value: T
}>()
</script>
```

## 使用泛型组件

```vue
<!-- 父组件 -->
<script setup lang="ts">
import GenericList from './GenericList.vue'

interface User {
  id: number
  name: string
}

const users: User[] = [...]
</script>

<template>
  <!-- T 被推断为 User -->
  <GenericList :items="users">
    <template #default="{ item }">
      {{ item.name }}  <!-- item: User -->
    </template>
  </GenericList>
</template>
```

## Volar 支持

```typescript
// IDE 类型推断需要额外类型定义
type __VLS_GenericComponent<T> = new () => {
  $props: __VLS_GenericProps<T>
  $slots: __VLS_GenericSlots<T>
}
```

## 运行时擦除

```typescript
// 泛型在运行时被擦除
// 编译后的 props 不包含类型信息

// 编译前（TypeScript）
defineProps<{ value: T }>()

// 编译后（JavaScript）
{ value: null }  // 或推断的运行时类型
```

## 约束处理

```vue
<script setup lang="ts" generic="T extends { id: number }">
defineProps<{
  items: T[]
}>()

// 可以安全访问 id
const getIds = (items: T[]) => items.map(i => i.id)
</script>
```

## 插槽类型

```vue
<script setup lang="ts" generic="T">
defineProps<{ items: T[] }>()

defineSlots<{
  default(props: { item: T; index: number }): any
}>()
</script>
```

插槽 props 中的 T 获得正确类型。

## 小结

泛型组件编译的关键点：

1. **generic 属性**：script 标签声明类型参数
2. **类型传播**：props、emits、slots 共享泛型
3. **运行时擦除**：JavaScript 中无泛型
4. **IDE 支持**：Volar 提供类型推断

下一章将分析 props 解构的响应式保持。
