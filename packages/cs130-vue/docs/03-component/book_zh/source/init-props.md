# initProps 属性初始化

Props 是父组件向子组件传递数据的主要方式。`initProps` 负责解析父组件传入的属性，验证类型，应用默认值，并设置响应式。这是组件初始化的关键步骤。

## 调用时机

在 `setupComponent` 中首先调用：

```typescript
export function setupComponent(instance: ComponentInternalInstance) {
  const { props, children } = instance.vnode
  
  // 第一步：初始化 props
  initProps(instance, props, isStateful, isSSR)
  
  // ...
}
```

## 源码分析

`initProps` 在 `runtime-core/src/componentProps.ts`：

```typescript
export function initProps(
  instance: ComponentInternalInstance,
  rawProps: Data | null,
  isStateful: number,
  isSSR = false
) {
  const props: Data = {}
  const attrs: Data = {}
  
  // 标记 attrs 为内部对象
  def(attrs, InternalObjectKey, 1)
  
  // 设置 props 默认值存储
  instance.propsDefaults = Object.create(null)
  
  // 解析和设置 props
  setFullProps(instance, rawProps, props, attrs)
  
  // 确保所有声明的 props 都有值
  for (const key in instance.propsOptions[0]) {
    if (!(key in props)) {
      props[key] = undefined
    }
  }
  
  // 开发环境验证
  if (__DEV__) {
    validateProps(rawProps || {}, props, instance)
  }
  
  // 设置响应式
  if (isStateful) {
    instance.props = isSSR ? props : shallowReactive(props)
  } else {
    // 函数式组件
    if (!instance.type.props) {
      instance.props = attrs
    } else {
      instance.props = props
    }
  }
  
  instance.attrs = attrs
}
```

## setFullProps

解析所有属性，分配到 props 或 attrs：

```typescript
function setFullProps(
  instance: ComponentInternalInstance,
  rawProps: Data | null,
  props: Data,
  attrs: Data
) {
  const [options, needCastKeys] = instance.propsOptions
  let hasAttrsChanged = false
  let rawCastValues: Data | undefined
  
  if (rawProps) {
    for (let key in rawProps) {
      // 跳过保留属性
      if (isReservedProp(key)) {
        continue
      }
      
      const value = rawProps[key]
      let camelKey
      
      // 将 kebab-case 转换为 camelCase
      if (options && hasOwn(options, (camelKey = camelize(key)))) {
        // 这是一个声明的 prop
        if (!needCastKeys || !needCastKeys.includes(camelKey)) {
          props[camelKey] = value
        } else {
          // 需要类型转换（布尔值等）
          ;(rawCastValues || (rawCastValues = {}))[camelKey] = value
        }
      } else if (!isEmitListener(instance.emitsOptions, key)) {
        // 不是 prop 也不是事件，放入 attrs
        if (!(key in attrs) || value !== attrs[key]) {
          attrs[key] = value
          hasAttrsChanged = true
        }
      }
    }
  }
  
  // 处理需要类型转换的 props
  if (needCastKeys) {
    const rawCurrentProps = toRaw(props)
    const castValues = rawCastValues || EMPTY_OBJ
    for (let i = 0; i < needCastKeys.length; i++) {
      const key = needCastKeys[i]
      props[key] = resolvePropValue(
        options!,
        rawCurrentProps,
        key,
        castValues[key],
        instance,
        !hasOwn(castValues, key)
      )
    }
  }
  
  return hasAttrsChanged
}
```

## Props 与 Attrs 的区分

```javascript
// 组件定义
const MyComponent = {
  props: ['title', 'count']
}

// 使用
<MyComponent title="Hello" count="5" class="container" @click="onClick" />
```

分类结果：
- `props`: `{ title: 'Hello', count: '5' }`
- `attrs`: `{ class: 'container' }`
- 事件 `@click` 被识别为 emit 监听器，不放入 attrs

## 保留属性

某些属性名被保留：

```typescript
const isReservedProp = makeMap(
  ',key,ref,ref_for,ref_key,' +
  'onVnodeBeforeMount,onVnodeMounted,' +
  'onVnodeBeforeUpdate,onVnodeUpdated,' +
  'onVnodeBeforeUnmount,onVnodeUnmounted'
)
```

这些属性有特殊用途，不会进入 props 或 attrs。

## resolvePropValue

解析 prop 值，处理默认值和类型转换：

```typescript
function resolvePropValue(
  options: NormalizedProps,
  props: Data,
  key: string,
  value: unknown,
  instance: ComponentInternalInstance,
  isAbsent: boolean
) {
  const opt = options[key]
  
  if (opt != null) {
    const hasDefault = hasOwn(opt, 'default')
    
    // 处理默认值
    if (hasDefault && value === undefined) {
      const defaultValue = opt.default
      if (opt.type !== Function && isFunction(defaultValue)) {
        const { propsDefaults } = instance
        if (key in propsDefaults) {
          value = propsDefaults[key]
        } else {
          setCurrentInstance(instance)
          value = propsDefaults[key] = defaultValue.call(null, props)
          unsetCurrentInstance()
        }
      } else {
        value = defaultValue
      }
    }
    
    // 布尔值转换
    if (opt[BooleanFlags.shouldCast]) {
      if (isAbsent && !hasDefault) {
        value = false
      } else if (
        opt[BooleanFlags.shouldCastTrue] &&
        (value === '' || value === hyphenate(key))
      ) {
        value = true
      }
    }
  }
  
  return value
}
```

## 布尔值特殊处理

布尔类型的 prop 有特殊的转换规则：

```javascript
// 组件定义
props: {
  disabled: Boolean
}

// 使用方式和结果
<MyComponent />              // disabled = false
<MyComponent disabled />     // disabled = true
<MyComponent disabled="" />  // disabled = true
<MyComponent :disabled="false" />  // disabled = false
```

这种转换让布尔 prop 的使用更自然。

## shallowReactive

props 使用 `shallowReactive` 而不是 `reactive`：

```typescript
instance.props = isSSR ? props : shallowReactive(props)
```

这是因为：
1. props 的值可能已经是响应式的（如 reactive 对象）
2. 避免不必要的深度代理
3. props 本身不应该被直接修改

## 函数式组件的处理

函数式组件的 props 处理略有不同：

```typescript
if (isStateful) {
  instance.props = isSSR ? props : shallowReactive(props)
} else {
  // 函数式组件
  if (!instance.type.props) {
    // 没有声明 props，所有属性都当作 props
    instance.props = attrs
  } else {
    instance.props = props
  }
}
```

如果函数式组件没有声明 props，所有传入的属性都可以通过 props 访问。

## 验证

开发环境会验证 props：

```typescript
if (__DEV__) {
  validateProps(rawProps || {}, props, instance)
}
```

验证包括：
- 类型检查
- required 检查
- 自定义验证器

## 与 attrs 的关系

未声明的属性会进入 `attrs`：

```javascript
// 组件
props: ['title']

// 使用
<MyComponent title="Hello" class="container" id="main" />

// 结果
// props = { title: 'Hello' }
// attrs = { class: 'container', id: 'main' }
```

`attrs` 可以通过 `inheritAttrs` 控制是否自动继承到根元素：

```javascript
export default {
  inheritAttrs: false,  // 禁止自动继承
  props: ['title']
}
```

## 完整流程

```
initProps(instance, rawProps)
    │
    ├── 创建 props 和 attrs 对象
    │
    ├── setFullProps(instance, rawProps, props, attrs)
    │   │
    │   ├── 遍历 rawProps
    │   │   ├── 跳过保留属性 (key, ref, ...)
    │   │   ├── kebab-case → camelCase
    │   │   ├── 已声明 → props
    │   │   ├── 是事件 → 跳过
    │   │   └── 其他 → attrs
    │   │
    │   └── 处理类型转换 (Boolean 等)
    │
    ├── 填充未传入的声明 props (值为 undefined)
    │
    ├── validateProps (开发环境)
    │
    └── 设置响应式
        ├── 有状态组件 → shallowReactive(props)
        └── 函数式组件 → props 或 attrs
```

## 小结

`initProps` 完成了 props 的解析、验证和响应式设置：

1. **分类**：根据组件声明，将属性分为 props 和 attrs
2. **转换**：kebab-case 转 camelCase，布尔值特殊处理
3. **默认值**：应用声明的默认值
4. **验证**：开发环境进行类型和 required 验证
5. **响应式**：使用 `shallowReactive` 包装

理解这个过程有助于正确使用 props 和调试相关问题。在下一章中，我们将详细分析 `normalizePropsOptions`——props 选项是如何规范化的。
