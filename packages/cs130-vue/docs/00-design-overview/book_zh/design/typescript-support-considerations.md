# TypeScript 支持的设计考量

Vue3 从头开始用 TypeScript 重写，并将类型支持作为一等公民。这不仅改善了框架本身的代码质量，更重要的是为应用开发者提供了完整的类型推导能力。

## Vue2 的类型困境

Vue2 的 Options API 设计给类型推导带来了根本性挑战。问题的核心在于 `this` 的类型难以准确表达。

```typescript
// Vue2 组件
export default {
  data() {
    return {
      message: 'Hello'
    }
  },
  computed: {
    reversedMessage() {
      // this.message 的类型很难推导
      return this.message.split('').reverse().join('')
    }
  },
  methods: {
    greet() {
      // this 上同时有 data、computed、methods 的属性
      console.log(this.reversedMessage)
    }
  }
}
```

`this` 的类型是 `data`、`computed`、`methods` 等多个选项的合并结果，而且还要考虑 Mixins 的注入。TypeScript 需要复杂的类型体操才能得到近似正确的 `this` 类型。

Vue 社区提供了 `vue-class-component` 和 `vue-property-decorator` 等方案，通过 Class 语法获得更好的类型支持，但这本质上是对 Vue 设计的一种适配，而非原生支持。

## Composition API 的类型友好设计

Composition API 的设计从根本上解决了类型推导问题。代码组织在普通函数中，TypeScript 可以准确推导每个变量的类型。

```typescript
import { ref, computed } from 'vue'

export default {
  setup() {
    // message 被推导为 Ref<string>
    const message = ref('Hello')

    // reversedMessage 被推导为 ComputedRef<string>
    const reversedMessage = computed(() => {
      return message.value.split('').reverse().join('')
    })

    function greet() {
      console.log(reversedMessage.value)  // 完整的类型提示
    }

    return { message, reversedMessage, greet }
  }
}
```

没有复杂的 `this`，没有隐式的合并逻辑，每个变量的类型在定义时就确定了。这种设计让 TypeScript 能够提供完整的智能提示和类型检查。

## defineComponent 的类型增强

Vue3 提供了 `defineComponent` 函数，它在运行时几乎不做任何事情，主要作用是帮助 TypeScript 推导组件的类型。

```typescript
import { defineComponent, PropType } from 'vue'

interface User {
  name: string
  age: number
}

export default defineComponent({
  props: {
    user: {
      type: Object as PropType<User>,
      required: true
    },
    count: {
      type: Number,
      default: 0
    }
  },
  setup(props) {
    // props.user 被正确推导为 User
    console.log(props.user.name)
    // props.count 被推导为 number
  }
})
```

`PropType<T>` 是一个类型工具，用于在运行时的 `type` 属性上标注 TypeScript 类型。这是连接运行时验证和编译时类型检查的桥梁。

## 泛型组件

Vue3 支持泛型组件，这在处理通用组件时非常有用：

```typescript
// 泛型列表组件
import { defineComponent } from 'vue'

export default defineComponent({
  props: {
    items: {
      type: Array as PropType<T[]>,
      required: true
    }
  },
  emits: {
    select: (item: T) => true
  },
  setup(props, { emit }) {
    function handleSelect(item: T) {
      emit('select', item)
    }
    return { handleSelect }
  }
})
```

在 Vue 3.3+ 中，`<script setup>` 语法支持更直接的泛型定义：

```vue
<script setup lang="ts" generic="T">
defineProps<{
  items: T[]
}>()

const emit = defineEmits<{
  select: [item: T]
}>()
</script>
```

## Volar 的加持

Volar 是 Vue 官方推荐的 VS Code 扩展，专门为 Vue 3 + TypeScript 设计。它提供了：

**模板内的类型检查**：模板中的表达式获得完整的类型检查，错误的属性访问、方法调用都会被标红。

**跨文件类型推导**：组件的 props、emits、slots 类型可以在使用处获得提示。

**重构支持**：重命名变量时，模板中的引用也会被更新。

```vue
<template>
  <!-- user 的类型被正确推导，访问 user.name 有类型提示 -->
  <div>{{ user.name }}</div>
  
  <!-- 如果写错属性名，会有错误提示 -->
  <div>{{ user.nmae }}</div>  <!-- 报错 -->
</template>

<script setup lang="ts">
interface User {
  name: string
  age: number
}

defineProps<{
  user: User
}>()
</script>
```

## 类型工具的提供

Vue3 导出了丰富的类型工具，方便开发者在应用中使用：

```typescript
import type { 
  Ref, 
  ComputedRef, 
  PropType,
  ComponentPublicInstance,
  VNode,
  App
} from 'vue'

// 函数返回类型
function useCounter(): { count: Ref<number>, increment: () => void } {
  const count = ref(0)
  const increment = () => count.value++
  return { count, increment }
}

// Props 类型提取
type MyProps = {
  title: string
  count?: number
}
```

## 渐进式类型采用

Vue3 的类型支持是渐进式的。你可以：

1. 完全不使用 TypeScript，照常编写 JavaScript
2. 使用 JSDoc 注释获得部分类型提示
3. 在 `.vue` 文件中使用 `<script lang="ts">`
4. 全面采用 TypeScript + Volar

这种灵活性让团队可以根据自身情况逐步引入类型系统，而不是被迫一次性全面改造。

Vue3 的类型设计证明了框架可以在保持易用性的同时提供强大的类型能力。这为大型项目的可维护性提供了重要保障。
