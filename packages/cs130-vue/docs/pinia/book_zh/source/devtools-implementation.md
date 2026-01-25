# DevTools 集成

Pinia 提供了 Vue DevTools 集成。这一章分析其实现原理。

## DevTools 功能

Pinia 在 DevTools 中提供：

- 查看所有 Store 和状态
- 实时编辑状态
- 时间旅行调试
- 查看 Action 调用历史

## 集成入口

createPinia 时设置 DevTools：

```typescript
function createPinia(): Pinia {
  const pinia = markRaw({
    // ...
  })
  
  if (__DEV__ && typeof window !== 'undefined') {
    // 开发环境启用 DevTools
    if ((window as any).__VUE_DEVTOOLS_GLOBAL_HOOK__) {
      setupDevtoolsPlugin(pinia)
    }
  }
  
  return pinia
}
```

只在开发环境且浏览器环境中启用。

## DevTools Plugin API

Pinia 使用 Vue DevTools Plugin API：

```typescript
import { setupDevtoolsPlugin } from '@vue/devtools-api'

function setupDevtoolsPlugin(pinia: Pinia) {
  setupDevtoolsPlugin(
    {
      id: 'pinia',
      label: 'Pinia 🍍',
      logo: 'https://pinia.vuejs.org/logo.svg',
      packageName: 'pinia',
      homepage: 'https://pinia.vuejs.org',
      componentStateTypes: ['pinia'],
      app: pinia._a
    },
    (api) => {
      // 注册各种功能
      registerStoreInspector(api, pinia)
      registerTimeline(api, pinia)
      registerStateEditor(api, pinia)
    }
  )
}
```

## 注册 Store Inspector

在组件检查器中显示 Store 状态：

```typescript
function registerStoreInspector(api: DevtoolsApi, pinia: Pinia) {
  api.on.inspectComponent((payload) => {
    const { componentInstance } = payload
    
    // 查找组件使用的 Store
    if (componentInstance.proxy.$pinia) {
      const stores = findUsedStores(componentInstance)
      
      payload.instanceData.state.push({
        type: 'pinia',
        key: 'stores',
        value: formatStores(stores)
      })
    }
  })
}
```

## 注册 Timeline

记录 Action 和状态变化：

```typescript
function registerTimeline(api: DevtoolsApi, pinia: Pinia) {
  // 添加时间线层
  api.addTimelineLayer({
    id: 'pinia:mutations',
    label: 'Pinia Mutations',
    color: 0xffd04b
  })
  
  api.addTimelineLayer({
    id: 'pinia:actions',
    label: 'Pinia Actions',
    color: 0x50c878
  })
}
```

## 监听状态变化

每个 Store 创建时添加监听：

```typescript
function setupStoreDevtools(store: Store, api: DevtoolsApi) {
  // 监听状态变化
  store.$subscribe((mutation, state) => {
    api.addTimelineEvent({
      layerId: 'pinia:mutations',
      event: {
        time: Date.now(),
        title: mutation.type,
        subtitle: store.$id,
        data: {
          store: store.$id,
          mutation: mutation.type,
          events: mutation.events,
          state: formatState(state)
        }
      }
    })
  })
  
  // 监听 Action
  store.$onAction(({ name, args, after, onError }) => {
    const groupId = generateId()
    
    // Action 开始
    api.addTimelineEvent({
      layerId: 'pinia:actions',
      event: {
        time: Date.now(),
        title: name,
        subtitle: 'started',
        data: {
          store: store.$id,
          action: name,
          args: formatArgs(args)
        },
        groupId
      }
    })
    
    // Action 完成
    after((result) => {
      api.addTimelineEvent({
        layerId: 'pinia:actions',
        event: {
          time: Date.now(),
          title: name,
          subtitle: 'finished',
          data: { result },
          groupId
        }
      })
    })
    
    // Action 错误
    onError((error) => {
      api.addTimelineEvent({
        layerId: 'pinia:actions',
        event: {
          time: Date.now(),
          title: name,
          subtitle: 'error',
          data: { error: error.message },
          groupId
        }
      })
    })
  })
}
```

## 状态编辑

允许在 DevTools 中编辑状态：

```typescript
function registerStateEditor(api: DevtoolsApi, pinia: Pinia) {
  api.on.editComponentState((payload) => {
    if (payload.type !== 'pinia') return
    
    const { path, state } = payload
    const storeId = path[0]
    const store = pinia._s.get(storeId)
    
    if (!store) return
    
    // 应用编辑
    const propertyPath = path.slice(1)
    setNestedProperty(store.$state, propertyPath, state.value)
  })
}

function setNestedProperty(obj: any, path: string[], value: any) {
  let current = obj
  for (let i = 0; i < path.length - 1; i++) {
    current = current[path[i]]
  }
  current[path[path.length - 1]] = value
}
```

## 时间旅行

保存状态快照实现时间旅行：

```typescript
const stateSnapshots: Map<string, any[]> = new Map()

function captureSnapshot(store: Store) {
  const storeId = store.$id
  
  if (!stateSnapshots.has(storeId)) {
    stateSnapshots.set(storeId, [])
  }
  
  const snapshots = stateSnapshots.get(storeId)!
  snapshots.push({
    timestamp: Date.now(),
    state: JSON.parse(JSON.stringify(store.$state))
  })
  
  // 限制快照数量
  if (snapshots.length > 100) {
    snapshots.shift()
  }
}

function restoreSnapshot(store: Store, index: number) {
  const snapshots = stateSnapshots.get(store.$id)
  if (!snapshots || !snapshots[index]) return
  
  store.$patch(snapshots[index].state)
}
```

## Store 注册检测

DevTools 自动检测新 Store：

```typescript
function createSetupStore(id, setup, options, pinia) {
  const store = reactive({ /* ... */ })
  
  // 注册到 DevTools
  if (__DEV__) {
    setupStoreDevtools(store, pinia._devtools)
    
    // 通知 DevTools 新 Store
    pinia._devtools?.addInspector({
      id: `pinia:${id}`,
      label: id,
      icon: 'storage',
      treeFilterPlaceholder: 'Filter stores...',
      // ...
    })
  }
  
  return store
}
```

## 格式化显示

美化 DevTools 中的显示：

```typescript
function formatState(state: any): any {
  return Object.entries(state).reduce((acc, [key, value]) => {
    acc[key] = formatValue(value)
    return acc
  }, {} as Record<string, any>)
}

function formatValue(value: any): any {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'function') return 'ƒ ' + value.name
  if (isRef(value)) return { __type: 'ref', value: value.value }
  if (isReactive(value)) return { __type: 'reactive', ...value }
  if (Array.isArray(value)) return value.map(formatValue)
  if (typeof value === 'object') return formatState(value)
  return value
}
```

## 自定义类型

支持自定义类型显示：

```typescript
api.on.inspectComponent((payload) => {
  // 自定义类型格式化
  payload.instanceData.state.forEach(state => {
    if (state.type === 'pinia') {
      state.value = formatWithCustomTypes(state.value)
    }
  })
})

function formatWithCustomTypes(value: any) {
  if (value instanceof Date) {
    return {
      _custom: {
        type: 'Date',
        value: value.toISOString(),
        display: value.toLocaleString()
      }
    }
  }
  
  if (value instanceof Map) {
    return {
      _custom: {
        type: 'Map',
        value: Array.from(value.entries()),
        display: `Map(${value.size})`
      }
    }
  }
  
  return value
}
```

## 生产环境

生产环境禁用 DevTools：

```typescript
if (__DEV__) {
  // DevTools 代码
}
```

打包时 `__DEV__` 被替换为 false，相关代码被 tree-shaking 移除。

## 手动触发

某些情况需要手动刷新 DevTools：

```typescript
function triggerDevtoolsUpdate(store: Store) {
  if (__DEV__ && store._devtools) {
    store._devtools.sendInspectorState('pinia')
  }
}
```

## HMR 中的处理

热更新时保持 DevTools 状态：

```typescript
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    // 保持 DevTools 连接
    if (pinia._devtools) {
      pinia._devtools.sendInspectorTree('pinia')
      pinia._devtools.sendInspectorState('pinia')
    }
  })
}
```

## 调试技巧

使用 DevTools 高效调试：

1. 在组件面板查看 Store 状态
2. 在时间线观察 Action 执行顺序
3. 使用时间旅行回溯状态
4. 直接编辑状态测试 UI 响应

## 实现一个简化的 DevTools 插件

```typescript
function createSimpleDevtools(pinia: Pinia) {
  // 存储历史
  const history: any[] = []
  
  // 添加到全局，方便控制台访问
  (window as any).__PINIA_DEVTOOLS__ = {
    stores: pinia._s,
    history,
    
    getState(id: string) {
      return pinia._s.get(id)?.$state
    },
    
    setState(id: string, state: any) {
      pinia._s.get(id)?.$patch(state)
    },
    
    timeTravel(index: number) {
      if (history[index]) {
        const { storeId, state } = history[index]
        pinia._s.get(storeId)?.$patch(state)
      }
    }
  }
  
  // 监听所有 Store
  pinia._s.forEach((store) => {
    store.$subscribe((mutation, state) => {
      history.push({
        type: 'mutation',
        storeId: store.$id,
        mutation: mutation.type,
        state: JSON.parse(JSON.stringify(state)),
        timestamp: Date.now()
      })
    })
    
    store.$onAction(({ name, args }) => {
      history.push({
        type: 'action',
        storeId: store.$id,
        action: name,
        args,
        timestamp: Date.now()
      })
    })
  })
}
```

使用：

```typescript
// 控制台
__PINIA_DEVTOOLS__.getState('user')
__PINIA_DEVTOOLS__.setState('user', { name: 'test' })
__PINIA_DEVTOOLS__.history
```

下一章我们将分析热模块替换的实现。
