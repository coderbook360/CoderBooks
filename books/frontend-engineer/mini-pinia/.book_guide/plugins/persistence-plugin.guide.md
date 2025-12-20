# 章节写作指导：实战：持久化插件实现

## 1. 章节信息
- **章节标题**: 实战：持久化插件实现
- **文件名**: plugins/persistence-plugin.md
- **所属部分**: 第八部分：插件系统
- **预计阅读时间**: 20分钟
- **难度等级**: 高级

## 2. 学习目标
### 知识目标
- 理解持久化插件的设计思路
- 掌握完整的插件开发流程
- 了解实际插件的最佳实践

### 技能目标
- 能够从零实现持久化插件
- 能够处理序列化和反序列化

## 3. 内容要点
### 核心概念
- **持久化**：将 state 存储到 localStorage
- **hydration**：从 localStorage 恢复 state
- **选择性持久化**：只持久化部分属性

### 关键知识点
- 插件配置读取
- $subscribe 的使用
- JSON 序列化处理
- 错误处理

## 4. 写作要求
### 开篇方式
"持久化是最常见的 Pinia 插件场景之一。通过编写一个完整的持久化插件，我们将把前面学到的所有插件知识付诸实践。"

### 结构组织
```
1. 需求分析
2. 配置项设计
3. 核心逻辑实现
4. hydration 处理
5. 错误处理
6. 完整实现代码
7. 使用示例
```

### 代码示例
```typescript
// 持久化插件实现
interface PersistOptions {
  enabled?: boolean
  key?: string
  paths?: string[]
  storage?: Storage
}

declare module 'pinia' {
  export interface DefineStoreOptionsBase<S, Store> {
    persist?: PersistOptions | boolean
  }
}

export function createPersistedState(): PiniaPlugin {
  return (context: PiniaPluginContext) => {
    const { store, options } = context
    
    // 读取配置
    const persist = options.persist
    if (!persist) return
    
    const config: PersistOptions = persist === true
      ? { enabled: true }
      : persist
    
    if (!config.enabled) return
    
    const {
      key = store.$id,
      paths,
      storage = localStorage,
    } = config
    
    // 1. Hydration：从 storage 恢复状态
    try {
      const saved = storage.getItem(key)
      if (saved) {
        const parsed = JSON.parse(saved)
        store.$patch(parsed)
      }
    } catch (error) {
      console.error(`[pinia-persist] Failed to hydrate store "${store.$id}":`, error)
    }
    
    // 2. 订阅变化：保存到 storage
    store.$subscribe(
      (mutation, state) => {
        try {
          // 选择性持久化
          const toStore = paths
            ? paths.reduce((acc, path) => {
                acc[path] = state[path]
                return acc
              }, {} as Record<string, any>)
            : state
          
          storage.setItem(key, JSON.stringify(toStore))
        } catch (error) {
          console.error(`[pinia-persist] Failed to persist store "${store.$id}":`, error)
        }
      },
      { detached: true }  // 组件卸载后继续监听
    )
  }
}
```

## 5. 技术细节
### 配置项设计
```typescript
// 使用方式一：简单开启
defineStore('counter', {
  state: () => ({ count: 0 }),
  persist: true,  // 使用默认配置
})

// 使用方式二：自定义配置
defineStore('user', {
  state: () => ({
    name: 'Alice',
    token: 'xxx',
    temp: 'not saved',
  }),
  persist: {
    enabled: true,
    key: 'user-store',      // 自定义 key
    paths: ['name', 'token'], // 只持久化部分属性
    storage: sessionStorage,  // 使用 sessionStorage
  },
})
```

### 选择性持久化
```typescript
// paths 选项实现
const toStore = paths
  ? paths.reduce((acc, path) => {
      // 只取指定的属性
      acc[path] = state[path]
      return acc
    }, {} as Record<string, any>)
  : state  // 没有 paths 就存储整个 state
```

### 深度路径支持
```typescript
// 高级版本：支持深度路径
// persist: { paths: ['user.profile.name'] }

function getByPath(obj: any, path: string) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj)
}

function setByPath(obj: any, path: string, value: any) {
  const keys = path.split('.')
  const last = keys.pop()!
  const target = keys.reduce((acc, key) => {
    if (!acc[key]) acc[key] = {}
    return acc[key]
  }, obj)
  target[last] = value
}
```

### 错误处理
```typescript
// 必须处理的错误场景：
// 1. storage 不可用（隐私模式）
// 2. JSON 解析失败（数据损坏）
// 3. storage 配额满

try {
  storage.setItem(key, JSON.stringify(data))
} catch (error) {
  if (error instanceof DOMException) {
    if (error.name === 'QuotaExceededError') {
      console.warn('Storage quota exceeded')
    }
  }
}
```

## 6. 风格指导
- **语气**：实战项目，循序渐进
- **完整性**：给出完整可用的代码

## 7. 章节检查清单
- [ ] 需求分析清晰
- [ ] 实现代码完整
- [ ] 错误处理到位
- [ ] 使用示例丰富
