# Composition API 的设计动机

Composition API 是 Vue3 最重要的新特性之一。理解它的设计动机，需要先回顾 Options API 在大型应用中面临的挑战。

## Options API 的局限

Options API 是 Vue2 的核心编程范式。组件通过 `data`、`computed`、`methods`、`watch` 等选项组织代码，这种结构在小型组件中清晰直观。

```javascript
export default {
  data() {
    return {
      searchQuery: '',
      searchResults: [],
      isLoading: false
    }
  },
  computed: {
    hasResults() {
      return this.searchResults.length > 0
    }
  },
  methods: {
    async search() {
      this.isLoading = true
      this.searchResults = await fetchResults(this.searchQuery)
      this.isLoading = false
    }
  },
  watch: {
    searchQuery: 'search'
  }
}
```

这个搜索组件看起来没什么问题。但当组件需要处理多个独立的功能时，问题开始显现。假设我们需要添加分页功能和排序功能，代码会变成这样：

```javascript
export default {
  data() {
    return {
      // 搜索相关
      searchQuery: '',
      searchResults: [],
      isLoading: false,
      // 分页相关
      currentPage: 1,
      pageSize: 10,
      totalPages: 0,
      // 排序相关
      sortField: 'date',
      sortOrder: 'desc'
    }
  },
  computed: {
    // 搜索相关
    hasResults() { /* ... */ },
    // 分页相关
    paginatedResults() { /* ... */ },
    // 排序相关
    sortedResults() { /* ... */ }
  },
  methods: {
    // 搜索相关
    async search() { /* ... */ },
    // 分页相关
    goToPage(page) { /* ... */ },
    // 排序相关
    changeSort(field) { /* ... */ }
  },
  watch: {
    searchQuery: 'search',
    currentPage: 'fetchPage',
    sortField: 'resort'
  }
}
```

注意到问题了吗？三个逻辑上独立的功能（搜索、分页、排序）的代码被分散在四个不同的选项中。随着功能继续增加，组件变得越来越难以理解和维护。我们称这种现象为"逻辑碎片化"。

## Mixins 的问题

Vue2 提供了 Mixins 来复用逻辑，但这个方案有几个严重缺陷。

**来源不清晰**：当组件使用多个 Mixin 时，很难追踪某个属性或方法来自哪里。

```javascript
// 使用了三个 Mixin 的组件
export default {
  mixins: [searchMixin, paginationMixin, sortMixin],
  methods: {
    handleClick() {
      this.search()  // 来自哪个 Mixin？
      this.reset()   // 来自哪个 Mixin？
    }
  }
}
```

**命名冲突**：如果两个 Mixin 定义了同名属性，后者会覆盖前者，可能导致难以追踪的 bug。

**隐式依赖**：Mixin 可能依赖组件中的特定属性，这种依赖关系是隐式的，容易被打破。

## Composition API 的解决方案

Composition API 提供了一种全新的代码组织方式。它允许我们按照逻辑关注点组织代码，而不是按照选项类型。

```javascript
import { ref, computed, watch } from 'vue'

// 搜索逻辑 - 一个独立的组合函数
function useSearch() {
  const query = ref('')
  const results = ref([])
  const isLoading = ref(false)
  const hasResults = computed(() => results.value.length > 0)

  async function search() {
    isLoading.value = true
    results.value = await fetchResults(query.value)
    isLoading.value = false
  }

  watch(query, search)

  return { query, results, isLoading, hasResults, search }
}

// 分页逻辑 - 另一个独立的组合函数
function usePagination(items) {
  const currentPage = ref(1)
  const pageSize = ref(10)
  const totalPages = computed(() => Math.ceil(items.value.length / pageSize.value))
  const paginatedItems = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return items.value.slice(start, start + pageSize.value)
  })

  function goToPage(page) {
    currentPage.value = page
  }

  return { currentPage, pageSize, totalPages, paginatedItems, goToPage }
}
```

现在，相关的代码被组织在一起。每个组合函数是一个独立的单元，可以单独开发、测试和复用。在组件中使用时，来源完全清晰：

```javascript
export default {
  setup() {
    const { query, results, isLoading, hasResults, search } = useSearch()
    const { currentPage, paginatedItems, goToPage } = usePagination(results)

    return {
      query, results, isLoading, hasResults, search,
      currentPage, paginatedItems, goToPage
    }
  }
}
```

每个变量的来源一目了然，没有隐式依赖，没有命名冲突风险。

## 类型推导的优势

Composition API 的另一个重要优势是更好的 TypeScript 支持。由于代码组织在函数中，TypeScript 可以准确推导出每个变量的类型。

```typescript
function useSearch() {
  const query = ref('')        // 类型推导为 Ref<string>
  const results = ref<User[]>([])  // 明确指定泛型

  async function search(): Promise<void> {
    // TypeScript 知道 results.value 是 User[]
    results.value = await fetchUsers(query.value)
  }

  return { query, results, search }
}
```

Options API 中，`this` 的类型很难准确推导，因为它依赖于整个组件选项的合并结果。Composition API 避开了这个问题，让类型推导变得自然而准确。

## 设计权衡

Composition API 不是要取代 Options API，而是提供另一种选择。对于简单组件，Options API 仍然是很好的选择，它的结构化特性让新手更容易理解。Composition API 的优势在复杂场景中更加明显。

Vue3 同时支持两种 API，开发者可以根据项目需求和团队偏好做出选择。这体现了 Vue 渐进式框架的理念——不强迫用户接受某种范式，而是提供选择的自由。
