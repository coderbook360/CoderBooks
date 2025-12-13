# Props 的声明、校验与传递

Props 是父组件向子组件传递数据的主要方式。**看似简单的 props 背后，Vue 3 实现了完整的声明、规范化、校验和响应式代理机制。**

本章将深入分析 Props 的实现原理——理解它，能帮你更好地设计组件 API、调试 Props 相关问题。

## Props 的声明方式

Vue 支持多种声明 Props 的方式：

**方式一：数组形式**

```javascript
const MyComponent = {
  props: ['title', 'content', 'isActive']
}
```

简单直接，但没有类型和校验。

**方式二：对象形式（带类型）**

```javascript
const MyComponent = {
  props: {
    title: String,
    count: Number,
    isActive: Boolean
  }
}
```

指定类型，Vue 会进行类型校验。

**方式三：完整对象形式**

```javascript
const MyComponent = {
  props: {
    title: {
      type: String,
      required: true
    },
    count: {
      type: Number,
      default: 0
    },
    items: {
      type: Array,
      default: () => []  // 引用类型需要工厂函数
    },
    validate: {
      type: Function,
      validator: (value) => typeof value === 'function'
    }
  }
}
```

最完整的声明方式，支持 required、default、validator。

## Props 规范化

不同声明方式最终都会被规范化为统一格式：

```javascript
function normalizePropsOptions(comp) {
  const raw = comp.props
  const normalized = {}
  const needCastKeys = []
  
  if (!raw) {
    return [null, null]
  }
  
  if (isArray(raw)) {
    // 数组形式 → 对象形式
    for (const key of raw) {
      const normalizedKey = camelize(key)
      normalized[normalizedKey] = {}
    }
  } else {
    // 对象形式
    for (const key in raw) {
      const normalizedKey = camelize(key)
      const opt = raw[key]
      
      // 规范化选项
      normalized[normalizedKey] = isPlainObject(opt)
        ? opt
        : { type: opt }
      
      // 标记需要特殊处理的 Boolean/Default
      if (opt.type === Boolean || 
          (isArray(opt.type) && opt.type.includes(Boolean))) {
        needCastKeys.push(normalizedKey)
      }
    }
  }
  
  // 缓存规范化结果
  comp.__props = [normalized, needCastKeys]
  
  return [normalized, needCastKeys]
}
```

关键处理：

**1. 驼峰转换**

```javascript
const normalizedKey = camelize(key)
// 'my-prop' → 'myProp'
```

模板中可以用 kebab-case，内部统一用 camelCase。

**2. Boolean 特殊处理标记**

```javascript
if (opt.type === Boolean) {
  needCastKeys.push(normalizedKey)
}
```

Boolean 类型需要特殊处理（空字符串转 true 等），标记后在初始化时处理。

## initProps 实现

组件初始化时调用 `initProps`：

```javascript
function initProps(instance, rawProps) {
  const props = {}
  const attrs = {}
  
  // 获取规范化后的 props 声明
  const [options, needCastKeys] = normalizePropsOptions(instance.type)
  
  if (rawProps) {
    for (const key in rawProps) {
      const value = rawProps[key]
      const camelKey = camelize(key)
      
      // 区分 props 和 attrs
      if (options && hasOwn(options, camelKey)) {
        // 声明过的属性 → props
        props[camelKey] = value
      } else {
        // 未声明的属性 → attrs
        attrs[camelKey] = value
      }
    }
  }
  
  // 处理默认值
  if (options) {
    for (const key in options) {
      let value = props[key]
      const opt = options[key]
      
      // 处理 default
      if (value === undefined && opt.default !== undefined) {
        const defaultValue = opt.default
        // 函数类型的 default 需要调用
        value = isFunction(defaultValue) && opt.type !== Function
          ? defaultValue()
          : defaultValue
        props[key] = value
      }
      
      // Boolean 特殊处理
      if (needCastKeys && needCastKeys.includes(key)) {
        props[key] = resolveBooleanProp(value, opt)
      }
    }
  }
  
  // 设置响应式
  instance.props = shallowReactive(props)
  instance.attrs = attrs
}
```

核心逻辑：

1. 遍历传入的 rawProps
2. 声明过的放入 props，未声明的放入 attrs
3. 处理默认值
4. Boolean 类型特殊处理
5. props 使用 shallowReactive 包装

## Props vs Attrs

思考一下：props 和 attrs 有什么区别？

**Props**：组件明确声明接收的属性，有类型校验和默认值

**Attrs**：未在 props 中声明的属性，会"穿透"到组件根元素

```vue
<!-- 父组件 -->
<Child title="Hello" data-id="123" class="my-class" />

<!-- 子组件 -->
<script>
export default {
  props: ['title']  // 只声明了 title
}
</script>
<template>
  <div>{{ title }}</div>
  <!-- data-id 和 class 作为 attrs 自动添加到 div 上 -->
</template>
```

可以通过 `inheritAttrs: false` 禁止自动继承，然后手动使用 `$attrs`：

```vue
<script>
export default {
  inheritAttrs: false
}
</script>
<template>
  <div>
    <span v-bind="$attrs">{{ title }}</span>
  </div>
</template>
```

## shallowReactive 的使用

注意 props 使用的是 `shallowReactive`：

```javascript
instance.props = shallowReactive(props)
```

为什么不用 `reactive`？

1. **性能考虑**：props 通常是扁平的，不需要深层响应式
2. **保持引用**：如果 prop 是对象，保持原引用，父组件的修改能同步
3. **单向数据流**：子组件不应该深度修改 props

```javascript
// 父组件传入
<Child :config="{ a: 1, b: 2 }" />

// 子组件
// props.config 本身是响应式的（浅层）
// props.config.a 不是响应式的
// 这是预期行为——props 应该由父组件控制
```

## Props 校验

开发环境下，Vue 会校验 props：

```javascript
function validateProp(name, value, opt) {
  const { type, required, validator } = opt
  
  // required 校验
  if (required && value === undefined) {
    warn(`Missing required prop: "${name}"`)
    return
  }
  
  // 类型校验
  if (type && value !== undefined) {
    const types = isArray(type) ? type : [type]
    let valid = false
    
    for (const t of types) {
      if (assertType(value, t)) {
        valid = true
        break
      }
    }
    
    if (!valid) {
      warn(`Invalid prop: type check failed for prop "${name}".`)
    }
  }
  
  // 自定义校验器
  if (validator && !validator(value)) {
    warn(`Invalid prop: custom validator check failed for prop "${name}".`)
  }
}

function assertType(value, type) {
  if (type === String) {
    return typeof value === 'string'
  }
  if (type === Number) {
    return typeof value === 'number'
  }
  if (type === Boolean) {
    return typeof value === 'boolean'
  }
  if (type === Array) {
    return isArray(value)
  }
  if (type === Object) {
    return isPlainObject(value)
  }
  if (type === Function) {
    return isFunction(value)
  }
  // 自定义类型（构造函数）
  return value instanceof type
}
```

## Boolean 类型的特殊处理

Boolean props 有特殊的转换规则：

```javascript
function resolveBooleanProp(value, opt) {
  const { type } = opt
  const hasBoolean = type === Boolean || 
    (isArray(type) && type.includes(Boolean))
  
  if (hasBoolean) {
    // 没传值或空字符串 → true
    if (value === '' || value === hyphenate(key)) {
      return true
    }
    // 没传且没默认值 → false
    if (value === undefined && opt.default === undefined) {
      return false
    }
  }
  
  return value
}
```

这是为了支持 HTML 风格的布尔属性：

```vue
<!-- 以下都等价于 disabled: true -->
<Button disabled />
<Button disabled="" />
<Button :disabled="true" />
```

## Props 更新

当父组件重渲染时，需要更新子组件的 props：

```javascript
function updateProps(instance, nextProps) {
  const { props, attrs } = instance
  const [options] = normalizePropsOptions(instance.type)
  const rawProps = nextProps || {}
  
  // 更新 props
  for (const key in rawProps) {
    const value = rawProps[key]
    const camelKey = camelize(key)
    
    if (options && hasOwn(options, camelKey)) {
      if (props[camelKey] !== value) {
        props[camelKey] = value  // 触发响应式更新
      }
    } else {
      attrs[camelKey] = value
    }
  }
  
  // 删除不存在的 props
  for (const key in props) {
    if (!hasOwn(rawProps, key) && !hasOwn(rawProps, hyphenate(key))) {
      delete props[key]
    }
  }
  
  // 删除不存在的 attrs
  for (const key in attrs) {
    if (!hasOwn(rawProps, key) && !hasOwn(rawProps, hyphenate(key))) {
      delete attrs[key]
    }
  }
}
```

由于 `props` 是 `shallowReactive`，修改会触发组件重新渲染。

## 本章小结

本章分析了 Props 的完整实现：

- **声明方式**：数组、对象、完整对象三种形式
- **规范化**：统一转换为标准格式，缓存结果
- **initProps**：区分 props 和 attrs，处理默认值和类型
- **Props vs Attrs**：声明的是 props，未声明的是 attrs
- **shallowReactive**：浅层响应式，保持引用，符合单向数据流
- **校验机制**：type、required、validator 三种校验
- **Boolean 特殊处理**：支持 HTML 风格的布尔属性
- **更新机制**：响应式更新，自动同步变化

Props 是组件通信的基础。理解了 props 的实现，你就能明白为什么 Vue 强调"单向数据流"——子组件不应该直接修改 props，而应该通过 emit 通知父组件。

下一章，我们将分析 Emit——子组件如何向父组件发送消息。
