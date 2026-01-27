# normalizeEmitsOptions 事件规范化

组件的 `emits` 选项可以是数组或对象。`normalizeEmitsOptions` 将其统一规范化为对象形式，便于后续处理。

## emits 的多种写法

```javascript
// 数组形式
emits: ['update', 'delete']

// 对象形式
emits: {
  update: null,
  delete: null
}

// 带验证的对象形式
emits: {
  update: (value) => typeof value === 'number',
  delete: (id) => typeof id === 'string'
}
```

## 源码分析

```typescript
export function normalizeEmitsOptions(
  comp: ConcreteComponent,
  appContext: AppContext,
  asMixin = false
): ObjectEmitsOptions | null {
  // 检查缓存
  const cache = appContext.emitsCache
  const cached = cache.get(comp)
  if (cached !== undefined) {
    return cached
  }

  const raw = comp.emits
  let normalized: ObjectEmitsOptions = {}

  // 处理继承和混入
  let hasExtends = false
  if (__FEATURE_OPTIONS_API__ && !isFunction(comp)) {
    const extendEmits = (raw: ComponentOptions) => {
      const normalizedFromExtend = normalizeEmitsOptions(raw, appContext, true)
      if (normalizedFromExtend) {
        hasExtends = true
        extend(normalized, normalizedFromExtend)
      }
    }
    
    // 全局混入
    if (!asMixin && appContext.mixins.length) {
      appContext.mixins.forEach(extendEmits)
    }
    // extends
    if (comp.extends) {
      extendEmits(comp.extends)
    }
    // 局部混入
    if (comp.mixins) {
      comp.mixins.forEach(extendEmits)
    }
  }

  // 没有 emits 声明
  if (!raw && !hasExtends) {
    if (isObject(comp)) {
      cache.set(comp, null)
    }
    return null
  }

  // 规范化
  if (isArray(raw)) {
    raw.forEach(key => (normalized[key] = null))
  } else {
    extend(normalized, raw)
  }

  if (isObject(comp)) {
    cache.set(comp, normalized)
  }
  
  return normalized
}
```

## 缓存机制

规范化结果被缓存：

```typescript
const cache = appContext.emitsCache
const cached = cache.get(comp)
if (cached !== undefined) {
  return cached
}
```

同一个组件类型只规范化一次。

## 继承合并

emits 会从继承链合并：

```javascript
const Base = {
  emits: ['base-event']
}

const Child = {
  extends: Base,
  emits: ['child-event']
}

// 规范化后
// { 'base-event': null, 'child-event': null }
```

源码中递归处理：

```typescript
if (comp.extends) {
  extendEmits(comp.extends)
}
if (comp.mixins) {
  comp.mixins.forEach(extendEmits)
}
```

## 混入合并

混入的 emits 也会合并：

```javascript
const mixin = {
  emits: ['mixin-event']
}

const Comp = {
  mixins: [mixin],
  emits: ['own-event']
}

// 规范化后
// { 'mixin-event': null, 'own-event': null }
```

## 数组转对象

数组形式转换为对象：

```typescript
if (isArray(raw)) {
  raw.forEach(key => (normalized[key] = null))
}
```

`['update', 'delete']` 变成 `{ update: null, delete: null }`。

## 全局混入

应用级混入的 emits 也会合并：

```javascript
app.mixin({
  emits: ['global-event']
})
```

```typescript
if (!asMixin && appContext.mixins.length) {
  appContext.mixins.forEach(extendEmits)
}
```

## 使用场景

### 事件验证

规范化后用于验证：

```typescript
// emit 函数中
if (emitsOptions) {
  if (!(event in emitsOptions)) {
    warn(`Component emitted event "${event}" but it is not declared...`)
  } else {
    const validator = emitsOptions[event]
    if (isFunction(validator)) {
      const isValid = validator(...rawArgs)
      // ...
    }
  }
}
```

### 区分组件事件和原生事件

```typescript
export function isEmitListener(
  options: ObjectEmitsOptions | null,
  key: string
): boolean {
  if (!options || !isOn(key)) {
    return false
  }

  key = key.slice(2).replace(/Once$/, '')
  return (
    hasOwn(options, key[0].toLowerCase() + key.slice(1)) ||
    hasOwn(options, hyphenate(key)) ||
    hasOwn(options, key)
  )
}
```

用于判断一个 prop 是否是事件监听器。

### attrs 过滤

声明的 emits 不会出现在 attrs 中：

```html
<Child @update="..." class="foo" />
```

如果 Child 声明了 `emits: ['update']`：
- `@update` 不会出现在 `attrs` 中
- `class` 会出现在 `attrs` 中

## 性能优化

函数式组件检查：

```typescript
if (!isFunction(comp)) {
  // 处理 extends 和 mixins
}
```

函数式组件没有 Options API，跳过相关处理。

## 与 props 的关系

emits 和 props 一起影响 attrs：

```typescript
// 过滤 attrs 时
if (
  !isEmitListener(options, key) &&
  !isPropsOption(propsOptions, key)
) {
  attrs[key] = value
}
```

## defineEmits 编译

`<script setup>` 中的 `defineEmits` 编译为 emits 选项：

```html
<script setup>
const emit = defineEmits(['update', 'delete'])
</script>
```

编译后：

```javascript
export default {
  emits: ['update', 'delete'],
  setup(__props, { emit }) {
    // ...
  }
}
```

## 类型化 emits

TypeScript 类型定义：

```typescript
type ObjectEmitsOptions = Record<
  string,
  ((...args: any[]) => any) | null
>
```

值可以是验证函数或 null。

## null vs undefined

规范化时 null 表示声明了但无验证：

```javascript
{
  update: null,      // 声明了，无验证
  delete: (id) => typeof id === 'string'  // 声明了，有验证
}
```

undefined 表示未声明。

## 边界情况

没有 emits 声明：

```typescript
if (!raw && !hasExtends) {
  cache.set(comp, null)
  return null
}
```

返回 null 表示无 emits 声明，这时所有 on* props 都当作原生事件处理。

## 调试

开发环境可以检查规范化结果：

```javascript
import { getCurrentInstance } from 'vue'

setup() {
  const instance = getCurrentInstance()
  console.log(instance.emitsOptions)
  // { update: null, delete: [Function] }
}
```

## 小结

`normalizeEmitsOptions` 的作用：

1. **统一格式**：数组转对象
2. **合并继承**：处理 extends 和 mixins
3. **缓存结果**：避免重复计算
4. **支持验证**：保留验证函数

规范化后的 emits 用于事件验证、attrs 过滤等场景。

下一章将分析 `v-model` 的实现——双向绑定的事件处理。
