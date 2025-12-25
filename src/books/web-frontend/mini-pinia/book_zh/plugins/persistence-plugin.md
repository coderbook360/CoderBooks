---
sidebar_position: 68
title: 持久化插件实战
---

# 持久化插件实战

持久化插件是最常用的 Pinia 插件之一。本章从零实现一个完整的持久化方案。

## 需求分析

一个好的持久化插件应该支持：

1. **自动保存**：状态变化时自动保存
2. **自动恢复**：页面刷新后恢复状态
3. **选择性持久化**：只持久化部分状态
4. **多存储后端**：localStorage、sessionStorage
5. **自定义序列化**：支持特殊类型
6. **过期机制**：TTL 支持

## 基础版本

```javascript
function persistPlugin({ store, options }) {
  // 检查是否启用持久化
  if (!options.persist) return
  
  const key = `pinia_${store.$id}`
  
  // 恢复状态
  const saved = localStorage.getItem(key)
  if (saved) {
    store.$patch(JSON.parse(saved))
  }
  
  // 监听变化并保存
  store.$subscribe(() => {
    localStorage.setItem(key, JSON.stringify(store.$state))
  })
}
```

## 完整实现

```javascript
function createPersistPlugin(globalOptions = {}) {
  const {
    storage: globalStorage = localStorage,
    key: globalKeyPrefix = 'pinia',
    serialize: globalSerialize = JSON.stringify,
    deserialize: globalDeserialize = JSON.parse
  } = globalOptions
  
  return ({ store, options }) => {
    const persistConfig = options.persist
    
    // 未启用持久化
    if (!persistConfig) return
    
    // 解析配置
    const config = typeof persistConfig === 'boolean'
      ? {}
      : persistConfig
    
    const {
      enabled = true,
      key = `${globalKeyPrefix}_${store.$id}`,
      storage = globalStorage,
      paths = null,  // null 表示全部
      serializer = {
        serialize: globalSerialize,
        deserialize: globalDeserialize
      },
      beforeRestore = null,
      afterRestore = null,
      ttl = null  // 毫秒
    } = config
    
    if (!enabled) return
    
    // 获取存储
    const getStorage = () => {
      if (typeof storage === 'string') {
        return storage === 'sessionStorage' ? sessionStorage : localStorage
      }
      return storage
    }
    
    const activeStorage = getStorage()
    
    // 恢复状态
    const restore = () => {
      try {
        const saved = activeStorage.getItem(key)
        
        if (!saved) return
        
        const parsed = serializer.deserialize(saved)
        
        // 检查过期
        if (ttl && parsed._persistedAt) {
          const age = Date.now() - parsed._persistedAt
          if (age > ttl) {
            activeStorage.removeItem(key)
            return
          }
        }
        
        // 恢复前钩子
        if (beforeRestore) {
          beforeRestore(store)
        }
        
        // 应用保存的状态
        const stateToRestore = { ...parsed }
        delete stateToRestore._persistedAt
        
        if (paths) {
          // 只恢复指定路径
          const partial = {}
          paths.forEach(path => {
            const value = getNestedValue(stateToRestore, path)
            if (value !== undefined) {
              setNestedValue(partial, path, value)
            }
          })
          store.$patch(partial)
        } else {
          store.$patch(stateToRestore)
        }
        
        // 恢复后钩子
        if (afterRestore) {
          afterRestore(store)
        }
        
      } catch (error) {
        console.error(`[Persist] Failed to restore ${store.$id}:`, error)
      }
    }
    
    // 保存状态
    const persist = () => {
      try {
        let stateToPersist = { ...store.$state }
        
        // 只保存指定路径
        if (paths) {
          const filtered = {}
          paths.forEach(path => {
            const value = getNestedValue(store.$state, path)
            if (value !== undefined) {
              setNestedValue(filtered, path, value)
            }
          })
          stateToPersist = filtered
        }
        
        // 添加持久化时间戳（用于 TTL）
        if (ttl) {
          stateToPersist._persistedAt = Date.now()
        }
        
        activeStorage.setItem(key, serializer.serialize(stateToPersist))
        
      } catch (error) {
        console.error(`[Persist] Failed to persist ${store.$id}:`, error)
      }
    }
    
    // 初始化：恢复状态
    restore()
    
    // 订阅变化：保存状态
    store.$subscribe(() => {
      persist()
    }, { detached: true })
    
    // 添加手动方法
    store.$persist = persist
    store.$clearPersisted = () => {
      activeStorage.removeItem(key)
    }
  }
}

// 辅助函数：获取嵌套值
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => 
    current?.[key], obj
  )
}

// 辅助函数：设置嵌套值
function setNestedValue(obj, path, value) {
  const keys = path.split('.')
  const lastKey = keys.pop()
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {}
    return current[key]
  }, obj)
  target[lastKey] = value
}

export { createPersistPlugin }
```

## 使用方式

### 基本使用

```javascript
import { createPersistPlugin } from './persist-plugin'

const pinia = createPinia()
pinia.use(createPersistPlugin())

// Store 启用持久化
const useUserStore = defineStore('user', {
  state: () => ({
    name: '',
    email: '',
    preferences: {}
  }),
  persist: true  // 启用
})
```

### 详细配置

```javascript
const useUserStore = defineStore('user', {
  state: () => ({
    name: '',
    email: '',
    token: '',
    preferences: {
      theme: 'light',
      language: 'en'
    }
  }),
  persist: {
    enabled: true,
    key: 'my-user-store',
    storage: 'localStorage',
    paths: ['name', 'preferences'],  // 只持久化这些
    ttl: 7 * 24 * 60 * 60 * 1000,    // 7 天过期
    beforeRestore: (store) => {
      console.log('Restoring store...')
    },
    afterRestore: (store) => {
      console.log('Store restored!')
    }
  }
})
```

### 自定义序列化

```javascript
const useDataStore = defineStore('data', {
  state: () => ({
    createdAt: new Date(),
    items: new Map()
  }),
  persist: {
    enabled: true,
    serializer: {
      serialize: (state) => {
        return JSON.stringify({
          ...state,
          createdAt: state.createdAt.toISOString(),
          items: Array.from(state.items.entries())
        })
      },
      deserialize: (saved) => {
        const parsed = JSON.parse(saved)
        return {
          ...parsed,
          createdAt: new Date(parsed.createdAt),
          items: new Map(parsed.items)
        }
      }
    }
  }
})
```

## 防抖保存

避免频繁写入：

```javascript
function createPersistPlugin(globalOptions = {}) {
  const { debounce: globalDebounce = 100 } = globalOptions
  
  return ({ store, options }) => {
    const config = options.persist
    if (!config) return
    
    const debounceTime = config.debounce ?? globalDebounce
    
    let timeoutId = null
    
    const debouncedPersist = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        persist()
      }, debounceTime)
    }
    
    store.$subscribe(() => {
      debouncedPersist()
    }, { detached: true })
  }
}
```

## 与 SSR 兼容

```javascript
function createPersistPlugin(globalOptions = {}) {
  return ({ store, options }) => {
    const config = options.persist
    if (!config) return
    
    // SSR 环境检测
    const isServer = typeof window === 'undefined'
    
    if (isServer) {
      // 服务端不执行持久化
      return
    }
    
    // 客户端正常执行
    // ...
  }
}
```

## 加密存储

```javascript
import CryptoJS from 'crypto-js'

const SECRET_KEY = 'your-secret-key'

const encryptedSerializer = {
  serialize: (state) => {
    const json = JSON.stringify(state)
    return CryptoJS.AES.encrypt(json, SECRET_KEY).toString()
  },
  deserialize: (saved) => {
    const bytes = CryptoJS.AES.decrypt(saved, SECRET_KEY)
    const json = bytes.toString(CryptoJS.enc.Utf8)
    return JSON.parse(json)
  }
}

const useSecureStore = defineStore('secure', {
  state: () => ({
    sensitiveData: ''
  }),
  persist: {
    enabled: true,
    serializer: encryptedSerializer
  }
})
```

## 测试持久化插件

```javascript
describe('Persist Plugin', () => {
  beforeEach(() => {
    localStorage.clear()
  })
  
  test('persists state to localStorage', () => {
    const pinia = createPinia()
    pinia.use(createPersistPlugin())
    
    const app = createApp({ template: '<div />' })
    app.use(pinia)
    
    const useStore = defineStore('test', {
      state: () => ({ count: 0 }),
      persist: true
    })
    
    const store = useStore()
    store.count = 42
    
    const saved = localStorage.getItem('pinia_test')
    expect(JSON.parse(saved).count).toBe(42)
  })
  
  test('restores state from localStorage', () => {
    localStorage.setItem('pinia_test', JSON.stringify({ count: 100 }))
    
    const pinia = createPinia()
    pinia.use(createPersistPlugin())
    
    const app = createApp({ template: '<div />' })
    app.use(pinia)
    
    const useStore = defineStore('test', {
      state: () => ({ count: 0 }),
      persist: true
    })
    
    const store = useStore()
    
    expect(store.count).toBe(100)
  })
  
  test('respects paths option', () => {
    const pinia = createPinia()
    pinia.use(createPersistPlugin())
    
    const app = createApp({ template: '<div />' })
    app.use(pinia)
    
    const useStore = defineStore('test', {
      state: () => ({
        persist: 'yes',
        noPersist: 'no'
      }),
      persist: {
        enabled: true,
        paths: ['persist']
      }
    })
    
    const store = useStore()
    store.persist = 'updated'
    store.noPersist = 'also updated'
    
    const saved = JSON.parse(localStorage.getItem('pinia_test'))
    expect(saved.persist).toBe('updated')
    expect(saved.noPersist).toBeUndefined()
  })
  
  test('expires after TTL', async () => {
    // 先保存带 TTL 的数据
    localStorage.setItem('pinia_test', JSON.stringify({
      count: 100,
      _persistedAt: Date.now() - 10000  // 10 秒前
    }))
    
    const pinia = createPinia()
    pinia.use(createPersistPlugin())
    
    const app = createApp({ template: '<div />' })
    app.use(pinia)
    
    const useStore = defineStore('test', {
      state: () => ({ count: 0 }),
      persist: {
        enabled: true,
        ttl: 5000  // 5 秒过期
      }
    })
    
    const store = useStore()
    
    // 已过期，使用默认值
    expect(store.count).toBe(0)
  })
})
```

## 本章小结

本章实现了完整的持久化插件：

- **自动恢复**：初始化时从存储恢复
- **自动保存**：订阅变化并保存
- **选择性持久化**：paths 选项
- **过期机制**：TTL 支持
- **自定义序列化**：支持特殊类型
- **SSR 兼容**：服务端检测
- **防抖保存**：避免频繁写入

下一章实现日志插件。
