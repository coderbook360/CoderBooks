---
sidebar_position: 72
title: 性能优化实践
---

# 性能优化实践

本章总结 Pinia 使用中的性能优化技巧和最佳实践。

## Store 设计优化

### 避免过大的 Store

```javascript
// ❌ 单一庞大 Store
const useAppStore = defineStore('app', {
  state: () => ({
    user: {},
    products: [],
    cart: [],
    orders: [],
    settings: {},
    notifications: []
    // ... 更多
  })
})

// ✅ 拆分为专注的 Store
const useUserStore = defineStore('user', { ... })
const useProductStore = defineStore('product', { ... })
const useCartStore = defineStore('cart', { ... })
```

**优点**：
- 按需加载，减少初始化开销
- 更细粒度的响应式追踪
- 更好的代码组织

### 惰性初始化

```javascript
// ❌ 立即初始化所有数据
const useDataStore = defineStore('data', {
  state: () => ({
    hugeList: generateHugeList()  // 立即执行
  })
})

// ✅ 惰性初始化
const useDataStore = defineStore('data', {
  state: () => ({
    hugeList: null
  }),
  actions: {
    initializeIfNeeded() {
      if (this.hugeList === null) {
        this.hugeList = generateHugeList()
      }
    }
  }
})
```

## 状态更新优化

### 批量更新

```javascript
// ❌ 多次单独更新
store.name = 'John'
store.age = 30
store.email = 'john@example.com'
// 触发 3 次响应式更新

// ✅ 使用 $patch 批量更新
store.$patch({
  name: 'John',
  age: 30,
  email: 'john@example.com'
})
// 只触发 1 次更新
```

### $patch 函数形式

```javascript
// 对于复杂更新，函数形式更高效
store.$patch(state => {
  state.items.push(newItem)
  state.total += newItem.price
  state.lastUpdated = Date.now()
})
```

### 避免不必要的响应式

```javascript
// ❌ 大型静态数据也被响应式化
const useConfigStore = defineStore('config', {
  state: () => ({
    staticData: hugeStaticConfig  // 不需要响应式
  })
})

// ✅ 使用 markRaw 跳过响应式
import { markRaw } from 'vue'

const useConfigStore = defineStore('config', {
  state: () => ({
    staticData: markRaw(hugeStaticConfig)
  })
})
```

## Getter 优化

### 利用计算属性缓存

```javascript
const useStore = defineStore('store', {
  state: () => ({
    items: []
  }),
  getters: {
    // ✅ 自动缓存，只在 items 变化时重新计算
    expensiveComputed() {
      return this.items.reduce((acc, item) => {
        return acc + complexCalculation(item)
      }, 0)
    }
  }
})
```

### 避免 getter 中的副作用

```javascript
// ❌ getter 中有副作用
getters: {
  computedValue() {
    console.log('Computing...')  // 副作用
    localStorage.setItem('cache', this.value)  // 副作用
    return this.value * 2
  }
}

// ✅ getter 保持纯函数
getters: {
  computedValue() {
    return this.value * 2
  }
}
```

### 参数化 getter

```javascript
// ✅ 返回函数实现参数化
getters: {
  getItemById: (state) => {
    // 创建索引提高查找效率
    const index = new Map(state.items.map(item => [item.id, item]))
    
    return (id) => index.get(id)
  }
}
```

## 订阅优化

### 使用 detached 避免内存泄漏

```javascript
// 组件外的订阅
const unsubscribe = store.$subscribe(
  (mutation, state) => {
    // 处理变化
  },
  { detached: true }  // 不随组件销毁
)

// 手动清理
onUnmounted(() => {
  unsubscribe()
})
```

### 防抖订阅

```javascript
import { debounce } from 'lodash-es'

const debouncedHandler = debounce((mutation, state) => {
  // 持久化或同步操作
  saveToServer(state)
}, 1000)

store.$subscribe(debouncedHandler, { detached: true })
```

### 选择性订阅

```javascript
store.$subscribe((mutation, state) => {
  // 只处理特定类型的变化
  if (mutation.type === 'patch object') {
    // 只有 $patch 对象形式才处理
  }
  
  // 只处理特定字段变化
  if ('importantField' in (mutation.payload || {})) {
    // 只有 importantField 变化才处理
  }
})
```

## 组件级优化

### storeToRefs 避免失去响应式

```javascript
// ❌ 解构会失去响应式
const { count, name } = store
// count 和 name 不是响应式的

// ✅ 使用 storeToRefs
import { storeToRefs } from 'pinia'

const store = useStore()
const { count, name } = storeToRefs(store)
// count 和 name 保持响应式
```

### 按需获取

```javascript
// ❌ 获取整个 Store 但只用少量属性
const store = useStore()
// 组件会追踪整个 store 的所有变化

// ✅ 只解构需要的属性
const { specificProp } = storeToRefs(useStore())
// 只追踪 specificProp 的变化
```

### computed 包装

```javascript
// 对于复杂的派生数据，使用 computed
const store = useStore()

const derivedData = computed(() => {
  // 复杂计算只在依赖变化时执行
  return store.items
    .filter(item => item.active)
    .map(item => transform(item))
    .sort((a, b) => a.order - b.order)
})
```

## 大数据处理

### 虚拟列表

```javascript
// 配合虚拟滚动库
const useListStore = defineStore('list', {
  state: () => ({
    allItems: [],  // 完整数据
    visibleRange: { start: 0, end: 50 }
  }),
  getters: {
    // 只返回可见范围的数据
    visibleItems() {
      const { start, end } = this.visibleRange
      return this.allItems.slice(start, end)
    }
  },
  actions: {
    updateVisibleRange(start, end) {
      this.visibleRange = { start, end }
    }
  }
})
```

### 分页数据

```javascript
const usePaginatedStore = defineStore('paginated', {
  state: () => ({
    pages: {},  // 按页缓存
    currentPage: 1,
    pageSize: 20
  }),
  getters: {
    currentItems() {
      return this.pages[this.currentPage] || []
    }
  },
  actions: {
    async loadPage(page) {
      if (this.pages[page]) {
        this.currentPage = page
        return
      }
      
      const data = await fetchPage(page, this.pageSize)
      this.pages[page] = data
      this.currentPage = page
    }
  }
})
```

### 索引优化

```javascript
const useIndexedStore = defineStore('indexed', {
  state: () => ({
    items: [],
    // 维护索引
    _indexById: new Map(),
    _indexByCategory: new Map()
  }),
  actions: {
    addItem(item) {
      this.items.push(item)
      
      // 更新索引
      this._indexById.set(item.id, item)
      
      const categoryItems = this._indexByCategory.get(item.category) || []
      categoryItems.push(item)
      this._indexByCategory.set(item.category, categoryItems)
    },
    
    getById(id) {
      return this._indexById.get(id)  // O(1)
    },
    
    getByCategory(category) {
      return this._indexByCategory.get(category) || []  // O(1)
    }
  }
})
```

## 内存优化

### 清理不用的 Store

```javascript
// 路由离开时清理
router.afterEach((to, from) => {
  // 如果离开了某个页面，清理其 Store
  if (from.name === 'DataHeavyPage') {
    const store = useDataHeavyStore()
    store.$dispose()
  }
})
```

### 限制历史记录

```javascript
const useHistoryStore = defineStore('history', {
  state: () => ({
    history: [],
    maxHistory: 100
  }),
  actions: {
    addEntry(entry) {
      this.history.push(entry)
      
      // 限制大小
      if (this.history.length > this.maxHistory) {
        this.history = this.history.slice(-this.maxHistory)
      }
    }
  }
})
```

## 性能监控

### 开发时性能追踪

```javascript
function performancePlugin({ store }) {
  store.$subscribe((mutation, state) => {
    console.time(`[${store.$id}] subscription`)
    // 正常处理
    console.timeEnd(`[${store.$id}] subscription`)
  })
  
  store.$onAction(({ name, after }) => {
    const start = performance.now()
    
    after(() => {
      const duration = performance.now() - start
      if (duration > 100) {
        console.warn(`[${store.$id}] Slow action: ${name} took ${duration}ms`)
      }
    })
  })
}
```

## 优化检查清单

**Store 设计**
- [ ] Store 是否足够小且专注？
- [ ] 大型静态数据是否使用 markRaw？
- [ ] 是否有惰性初始化机会？

**状态更新**
- [ ] 是否使用 $patch 批量更新？
- [ ] 是否避免了不必要的更新？

**订阅**
- [ ] 是否正确使用 detached？
- [ ] 是否对频繁操作使用防抖？

**组件**
- [ ] 是否使用 storeToRefs？
- [ ] 是否只解构需要的属性？

## 本章小结

本章总结了性能优化实践：

- **Store 设计**：拆分、惰性初始化
- **状态更新**：$patch 批量更新、markRaw
- **Getter 优化**：利用缓存、保持纯函数
- **订阅优化**：detached、防抖、选择性订阅
- **大数据处理**：虚拟列表、分页、索引
- **内存管理**：$dispose、限制历史

下一章是本书的总结与展望。
