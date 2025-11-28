# Day 18: watchEffect 和高级选项

> 学习日期: 2025-12-10  
> 预计用时: 1小时  
> 难度等级: ⭐⭐

## 📋 今日目标
- [ ] 实现 watchEffect 函数
- [ ] 支持 deep 深度监听选项
- [ ] 实现 onCleanup 清理函数
- [ ] 理解 flush 执行时机

## ⏰ 时间规划
- 理论学习: 20分钟
- 编码实践: 30分钟
- 测试与调试: 10分钟

---

## 📚 理论知识详解

### 1. watchEffect 的核心原理

#### 1.1 核心概念

**watchEffect vs watch**

| 特性 | watchEffect | watch |
|------|-------------|-------|
| source | 自动追踪 | 需要指定 |
| 回调参数 | 无 newValue/oldValue | 有 newValue/oldValue |
| 立即执行 | 默认 | 需要 immediate 选项 |
| 使用场景 | 简单的副作用 | 需要对比新旧值 |

```javascript
// watch - 明确指定监听对象
const count = ref(0)
watch(count, (newValue, oldValue) => {
  console.log(`${oldValue} -> ${newValue}`)
})

// watchEffect - 自动追踪依赖
watchEffect(() => {
  console.log(count.value)  // 自动追踪 count
})
```

**watchEffect 的特点**：

1. **自动依赖追踪**：函数中访问的所有响应式数据都会被追踪
2. **立即执行**：创建时立即执行一次
3. **无新旧值对比**：不需要关心具体是哪个值变化了

```javascript
const firstName = ref('张')
const lastName = ref('三')

// watchEffect 自动追踪 firstName 和 lastName
watchEffect(() => {
  console.log(`${firstName.value} ${lastName.value}`)
})

// 任何一个变化都会触发
firstName.value = '李'  // 触发
lastName.value = '四'   // 触发
```

#### 1.2 onCleanup 清理函数

**为什么需要清理函数？**

在执行副作用时，可能会产生需要清理的资源：
- 定时器（setTimeout/setInterval）
- 事件监听器
- 异步请求
- 订阅

```javascript
watchEffect((onCleanup) => {
  const timer = setTimeout(() => {
    console.log('延迟执行')
  }, 1000)
  
  // 在下次执行前或组件卸载时清理定时器
  onCleanup(() => {
    clearTimeout(timer)
  })
})
```

**清理函数的执行时机**：

1. **副作用重新执行前**：清理上一次的副作用
2. **监听器停止时**：组件卸载或手动停止

```javascript
let id = 0

watchEffect((onCleanup) => {
  const currentId = ++id
  console.log(`执行副作用 ${currentId}`)
  
  onCleanup(() => {
    console.log(`清理副作用 ${currentId}`)
  })
  
  console.log(count.value)
})

// 输出：
// 执行副作用 1
// 0
// (count 变化)
// 清理副作用 1
// 执行副作用 2
// 1
```

**典型使用场景：防抖搜索**

```javascript
const searchText = ref('')

watchEffect((onCleanup) => {
  const timer = setTimeout(async () => {
    if (searchText.value) {
      const results = await fetch(`/api/search?q=${searchText.value}`)
      // 处理结果...
    }
  }, 300)
  
  // 用户快速输入时，取消上一次的请求
  onCleanup(() => {
    clearTimeout(timer)
  })
})
```

#### 1.3 deep 深度监听

**deep: true** - 深度遍历对象的所有嵌套属性

```javascript
const state = reactive({
  user: {
    profile: {
      name: 'Vue'
    }
  }
})

// 不使用 deep，只监听顶层属性的引用变化
watch(state, () => {
  console.log('state 变化')
})

state.user = { profile: { name: 'React' } }  // 触发
state.user.profile.name = 'Angular'          // 不触发

// 使用 deep，监听所有嵌套属性
watch(state, () => {
  console.log('state 变化')
}, { deep: true })

state.user.profile.name = 'Angular'          // 触发
```

**deep 的实现原理**：

```javascript
function traverse(value, seen = new Set()) {
  // 避免循环引用
  if (typeof value !== 'object' || value === null || seen.has(value)) {
    return value
  }
  
  seen.add(value)
  
  // 递归访问所有属性，触发 getter，收集依赖
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      traverse(value[i], seen)
    }
  } else {
    for (const key in value) {
      traverse(value[key], seen)
    }
  }
  
  return value
}
```

---

## 💻 实践任务

### 任务目标
实现 watchEffect 函数和 onCleanup 清理机制。

### 测试用例

在 `test/reactivity/watch.spec.ts` 中添加：

```typescript
describe('watchEffect', () => {
  it('应该自动追踪依赖', () => {
    const count = ref(0)
    const fn = vi.fn(() => {
      count.value
    })
    
    watchEffect(fn)
    
    expect(fn).toHaveBeenCalledTimes(1)
    
    count.value++
    expect(fn).toHaveBeenCalledTimes(2)
  })
  
  it('应该追踪多个依赖', () => {
    const count1 = ref(0)
    const count2 = ref(0)
    let sum = 0
    
    watchEffect(() => {
      sum = count1.value + count2.value
    })
    
    expect(sum).toBe(0)
    
    count1.value = 1
    expect(sum).toBe(1)
    
    count2.value = 2
    expect(sum).toBe(3)
  })
  
  it('应该支持 onCleanup', () => {
    const count = ref(0)
    const cleanup = vi.fn()
    
    watchEffect((onCleanup) => {
      onCleanup(cleanup)
      count.value
    })
    
    expect(cleanup).toHaveBeenCalledTimes(0)
    
    count.value++
    expect(cleanup).toHaveBeenCalledTimes(1)
    
    count.value++
    expect(cleanup).toHaveBeenCalledTimes(2)
  })
  
  it('停止时应该调用 cleanup', () => {
    const count = ref(0)
    const cleanup = vi.fn()
    
    const stop = watchEffect((onCleanup) => {
      onCleanup(cleanup)
      count.value
    })
    
    count.value++
    expect(cleanup).toHaveBeenCalledTimes(1)
    
    stop()
    expect(cleanup).toHaveBeenCalledTimes(2)
  })
})

describe('watch - deep', () => {
  it('应该支持深度监听', () => {
    const state = reactive({
      nested: {
        count: 0
      }
    })
    const fn = vi.fn()
    
    watch(state, fn, { deep: true })
    
    state.nested.count++
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
```

### 实现步骤

#### 步骤1: 实现 watchEffect (预估10分钟)

修改 `src/reactivity/watch.ts`，添加 watchEffect：

```typescript
export type WatchEffect = (onCleanup: (cleanupFn: () => void) => void) => void

export function watchEffect(effect: WatchEffect) {
  return doWatch(effect, null, {})
}

// 重构 watch，提取公共逻辑到 doWatch
export function watch<T>(
  source: WatchSource<T>,
  cb: (newValue: T, oldValue: T | undefined) => void,
  options: WatchOptions = {}
) {
  return doWatch(source, cb, options)
}

function doWatch(
  source: WatchSource<any> | WatchEffect,
  cb: ((newValue: any, oldValue: any) => void) | null,
  options: WatchOptions = {}
) {
  let getter: () => any
  
  // watchEffect: source 是 effect 函数
  if (cb === null) {
    getter = source as () => any
  }
  // watch: 规范化 source
  else {
    if (typeof source === 'function') {
      getter = source as () => any
    } else if (isRef(source)) {
      getter = () => (source as any).value
    } else if (isReactive(source)) {
      getter = () => traverse(source)
      options.deep = true
    } else {
      console.warn('watch source 类型不正确')
      getter = () => source as any
    }
  }
  
  // 如果有 deep 选项，包装 getter
  if (options.deep && cb !== null) {
    const baseGetter = getter
    getter = () => traverse(baseGetter())
  }
  
  let cleanup: (() => void) | undefined
  
  // onCleanup 函数
  const onCleanup = (fn: () => void) => {
    cleanup = fn
  }
  
  let oldValue: any
  
  const job = () => {
    // 执行清理函数
    if (cleanup) {
      cleanup()
    }
    
    if (cb) {
      // watch: 调用回调
      const newValue = effectFn.run()
      cb(newValue, oldValue)
      oldValue = newValue
    } else {
      // watchEffect: 直接执行 effect
      effectFn.run()
    }
  }
  
  const effectFn = new ReactiveEffect(getter, () => {
    job()
  })
  
  // watchEffect 或 immediate: 立即执行
  if (cb === null || options.immediate) {
    job()
  } else {
    oldValue = effectFn.run()
  }
  
  // 返回停止函数
  return () => {
    if (cleanup) {
      cleanup()
    }
    effectFn.stop()
  }
}
```

#### 步骤2: 传递 onCleanup 参数 (预估5分钟)

修改 ReactiveEffect，支持传递参数给 fn：

```typescript
export class ReactiveEffect<T = any> {
  active = true
  deps: Set<ReactiveEffect>[] = []
  onStop?: () => void
  
  constructor(
    public fn: () => T,
    public scheduler?: (effect: ReactiveEffect<T>) => void
  ) {}
  
  run() {
    if (!this.active) {
      return this.fn()
    }
    
    activeEffect = this
    const result = this.fn()
    activeEffect = undefined
    
    return result
  }
  
  stop() {
    if (this.active) {
      cleanupEffect(this)
      if (this.onStop) {
        this.onStop()
      }
      this.active = false
    }
  }
}
```

修改 doWatch，传递 onCleanup：

```typescript
function doWatch(
  source: WatchSource<any> | WatchEffect,
  cb: ((newValue: any, oldValue: any) => void) | null,
  options: WatchOptions = {}
) {
  let cleanup: (() => void) | undefined
  
  const onCleanup = (fn: () => void) => {
    cleanup = fn
    effectFn.onStop = fn  // 停止时也调用清理函数
  }
  
  let getter: () => any
  
  // watchEffect: 需要传递 onCleanup
  if (cb === null) {
    getter = () => (source as WatchEffect)(onCleanup)
  }
  // watch: 正常的 getter
  else {
    // ... 规范化 source
  }
  
  // ... 其余代码
}
```

#### 步骤3: 测试和验证 (预估5分钟)

运行测试：

```bash
npm test watch.spec.ts
```

验证以下场景：
1. watchEffect 自动追踪依赖
2. onCleanup 在重新执行前调用
3. stop() 时调用清理函数
4. deep 选项正确工作

---

## 🤔 思考题

### 问题1: 如何实现一个只执行一次的 watchEffect？
**提示**: 在清理函数中调用 stop()。

### 问题2: watchEffect 相比 computed 有什么优缺点？
**提示**: 考虑缓存、返回值、使用场景。

### 问题3: 如何避免 deep 监听的性能问题？
**提示**: 使用 getter 函数只监听需要的属性。

---

## 📝 学习总结

完成今天的学习后，请回答以下问题：

1. **今天学到的核心知识点是什么？**
   - 

2. **遇到了哪些困难？如何解决的？**
   - 

3. **有哪些新的思考和疑问？**
   - 

4. **如何将今天的知识应用到实际项目中？**
   - 

---

## 📖 扩展阅读

- [Vue 3 watchEffect API 文档](https://cn.vuejs.org/api/reactivity-core.html#watcheffect) - 阅读时间: 10分钟
- [Vue 3 源码 - apiWatch.ts](../../.book_refe/core/packages/runtime-core/src/apiWatch.ts) - 阅读时间: 40分钟

---

## ⏭️ 明日预告

明天我们将学习: **响应式系统的性能优化**

主要内容:
- 调度器优化
- 批量更新
- 依赖去重
- 性能测试

建议预习: 事件循环和微任务队列
