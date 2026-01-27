# normalizePropsOptions 属性规范化

Vue 支持多种 props 声明方式：数组形式、对象简写、完整对象。`normalizePropsOptions` 将这些不同的形式统一规范化为内部使用的标准格式。

## 为什么需要规范化

Props 可以用多种方式声明：

```javascript
// 数组形式
props: ['title', 'count']

// 对象简写
props: {
  title: String,
  count: Number
}

// 完整形式
props: {
  title: {
    type: String,
    required: true
  },
  count: {
    type: Number,
    default: 0
  }
}
```

为了统一处理，需要将这些形式转换为一致的内部格式。

## 源码位置

`normalizePropsOptions` 在 `runtime-core/src/componentProps.ts`：

```typescript
export function normalizePropsOptions(
  comp: ConcreteComponent,
  appContext: AppContext,
  asMixin = false
): NormalizedPropsOptions {
  // 检查缓存
  const cache = appContext.propsCache
  const cached = cache.get(comp)
  if (cached) {
    return cached
  }
  
  const raw = comp.props
  const normalized: NormalizedPropsOptions[0] = {}
  const needCastKeys: NormalizedPropsOptions[1] = []
  
  // 处理 mixins 和 extends
  let hasExtends = false
  if (__FEATURE_OPTIONS_API__ && !isFunction(comp)) {
    const extendProps = (raw: ComponentOptions) => {
      hasExtends = true
      const [props, keys] = normalizePropsOptions(raw, appContext, true)
      extend(normalized, props)
      if (keys) needCastKeys.push(...keys)
    }
    if (!asMixin && appContext.mixins.length) {
      appContext.mixins.forEach(extendProps)
    }
    if (comp.extends) {
      extendProps(comp.extends)
    }
    if (comp.mixins) {
      comp.mixins.forEach(extendProps)
    }
  }
  
  // 没有 props
  if (!raw && !hasExtends) {
    if (isObject(comp)) {
      cache.set(comp, EMPTY_ARR as any)
    }
    return EMPTY_ARR as any
  }
  
  // 规范化
  if (isArray(raw)) {
    // 数组形式
    for (let i = 0; i < raw.length; i++) {
      const normalizedKey = camelize(raw[i])
      if (validatePropName(normalizedKey)) {
        normalized[normalizedKey] = EMPTY_OBJ
      }
    }
  } else if (raw) {
    // 对象形式
    for (const key in raw) {
      const normalizedKey = camelize(key)
      if (validatePropName(normalizedKey)) {
        const opt = raw[key]
        const prop: NormalizedProp = (normalized[normalizedKey] =
          isArray(opt) || isFunction(opt) ? { type: opt } : opt)
        
        if (prop) {
          const booleanIndex = getTypeIndex(Boolean, prop.type)
          const stringIndex = getTypeIndex(String, prop.type)
          
          prop[BooleanFlags.shouldCast] = booleanIndex > -1
          prop[BooleanFlags.shouldCastTrue] =
            stringIndex < 0 || booleanIndex < stringIndex
          
          if (booleanIndex > -1 || hasOwn(prop, 'default')) {
            needCastKeys.push(normalizedKey)
          }
        }
      }
    }
  }
  
  const res: NormalizedPropsOptions = [normalized, needCastKeys]
  if (isObject(comp)) {
    cache.set(comp, res)
  }
  return res
}
```

## 规范化结果

返回一个元组 `[normalized, needCastKeys]`：

```typescript
type NormalizedPropsOptions = [
  NormalizedProps,    // 规范化后的 props 对象
  string[]            // 需要类型转换的 key 列表
]

type NormalizedProp = {
  type: PropType<any> | null
  required?: boolean
  default?: any
  validator?: (value: any) => boolean
  [BooleanFlags.shouldCast]?: boolean
  [BooleanFlags.shouldCastTrue]?: boolean
}
```

## 数组形式的规范化

```javascript
// 输入
props: ['title', 'user-name']

// 规范化后
{
  title: {},
  userName: {}
}
```

数组中的字符串被转换为 camelCase，值为空对象。

## 简写形式的规范化

```javascript
// 输入
props: {
  title: String,
  count: [Number, String]
}

// 规范化后
{
  title: { type: String },
  count: { type: [Number, String] }
}
```

类型被包装到 `{ type: ... }` 对象中。

## 完整形式的规范化

```javascript
// 输入
props: {
  title: {
    type: String,
    required: true,
    default: 'Hello'
  }
}

// 规范化后（基本保持不变，但添加内部标记）
{
  title: {
    type: String,
    required: true,
    default: 'Hello',
    [BooleanFlags.shouldCast]: false,
    [BooleanFlags.shouldCastTrue]: false
  }
}
```

## BooleanFlags

布尔类型的 props 需要特殊处理：

```typescript
const enum BooleanFlags {
  shouldCast,       // 是否需要布尔转换
  shouldCastTrue    // 空字符串是否转为 true
}
```

处理逻辑：

```typescript
// 检查类型中是否包含 Boolean
const booleanIndex = getTypeIndex(Boolean, prop.type)
const stringIndex = getTypeIndex(String, prop.type)

// 包含 Boolean 类型，需要转换
prop[BooleanFlags.shouldCast] = booleanIndex > -1

// Boolean 优先级高于 String，空字符串转为 true
prop[BooleanFlags.shouldCastTrue] = 
  stringIndex < 0 || booleanIndex < stringIndex
```

例子：

```javascript
// type: Boolean
// shouldCast: true, shouldCastTrue: true
// <Comp disabled /> => disabled = true

// type: [Boolean, String]
// shouldCast: true, shouldCastTrue: true
// <Comp disabled /> => disabled = true

// type: [String, Boolean]
// shouldCast: true, shouldCastTrue: false
// <Comp disabled /> => disabled = ''
```

## needCastKeys

需要在运行时进行类型转换的 props：

```javascript
props: {
  disabled: Boolean,      // 需要布尔转换
  count: {
    type: Number,
    default: 0            // 有默认值
  },
  title: String           // 不需要
}

// needCastKeys = ['disabled', 'count']
```

只有需要转换的 props 才会在 `resolvePropValue` 中处理。

## Mixins 和 Extends

规范化会合并 mixins 和 extends 的 props：

```javascript
const mixin = {
  props: ['mixinProp']
}

const parent = {
  props: ['parentProp']
}

export default {
  mixins: [mixin],
  extends: parent,
  props: ['ownProp']
}

// 规范化后包含所有 props
// normalized = { mixinProp: {}, parentProp: {}, ownProp: {} }
```

合并顺序：全局 mixins → extends → 组件 mixins → 组件自身。

## 缓存

规范化结果被缓存：

```typescript
const cache = appContext.propsCache
const cached = cache.get(comp)
if (cached) {
  return cached
}

// ... 规范化处理

cache.set(comp, res)
return res
```

使用 WeakMap，当组件不再被引用时自动清理。同一个组件只规范化一次。

## validatePropName

验证 prop 名称：

```typescript
function validatePropName(key: string) {
  if (key[0] !== '$') {
    return true
  } else if (__DEV__) {
    warn(`Invalid prop name: "${key}" is a reserved property.`)
  }
  return false
}
```

不允许以 `$` 开头的 prop 名，这些是保留的。

## getTypeIndex

获取类型在类型数组中的索引：

```typescript
function getTypeIndex(
  type: Prop<any>,
  expectedTypes: PropType<any> | void | null | true
): number {
  if (isArray(expectedTypes)) {
    return expectedTypes.findIndex(t => isSameType(t, type))
  } else if (isFunction(expectedTypes)) {
    return isSameType(expectedTypes, type) ? 0 : -1
  }
  return -1
}
```

用于判断类型优先级。

## 实际使用

规范化后的 props 在 `initProps` 中使用：

```typescript
const [options, needCastKeys] = instance.propsOptions

// options 用于判断属性是否是 prop
if (hasOwn(options, camelKey)) {
  props[camelKey] = value
}

// needCastKeys 用于确定哪些需要转换
if (needCastKeys) {
  for (const key of needCastKeys) {
    props[key] = resolvePropValue(...)
  }
}
```

## 小结

`normalizePropsOptions` 将各种 props 声明形式统一为标准格式：

1. **转换形式**：数组转对象，简写展开
2. **名称规范化**：kebab-case 转 camelCase
3. **添加标记**：布尔转换标记
4. **合并继承**：处理 mixins 和 extends
5. **缓存结果**：避免重复处理

返回的 `[normalized, needCastKeys]` 元组在 props 初始化时使用，指导属性的分类和转换。

在下一章中，我们将详细分析 Props 的验证机制。
