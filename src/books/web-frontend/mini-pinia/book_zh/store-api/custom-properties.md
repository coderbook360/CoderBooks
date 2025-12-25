---
sidebar_position: 39
title: _customProperties 与调试支持
---

# _customProperties 与调试支持

`_customProperties` 是 Pinia 为插件和调试工具设计的机制，用于追踪插件添加的自定义属性。本章探讨其设计和应用。

## _customProperties 的作用

当插件向 Store 添加属性时，需要一种方式区分：
- **原生属性**：state、getters、actions
- **自定义属性**：插件添加的属性

```javascript
// 插件添加属性
pinia.use(({ store }) => {
  store.hello = 'world'
  store.$greet = () => console.log('Hello!')
})

// DevTools 需要知道哪些是插件添加的
// _customProperties 记录了这些信息
```

## 基本实现

```javascript
function createSetupStore(id, setup, options, pinia) {
  // 用 Set 存储自定义属性名
  const _customProperties = new Set()
  
  const store = reactive({})
  
  Object.defineProperty(store, '_customProperties', {
    value: _customProperties,
    writable: false,
    enumerable: false
  })
  
  return store
}
```

## 插件如何注册自定义属性

插件返回的对象会被合并到 Store，同时属性名被记录：

```javascript
function applyPlugin(store, plugin, pinia) {
  const extensions = plugin({
    store,
    app: pinia._a,
    pinia,
    options: store._options
  })
  
  if (extensions) {
    for (const key in extensions) {
      // 合并到 store
      store[key] = extensions[key]
      
      // 记录为自定义属性
      if (!key.startsWith('$')) {
        store._customProperties.add(key)
      }
    }
  }
}
```

示例：

```javascript
// 持久化插件
const persistPlugin = ({ store }) => {
  // 这些属性会被记录到 _customProperties
  return {
    persist: true,
    _persistOptions: { storage: localStorage }
  }
}

pinia.use(persistPlugin)

const store = useCounterStore()
console.log(store._customProperties)  // Set { 'persist', '_persistOptions' }
```

## $ 属性的特殊处理

以 `$` 开头的属性被视为扩展 API，不记录到 `_customProperties`：

```javascript
function applyPlugin(store, plugin, pinia) {
  const extensions = plugin({ store, pinia })
  
  if (extensions) {
    for (const key in extensions) {
      if (key.startsWith('$')) {
        // $ 属性是 API 扩展，不记录
        Object.defineProperty(store, key, {
          value: extensions[key],
          enumerable: false
        })
      } else {
        // 普通属性，记录为自定义
        store[key] = extensions[key]
        store._customProperties.add(key)
      }
    }
  }
}
```

## DevTools 集成

`_customProperties` 主要用于 Vue DevTools：

```javascript
// DevTools 显示 Store 时区分属性来源
function getStoreInfo(store) {
  const info = {
    id: store.$id,
    state: {},
    getters: {},
    actions: {},
    customProperties: {}
  }
  
  for (const key in store) {
    if (store._customProperties.has(key)) {
      // 插件添加的属性
      info.customProperties[key] = store[key]
    } else if (typeof store[key] === 'function') {
      info.actions[key] = store[key]
    } else {
      // state 或 getter
      info.state[key] = store[key]
    }
  }
  
  return info
}
```

DevTools 中的显示效果：

```
Pinia
└─ counter
    ├─ state
    │   └─ count: 0
    ├─ getters
    │   └─ double: 0
    ├─ actions
    │   └─ increment()
    └─ custom properties  ← _customProperties 的内容
        ├─ persist: true
        └─ _persistOptions: {...}
```

## 调试用途

### 查看所有自定义属性

```javascript
const store = useCounterStore()

// 列出所有插件添加的属性
console.log('Custom properties:', [...store._customProperties])

// 检查特定属性是否是插件添加的
console.log('Is "persist" custom?', store._customProperties.has('persist'))
```

### 清理自定义属性

```javascript
// 移除所有自定义属性（调试用）
function clearCustomProperties(store) {
  for (const key of store._customProperties) {
    delete store[key]
  }
  store._customProperties.clear()
}
```

## 插件开发最佳实践

### 明确标记自定义属性

```javascript
const myPlugin = ({ store }) => {
  return {
    // 明确的插件相关属性
    _myPluginEnabled: true,
    _myPluginConfig: {},
    
    // API 方法使用 $ 前缀
    $myPluginMethod() {}
  }
}
```

### 避免属性冲突

```javascript
const myPlugin = ({ store }) => {
  // 检查是否已存在
  if ('myProp' in store) {
    console.warn(`Property "myProp" already exists in store ${store.$id}`)
    return
  }
  
  return { myProp: 'value' }
}
```

### 使用命名空间

```javascript
const myPlugin = ({ store }) => {
  // 用对象命名空间避免冲突
  return {
    $myPlugin: {
      enabled: true,
      config: {},
      method() {}
    }
  }
}

// 使用
store.$myPlugin.method()
```

## 序列化时排除

自定义属性通常不应该被序列化：

```javascript
function serializeStore(store) {
  const serialized = {}
  
  for (const key in store.$state) {
    // 只序列化原生 state
    if (!store._customProperties.has(key)) {
      serialized[key] = store.$state[key]
    }
  }
  
  return JSON.stringify(serialized)
}
```

## 测试用例

```javascript
describe('_customProperties', () => {
  test('tracks plugin-added properties', () => {
    const pinia = createPinia()
    
    pinia.use(({ store }) => ({
      custom1: 'value1',
      custom2: 'value2'
    }))
    
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore(pinia)
    
    expect(store._customProperties.has('custom1')).toBe(true)
    expect(store._customProperties.has('custom2')).toBe(true)
    expect(store._customProperties.has('count')).toBe(false)
  })
  
  test('$ properties are not tracked', () => {
    const pinia = createPinia()
    
    pinia.use(({ store }) => ({
      $customMethod: () => {},
      normalProp: 'value'
    }))
    
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore(pinia)
    
    expect(store._customProperties.has('$customMethod')).toBe(false)
    expect(store._customProperties.has('normalProp')).toBe(true)
  })
  
  test('_customProperties is not enumerable', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    
    expect(Object.keys(store)).not.toContain('_customProperties')
  })
})
```

## 与 HMR 的关系

热模块替换时，自定义属性需要保留：

```javascript
function hotUpdate(store, newOptions) {
  // 保存自定义属性
  const customProps = {}
  for (const key of store._customProperties) {
    customProps[key] = store[key]
  }
  
  // 更新 Store
  // ...
  
  // 恢复自定义属性
  for (const key in customProps) {
    store[key] = customProps[key]
    store._customProperties.add(key)
  }
}
```

## 本章小结

本章探讨了 `_customProperties`：

- **核心作用**：追踪插件添加的属性
- **Set 存储**：记录属性名，便于查询
- **$ 属性例外**：$ 开头的属性不记录
- **DevTools 支持**：区分显示原生和自定义属性
- **最佳实践**：命名空间、冲突检查、序列化排除

完成 Store API 部分，下一章进入状态变更与订阅系统。
