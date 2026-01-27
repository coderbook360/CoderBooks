# normalizeEmitsOptions 规范化

normalizeEmitsOptions 将组件的 emits 选项统一转换为标准格式，支持数组和对象两种声明方式，并处理 mixins 继承。

## emits 声明方式

```typescript
// 数组形式
emits: ['change', 'update']

// 对象形式（带验证）
emits: {
  change: (value) => typeof value === 'string',
  update: null  // 不验证
}
```

## 函数定义

```typescript
export function normalizeEmitsOptions(
  comp: ConcreteComponent,
  appContext: AppContext,
  asMixin = false
): ObjectEmitsOptions | null {
  const cache = appContext.emitsCache
  const cached = cache.get(comp)
  if (cached !== undefined) {
    return cached
  }

  const raw = comp.emits
  let normalized: ObjectEmitsOptions = {}

  // 是否需要规范化（有继承或者是数组形式）
  let hasExtends = false
  
  if (__FEATURE_OPTIONS_API__ && !isFunction(comp)) {
    const extendEmits = (raw: ComponentOptions) => {
      const normalizedFromExtend = normalizeEmitsOptions(raw, appContext, true)
      if (normalizedFromExtend) {
        hasExtends = true
        extend(normalized, normalizedFromExtend)
      }
    }
    // 全局 mixins
    if (!asMixin && appContext.mixins.length) {
      appContext.mixins.forEach(extendEmits)
    }
    // extends
    if (comp.extends) {
      extendEmits(comp.extends)
    }
    // mixins
    if (comp.mixins) {
      comp.mixins.forEach(extendEmits)
    }
  }

  // 没有 emits 定义
  if (!raw && !hasExtends) {
    if (isObject(comp)) {
      cache.set(comp, null)
    }
    return null
  }

  // 数组形式转对象
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

```typescript
const cache = appContext.emitsCache
const cached = cache.get(comp)
if (cached !== undefined) {
  return cached
}

// ... 处理逻辑

if (isObject(comp)) {
  cache.set(comp, normalized)
}
```

结果被缓存到 appContext.emitsCache，避免重复计算。

## mixins 继承

```typescript
const extendEmits = (raw: ComponentOptions) => {
  const normalizedFromExtend = normalizeEmitsOptions(raw, appContext, true)
  if (normalizedFromExtend) {
    hasExtends = true
    extend(normalized, normalizedFromExtend)
  }
}

// 处理全局 mixins
if (!asMixin && appContext.mixins.length) {
  appContext.mixins.forEach(extendEmits)
}

// 处理 extends
if (comp.extends) {
  extendEmits(comp.extends)
}

// 处理局部 mixins
if (comp.mixins) {
  comp.mixins.forEach(extendEmits)
}
```

继承顺序：全局 mixins → extends → 局部 mixins → 组件自身。

## 数组转对象

```typescript
if (isArray(raw)) {
  raw.forEach(key => (normalized[key] = null))
} else {
  extend(normalized, raw)
}
```

数组形式会被转换为对象形式，值为 null 表示不需要验证。

## 在 emit 中的使用

```typescript
function emit(
  instance: ComponentInternalInstance,
  event: string,
  ...rawArgs: any[]
) {
  const props = instance.vnode.props || EMPTY_OBJ

  if (__DEV__) {
    const { emitsOptions } = instance
    if (emitsOptions) {
      if (!(event in emitsOptions)) {
        // 检查是否是未声明的事件
        if (!propsOptions || !(toHandlerKey(event) in propsOptions)) {
          warn(
            `Component emitted event "${event}" but it is neither declared ` +
            `in the emits option nor as an "${toHandlerKey(event)}" prop.`
          )
        }
      } else {
        const validator = emitsOptions[event]
        if (isFunction(validator)) {
          const isValid = validator(...rawArgs)
          if (!isValid) {
            warn(
              `Invalid event arguments: event validation failed for event "${event}".`
            )
          }
        }
      }
    }
  }
  
  // ...
}
```

## 验证器

```typescript
// 定义验证器
emits: {
  submit: (payload) => {
    if (!payload.email) {
      console.warn('Email is required')
      return false
    }
    return true
  }
}

// 触发时验证
emit('submit', { email: '' })  // 警告：验证失败
```

## isEmitListener

判断是否是事件监听器：

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

用于区分事件和普通 props。

## 与 props 的关系

```typescript
// initProps 中使用
function setFullProps(
  instance: ComponentInternalInstance,
  rawProps: Data | null,
  props: Data,
  attrs: Data
) {
  const [options, needCastKeys] = instance.propsOptions
  const emitsOptions = instance.emitsOptions

  for (const key in rawProps!) {
    const value = rawProps![key]
    
    // 检查是否是 props
    if (options && hasOwn(options, key)) {
      props[key] = value
    } 
    // 检查是否是事件监听器
    else if (!isEmitListener(emitsOptions, key)) {
      // 既不是 props 也不是事件，放入 attrs
      attrs[key] = value
    }
  }
}
```

## 类型推断

```typescript
// TypeScript 类型
interface ComponentOptions {
  emits?: EmitsOptions
}

type EmitsOptions = ObjectEmitsOptions | string[]

type ObjectEmitsOptions = Record<
  string,
  ((...args: any[]) => any) | null
>
```

## 完整示例

```typescript
import { defineComponent } from 'vue'

const MyButton = defineComponent({
  emits: {
    // 点击事件，验证 payload
    click: (evt: MouseEvent) => evt instanceof MouseEvent,
    
    // 提交事件，带数据验证
    submit: (data: { name: string; value: number }) => {
      return typeof data.name === 'string' && typeof data.value === 'number'
    },
    
    // 不需要验证
    cancel: null
  },
  
  setup(props, { emit }) {
    const handleClick = (evt: MouseEvent) => {
      emit('click', evt)
    }
    
    const handleSubmit = () => {
      emit('submit', { name: 'test', value: 42 })
    }
    
    const handleCancel = () => {
      emit('cancel')
    }
    
    return { handleClick, handleSubmit, handleCancel }
  }
})
```

## v-model 的 emits

defineModel 自动生成 emits：

```typescript
// 使用 defineModel
const model = defineModel<string>()

// 等价于声明
emits: ['update:modelValue']
```

## 小结

normalizeEmitsOptions 的核心要点：

1. **统一格式**：数组和对象统一转换为对象格式
2. **继承合并**：处理 mixins 和 extends 的 emits
3. **缓存优化**：结果缓存避免重复计算
4. **验证支持**：对象形式支持自定义验证器
5. **类型推断**：为 emit 提供类型支持

emits 规范化是事件系统的基础。

下一章将分析 provide 的实现。
