---
sidebar_position: 70
title: 完整实现代码
---

# 完整实现代码

本章汇总 mini-pinia 的完整实现代码，将前面章节的所有模块整合为可运行的库。

## 项目结构

```
mini-pinia/
├── src/
│   ├── index.js           # 主入口
│   ├── createPinia.js     # Pinia 实例创建
│   ├── defineStore.js     # Store 定义
│   ├── store.js           # Store 核心实现
│   ├── subscriptions.js   # 订阅系统
│   ├── helpers/
│   │   ├── index.js
│   │   ├── mapStores.js
│   │   ├── mapState.js
│   │   ├── mapWritableState.js
│   │   ├── mapActions.js
│   │   └── storeToRefs.js
│   └── utils.js           # 工具函数
└── package.json
```

## createPinia.js

```javascript
import { ref, effectScope, markRaw } from 'vue'

const piniaSymbol = Symbol('pinia')
let activePinia = null

function setActivePinia(pinia) {
  activePinia = pinia
}

function getActivePinia() {
  return activePinia
}

function createPinia() {
  const scope = effectScope(true)
  const state = scope.run(() => ref({}))
  
  const _p = []  // 插件列表
  const _s = new Map()  // Store 映射
  let _a = null  // Vue app 引用
  
  const pinia = markRaw({
    install(app) {
      setActivePinia(pinia)
      _a = app
      
      // 全局注入
      app.provide(piniaSymbol, pinia)
      app.config.globalProperties.$pinia = pinia
    },
    
    use(plugin) {
      if (!_p.includes(plugin)) {
        _p.push(plugin)
      }
      return this
    },
    
    _p,
    _s,
    _a,
    _e: scope,
    state
  })
  
  return pinia
}

export { 
  createPinia, 
  piniaSymbol, 
  setActivePinia, 
  getActivePinia 
}
```

## defineStore.js

```javascript
import { inject, getCurrentInstance } from 'vue'
import { piniaSymbol, getActivePinia } from './createPinia'
import { createOptionsStore, createSetupStore } from './store'

function defineStore(idOrOptions, setup, setupOptions) {
  let id
  let options
  
  // 解析参数
  if (typeof idOrOptions === 'string') {
    id = idOrOptions
    if (typeof setup === 'function') {
      // Setup Store: defineStore('id', () => {})
      options = setupOptions || {}
      options._setup = setup
    } else {
      // Options Store: defineStore('id', { state, getters, actions })
      options = setup
    }
  } else {
    // defineStore({ id, state, getters, actions })
    options = idOrOptions
    id = options.id
  }
  
  // 创建 useStore 函数
  function useStore(pinia) {
    const currentInstance = getCurrentInstance()
    
    // 获取 Pinia 实例
    pinia = pinia || 
      (currentInstance && inject(piniaSymbol, null)) || 
      getActivePinia()
    
    if (!pinia) {
      throw new Error('Pinia is not installed')
    }
    
    // 检查 Store 是否已创建
    if (!pinia._s.has(id)) {
      // 创建新 Store
      if (options._setup) {
        createSetupStore(pinia, id, options._setup, options)
      } else {
        createOptionsStore(pinia, id, options)
      }
    }
    
    return pinia._s.get(id)
  }
  
  // 附加 ID
  useStore.$id = id
  
  return useStore
}

export { defineStore }
```

## store.js

```javascript
import { 
  reactive, 
  computed, 
  toRaw, 
  isRef, 
  isReactive,
  toRef,
  watch
} from 'vue'
import { addSubscription, triggerSubscriptions } from './subscriptions'

const MutationType = {
  direct: 'direct',
  patchObject: 'patch object',
  patchFunction: 'patch function'
}

function createOptionsStore(pinia, id, options) {
  const { state, getters, actions } = options
  
  function setup() {
    // 初始化 state
    const initialState = state ? state() : {}
    pinia.state.value[id] = initialState
    
    const localState = toRefs(pinia.state.value[id])
    
    // 创建 getters
    const computedGetters = {}
    if (getters) {
      Object.keys(getters).forEach(name => {
        computedGetters[name] = computed(() => {
          const store = pinia._s.get(id)
          return getters[name].call(store, store.$state)
        })
      })
    }
    
    return {
      ...localState,
      ...computedGetters
    }
  }
  
  const store = createSetupStore(pinia, id, setup, options, true)
  
  // 添加 actions
  if (actions) {
    Object.keys(actions).forEach(name => {
      store[name] = wrapAction(store, name, actions[name])
    })
  }
  
  // Options Store 支持 $reset
  store.$reset = function() {
    const newState = state ? state() : {}
    this.$patch(newState)
  }
  
  return store
}

function createSetupStore(pinia, id, setup, options = {}, isOptions = false) {
  let scope
  
  const initialState = pinia.state.value[id]
  
  // 订阅列表
  const subscriptions = []
  const actionSubscriptions = []
  
  // 运行 setup
  const setupStore = pinia._e.run(() => {
    scope = effectScope()
    return scope.run(() => setup())
  })
  
  // 创建 Store 对象
  const partialStore = {
    $id: id,
    _p: pinia,
    
    $patch(partialStateOrMutator) {
      let type = MutationType.patchObject
      let payload = partialStateOrMutator
      
      if (typeof partialStateOrMutator === 'function') {
        type = MutationType.patchFunction
        partialStateOrMutator(pinia.state.value[id])
      } else {
        mergeReactiveObjects(pinia.state.value[id], partialStateOrMutator)
      }
      
      triggerSubscriptions(subscriptions, {
        storeId: id,
        type,
        payload
      }, pinia.state.value[id])
    },
    
    $subscribe(callback, options = {}) {
      const removeSubscription = addSubscription(
        subscriptions,
        callback,
        options.detached
      )
      
      const stopWatcher = scope.run(() => 
        watch(
          () => pinia.state.value[id],
          (state) => {
            if (options.flush === 'sync' ? true : options.immediate) {
              callback({ storeId: id, type: MutationType.direct }, state)
            }
          },
          { deep: true, flush: options.flush || 'sync' }
        )
      )
      
      return () => {
        removeSubscription()
        stopWatcher()
      }
    },
    
    $onAction(callback) {
      return addSubscription(actionSubscriptions, callback, true)
    },
    
    $dispose() {
      scope.stop()
      subscriptions.length = 0
      actionSubscriptions.length = 0
      pinia._s.delete(id)
    }
  }
  
  // 处理 setup 返回值
  Object.keys(setupStore).forEach(key => {
    const value = setupStore[key]
    
    if (isRef(value) && !isComputed(value)) {
      // State: 同步到 pinia.state
      if (!isOptions) {
        if (!pinia.state.value[id]) {
          pinia.state.value[id] = {}
        }
        pinia.state.value[id][key] = value.value
        
        // 双向同步
        watch(value, (newVal) => {
          pinia.state.value[id][key] = newVal
        })
      }
    } else if (typeof value === 'function') {
      // Action: 包装
      setupStore[key] = wrapAction(partialStore, key, value)
    }
  })
  
  const store = reactive({
    ...partialStore,
    ...setupStore
  })
  
  // 定义 $state getter/setter
  Object.defineProperty(store, '$state', {
    get: () => pinia.state.value[id],
    set: (newState) => {
      store.$patch((state) => {
        Object.assign(state, newState)
      })
    }
  })
  
  // 保存选项
  store._o = options
  
  // 应用插件
  pinia._p.forEach(plugin => {
    const result = plugin({
      store,
      pinia,
      app: pinia._a,
      options
    })
    
    if (result) {
      Object.assign(store, result)
    }
  })
  
  // 注册 Store
  pinia._s.set(id, store)
  
  return store
}

function wrapAction(store, name, action) {
  return function(...args) {
    const afterCallbacks = []
    const onErrorCallbacks = []
    
    function after(callback) {
      afterCallbacks.push(callback)
    }
    
    function onError(callback) {
      onErrorCallbacks.push(callback)
    }
    
    // 触发 $onAction 回调
    triggerSubscriptions(store._p?._s?.get(store.$id)?._actionSubscriptions || [], {
      name,
      store,
      args,
      after,
      onError
    })
    
    let result
    
    try {
      result = action.apply(store, args)
    } catch (error) {
      onErrorCallbacks.forEach(cb => cb(error))
      throw error
    }
    
    if (result instanceof Promise) {
      return result
        .then(value => {
          afterCallbacks.forEach(cb => cb(value))
          return value
        })
        .catch(error => {
          onErrorCallbacks.forEach(cb => cb(error))
          throw error
        })
    }
    
    afterCallbacks.forEach(cb => cb(result))
    return result
  }
}

function mergeReactiveObjects(target, source) {
  for (const key in source) {
    const value = source[key]
    const targetValue = target[key]
    
    if (
      isPlainObject(targetValue) &&
      isPlainObject(value) &&
      !isRef(value) &&
      !isReactive(value)
    ) {
      target[key] = mergeReactiveObjects(targetValue, value)
    } else {
      target[key] = value
    }
  }
  
  return target
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]'
}

function isComputed(value) {
  return isRef(value) && value.effect
}

function toRefs(obj) {
  const result = {}
  for (const key in obj) {
    result[key] = toRef(obj, key)
  }
  return result
}

export { 
  createOptionsStore, 
  createSetupStore,
  MutationType 
}
```

## subscriptions.js

```javascript
function addSubscription(subscriptions, callback, detached = false) {
  subscriptions.push(callback)
  
  const removeSubscription = () => {
    const idx = subscriptions.indexOf(callback)
    if (idx > -1) {
      subscriptions.splice(idx, 1)
    }
  }
  
  if (!detached) {
    const scope = getCurrentScope()
    if (scope) {
      onScopeDispose(removeSubscription)
    }
  }
  
  return removeSubscription
}

function triggerSubscriptions(subscriptions, ...args) {
  subscriptions.slice().forEach(callback => {
    callback(...args)
  })
}

export { addSubscription, triggerSubscriptions }
```

## helpers/storeToRefs.js

```javascript
import { toRef, isRef, isReactive } from 'vue'

function storeToRefs(store) {
  const refs = {}
  
  for (const key in store) {
    const value = store[key]
    
    if (isRef(value) || isReactive(value)) {
      refs[key] = toRef(store, key)
    }
  }
  
  return refs
}

export { storeToRefs }
```

## helpers/mapState.js

```javascript
function mapState(useStore, keysOrMapper) {
  return Array.isArray(keysOrMapper)
    ? keysOrMapper.reduce((result, key) => {
        result[key] = {
          get() {
            return useStore(this.$pinia)[key]
          },
          enumerable: true
        }
        return result
      }, {})
    : Object.keys(keysOrMapper).reduce((result, alias) => {
        const value = keysOrMapper[alias]
        
        result[alias] = {
          get() {
            const store = useStore(this.$pinia)
            return typeof value === 'function'
              ? value(store)
              : store[value]
          },
          enumerable: true
        }
        return result
      }, {})
}

export { mapState }
```

## helpers/mapActions.js

```javascript
function mapActions(useStore, keysOrMapper) {
  return Array.isArray(keysOrMapper)
    ? keysOrMapper.reduce((result, key) => {
        result[key] = function(...args) {
          return useStore(this.$pinia)[key](...args)
        }
        return result
      }, {})
    : Object.keys(keysOrMapper).reduce((result, alias) => {
        const actionName = keysOrMapper[alias]
        
        result[alias] = function(...args) {
          return useStore(this.$pinia)[actionName](...args)
        }
        return result
      }, {})
}

export { mapActions }
```

## index.js

```javascript
export { createPinia, getActivePinia, setActivePinia } from './createPinia'
export { defineStore } from './defineStore'
export { MutationType } from './store'
export { storeToRefs } from './helpers/storeToRefs'
export { mapState } from './helpers/mapState'
export { mapActions } from './helpers/mapActions'
export { mapWritableState } from './helpers/mapWritableState'
export { mapStores } from './helpers/mapStores'
```

## 使用示例

```javascript
import { createApp } from 'vue'
import { createPinia, defineStore } from 'mini-pinia'

const pinia = createPinia()

const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0
  }),
  getters: {
    doubleCount: (state) => state.count * 2
  },
  actions: {
    increment() {
      this.count++
    }
  }
})

const app = createApp(App)
app.use(pinia)
app.mount('#app')
```

## 本章小结

本章提供了 mini-pinia 的完整实现：

- **createPinia**：创建 Pinia 实例
- **defineStore**：定义 Store（Options/Setup）
- **核心功能**：$patch、$subscribe、$onAction、$reset、$dispose
- **辅助函数**：mapState、mapActions、storeToRefs

下一章对比 mini-pinia 与官方 Pinia。
