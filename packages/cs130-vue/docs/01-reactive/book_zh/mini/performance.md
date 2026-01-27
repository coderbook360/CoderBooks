# 性能分析：优化建议与最佳实践

本章分析迷你响应式系统的性能特点，并给出优化建议。

## 性能瓶颈分析

### 1. 依赖收集开销

每次访问响应式属性都会触发依赖收集：

```typescript
function track(target: object, key: unknown) {
  if (!activeEffect) return
  
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }
  
  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = new Set()))
  }
  
  dep.add(activeEffect)
  activeEffect.deps.push(dep)
}
```

即使依赖已存在，仍需检查。

### 2. 依赖清理开销

每次 effect 执行前都要清理旧依赖：

```typescript
function cleanupEffect(effect: ReactiveEffect) {
  for (const dep of effect.deps) {
    dep.delete(effect)
  }
  effect.deps.length = 0
}
```

大量依赖时，清理成本很高。

### 3. 嵌套代理创建

访问嵌套属性时创建新代理：

```typescript
if (typeof result === 'object' && result !== null) {
  return reactive(result)  // 每次访问都检查
}
```

虽然有缓存，但检查本身有开销。

## 优化策略

### 1. 避免重复收集

```typescript
function track(target: object, key: unknown) {
  if (!activeEffect) return
  
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }
  
  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = new Set()))
  }
  
  // 检查是否已收集
  if (dep.has(activeEffect)) {
    return  // 已存在，跳过
  }
  
  dep.add(activeEffect)
  activeEffect.deps.push(dep)
}
```

### 2. 惰性清理

使用版本号代替每次清理：

```typescript
let effectTrackId = 0

class ReactiveEffect {
  _trackId = 0
  
  run() {
    this._trackId = ++effectTrackId  // 新版本号
    // ...
  }
}

// Dep 记录版本号
class Dep {
  _trackId = 0
  
  track(effect: ReactiveEffect) {
    if (this._trackId === effect._trackId) {
      return  // 本轮已收集
    }
    this._trackId = effect._trackId
    // 收集依赖...
  }
}
```

这避免了每次执行都清理所有依赖。

### 3. shallowReactive 使用

不需要深层响应时使用 shallowReactive：

```typescript
// 大数据只需要监听顶层
const largeList = shallowReactive({
  items: hugeArray,
  loaded: false
})

// 只有 items 和 loaded 是响应式
// 数组元素不是响应式的
```

### 4. 批量更新

使用 scheduler 批量处理：

```typescript
const queue = new Set<ReactiveEffect>()
let isFlushing = false

function queueJob(effect: ReactiveEffect) {
  queue.add(effect)  // Set 自动去重
  
  if (!isFlushing) {
    isFlushing = true
    Promise.resolve().then(() => {
      queue.forEach(e => e.run())
      queue.clear()
      isFlushing = false
    })
  }
}

// 多次修改只触发一次
state.a = 1
state.b = 2
state.c = 3
// 合并为一次更新
```

### 5. computed 缓存

利用 computed 的缓存特性：

```typescript
// 不好：每次访问都计算
effect(() => {
  const total = items.reduce((sum, item) => sum + item.price, 0)
  console.log(total)
})

// 好：使用 computed 缓存
const total = computed(() => {
  return items.reduce((sum, item) => sum + item.price, 0)
})

effect(() => {
  console.log(total.value)  // 只在依赖变化时重算
})
```

## 基准测试

```typescript
function benchmark(name: string, fn: () => void, iterations = 10000) {
  const start = performance.now()
  for (let i = 0; i < iterations; i++) {
    fn()
  }
  const end = performance.now()
  console.log(`${name}: ${(end - start).toFixed(2)}ms (${iterations} iterations)`)
}

// 测试响应式创建
benchmark('reactive creation', () => {
  reactive({ count: 0 })
})

// 测试属性访问
const obj = reactive({ count: 0 })
benchmark('property access', () => {
  obj.count
})

// 测试属性修改
benchmark('property set', () => {
  obj.count++
})

// 测试 effect 执行
let dummy
benchmark('effect execution', () => {
  effect(() => {
    dummy = obj.count
  })
})

// 测试深层嵌套
const deep = reactive({
  a: { b: { c: { d: { e: 0 } } } }
})
benchmark('deep access', () => {
  deep.a.b.c.d.e
})
```

## 内存分析

### 内存占用来源

1. **WeakMap/Map/Set**：依赖存储结构
2. **Proxy 对象**：每个响应式对象一个
3. **ReactiveEffect 实例**：每个 effect 一个
4. **deps 数组**：effect 的依赖引用

### 内存优化

```typescript
// 及时清理不需要的 effect
const runner = effect(() => {
  // ...
})

// 不再需要时停止
runner.effect.stop()

// 使用 effectScope 统一管理
const scope = effectScope()
scope.run(() => {
  effect(() => { /* ... */ })
  effect(() => { /* ... */ })
})

// 统一清理
scope.stop()
```

## 最佳实践

### 1. 减少响应式数据量

```typescript
// 不好：所有数据都响应式
const state = reactive({
  items: largeArray,
  config: staticConfig,
  cache: cacheData
})

// 好：只让需要的数据响应式
const state = reactive({
  currentItem: null,
  selectedIds: []
})

const items = largeArray  // 普通数据
const config = staticConfig  // 静态配置
```

### 2. 使用 shallowRef 存储大对象

```typescript
// 好：只响应整体替换
const largeData = shallowRef(null)

// 替换触发更新
largeData.value = newData

// 修改内部不触发（也不需要）
largeData.value.someKey = 'new'  // 不触发
```

### 3. 避免不必要的依赖

```typescript
// 不好：依赖整个对象
effect(() => {
  console.log(state)  // 任何属性变化都触发
})

// 好：只依赖需要的属性
effect(() => {
  console.log(state.count)  // 只有 count 变化触发
})
```

### 4. 合理使用 computed

```typescript
// 复杂计算用 computed 缓存
const filteredList = computed(() => {
  return items.filter(item => item.active)
})

const sortedList = computed(() => {
  return [...filteredList.value].sort((a, b) => a.id - b.id)
})

// 多个地方使用，只计算一次
console.log(sortedList.value)
console.log(sortedList.value)
```

### 5. 使用 toRaw 跳过响应式

```typescript
// 批量操作时获取原始对象
const raw = toRaw(state)

// 直接操作原始对象，最后统一触发
raw.a = 1
raw.b = 2
raw.c = 3

// 手动触发更新
trigger(state, 'batch')
```

## 性能对比总结

| 操作 | 迷你版 | Vue 源码 |
|------|--------|----------|
| 创建 reactive | 较快 | 快 |
| 属性访问 | 中等 | 快 |
| 依赖收集 | 中等 | 快 |
| 依赖清理 | 慢 | 快 |
| computed | 快 | 快 |
| 大量 effect | 慢 | 中等 |

## 本章小结

性能优化的关键点：

1. **减少依赖收集次数**：避免重复收集
2. **优化清理策略**：使用版本号代替每次清理
3. **合理使用 shallow 系列**：大数据不需要深层响应
4. **批量更新**：合并多次修改为一次
5. **computed 缓存**：复杂计算使用 computed
6. **及时清理**：不需要的 effect 要停止

理解这些优化策略，有助于在实际项目中写出高性能的响应式代码。
