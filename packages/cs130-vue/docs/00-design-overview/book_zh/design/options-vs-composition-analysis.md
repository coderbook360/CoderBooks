# Options API vs Composition API 深度分析

Vue 3 的发布带来了 Composition API，这是 Vue 历史上最重大的 API 变革之一。然而，这并不意味着 Options API 被废弃——两种 API 在 Vue 3 中并存，各有其适用场景。理解这两种 API 的设计理念、权衡取舍以及适用边界，是每个 Vue 开发者需要掌握的核心知识。

## 设计理念对比

Options API 的设计理念可以用一个词概括：约定。它为组件定义了一套固定的组织结构，开发者按照 `data`、`computed`、`methods`、`watch` 等选项来组织代码。这种设计源自 Vue 最初的目标——降低前端开发的门槛，让不熟悉 JavaScript 高级特性的开发者也能快速上手。

```javascript
export default {
  data() {
    return {
      firstName: 'John',
      lastName: 'Doe',
      age: 25
    }
  },
  computed: {
    fullName() {
      return `${this.firstName} ${this.lastName}`
    },
    isAdult() {
      return this.age >= 18
    }
  },
  methods: {
    celebrateBirthday() {
      this.age++
    }
  },
  watch: {
    age(newVal, oldVal) {
      console.log(`Age changed from ${oldVal} to ${newVal}`)
    }
  }
}
```

这种按选项类型组织代码的方式，有一个显著的优点：代码结构高度可预测。无论是哪个开发者编写的组件，你总能在相同的位置找到相同类型的逻辑。这种一致性在团队协作中尤为重要，新成员能够快速理解项目的代码组织。

然而，Options API 的局限性也源于这种约定。当组件的复杂度增加时，同一个逻辑关注点的代码会被分散到不同的选项中。假设我们有一个搜索功能，需要管理搜索关键词、搜索结果、加载状态，并响应关键词变化触发搜索。在 Options API 中，这些相关的代码会分散在 `data`、`computed`、`methods` 和 `watch` 中，随着组件功能的增加，代码的碎片化会越来越严重。

Composition API 的设计理念则是：组合。它不再规定代码的组织结构，而是提供一组可组合的函数，让开发者按照逻辑关注点来组织代码。

```javascript
import { ref, computed, watch } from 'vue'

// 搜索功能的完整逻辑内聚在一起
function useSearch() {
  const keyword = ref('')
  const results = ref([])
  const isLoading = ref(false)
  
  const hasResults = computed(() => results.value.length > 0)
  
  async function doSearch() {
    if (!keyword.value.trim()) {
      results.value = []
      return
    }
    
    isLoading.value = true
    try {
      results.value = await fetchSearchResults(keyword.value)
    } finally {
      isLoading.value = false
    }
  }
  
  watch(keyword, () => {
    doSearch()
  }, { debounce: 300 })
  
  return {
    keyword,
    results,
    isLoading,
    hasResults,
    doSearch
  }
}
```

这个 `useSearch` 函数将搜索功能的所有相关代码封装在一起。状态定义、计算属性、方法和副作用都在同一个地方，代码的内聚性大大提高。更重要的是，这个函数可以被多个组件复用，实现了逻辑的真正共享。

Composition API 的另一个核心设计理念是透明性。在 Options API 中，`this` 是一个魔法对象，它如何工作、为什么 `data` 返回的对象会变成响应式的，这些都被框架隐藏了。而 Composition API 将这些机制暴露出来：你需要显式调用 `ref()` 或 `reactive()` 来创建响应式数据，用 `computed()` 创建计算属性，用 `watch()` 创建监听器。这种显式性虽然增加了代码量，但也使得代码的行为更加可预测和可调试。

## 适用场景分析

理解两种 API 的适用场景，需要考虑多个维度：项目规模、团队构成、复用需求和 TypeScript 支持。

对于小型项目或原型开发，Options API 往往是更高效的选择。它的约定性结构意味着更少的决策负担，开发者可以快速搭建功能而无需思考如何组织代码。当组件逻辑简单、功能单一时，Options API 的「碎片化」问题并不明显，反而其结构化的组织方式能够保持代码的清晰。

```javascript
// 简单的计数器组件，Options API 足够清晰
export default {
  data() {
    return { count: 0 }
  },
  methods: {
    increment() {
      this.count++
    },
    decrement() {
      this.count--
    }
  }
}
```

当项目规模增长，组件复杂度提升时，Composition API 的优势开始显现。一个复杂的表单组件可能需要处理表单验证、异步提交、字段联动等多个关注点。使用 Composition API，我们可以将这些关注点封装为独立的组合函数：

```javascript
import { useFormValidation } from './useFormValidation'
import { useAsyncSubmit } from './useAsyncSubmit'
import { useFieldDependency } from './useFieldDependency'

export default {
  setup() {
    const { fields, errors, validate, isValid } = useFormValidation({
      username: { required: true, minLength: 3 },
      email: { required: true, email: true },
      password: { required: true, minLength: 8 }
    })
    
    const { submit, isSubmitting, submitError } = useAsyncSubmit(
      async () => {
        if (!isValid.value) return
        await api.register(fields)
      }
    )
    
    const { dependentValue } = useFieldDependency(
      () => fields.country,
      async (country) => await api.getCities(country)
    )
    
    return {
      fields,
      errors,
      validate,
      submit,
      isSubmitting,
      submitError,
      dependentValue
    }
  }
}
```

逻辑复用是 Composition API 最显著的优势。在 Options API 中，复用逻辑的主要方式是 mixins，但 mixins 存在众所周知的问题：命名冲突、隐式依赖、数据来源不清晰。Composition API 的组合函数完全避免了这些问题，因为所有的状态和方法都是显式返回的，不存在命名空间的混淆。

对于使用 TypeScript 的项目，Composition API 提供了显著更好的类型推断支持。Options API 中的 `this` 类型推断一直是 Vue 的痛点，虽然可以通过 `defineComponent` 获得部分类型支持，但复杂场景下仍然需要大量的类型标注。而 Composition API 中的每个函数调用都有明确的输入输出类型，TypeScript 能够自然地进行推断：

```typescript
import { ref, computed, Ref } from 'vue'

interface User {
  id: number
  name: string
  email: string
}

function useUser(userId: Ref<number>) {
  const user = ref<User | null>(null)
  const isLoading = ref(false)
  
  // computed 自动推断返回 ComputedRef<string>
  const displayName = computed(() => user.value?.name ?? 'Anonymous')
  
  async function fetchUser() {
    isLoading.value = true
    try {
      user.value = await api.getUser(userId.value)
    } finally {
      isLoading.value = false
    }
  }
  
  return { user, isLoading, displayName, fetchUser }
}
```

团队构成也是选择 API 的重要考量因素。如果团队成员主要是传统的前端开发者，习惯于 jQuery 或早期 Angular 的编程模式，Options API 的学习曲线会更平缓。而如果团队成员熟悉函数式编程、React Hooks 或其他现代前端技术栈，Composition API 会更加自然。

## 如何选择

在实际项目中选择使用哪种 API，并非一个非此即彼的决策。Vue 3 允许两种 API 在同一项目中共存，甚至可以在同一个组件中混用（尽管不推荐）。更合理的策略是根据具体情况做出选择。

对于新建项目，推荐默认使用 Composition API 配合 `<script setup>` 语法。这种组合提供了最简洁的代码编写体验和最好的性能特性。`<script setup>` 是编译时语法糖，它消除了 Composition API 中返回值的样板代码，同时提供更好的 IDE 支持：

```vue
<script setup>
import { ref, computed } from 'vue'

const count = ref(0)
const doubled = computed(() => count.value * 2)

function increment() {
  count.value++
}
</script>

<template>
  <button @click="increment">{{ count }} (doubled: {{ doubled }})</button>
</template>
```

对于维护现有的 Vue 2 项目或迁移到 Vue 3，可以采用渐进策略。保留现有的 Options API 组件不变，新增功能使用 Composition API 实现。如果需要在 Options API 组件中使用组合函数，可以通过 `setup` 选项引入：

```javascript
import { useSearch } from './composables/useSearch'

export default {
  data() {
    return {
      // 现有的 Options API 数据
      title: 'My Component'
    }
  },
  setup() {
    // 引入 Composition API 逻辑
    const { keyword, results, doSearch } = useSearch()
    return { keyword, results, doSearch }
  },
  methods: {
    // 现有的 Options API 方法
    updateTitle(newTitle) {
      this.title = newTitle
    }
  }
}
```

选择的核心原则是：让代码的组织方式服务于代码的可维护性。如果一个组件足够简单，Options API 的结构化组织能够保持清晰，那就使用 Options API。如果组件涉及多个关注点，或者需要复用逻辑，Composition API 会是更好的选择。避免教条主义——两种 API 都是 Vue 提供的工具，根据场景选择合适的工具才是明智之举。

最后，值得注意的是，尤雨溪在设计 Composition API 时明确表示，它的目标不是取代 Options API，而是解决 Options API 在特定场景下的局限性。两种 API 反映了不同的心智模型：Options API 是基于对象的、声明式的，适合描述「组件是什么」；Composition API 是基于函数的、命令式的，适合描述「组件如何工作」。理解这种差异，有助于我们在实践中做出更好的选择。
