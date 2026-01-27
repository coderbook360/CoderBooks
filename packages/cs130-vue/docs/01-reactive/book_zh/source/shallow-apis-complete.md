# Shallow 系列 API 完整解析

Vue 提供了一组「浅层」响应式 API：`shallowRef`、`shallowReactive`、`shallowReadonly`。本章完整解析它们的实现和使用场景。

## Shallow API 概览

| API | 描述 | 深层响应式 |
|-----|------|-----------|
| `reactive` | 深层响应式对象 | ✓ |
| `shallowReactive` | 浅层响应式对象 | ✗ |
| `ref` | 深层响应式引用 | ✓ |
| `shallowRef` | 浅层响应式引用 | ✗ |
| `readonly` | 深层只读 | ✓ |
| `shallowReadonly` | 浅层只读 | ✗ |

## shallowReactive 源码解析

```typescript
export function shallowReactive<T extends object>(target: T): T {
  return createReactiveObject(
    target,
    false,
    shallowReactiveHandlers,
    shallowCollectionHandlers,
    shallowReactiveMap
  )
}
```

核心区别在于 handlers。shallowReactiveHandlers 的 getter：

```typescript
function shallowGet(target: object, key: string | symbol, receiver: object) {
  // ... 标识符检查
  
  const res = Reflect.get(target, key, receiver)
  
  track(target, TrackOpTypes.GET, key)
  
  // 关键：不递归转换
  return res
}
```

普通 reactive 的 getter：

```typescript
function get(target: object, key: string | symbol, receiver: object) {
  // ...
  
  const res = Reflect.get(target, key, receiver)
  
  track(target, TrackOpTypes.GET, key)
  
  // 深层：递归转换对象
  if (isObject(res)) {
    return isReadonly ? readonly(res) : reactive(res)
  }
  
  return res
}
```

## shallowRef 源码解析

```typescript
export function shallowRef<T>(value: T): ShallowRef<T> {
  return createRef(value, true)
}

function createRef(rawValue: unknown, shallow: boolean) {
  if (isRef(rawValue)) {
    return rawValue
  }
  return new RefImpl(rawValue, shallow)
}
```

RefImpl 中处理 shallow：

```typescript
class RefImpl<T> {
  private _value: T
  public readonly __v_isShallow: boolean
  
  constructor(value: T, isShallow: boolean) {
    this._rawValue = isShallow ? value : toRaw(value)
    // 关键：shallow 不转换为 reactive
    this._value = isShallow ? value : toReactive(value)
    this.__v_isShallow = isShallow
  }
  
  set value(newVal) {
    const useDirectValue = this.__v_isShallow || isShallow(newVal) || isReadonly(newVal)
    newVal = useDirectValue ? newVal : toRaw(newVal)
    
    if (hasChanged(newVal, this._rawValue)) {
      this._rawValue = newVal
      // shallow 不转换
      this._value = useDirectValue ? newVal : toReactive(newVal)
      triggerRefValue(this, newVal)
    }
  }
}
```

## shallowReadonly 源码

```typescript
export function shallowReadonly<T extends object>(target: T): Readonly<T> {
  return createReactiveObject(
    target,
    true,
    shallowReadonlyHandlers,
    shallowReadonlyCollectionHandlers,
    shallowReadonlyMap
  )
}
```

shallowReadonlyHandlers：

```typescript
const shallowReadonlyHandlers = {
  get: shallowReadonlyGet,
  set(target, key) {
    warn(`Set operation on key "${String(key)}" failed: target is readonly.`)
    return true
  },
  deleteProperty(target, key) {
    warn(`Delete operation on key "${String(key)}" failed: target is readonly.`)
    return true
  }
}

function shallowReadonlyGet(target: object, key: string | symbol, receiver: object) {
  // ... 标识符检查
  
  // 不追踪（readonly 不需要追踪）
  // 不递归转换（shallow）
  return Reflect.get(target, key, receiver)
}
```

## isShallow 检查

```typescript
export function isShallow(value: unknown): boolean {
  return !!(value && (value as any).__v_isShallow)
}
```

可以检查任何 shallow 类型的值。

## 使用场景分析

### shallowReactive 场景

**大型静态数据结构：**

```typescript
const state = shallowReactive({
  // 大量静态配置，不需要响应式
  config: loadHugeConfig(),
  
  // 只有 activeTab 需要响应式
  activeTab: 'home'
})

// 修改 activeTab 触发更新
state.activeTab = 'settings'

// 修改 config 内部不触发更新（也不需要）
state.config.someKey = 'value'
```

**包含不兼容对象：**

```typescript
const state = shallowReactive({
  // 第三方类实例可能不兼容 Proxy
  mapInstance: new google.maps.Map(element),
  
  // 正常响应式
  markers: []
})
```

### shallowRef 场景

**整体替换的大对象：**

```typescript
const largeList = shallowRef<Item[]>([])

// 整体替换触发更新
largeList.value = await fetchItems()

// 内部修改不触发（使用 triggerRef 手动触发）
largeList.value.push(newItem)
triggerRef(largeList)
```

**DOM 元素引用：**

```typescript
const canvasRef = shallowRef<HTMLCanvasElement | null>(null)

// 用于模板 ref
// <canvas ref="canvasRef">
```

### shallowReadonly 场景

**暴露只读的外部数据：**

```typescript
const internalState = reactive({
  users: [],
  settings: {
    theme: 'dark'
  }
})

// 对外暴露浅层只读
// 顶层不可改，但嵌套对象的属性仍可改
export const publicState = shallowReadonly(internalState)
```

**Props 代理：**

```typescript
// Vue 内部使用 shallowReadonly 包装 props
const props = shallowReadonly(rawProps)
```

## 性能对比

```typescript
// 创建性能测试
const iterations = 10000

console.time('reactive')
for (let i = 0; i < iterations; i++) {
  reactive({ nested: { deep: { value: i } } })
}
console.timeEnd('reactive')

console.time('shallowReactive')
for (let i = 0; i < iterations; i++) {
  shallowReactive({ nested: { deep: { value: i } } })
}
console.timeEnd('shallowReactive')
```

shallowReactive 更快，因为不需要递归处理嵌套对象。

## triggerRef 配合使用

shallowRef 需要 triggerRef 手动触发：

```typescript
const list = shallowRef<number[]>([])

// 这不会触发更新
list.value.push(1)

// 手动触发
triggerRef(list)
```

triggerRef 源码：

```typescript
export function triggerRef(ref: Ref) {
  triggerRefValue(ref, __DEV__ ? ref.value : void 0)
}
```

## 组合使用

有时需要混合使用：

```typescript
const state = reactive({
  // 这部分深层响应式
  form: {
    name: '',
    email: ''
  },
  
  // 这部分使用 shallowRef
  results: shallowRef<SearchResult[]>([])
})

// form 的任何变化都触发
state.form.name = 'Vue'

// results 只在整体替换时触发
state.results = await search(query)
```

## 最佳实践

### 何时使用 Shallow API

1. **大型静态数据**：配置、常量、只读数据
2. **第三方对象**：DOM 元素、类实例、外部库对象
3. **性能敏感场景**：高频更新、大量数据
4. **整体替换场景**：列表、分页数据

### 何时不使用

1. **需要深层响应**：表单、状态管理
2. **数据结构不确定**：动态添加属性
3. **小型简单对象**：没有性能收益

## 本章小结

Shallow 系列 API 的要点：

1. **shallowReactive**：只有第一层属性是响应式
2. **shallowRef**：只有 `.value` 的赋值是响应式
3. **shallowReadonly**：只有第一层属性是只读
4. **isShallow**：检查是否是浅层响应式
5. **triggerRef**：手动触发 shallowRef 更新

合理使用 Shallow API 可以在保持响应式能力的同时优化性能。关键是理解「浅层」的含义：只有第一层是响应式的，嵌套对象保持原样。
