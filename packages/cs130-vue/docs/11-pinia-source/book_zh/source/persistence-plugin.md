# 持久化插件

状态持久化是常见需求。这一章实现一个完整的持久化插件。

## 核心需求

持久化插件需要：

- 页面刷新后恢复状态
- 支持选择性持久化部分字段
- 支持不同存储后端
- 处理序列化问题

## 基础实现

最简单的持久化：

```typescript
function persistPlugin({ store }) {
  const key = `pinia-${store.$id}`
  
  // 恢复
  const saved = localStorage.getItem(key)
  if (saved) {
    store.$patch(JSON.parse(saved))
  }
  
  // 保存
  store.$subscribe((mutation, state) => {
    localStorage.setItem(key, JSON.stringify(state))
  }, { detached: true })
}
```

## 可配置的持久化插件

支持配置选项：

```typescript
interface PersistOptions {
  enabled?: boolean
  key?: string
  storage?: Storage
  paths?: string[]
  serializer?: {
    serialize: (state: any) => string
    deserialize: (raw: string) => any
  }
}

function createPersistPlugin() {
  return ({ store, options }) => {
    const config = options.persist as PersistOptions | boolean
    
    // 检查是否启用
    if (!config) return
    
    const persistConfig: PersistOptions = typeof config === 'boolean'
      ? { enabled: config }
      : { enabled: true, ...config }
    
    if (!persistConfig.enabled) return
    
    const key = persistConfig.key ?? `pinia-${store.$id}`
    const storage = persistConfig.storage ?? localStorage
    const serializer = persistConfig.serializer ?? {
      serialize: JSON.stringify,
      deserialize: JSON.parse
    }
    
    // 恢复状态
    restoreState()
    
    // 持久化状态
    store.$subscribe((mutation, state) => {
      persistState(state)
    }, { detached: true })
    
    function restoreState() {
      try {
        const saved = storage.getItem(key)
        if (!saved) return
        
        const data = serializer.deserialize(saved)
        
        // 部分恢复
        if (persistConfig.paths) {
          const partial = pick(data, persistConfig.paths)
          store.$patch(partial)
        } else {
          store.$patch(data)
        }
      } catch (e) {
        console.warn(`[Pinia Persist] Failed to restore ${store.$id}:`, e)
      }
    }
    
    function persistState(state: any) {
      try {
        // 选择要持久化的字段
        const toPersist = persistConfig.paths
          ? pick(state, persistConfig.paths)
          : state
        
        storage.setItem(key, serializer.serialize(toPersist))
      } catch (e) {
        console.warn(`[Pinia Persist] Failed to persist ${store.$id}:`, e)
      }
    }
    
    function pick(obj: any, paths: string[]) {
      const result: any = {}
      for (const path of paths) {
        if (path in obj) {
          result[path] = obj[path]
        }
      }
      return result
    }
  }
}
```

## 使用方式

```typescript
// 注册插件
pinia.use(createPersistPlugin())

// 简单启用
const useUserStore = defineStore('user', {
  state: () => ({
    name: '',
    token: '',
    preferences: {}
  }),
  persist: true  // 持久化所有状态
})

// 高级配置
const useSettingsStore = defineStore('settings', {
  state: () => ({
    theme: 'light',
    language: 'zh',
    notifications: true,
    tempData: null  // 不需要持久化
  }),
  persist: {
    key: 'app-settings',
    storage: localStorage,
    paths: ['theme', 'language', 'notifications']  // 只持久化这些
  }
})
```

## 类型声明

```typescript
declare module 'pinia' {
  export interface DefineStoreOptionsBase<S, Store> {
    persist?: boolean | PersistOptions
  }
}
```

## 深层路径支持

支持嵌套对象的路径：

```typescript
function getByPath(obj: any, path: string) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj)
}

function setByPath(obj: any, path: string, value: any) {
  const keys = path.split('.')
  const last = keys.pop()!
  const target = keys.reduce((acc, key) => {
    if (!(key in acc)) acc[key] = {}
    return acc[key]
  }, obj)
  target[last] = value
}

// 使用
persist: {
  paths: ['user.profile.name', 'settings.theme']
}
```

## 防抖保存

频繁更新时使用防抖：

```typescript
function createPersistPlugin(globalOptions = {}) {
  const { debounce = 0 } = globalOptions
  
  return ({ store, options }) => {
    const config = options.persist
    if (!config) return
    
    const key = `pinia-${store.$id}`
    let timeoutId: number | null = null
    
    store.$subscribe((mutation, state) => {
      // 清除之前的定时器
      if (timeoutId) clearTimeout(timeoutId)
      
      // 设置新的定时器
      timeoutId = setTimeout(() => {
        localStorage.setItem(key, JSON.stringify(state))
        timeoutId = null
      }, debounce)
    }, { detached: true })
  }
}

// 使用
pinia.use(createPersistPlugin({ debounce: 300 }))
```

## 不同存储后端

支持 sessionStorage：

```typescript
const useSessionStore = defineStore('session', {
  state: () => ({ tempData: null }),
  persist: {
    storage: sessionStorage
  }
})
```

自定义存储：

```typescript
const cookieStorage: Storage = {
  getItem(key) {
    const match = document.cookie.match(new RegExp(`${key}=([^;]+)`))
    return match ? decodeURIComponent(match[1]) : null
  },
  setItem(key, value) {
    document.cookie = `${key}=${encodeURIComponent(value)};path=/;max-age=31536000`
  },
  removeItem(key) {
    document.cookie = `${key}=;path=/;max-age=0`
  },
  get length() { return 0 },
  key() { return null },
  clear() {}
}

persist: {
  storage: cookieStorage
}
```

## 自定义序列化

处理特殊类型：

```typescript
const dateSerializer = {
  serialize(state: any) {
    return JSON.stringify(state, (key, value) => {
      if (value instanceof Date) {
        return { __type: 'Date', value: value.toISOString() }
      }
      return value
    })
  },
  deserialize(raw: string) {
    return JSON.parse(raw, (key, value) => {
      if (value?.__type === 'Date') {
        return new Date(value.value)
      }
      return value
    })
  }
}

persist: {
  serializer: dateSerializer
}
```

## 版本迁移

处理状态结构变化：

```typescript
interface PersistOptionsWithVersion extends PersistOptions {
  version?: number
  migrate?: (oldState: any, version: number) => any
}

function restoreState() {
  const saved = storage.getItem(key)
  if (!saved) return
  
  const { version = 0, state } = JSON.parse(saved)
  
  // 版本迁移
  if (config.migrate && version < config.version) {
    const migrated = config.migrate(state, version)
    store.$patch(migrated)
  } else {
    store.$patch(state)
  }
}

function persistState(state: any) {
  storage.setItem(key, JSON.stringify({
    version: config.version ?? 1,
    state
  }))
}

// 使用
persist: {
  version: 2,
  migrate(state, oldVersion) {
    if (oldVersion < 2) {
      // 旧版本迁移
      return {
        ...state,
        newField: state.oldField ?? 'default'
      }
    }
    return state
  }
}
```

## SSR 兼容

服务端渲染时跳过：

```typescript
function createPersistPlugin() {
  return ({ store, options }) => {
    // SSR 环境跳过
    if (typeof window === 'undefined') return
    
    // 正常持久化逻辑
    // ...
  }
}
```

## 加密存储

敏感数据加密：

```typescript
import CryptoJS from 'crypto-js'

const encryptedSerializer = {
  serialize(state: any) {
    const json = JSON.stringify(state)
    return CryptoJS.AES.encrypt(json, SECRET_KEY).toString()
  },
  deserialize(encrypted: string) {
    const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY)
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8))
  }
}

persist: {
  serializer: encryptedSerializer
}
```

## 完整实现

```typescript
interface PersistConfig {
  key?: string
  storage?: Storage
  paths?: string[]
  serializer?: Serializer
  debounce?: number
  version?: number
  migrate?: (state: any, version: number) => any
}

interface Serializer {
  serialize: (state: any) => string
  deserialize: (raw: string) => any
}

const defaultSerializer: Serializer = {
  serialize: JSON.stringify,
  deserialize: JSON.parse
}

export function createPiniaPersistedState(globalConfig: Partial<PersistConfig> = {}) {
  return ({ store, options }) => {
    const storeConfig = options.persist
    
    if (!storeConfig) return
    
    // 合并配置
    const config: PersistConfig = {
      ...globalConfig,
      ...(typeof storeConfig === 'object' ? storeConfig : {})
    }
    
    // SSR 检查
    if (typeof window === 'undefined') return
    
    const {
      key = `pinia-${store.$id}`,
      storage = localStorage,
      paths,
      serializer = defaultSerializer,
      debounce = 0,
      version = 1,
      migrate
    } = config
    
    // 恢复
    try {
      const saved = storage.getItem(key)
      if (saved) {
        const { v = 0, d } = serializer.deserialize(saved)
        let data = d
        
        // 迁移
        if (migrate && v < version) {
          data = migrate(data, v)
        }
        
        // 部分恢复
        if (paths) {
          const partial: any = {}
          for (const path of paths) {
            if (path in data) {
              partial[path] = data[path]
            }
          }
          store.$patch(partial)
        } else {
          store.$patch(data)
        }
      }
    } catch (e) {
      console.warn(`[persist] restore ${store.$id} failed:`, e)
    }
    
    // 持久化
    let timeoutId: number | null = null
    
    store.$subscribe(
      (mutation, state) => {
        if (timeoutId) clearTimeout(timeoutId)
        
        const save = () => {
          try {
            const data = paths
              ? paths.reduce((obj, key) => ({ ...obj, [key]: state[key] }), {})
              : state
            
            storage.setItem(key, serializer.serialize({
              v: version,
              d: data
            }))
          } catch (e) {
            console.warn(`[persist] save ${store.$id} failed:`, e)
          }
        }
        
        if (debounce > 0) {
          timeoutId = setTimeout(save, debounce) as any
        } else {
          save()
        }
      },
      { detached: true }
    )
    
    // 返回工具方法
    return {
      $clearPersisted() {
        storage.removeItem(key)
      }
    }
  }
}
```

这个实现涵盖了生产环境需要的大部分功能。

下一章我们将分析 DevTools 集成的实现。
