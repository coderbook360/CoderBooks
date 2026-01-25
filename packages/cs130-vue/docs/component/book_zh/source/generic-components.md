# 泛型组件与类型推导

Vue 3.3 引入了泛型组件支持，允许在组件定义中使用泛型参数，实现更灵活的类型推导。

## 基本语法

```html
<script setup lang="ts" generic="T">
defineProps<{
  items: T[]
  selected: T
}>()

defineEmits<{
  select: [item: T]
}>()
</script>
```

## 多个泛型参数

```html
<script setup lang="ts" generic="T, U extends string">
defineProps<{
  data: T
  label: U
}>()
</script>
```

## 泛型约束

```html
<script setup lang="ts" generic="T extends { id: number }">
defineProps<{
  items: T[]
}>()

// T 必须有 id 属性
</script>

<template>
  <div v-for="item in items" :key="item.id">
    {{ item }}
  </div>
</template>
```

## 编译转换

```html
<!-- 源码 -->
<script setup lang="ts" generic="T">
defineProps<{
  value: T
}>()
</script>

<!-- 编译后（TypeScript 层面） -->
<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  __name: 'GenericComp',
  props: {
    value: { type: null, required: true }
  },
  setup<T>(props: { value: T }) {
    // ...
  }
}) as <T>(props: { value: T }) => any
</script>
```

## DefineComponent 泛型支持

```typescript
// 组件类型签名
type GenericComponent = <T>(props: {
  items: T[]
  selected?: T
}) => any

// 使用时自动推导 T
// <GenericComp :items="[1, 2, 3]" />
// T 推导为 number
```

## 与 defineSlots 配合

```html
<script setup lang="ts" generic="T">
defineProps<{
  items: T[]
}>()

defineSlots<{
  default(props: { item: T; index: number }): any
}>()
</script>

<template>
  <div v-for="(item, index) in items" :key="index">
    <slot :item="item" :index="index" />
  </div>
</template>
```

## 与 defineModel 配合

```html
<script setup lang="ts" generic="T">
const model = defineModel<T>()
</script>
```

## 泛型组件实例

```typescript
// 获取泛型组件的实例类型比较复杂
// 通常需要使用 InstanceType 配合

import type { ComponentPublicInstance } from 'vue'

type GenericCompInstance<T> = ComponentPublicInstance<{
  items: T[]
}>
```

## 实际使用示例

### 通用列表组件

```html
<!-- GenericList.vue -->
<script setup lang="ts" generic="T extends { id: string | number }">
interface Props {
  items: T[]
  keyField?: keyof T
}

const props = withDefaults(defineProps<Props>(), {
  keyField: 'id' as keyof T
})

const emit = defineEmits<{
  select: [item: T]
  delete: [item: T]
}>()

const slots = defineSlots<{
  default(props: { item: T; index: number }): any
  empty(): any
}>()
</script>

<template>
  <ul v-if="items.length">
    <li 
      v-for="(item, index) in items" 
      :key="String(item[keyField])"
      @click="emit('select', item)"
    >
      <slot :item="item" :index="index">
        {{ item }}
      </slot>
    </li>
  </ul>
  <div v-else>
    <slot name="empty">No items</slot>
  </div>
</template>
```

### 使用泛型列表

```html
<script setup lang="ts">
interface User {
  id: number
  name: string
  email: string
}

const users = ref<User[]>([
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' }
])

const handleSelect = (user: User) => {
  // user 有正确的类型
  console.log(user.name)
}
</script>

<template>
  <GenericList :items="users" @select="handleSelect">
    <template #default="{ item }">
      <!-- item 自动推导为 User 类型 -->
      <div>{{ item.name }} - {{ item.email }}</div>
    </template>
  </GenericList>
</template>
```

### 泛型表单字段

```html
<!-- FormField.vue -->
<script setup lang="ts" generic="T">
const model = defineModel<T>()

defineProps<{
  label: string
  validate?: (value: T) => string | null
}>()
</script>

<template>
  <label>
    {{ label }}
    <input v-model="model" />
  </label>
</template>
```

### 泛型选择器

```html
<!-- Select.vue -->
<script setup lang="ts" generic="T">
interface Props {
  options: T[]
  labelKey: keyof T
  valueKey: keyof T
}

defineProps<Props>()

const model = defineModel<T[Props['valueKey']]>()
</script>

<template>
  <select v-model="model">
    <option 
      v-for="option in options" 
      :key="String(option[valueKey])"
      :value="option[valueKey]"
    >
      {{ option[labelKey] }}
    </option>
  </select>
</template>
```

## 类型推导链

```typescript
// 父组件传入具体类型
// <GenericComp :items="users" />

// Vue 编译器推导 T = User

// 插槽 props 获得正确类型
// <template #default="{ item }">
//   {{ item.name }}  // item: User
// </template>
```

## 注意事项

```typescript
// 1. 泛型参数在运行时不存在
// 编译后擦除类型

// 2. 默认值需要显式类型
const props = withDefaults(defineProps<{
  items: T[]
}>(), {
  items: () => [] as T[]  // 需要类型断言
})

// 3. 复杂泛型可能影响类型推导性能
// 保持泛型约束简洁
```

## 小结

泛型组件与类型推导的核心要点：

1. **generic 属性**：声明泛型参数
2. **约束支持**：extends 限制类型
3. **自动推导**：使用时推导具体类型
4. **与其他宏配合**：defineProps、defineSlots、defineModel
5. **编译时擦除**：运行时无泛型信息

这是 Vue3 组件系统源码解析的最后一章。通过本书的学习，读者应该对 Vue3 组件系统有了深入的理解，能够更好地开发 Vue 应用和解决实际问题。
