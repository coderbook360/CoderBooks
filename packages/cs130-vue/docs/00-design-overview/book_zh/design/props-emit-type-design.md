# Props 与 Emit 的类型设计

Vue3 显著增强了 props 和 emit 的类型支持，让 TypeScript 用户获得完整的类型检查和智能提示。

## 运行时声明

最基本的声明方式使用运行时对象：

```javascript
export default {
  props: {
    title: String,
    count: {
      type: Number,
      required: true,
      validator: (value) => value >= 0
    },
    items: {
      type: Array,
      default: () => []
    }
  },
  emits: ['update', 'delete']
}
```

这种方式在运行时生效，Vue 会验证传入的 props 并在开发模式下给出警告。

## 纯类型声明

使用 `<script setup>` 和 TypeScript 时，可以使用纯类型声明：

```typescript
interface Props {
  title: string
  count: number
  items?: string[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update', value: number): void
  (e: 'delete', id: string): void
}>()
```

这种方式只在编译时生效，运行时没有验证。但类型信息更精确，可以定义复杂类型：

```typescript
interface User {
  id: string
  name: string
  email: string
}

interface Props {
  user: User
  permissions: Array<'read' | 'write' | 'admin'>
  status: 'active' | 'inactive' | 'pending'
}
```

## 混合声明

有时需要同时使用类型检查和运行时特性（如默认值）：

```typescript
interface Props {
  title: string
  count?: number
}

const props = withDefaults(defineProps<Props>(), {
  count: 0
})
```

`withDefaults` 让你在使用类型声明的同时提供默认值。

## Emit 类型约束

类型声明让 emit 获得完整的类型检查：

```typescript
const emit = defineEmits<{
  (e: 'update', value: number): void
  (e: 'delete', id: string): void
}>()

// 类型检查
emit('update', 42)        // ✓
emit('update', 'string')  // ✗ 类型错误
emit('unknown', 1)        // ✗ 事件名错误
```

调用组件时也能获得提示：

```vue
<!-- 有类型提示和检查 -->
<MyComponent @update="handleUpdate" @delete="handleDelete" />
```

## Props 验证的权衡

运行时验证和类型声明各有优劣：

运行时验证的优势：

```javascript
props: {
  email: {
    type: String,
    validator: (value) => {
      // 复杂的运行时验证
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    }
  }
}
```

在生产环境也能捕获非法数据，比如后端返回的意外值。

类型声明的优势：

在编译时就发现问题，开发体验更好。但运行时不会验证，如果数据来源不可信（如 API 响应），可能需要额外的运行时检查。

## 复杂场景的处理

泛型组件：

```typescript
// 泛型 props
function useGenericProps<T>() {
  return defineProps<{
    items: T[]
    selected: T
  }>()
}
```

条件必需：

```typescript
// 某个 prop 的必需性依赖另一个
type Props = {
  mode: 'single'
  value: string
} | {
  mode: 'multiple'
  values: string[]
}
```

这种联合类型让 Vue 根据 mode 的值推断其他 props 的类型。

## 设计理念

Vue3 的类型设计遵循几个原则：

渐进增强：不强制使用 TypeScript，JavaScript 用户仍可使用运行时验证。

类型优先：为 TypeScript 用户提供一流的开发体验。

编译时优化：类型信息在编译时处理，不增加运行时负担。

这种设计让 Vue 既适合快速原型开发，也适合大型 TypeScript 项目。开发者可以根据项目需求选择合适的方式。
