# 测试用例

这一章提供完整的测试用例实现，涵盖 Mini Pinia 的所有核心功能。

## 测试入口

```typescript
// tests/index.test.ts
import { describe } from 'vitest'

// 导入所有测试模块
import './createPinia.test'
import './defineStore.test'
import './state.test'
import './getters.test'
import './actions.test'
import './patch.test'
import './reset.test'
import './subscribe.test'
import './onAction.test'
import './storeToRefs.test'
import './plugin.test'
import './integration.test'
```

## createPinia 测试

```typescript
// tests/createPinia.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia, getActivePinia } from '../src/createPinia'
import { isRef } from 'vue'

describe('createPinia', () => {
  it('should create pinia with reactive state', () => {
    const pinia = createPinia()
    
    expect(pinia).toBeDefined()
    expect(isRef(pinia.state)).toBe(true)
    expect(pinia.state.value).toEqual({})
  })
  
  it('should have _stores Map', () => {
    const pinia = createPinia()
    
    expect(pinia._stores).toBeInstanceOf(Map)
    expect(pinia._stores.size).toBe(0)
  })
  
  it('should have _plugins array', () => {
    const pinia = createPinia()
    
    expect(Array.isArray(pinia._plugins)).toBe(true)
    expect(pinia._plugins.length).toBe(0)
  })
  
  it('should have use method', () => {
    const pinia = createPinia()
    
    expect(typeof pinia.use).toBe('function')
  })
  
  it('should chain use calls', () => {
    const pinia = createPinia()
    
    const result = pinia
      .use(() => {})
      .use(() => {})
    
    expect(result).toBe(pinia)
    expect(pinia._plugins.length).toBe(2)
  })
  
  it('should have install method', () => {
    const pinia = createPinia()
    
    expect(typeof pinia.install).toBe('function')
  })
})

describe('setActivePinia / getActivePinia', () => {
  beforeEach(() => {
    setActivePinia(undefined as any)
  })
  
  it('should set and get active pinia', () => {
    const pinia = createPinia()
    
    setActivePinia(pinia)
    
    expect(getActivePinia()).toBe(pinia)
  })
  
  it('should return undefined when not set', () => {
    expect(getActivePinia()).toBeUndefined()
  })
})
```

## defineStore 测试

```typescript
// tests/defineStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from '../src/createPinia'
import { defineStore } from '../src/defineStore'
import { ref, computed } from 'vue'

describe('defineStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  
  describe('Options Store', () => {
    it('should define store with id and options', () => {
      const useStore = defineStore('test', {
        state: () => ({ count: 0 })
      })
      
      expect(typeof useStore).toBe('function')
      expect(useStore.$id).toBe('test')
    })
    
    it('should define store with options containing id', () => {
      const useStore = defineStore({
        id: 'test',
        state: () => ({ count: 0 })
      })
      
      expect(useStore.$id).toBe('test')
    })
    
    it('should return store instance', () => {
      const useStore = defineStore('test', {
        state: () => ({ count: 0 })
      })
      
      const store = useStore()
      
      expect(store.$id).toBe('test')
      expect(store.count).toBe(0)
    })
  })
  
  describe('Setup Store', () => {
    it('should define store with id and setup function', () => {
      const useStore = defineStore('test', () => {
        const count = ref(0)
        return { count }
      })
      
      const store = useStore()
      
      expect(store.$id).toBe('test')
      expect(store.count).toBe(0)
    })
    
    it('should support refs and computed', () => {
      const useStore = defineStore('test', () => {
        const count = ref(0)
        const double = computed(() => count.value * 2)
        return { count, double }
      })
      
      const store = useStore()
      
      expect(store.double).toBe(0)
      store.count = 5
      expect(store.double).toBe(10)
    })
  })
  
  describe('Store Caching', () => {
    it('should return same instance', () => {
      const useStore = defineStore('test', {
        state: () => ({ count: 0 })
      })
      
      const store1 = useStore()
      const store2 = useStore()
      
      expect(store1).toBe(store2)
    })
    
    it('should share state between calls', () => {
      const useStore = defineStore('test', {
        state: () => ({ count: 0 })
      })
      
      const store1 = useStore()
      store1.count = 10
      
      const store2 = useStore()
      expect(store2.count).toBe(10)
    })
  })
})
```

## State 测试

```typescript
// tests/state.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from '../src/createPinia'
import { defineStore } from '../src/defineStore'
import { nextTick, watchEffect } from 'vue'

describe('State', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  
  it('should initialize from state function', () => {
    const useStore = defineStore('test', {
      state: () => ({
        count: 0,
        name: 'test'
      })
    })
    
    const store = useStore()
    
    expect(store.count).toBe(0)
    expect(store.name).toBe('test')
  })
  
  it('should be reactive', async () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    const values: number[] = []
    
    watchEffect(() => {
      values.push(store.count)
    })
    
    expect(values).toEqual([0])
    
    store.count++
    await nextTick()
    
    expect(values).toEqual([0, 1])
  })
  
  it('should support nested objects', () => {
    const useStore = defineStore('test', {
      state: () => ({
        user: {
          name: 'John',
          profile: {
            age: 30
          }
        }
      })
    })
    
    const store = useStore()
    
    expect(store.user.name).toBe('John')
    expect(store.user.profile.age).toBe(30)
    
    store.user.profile.age = 31
    expect(store.user.profile.age).toBe(31)
  })
  
  it('should support arrays', () => {
    const useStore = defineStore('test', {
      state: () => ({
        items: [1, 2, 3]
      })
    })
    
    const store = useStore()
    
    expect(store.items).toEqual([1, 2, 3])
    
    store.items.push(4)
    expect(store.items).toEqual([1, 2, 3, 4])
  })
  
  it('should expose $state', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0, name: 'test' })
    })
    
    const store = useStore()
    
    expect(store.$state).toEqual({ count: 0, name: 'test' })
  })
  
  it('should allow replacing $state', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    store.$state = { count: 100 }
    
    expect(store.count).toBe(100)
  })
})
```

## Getters 测试

```typescript
// tests/getters.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from '../src/createPinia'
import { defineStore } from '../src/defineStore'

describe('Getters', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  
  it('should compute from state', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 5 }),
      getters: {
        double: (state) => state.count * 2
      }
    })
    
    const store = useStore()
    
    expect(store.double).toBe(10)
  })
  
  it('should be cached', () => {
    let computeCount = 0
    
    const useStore = defineStore('test', {
      state: () => ({ count: 1 }),
      getters: {
        expensive: (state) => {
          computeCount++
          return state.count * 10
        }
      }
    })
    
    const store = useStore()
    
    // 多次访问
    store.expensive
    store.expensive
    store.expensive
    
    // 只计算一次
    expect(computeCount).toBe(1)
  })
  
  it('should recompute when state changes', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 1 }),
      getters: {
        double: (state) => state.count * 2
      }
    })
    
    const store = useStore()
    
    expect(store.double).toBe(2)
    
    store.count = 5
    
    expect(store.double).toBe(10)
  })
  
  it('should access other getters via this', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 2 }),
      getters: {
        double: (state) => state.count * 2,
        quadruple() {
          return this.double * 2
        }
      }
    })
    
    const store = useStore()
    
    expect(store.quadruple).toBe(8)
  })
  
  it('should support getter with arguments', () => {
    const useStore = defineStore('test', {
      state: () => ({
        items: [
          { id: 1, name: 'a' },
          { id: 2, name: 'b' }
        ]
      }),
      getters: {
        getById: (state) => (id: number) => {
          return state.items.find(item => item.id === id)
        }
      }
    })
    
    const store = useStore()
    
    expect(store.getById(1)?.name).toBe('a')
    expect(store.getById(2)?.name).toBe('b')
    expect(store.getById(999)).toBeUndefined()
  })
})
```

## Actions 测试

```typescript
// tests/actions.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from '../src/createPinia'
import { defineStore } from '../src/defineStore'

describe('Actions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  
  it('should mutate state', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 }),
      actions: {
        increment() {
          this.count++
        }
      }
    })
    
    const store = useStore()
    store.increment()
    
    expect(store.count).toBe(1)
  })
  
  it('should access state and getters', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 2 }),
      getters: {
        double: (state) => state.count * 2
      },
      actions: {
        setToDouble() {
          this.count = this.double
        }
      }
    })
    
    const store = useStore()
    store.setToDouble()
    
    expect(store.count).toBe(4)
  })
  
  it('should support async actions', async () => {
    const mockApi = vi.fn().mockResolvedValue('data')
    
    const useStore = defineStore('test', {
      state: () => ({ data: null as string | null }),
      actions: {
        async fetchData() {
          this.data = await mockApi()
        }
      }
    })
    
    const store = useStore()
    await store.fetchData()
    
    expect(mockApi).toHaveBeenCalled()
    expect(store.data).toBe('data')
  })
  
  it('should call other actions', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 }),
      actions: {
        increment() {
          this.count++
        },
        incrementTwice() {
          this.increment()
          this.increment()
        }
      }
    })
    
    const store = useStore()
    store.incrementTwice()
    
    expect(store.count).toBe(2)
  })
  
  it('should receive arguments', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 }),
      actions: {
        add(amount: number) {
          this.count += amount
        }
      }
    })
    
    const store = useStore()
    store.add(5)
    
    expect(store.count).toBe(5)
  })
  
  it('should return value', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 10 }),
      actions: {
        getDouble() {
          return this.count * 2
        }
      }
    })
    
    const store = useStore()
    
    expect(store.getDouble()).toBe(20)
  })
  
  it('should access other stores', () => {
    const useStoreA = defineStore('a', {
      state: () => ({ value: 10 })
    })
    
    const useStoreB = defineStore('b', {
      state: () => ({ result: 0 }),
      actions: {
        compute() {
          const storeA = useStoreA()
          this.result = storeA.value * 2
        }
      }
    })
    
    const storeB = useStoreB()
    storeB.compute()
    
    expect(storeB.result).toBe(20)
  })
})
```

## 集成测试

```typescript
// tests/integration.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from '../src/createPinia'
import { defineStore } from '../src/defineStore'
import { storeToRefs } from '../src/storeToRefs'
import { nextTick, ref, computed } from 'vue'

describe('Integration Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  
  it('should work with complete store', async () => {
    const useStore = defineStore('counter', {
      state: () => ({
        count: 0,
        history: [] as number[]
      }),
      getters: {
        double: (state) => state.count * 2,
        lastHistory: (state) => state.history[state.history.length - 1]
      },
      actions: {
        increment() {
          this.count++
          this.history.push(this.count)
        },
        async asyncIncrement() {
          await new Promise(r => setTimeout(r, 10))
          this.increment()
        }
      }
    })
    
    const store = useStore()
    
    // 初始状态
    expect(store.count).toBe(0)
    expect(store.double).toBe(0)
    
    // 同步 action
    store.increment()
    expect(store.count).toBe(1)
    expect(store.double).toBe(2)
    expect(store.history).toEqual([1])
    
    // 异步 action
    await store.asyncIncrement()
    expect(store.count).toBe(2)
    expect(store.lastHistory).toBe(2)
    
    // $patch
    store.$patch({ count: 10 })
    expect(store.count).toBe(10)
    expect(store.double).toBe(20)
    
    // $reset
    store.$reset()
    expect(store.count).toBe(0)
    expect(store.history).toEqual([])
  })
  
  it('should work with plugins', () => {
    const pinia = createPinia()
    
    pinia.use(({ store }) => ({
      createdAt: Date.now(),
      log() {
        console.log(store.$id)
      }
    }))
    
    setActivePinia(pinia)
    
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    
    expect(store.createdAt).toBeDefined()
    expect(typeof store.log).toBe('function')
  })
  
  it('should work with storeToRefs', async () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 }),
      getters: {
        double: (state) => state.count * 2
      },
      actions: {
        increment() { this.count++ }
      }
    })
    
    const store = useStore()
    const { count, double } = storeToRefs(store)
    const { increment } = store
    
    expect(count.value).toBe(0)
    expect(double.value).toBe(0)
    
    count.value = 5
    expect(store.count).toBe(5)
    expect(double.value).toBe(10)
    
    increment()
    expect(count.value).toBe(6)
  })
  
  it('should work with subscriptions', async () => {
    const subscribeCallback = vi.fn()
    const onActionCallback = vi.fn()
    
    const useStore = defineStore('test', {
      state: () => ({ count: 0 }),
      actions: {
        increment() { this.count++ }
      }
    })
    
    const store = useStore()
    
    store.$subscribe(subscribeCallback)
    store.$onAction(onActionCallback)
    
    store.increment()
    await nextTick()
    
    expect(subscribeCallback).toHaveBeenCalled()
    expect(onActionCallback).toHaveBeenCalled()
  })
  
  it('should work with multiple stores', () => {
    const useUserStore = defineStore('user', {
      state: () => ({ name: 'John' })
    })
    
    const useCartStore = defineStore('cart', {
      state: () => ({ items: [] as string[] }),
      actions: {
        addItem(item: string) {
          const user = useUserStore()
          this.items.push(`${item} (by ${user.name})`)
        }
      }
    })
    
    const cart = useCartStore()
    cart.addItem('Book')
    
    expect(cart.items).toEqual(['Book (by John)'])
  })
})
```

## 运行测试

```bash
# 运行所有测试
npm test

# 查看覆盖率
npm test -- --coverage
```

测试完成后，下一章进行项目总结。
