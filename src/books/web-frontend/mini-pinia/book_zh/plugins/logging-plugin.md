---
sidebar_position: 69
title: 日志插件实战
---

# 日志插件实战

日志插件帮助开发者追踪状态变化和 action 执行。本章实现一个功能完善的日志插件。

## 需求分析

一个好的日志插件应该支持：

1. **状态变化日志**：记录 mutation 类型和数据
2. **Action 日志**：记录调用参数和结果
3. **差异对比**：显示状态变化前后的差异
4. **过滤能力**：只记录特定 Store 或 action
5. **性能计时**：记录 action 执行时间
6. **日志级别**：支持 debug、info、warn、error
7. **自定义输出**：支持自定义日志处理器

## 基础版本

```javascript
function loggerPlugin({ store }) {
  // 记录状态变化
  store.$subscribe((mutation, state) => {
    console.log(`[${store.$id}] ${mutation.type}`)
    console.log('  Payload:', mutation.payload)
    console.log('  State:', state)
  })
  
  // 记录 action 调用
  store.$onAction(({ name, args, after, onError }) => {
    console.log(`[${store.$id}] Action: ${name}`)
    console.log('  Args:', args)
    
    after((result) => {
      console.log(`[${store.$id}] Action ${name} completed`)
      console.log('  Result:', result)
    })
    
    onError((error) => {
      console.error(`[${store.$id}] Action ${name} failed`)
      console.error('  Error:', error)
    })
  })
}
```

## 完整实现

```javascript
function createLoggerPlugin(options = {}) {
  const {
    // 日志级别：'debug' | 'info' | 'warn' | 'error' | 'none'
    level = 'info',
    
    // 是否记录状态变化
    logMutations = true,
    
    // 是否记录 actions
    logActions = true,
    
    // 是否显示状态差异
    showDiff = true,
    
    // 是否显示执行时间
    showDuration = true,
    
    // 是否折叠日志组
    collapsed = true,
    
    // 过滤器：返回 true 表示记录
    filter = () => true,
    
    // 自定义日志处理器
    logger = console,
    
    // 自定义格式化
    formatter = defaultFormatter
  } = options
  
  // 日志级别优先级
  const levels = { debug: 0, info: 1, warn: 2, error: 3, none: 4 }
  const currentLevel = levels[level] || 1
  
  function shouldLog(logLevel) {
    return levels[logLevel] >= currentLevel
  }
  
  function log(logLevel, ...args) {
    if (!shouldLog(logLevel)) return
    
    const method = logger[logLevel] || logger.log
    method.apply(logger, args)
  }
  
  return ({ store }) => {
    // 记录状态变化
    if (logMutations) {
      let prevState = JSON.parse(JSON.stringify(store.$state))
      
      store.$subscribe((mutation, state) => {
        // 应用过滤器
        if (!filter({ type: 'mutation', store, mutation })) {
          prevState = JSON.parse(JSON.stringify(state))
          return
        }
        
        const title = formatter.mutation(store.$id, mutation)
        const groupMethod = collapsed ? 'groupCollapsed' : 'group'
        
        if (shouldLog('info')) {
          logger[groupMethod]?.(title) || logger.log(title)
          
          if (showDiff) {
            const diff = computeDiff(prevState, state)
            if (diff.length > 0) {
              logger.log('%c diff', 'color: #9E9E9E; font-weight: bold')
              diff.forEach(d => {
                const color = d.type === 'added' ? 'green' 
                  : d.type === 'removed' ? 'red' 
                  : 'blue'
                logger.log(`%c   ${d.type}: ${d.path} = ${JSON.stringify(d.value)}`, `color: ${color}`)
              })
            }
          }
          
          logger.log('%c prev state', 'color: #9E9E9E; font-weight: bold', prevState)
          logger.log('%c mutation', 'color: #03A9F4; font-weight: bold', mutation)
          logger.log('%c next state', 'color: #4CAF50; font-weight: bold', state)
          
          logger.groupEnd?.()
        }
        
        prevState = JSON.parse(JSON.stringify(state))
      })
    }
    
    // 记录 actions
    if (logActions) {
      store.$onAction(({ name, args, after, onError }) => {
        // 应用过滤器
        if (!filter({ type: 'action', store, actionName: name, args })) {
          return
        }
        
        const startTime = performance.now()
        const title = formatter.action(store.$id, name)
        const groupMethod = collapsed ? 'groupCollapsed' : 'group'
        
        if (shouldLog('info')) {
          logger[groupMethod]?.(title) || logger.log(title)
          logger.log('%c args', 'color: #03A9F4; font-weight: bold', args)
        }
        
        after((result) => {
          const duration = performance.now() - startTime
          
          if (shouldLog('info')) {
            if (result !== undefined) {
              logger.log('%c result', 'color: #4CAF50; font-weight: bold', result)
            }
            
            if (showDuration) {
              logger.log(`%c duration: ${duration.toFixed(2)}ms`, 'color: #9E9E9E')
            }
            
            logger.groupEnd?.()
          }
        })
        
        onError((error) => {
          const duration = performance.now() - startTime
          
          if (shouldLog('error')) {
            logger.error('%c error', 'color: #F44336; font-weight: bold', error)
            
            if (showDuration) {
              logger.log(`%c duration: ${duration.toFixed(2)}ms`, 'color: #9E9E9E')
            }
            
            logger.groupEnd?.()
          }
        })
      })
    }
  }
}

// 默认格式化器
const defaultFormatter = {
  mutation: (storeId, mutation) => {
    const time = new Date().toLocaleTimeString()
    return `%c[${time}] %c${storeId} %c${mutation.type}`
      + '%c'
      .replace('%c', 'color: #9E9E9E')
      .replace('%c', 'color: #03A9F4; font-weight: bold')
      .replace('%c', 'color: #4CAF50')
      .replace('%c', 'color: inherit')
  },
  
  action: (storeId, actionName) => {
    const time = new Date().toLocaleTimeString()
    return `[${time}] ${storeId}.${actionName}()`
  }
}

// 计算状态差异
function computeDiff(prev, next, path = '') {
  const diffs = []
  
  const allKeys = new Set([
    ...Object.keys(prev || {}),
    ...Object.keys(next || {})
  ])
  
  allKeys.forEach(key => {
    const currentPath = path ? `${path}.${key}` : key
    const prevValue = prev?.[key]
    const nextValue = next?.[key]
    
    if (prevValue === undefined && nextValue !== undefined) {
      diffs.push({ type: 'added', path: currentPath, value: nextValue })
    } else if (prevValue !== undefined && nextValue === undefined) {
      diffs.push({ type: 'removed', path: currentPath, value: prevValue })
    } else if (typeof prevValue === 'object' && typeof nextValue === 'object') {
      diffs.push(...computeDiff(prevValue, nextValue, currentPath))
    } else if (prevValue !== nextValue) {
      diffs.push({ 
        type: 'changed', 
        path: currentPath, 
        value: { from: prevValue, to: nextValue }
      })
    }
  })
  
  return diffs
}

export { createLoggerPlugin }
```

## 使用方式

### 基本使用

```javascript
import { createLoggerPlugin } from './logger-plugin'

const pinia = createPinia()

// 开发环境启用
if (process.env.NODE_ENV === 'development') {
  pinia.use(createLoggerPlugin())
}
```

### 详细配置

```javascript
pinia.use(createLoggerPlugin({
  level: 'debug',
  logMutations: true,
  logActions: true,
  showDiff: true,
  showDuration: true,
  collapsed: true,
  
  // 只记录特定 Store
  filter: ({ store }) => {
    return ['counter', 'user'].includes(store.$id)
  }
}))
```

### 只记录特定 actions

```javascript
pinia.use(createLoggerPlugin({
  logMutations: false,
  logActions: true,
  
  filter: ({ type, actionName }) => {
    if (type !== 'action') return false
    
    // 只记录这些 actions
    const tracked = ['login', 'logout', 'fetchData']
    return tracked.includes(actionName)
  }
}))
```

### 自定义日志处理器

```javascript
// 发送到远程日志服务
const remoteLogger = {
  log: (...args) => {
    fetch('/api/logs', {
      method: 'POST',
      body: JSON.stringify({ level: 'info', data: args })
    })
  },
  error: (...args) => {
    fetch('/api/logs', {
      method: 'POST',
      body: JSON.stringify({ level: 'error', data: args })
    })
  },
  group: () => {},
  groupEnd: () => {},
  groupCollapsed: () => {}
}

pinia.use(createLoggerPlugin({
  logger: remoteLogger
}))
```

### 结合其他工具

```javascript
// 与 Vue DevTools 结合
pinia.use(createLoggerPlugin({
  logMutations: true,
  logActions: true,
  
  // 额外发送到 DevTools
  logger: {
    ...console,
    log: (...args) => {
      console.log(...args)
      // 发送到 Vue DevTools 自定义事件
      window.__VUE_DEVTOOLS_GLOBAL_HOOK__?.emit('pinia:log', args)
    }
  }
}))
```

## 生产环境考虑

```javascript
function createLoggerPlugin(options = {}) {
  // 生产环境禁用
  if (process.env.NODE_ENV === 'production' && !options.forceEnable) {
    return () => {}
  }
  
  // 正常实现...
}

// 或者使用空操作
const noop = () => {}
const noopLogger = {
  log: noop,
  info: noop,
  warn: noop,
  error: noop,
  group: noop,
  groupEnd: noop,
  groupCollapsed: noop
}

pinia.use(createLoggerPlugin({
  logger: process.env.NODE_ENV === 'production' ? noopLogger : console
}))
```

## 测试日志插件

```javascript
describe('Logger Plugin', () => {
  test('logs mutations', () => {
    const logs = []
    const mockLogger = {
      log: (...args) => logs.push({ type: 'log', args }),
      group: () => {},
      groupEnd: () => {},
      groupCollapsed: () => {}
    }
    
    const pinia = createPinia()
    pinia.use(createLoggerPlugin({
      logger: mockLogger,
      collapsed: false
    }))
    
    const app = createApp({ template: '<div />' })
    app.use(pinia)
    
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    store.count = 1
    
    expect(logs.some(l => 
      l.args.some(arg => 
        typeof arg === 'string' && arg.includes('test')
      )
    )).toBe(true)
  })
  
  test('logs actions with duration', async () => {
    const logs = []
    const mockLogger = {
      log: (...args) => logs.push({ type: 'log', args }),
      group: () => {},
      groupEnd: () => {},
      groupCollapsed: () => {}
    }
    
    const pinia = createPinia()
    pinia.use(createLoggerPlugin({
      logger: mockLogger,
      showDuration: true
    }))
    
    const app = createApp({ template: '<div />' })
    app.use(pinia)
    
    const useStore = defineStore('test', {
      state: () => ({ count: 0 }),
      actions: {
        async slowAction() {
          await new Promise(r => setTimeout(r, 100))
          this.count++
        }
      }
    })
    
    const store = useStore()
    await store.slowAction()
    
    // 检查是否有 duration 日志
    expect(logs.some(l => 
      l.args.some(arg => 
        typeof arg === 'string' && arg.includes('duration')
      )
    )).toBe(true)
  })
  
  test('respects filter', () => {
    const logs = []
    const mockLogger = {
      log: (...args) => logs.push(args),
      group: () => {},
      groupEnd: () => {},
      groupCollapsed: () => {}
    }
    
    const pinia = createPinia()
    pinia.use(createLoggerPlugin({
      logger: mockLogger,
      filter: ({ store }) => store.$id === 'tracked'
    }))
    
    const app = createApp({ template: '<div />' })
    app.use(pinia)
    
    const useTracked = defineStore('tracked', {
      state: () => ({ value: 0 })
    })
    const useIgnored = defineStore('ignored', {
      state: () => ({ value: 0 })
    })
    
    const tracked = useTracked()
    const ignored = useIgnored()
    
    tracked.value = 1
    const logCountAfterTracked = logs.length
    
    ignored.value = 1
    const logCountAfterIgnored = logs.length
    
    // ignored 的变化不应该产生新日志
    expect(logCountAfterIgnored).toBe(logCountAfterTracked)
  })
})
```

## 本章小结

本章实现了完整的日志插件：

- **状态日志**：记录 mutation 类型和载荷
- **Action 日志**：记录参数、结果、错误
- **差异显示**：计算并展示状态变化
- **性能计时**：记录 action 执行时间
- **过滤能力**：灵活过滤记录内容
- **自定义输出**：支持自定义 logger
- **生产优化**：生产环境禁用

至此，插件系统部分完成。下一部分进入完整实现。
