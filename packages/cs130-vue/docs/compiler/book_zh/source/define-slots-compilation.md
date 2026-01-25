# defineSlots 编译

defineSlots 是 Vue 3.3 引入的宏，用于声明插槽类型，提供更好的 TypeScript 支持。

## 基本用法

```vue
<script setup lang="ts">
const slots = defineSlots<{
  default(props: { message: string }): any
  header(props: { title: string }): any
}>()
</script>
```

## 编译识别

```typescript
function processDefineSlots(ctx: ScriptCompileContext) {
  for (const node of ctx.scriptSetupAst!) {
    if (node.type === 'VariableDeclaration') {
      for (const decl of node.declarations) {
        if (isCallOf(decl.init, 'defineSlots')) {
          ctx.hasSlotsCall = true
          ctx.slotsIdentifier = decl.id

          // 提取类型参数
          const typeArg = decl.init.typeParameters?.params[0]
          if (typeArg) {
            ctx.slotsTypeDecl = typeArg
          }
        }
      }
    }
  }
}
```

## 编译结果

```vue
<script setup lang="ts">
const slots = defineSlots<{
  default(props: { msg: string }): any
}>()
</script>
```

```typescript
import { useSlots as _useSlots } from 'vue'

export default {
  setup(__props) {
    const slots = _useSlots()
    return { slots }
  }
}
```

## 类型提取

```typescript
function extractSlotsType(
  typeNode: TSTypeLiteral
): Record<string, SlotTypeData> {
  const slots: Record<string, SlotTypeData> = {}

  for (const member of typeNode.members) {
    if (member.type === 'TSMethodSignature') {
      const name = getId(member.key)
      const propsParam = member.parameters[0]

      slots[name] = {
        name,
        propsType: propsParam?.typeAnnotation
      }
    }
  }

  return slots
}
```

## 运行时使用

```typescript
// useSlots 返回的是代理对象
export function useSlots(): SetupContext['slots'] {
  return getContext().slots
}

// slots 对象
interface Slots {
  [name: string]: Slot | undefined
}

type Slot<T = any> = (props: T) => VNode[]
```

## 模板中使用

```vue
<script setup lang="ts">
const slots = defineSlots<{
  default(props: { item: Item }): any
  empty(): any
}>()
</script>

<template>
  <div v-for="item in items" :key="item.id">
    <slot :item="item" />
  </div>
  <div v-if="!items.length">
    <slot name="empty" />
  </div>
</template>
```

## 类型安全

```typescript
// 父组件使用时有类型提示
<Child>
  <template #default="{ item }">
    {{ item.name }}  <!-- item 有正确类型 -->
  </template>
</Child>
```

## 空调用

```vue
<script setup>
// 不需要类型时，仅获取 slots 对象
const slots = defineSlots()
</script>
```

```typescript
export default {
  setup(__props) {
    const slots = _useSlots()
    return { slots }
  }
}
```

## 条件渲染

```vue
<script setup lang="ts">
const slots = defineSlots<{
  header(): any
  default(): any
}>()
</script>

<template>
  <header v-if="slots.header">
    <slot name="header" />
  </header>
  <main>
    <slot />
  </main>
</template>
```

## 与 defineProps 配合

```vue
<script setup lang="ts">
interface Item {
  id: number
  name: string
}

const props = defineProps<{
  items: Item[]
}>()

const slots = defineSlots<{
  default(props: { item: Item; index: number }): any
  empty(): any
}>()
</script>
```

## 绑定元数据

```typescript
// slots 变量注册为 SETUP_CONST
if (ctx.slotsIdentifier) {
  ctx.bindingMetadata[getId(ctx.slotsIdentifier)] =
    BindingTypes.SETUP_CONST
}
```

## 泛型组件

```vue
<script setup lang="ts" generic="T">
const props = defineProps<{
  items: T[]
}>()

const slots = defineSlots<{
  default(props: { item: T }): any
}>()
</script>
```

泛型参数 T 可在 slots 类型中使用。

## 小结

defineSlots 编译的关键点：

1. **类型声明**：仅用于 TypeScript 类型检查
2. **运行时返回**：useSlots() 获取实际对象
3. **作用域类型**：插槽 props 获得类型提示
4. **条件检查**：slots.name 判断插槽存在

下一章将分析泛型组件的编译实现。
