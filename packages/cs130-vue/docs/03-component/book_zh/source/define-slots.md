# defineSlots 类型推导

defineSlots 是 Vue 3.3 新增的编译器宏，用于为插槽提供类型定义，增强 TypeScript 支持。

## 基本用法

```typescript
// 在 <script setup> 中
const slots = defineSlots<{
  default(props: { message: string }): any
  header(props: { title: string }): any
}>()
```

## 编译器宏特性

```typescript
// defineSlots 是编译器宏，不需要导入
// 编译时会被转换，运行时不存在

// 源码
const slots = defineSlots<{
  default(props: { msg: string }): any
}>()

// 编译后（大致）
const slots = __slots
```

## 运行时定义

```typescript
// packages/runtime-core/src/apiSetupHelpers.ts
export function defineSlots<
  S extends Record<string, (props: any) => any>
>(): StrictUnwrapSlotsType<SlotsType<S>> {
  if (__DEV__) {
    warn(
      `defineSlots() is a compiler-hint helper that is only usable inside ` +
        `<script setup> of a single file component. Its arguments should be ` +
        `dropped during compilation.`
    )
  }
  return null as any
}
```

## SlotsType 类型

```typescript
// packages/runtime-core/src/componentSlots.ts
export type SlotsType<T extends Record<string, any> = Record<string, any>> = {
  [SlotSymbol]?: T
}

declare const SlotSymbol: unique symbol

export type StrictUnwrapSlotsType<
  S extends SlotsType,
  T = NonNullable<S[typeof SlotSymbol]>
> = [keyof S] extends [never]
  ? Slots
  : Readonly<
      T & {
        [K in keyof T as string extends K
          ? never
          : K extends `_${string}`
          ? never
          : K]: T[K]
      }
    >
```

## 与 slots 属性配合

```typescript
// 组件选项中的 slots 类型声明
export default defineComponent({
  slots: Object as SlotsType<{
    default: { message: string }
    header: { title: string }
  }>,
  setup(props, { slots }) {
    // slots.default 有类型
    const defaultContent = slots.default?.({ message: 'hello' })
  }
})
```

## 作用域插槽类型

```html
<!-- Parent.vue -->
<template>
  <List>
    <template #item="{ data }">
      <!-- data 有正确的类型 -->
      {{ data.name }}
    </template>
  </List>
</template>

<!-- List.vue -->
<script setup lang="ts">
interface Item {
  id: number
  name: string
}

const slots = defineSlots<{
  item(props: { data: Item; index: number }): any
}>()
</script>

<template>
  <div v-for="(item, index) in items" :key="item.id">
    <slot name="item" :data="item" :index="index" />
  </div>
</template>
```

## 返回值使用

```typescript
const slots = defineSlots<{
  default(props: {}): any
  header(props: { title: string }): any
}>()

// slots 有类型
if (slots.header) {
  const headerVNodes = slots.header({ title: 'Hello' })
}
```

## 可选插槽

```typescript
const slots = defineSlots<{
  default(props: {}): any
  header?(props: { title: string }): any  // 可选
}>()

// 使用时需要检查
if (slots.header) {
  slots.header({ title: 'Hello' })
}
```

## 编译转换

```html
<!-- 源码 -->
<script setup lang="ts">
const slots = defineSlots<{
  default(props: { msg: string }): any
}>()
</script>

<template>
  <slot :msg="message" />
</template>

<!-- 编译后 -->
<script>
export default {
  setup(__props, { expose: __expose, slots: __slots }) {
    __expose()
    const slots = __slots
    return { slots }
  }
}
</script>
```

## 与 defineProps 配合

```html
<script setup lang="ts">
interface Props {
  title: string
}

const props = defineProps<Props>()

const slots = defineSlots<{
  default(props: { data: string }): any
  title(props: { text: string }): any
}>()
</script>
```

## 类型推导链

```typescript
// 组件定义
const slots = defineSlots<{
  item(props: { data: User }): any
}>()

// 使用组件时，IDE 能推导出插槽 props 类型
// <MyComponent>
//   <template #item="{ data }">
//     {{ data.name }}  <!-- data 类型为 User -->
//   </template>
// </MyComponent>
```

## 与 generic 配合

```html
<script setup lang="ts" generic="T">
defineProps<{
  items: T[]
}>()

const slots = defineSlots<{
  item(props: { data: T; index: number }): any
}>()
</script>
```

## 使用示例

### 表格组件

```html
<!-- Table.vue -->
<script setup lang="ts" generic="T extends { id: string | number }">
interface Props {
  data: T[]
  columns: Array<{ key: keyof T; label: string }>
}

defineProps<Props>()

const slots = defineSlots<{
  header(props: {}): any
  cell(props: { row: T; column: keyof T; value: T[keyof T] }): any
  empty(props: {}): any
}>()
</script>

<template>
  <table>
    <thead>
      <tr>
        <th v-for="col in columns" :key="String(col.key)">
          {{ col.label }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in data" :key="row.id">
        <td v-for="col in columns" :key="String(col.key)">
          <slot name="cell" :row="row" :column="col.key" :value="row[col.key]">
            {{ row[col.key] }}
          </slot>
        </td>
      </tr>
      <tr v-if="data.length === 0">
        <td :colspan="columns.length">
          <slot name="empty">No data</slot>
        </td>
      </tr>
    </tbody>
  </table>
</template>
```

## 小结

defineSlots 的核心要点：

1. **编译器宏**：编译时处理，运行时不存在
2. **类型推导**：为插槽提供 TypeScript 类型
3. **作用域插槽**：定义插槽 props 类型
4. **返回 slots**：返回有类型的 slots 对象
5. **泛型支持**：配合 generic 使用

下一章将分析 useSlots 与 useAttrs。
