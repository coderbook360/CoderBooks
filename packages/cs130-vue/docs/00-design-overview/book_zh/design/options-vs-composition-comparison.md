# Options API vs Composition API 设计对比

Vue3 保留了 Options API，同时引入了 Composition API。这不是取代关系，而是针对不同场景的补充。

## Options API 的优势

Options API 是 Vue2 的标志性设计，按选项类型组织代码：

```javascript
export default {
  data() {
    return {
      count: 0,
      name: ''
    }
  },
  computed: {
    double() {
      return this.count * 2
    }
  },
  methods: {
    increment() {
      this.count++
    }
  },
  mounted() {
    console.log('mounted')
  }
}
```

这种组织方式对初学者友好。每个选项做什么一目了然，不需要理解闭包、响应式原理等概念。框架帮你处理好一切，你只需要往对应位置填代码。

对于中小型组件，Options API 足够好用。代码量不大时，跳转几个位置看代码不是问题。

## Options API 的痛点

当组件变大后，Options API 的问题开始显现。

一个功能的代码分散在多处：

```javascript
export default {
  data() {
    return {
      // 功能 A 的状态
      searchQuery: '',
      searchResults: [],
      // 功能 B 的状态
      pagination: { page: 1, pageSize: 10 },
      // 功能 C 的状态
      filters: {}
    }
  },
  computed: {
    // A、B、C 的计算属性混在一起
  },
  methods: {
    // A、B、C 的方法混在一起
  },
  mounted() {
    // A、B、C 的初始化逻辑混在一起
  }
}
```

阅读"搜索"功能时，需要在 data、computed、methods、生命周期之间跳来跳去。组件越大，这种碎片化越严重。

逻辑复用也是问题。Vue2 用 mixins 复用逻辑，但 mixins 有命名冲突、来源不清晰等问题。

```javascript
// 两个 mixin 可能定义同名属性
const mixinA = { data: () => ({ count: 0 }) }
const mixinB = { data: () => ({ count: 100 }) }

export default {
  mixins: [mixinA, mixinB],
  // count 是 0 还是 100？哪个 mixin 提供的？
}
```

## Composition API 的解法

Composition API 按功能组织代码，把相关逻辑放在一起：

```javascript
import { ref, computed, onMounted } from 'vue'

function useSearch() {
  const query = ref('')
  const results = ref([])

  const search = async () => {
    results.value = await fetchResults(query.value)
  }

  return { query, results, search }
}

function usePagination() {
  const page = ref(1)
  const pageSize = ref(10)

  const next = () => page.value++
  const prev = () => page.value--

  return { page, pageSize, next, prev }
}

export default {
  setup() {
    const { query, results, search } = useSearch()
    const { page, pageSize, next, prev } = usePagination()

    onMounted(() => {
      search()
    })

    return { query, results, search, page, pageSize, next, prev }
  }
}
```

每个功能被封装在一个函数中，可以独立开发、测试和复用。组件只是把这些功能组合起来。

## 逻辑复用的革新

Composition API 用组合函数（composables）取代 mixins：

```javascript
// composables/useCounter.js
import { ref, computed } from 'vue'

export function useCounter(initialValue = 0) {
  const count = ref(initialValue)
  const double = computed(() => count.value * 2)

  function increment() {
    count.value++
  }

  function decrement() {
    count.value--
  }

  return { count, double, increment, decrement }
}
```

组合函数的优势：

显式导入：使用什么一目了然，不会有隐藏的依赖。

无命名冲突：返回的变量在使用处命名，完全由使用者控制。

更好的类型推断：TypeScript 可以准确推断类型。

可测试：纯函数，容易单元测试。

## 两种 API 的共存

Vue3 不强制二选一，两种 API 可以共存：

```javascript
export default {
  data() {
    return { name: '' }  // Options API
  },
  setup() {
    const count = ref(0)  // Composition API
    return { count }
  },
  methods: {
    greet() {
      // 可以访问两边的数据
      console.log(this.name, this.count)
    }
  }
}
```

官方建议：

简单组件：Options API 就够了，不需要过度设计。

复杂组件：Composition API 更好维护。

需要复用逻辑：Composition API 的组合函数是首选。

库/框架开发：Composition API 提供更好的灵活性。

渐进式迁移：可以在现有 Options API 组件中逐步引入 Composition API。

这种包容性体现了 Vue 的务实哲学：提供多种工具，让开发者根据场景选择最合适的方式。
