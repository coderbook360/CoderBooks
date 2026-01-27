# 单元测试

良好的测试是代码质量的保障。这一章设计 Mini Pinia 的测试策略。

## 测试工具选择

使用 Vitest 作为测试框架：

```bash
npm install -D vitest @vue/test-utils happy-dom
```

配置 vitest.config.ts：

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true
  }
})
```

## 测试目录结构

```
src/
├── createPinia.ts
├── defineStore.ts
├── ...
tests/
├── createPinia.test.ts
├── defineStore.test.ts
├── state.test.ts
├── getters.test.ts
├── actions.test.ts
├── patch.test.ts
├── reset.test.ts
├── subscribe.test.ts
├── onAction.test.ts
├── storeToRefs.test.ts
├── plugin.test.ts
└── integration.test.ts
```

## 测试辅助函数

创建通用的测试辅助：

```typescript
// tests/helpers.ts
import { createPinia, setActivePinia } from '../src/createPinia'
import type { Pinia } from '../src/types'

/**
 * 创建干净的测试环境
 */
export function setupTestPinia(): Pinia {
  const pinia = createPinia()
  setActivePinia(pinia)
  return pinia
}

/**
 * 等待 Vue 响应式更新
 */
export { nextTick } from 'vue'

/**
 * 创建模拟函数
 */
export { vi } from 'vitest'
```

## 测试分类

### 1. 单元测试

测试单个函数或模块：

```typescript
describe('createPinia', () => {
  it('should create pinia instance', () => {
    const pinia = createPinia()
    
    expect(pinia).toBeDefined()
    expect(pinia.state).toBeDefined()
    expect(pinia._stores).toBeInstanceOf(Map)
  })
})
```

### 2. 集成测试

测试多个模块协作：

```typescript
describe('Store Integration', () => {
  it('should work with state, getters, and actions', () => {
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
    
    expect(store.count).toBe(0)
    expect(store.double).toBe(0)
    
    store.increment()
    
    expect(store.count).toBe(1)
    expect(store.double).toBe(2)
  })
})
```

### 3. 边界测试

测试边界条件：

```typescript
describe('Edge Cases', () => {
  it('should handle empty state', () => {
    const useStore = defineStore('empty', {})
    const store = useStore()
    
    expect(store.$id).toBe('empty')
  })
  
  it('should handle undefined values', () => {
    const useStore = defineStore('test', {
      state: () => ({ value: undefined })
    })
    
    const store = useStore()
    expect(store.value).toBeUndefined()
  })
})
```

## 测试覆盖要点

### createPinia

```typescript
describe('createPinia', () => {
  it('should create pinia instance with correct structure')
  it('should have reactive state')
  it('should support use() for plugins')
  it('should support chained use() calls')
  it('should have install method for Vue app')
})
```

### defineStore

```typescript
describe('defineStore', () => {
  it('should accept id and options')
  it('should accept id and setup function')
  it('should accept options with id property')
  it('should return useStore function')
  it('should cache store instance')
  it('should support multiple stores')
})
```

### State

```typescript
describe('State', () => {
  it('should initialize state from function')
  it('should be reactive')
  it('should support nested objects')
  it('should support arrays')
  it('should share state across components')
})
```

### Getters

```typescript
describe('Getters', () => {
  it('should compute from state')
  it('should be cached')
  it('should update when state changes')
  it('should access other getters via this')
  it('should support getter with arguments')
})
```

### Actions

```typescript
describe('Actions', () => {
  it('should mutate state')
  it('should access state and getters')
  it('should support async actions')
  it('should call other actions')
  it('should receive arguments')
  it('should return value')
})
```

### $patch

```typescript
describe('$patch', () => {
  describe('object mode', () => {
    it('should patch state with object')
    it('should deep merge objects')
    it('should replace arrays')
  })
  
  describe('function mode', () => {
    it('should patch state with function')
    it('should allow array mutations')
    it('should allow conditional updates')
  })
})
```

### $reset

```typescript
describe('$reset', () => {
  it('should reset state to initial values')
  it('should reset nested objects')
  it('should reset arrays')
  it('should throw error for setup store')
})
```

### $subscribe

```typescript
describe('$subscribe', () => {
  it('should trigger on state change')
  it('should provide mutation type')
  it('should unsubscribe')
  it('should support immediate option')
  it('should detect nested changes')
})
```

### $onAction

```typescript
describe('$onAction', () => {
  it('should trigger before action')
  it('should provide action arguments')
  it('should call after callback on success')
  it('should call onError callback on failure')
  it('should handle async actions')
  it('should unsubscribe')
})
```

### storeToRefs

```typescript
describe('storeToRefs', () => {
  it('should extract state as refs')
  it('should extract getters as refs')
  it('should skip actions')
  it('should skip $ prefixed properties')
  it('should maintain reactivity')
})
```

### Plugin System

```typescript
describe('Plugin System', () => {
  it('should call plugin when store is created')
  it('should provide context to plugin')
  it('should extend store with returned object')
  it('should support multiple plugins')
})
```

## 异步测试

处理异步操作：

```typescript
it('should handle async actions', async () => {
  const useStore = defineStore('test', {
    state: () => ({ data: null }),
    actions: {
      async fetchData() {
        this.data = await Promise.resolve('result')
      }
    }
  })
  
  const store = useStore()
  await store.fetchData()
  
  expect(store.data).toBe('result')
})
```

## 响应式测试

测试响应式更新：

```typescript
import { nextTick, watchEffect } from 'vue'

it('should trigger watchEffect', async () => {
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
```

## Mock 策略

### 模拟 API 调用

```typescript
const mockApi = vi.fn().mockResolvedValue({ data: 'test' })

const useStore = defineStore('test', {
  actions: {
    async fetch() {
      return mockApi()
    }
  }
})

it('should call api', async () => {
  const store = useStore()
  await store.fetch()
  
  expect(mockApi).toHaveBeenCalled()
})
```

### 模拟定时器

```typescript
vi.useFakeTimers()

it('should debounce', async () => {
  store.debouncedAction()
  store.debouncedAction()
  store.debouncedAction()
  
  vi.advanceTimersByTime(300)
  
  expect(callback).toHaveBeenCalledTimes(1)
})

vi.useRealTimers()
```

## 运行测试

```bash
# 运行所有测试
npm test

# 监听模式
npm test -- --watch

# 覆盖率报告
npm test -- --coverage

# 运行特定文件
npm test -- tests/state.test.ts
```

## 测试脚本配置

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

下一章我们编写具体的测试用例。
