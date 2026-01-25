# 实现 createPinia

createPinia 是 Pinia 的入口函数，创建 Pinia 实例。这一章实现它。

## 功能分析

createPinia 需要：

1. 创建全局状态容器
2. 创建 Store 注册表
3. 管理插件
4. 提供 Vue 插件安装

## 基础实现

```typescript
// src/createPinia.ts
import { ref, markRaw } from 'vue'
import type { App, Ref } from 'vue'
import type { Pinia, PiniaPlugin, StateTree, Store } from './types'

export function createPinia(): Pinia {
  // 全局状态容器
  const state: Ref<Record<string, StateTree>> = ref({})
  
  // 插件列表
  const _p: PiniaPlugin[] = []
  
  // Pinia 实例
  const pinia: Pinia = markRaw({
    // Vue App 引用
    _a: undefined,
    
    // Store 注册表
    _s: new Map<string, Store>(),
    
    // 全局状态
    state,
    
    // 插件列表
    _p,
    
    // 安装插件
    use(plugin: PiniaPlugin) {
      _p.push(plugin)
      return this
    },
    
    // Vue 插件安装
    install(app: App) {
      pinia._a = app
      
      // 全局提供 Pinia 实例
      app.provide('pinia', pinia)
      
      // 添加全局属性（Options API 支持）
      app.config.globalProperties.$pinia = pinia
    }
  })
  
  return pinia
}
```

## 逐步解析

### 状态容器

```typescript
const state: Ref<Record<string, StateTree>> = ref({})
```

state 是一个 ref，存储所有 Store 的状态：

```typescript
// state.value 结构
{
  'counter': { count: 0 },
  'user': { name: 'John', age: 25 },
  // ...其他 Store
}
```

### Store 注册表

```typescript
_s: new Map<string, Store>()
```

使用 Map 存储 Store 实例，key 是 Store ID：

```typescript
// 内部使用
pinia._s.set('counter', counterStore)
pinia._s.get('counter')  // 获取 Store
pinia._s.has('counter')  // 检查是否存在
```

### markRaw

```typescript
const pinia: Pinia = markRaw({...})
```

markRaw 防止 Pinia 实例被响应式代理：

- Pinia 实例不需要响应式
- 避免不必要的依赖追踪
- 提高性能

### 插件系统

```typescript
use(plugin: PiniaPlugin) {
  _p.push(plugin)
  return this
}
```

use 方法添加插件，返回 this 支持链式调用：

```typescript
pinia
  .use(pluginA)
  .use(pluginB)
```

### Vue 插件安装

```typescript
install(app: App) {
  pinia._a = app
  app.provide('pinia', pinia)
  app.config.globalProperties.$pinia = pinia
}
```

install 是 Vue 插件的标准方法：

1. 保存 App 引用
2. 使用 provide 注入 Pinia
3. 添加全局属性供 Options API 使用

## 使用方式

```typescript
import { createApp } from 'vue'
import { createPinia } from './createPinia'
import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()

// 使用插件
pinia.use(myPlugin)

// 安装到 Vue
app.use(pinia)

app.mount('#app')
```

## 活跃 Pinia 管理

添加全局活跃 Pinia 引用，用于无参数调用 useStore 时：

```typescript
// src/createPinia.ts

// 全局活跃 Pinia
let activePinia: Pinia | undefined

export function setActivePinia(pinia: Pinia | undefined) {
  activePinia = pinia
}

export function getActivePinia(): Pinia | undefined {
  return activePinia
}

export function createPinia(): Pinia {
  const state = ref<Record<string, StateTree>>({})
  const _p: PiniaPlugin[] = []
  
  const pinia: Pinia = markRaw({
    _a: undefined,
    _s: new Map(),
    state,
    _p,
    
    use(plugin) {
      _p.push(plugin)
      return this
    },
    
    install(app) {
      // 设置为活跃 Pinia
      setActivePinia(pinia)
      
      pinia._a = app
      app.provide('pinia', pinia)
      app.config.globalProperties.$pinia = pinia
    }
  })
  
  return pinia
}
```

## 组件中获取 Pinia

在组件中获取 Pinia 实例：

```typescript
import { inject } from 'vue'

export function usePinia(): Pinia {
  // 先尝试从组件注入获取
  const pinia = inject<Pinia>('pinia')
  
  if (pinia) {
    return pinia
  }
  
  // 回退到全局活跃 Pinia
  const activePinia = getActivePinia()
  
  if (activePinia) {
    return activePinia
  }
  
  throw new Error('No Pinia instance found')
}
```

## 完整实现

```typescript
// src/createPinia.ts
import { ref, markRaw } from 'vue'
import type { App, Ref } from 'vue'
import type { Pinia, PiniaPlugin, StateTree, Store } from './types'

let activePinia: Pinia | undefined

export function setActivePinia(pinia: Pinia | undefined): void {
  activePinia = pinia
}

export function getActivePinia(): Pinia | undefined {
  return activePinia
}

export function createPinia(): Pinia {
  const state: Ref<Record<string, StateTree>> = ref({})
  const _p: PiniaPlugin[] = []
  
  const pinia: Pinia = markRaw({
    _a: undefined,
    _s: new Map<string, Store>(),
    state,
    _p,
    
    use(plugin: PiniaPlugin): Pinia {
      _p.push(plugin)
      return this
    },
    
    install(app: App): void {
      setActivePinia(pinia)
      pinia._a = app
      app.provide('pinia', pinia)
      app.config.globalProperties.$pinia = pinia
    }
  })
  
  return pinia
}
```

## 测试

```typescript
// tests/createPinia.test.ts
import { describe, it, expect } from 'vitest'
import { createApp } from 'vue'
import { createPinia, getActivePinia } from '../src/createPinia'

describe('createPinia', () => {
  it('should create a pinia instance', () => {
    const pinia = createPinia()
    
    expect(pinia).toBeDefined()
    expect(pinia.state.value).toEqual({})
    expect(pinia._s.size).toBe(0)
    expect(pinia._p).toEqual([])
  })
  
  it('should support plugin', () => {
    const pinia = createPinia()
    const plugin = () => {}
    
    pinia.use(plugin)
    
    expect(pinia._p).toContain(plugin)
  })
  
  it('should set active pinia on install', () => {
    const app = createApp({})
    const pinia = createPinia()
    
    app.use(pinia)
    
    expect(getActivePinia()).toBe(pinia)
  })
})
```

下一章我们实现 defineStore。
