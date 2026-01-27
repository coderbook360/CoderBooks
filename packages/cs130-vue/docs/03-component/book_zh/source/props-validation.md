# Props 验证机制

Vue 的 props 验证在开发环境提供了强大的类型检查和自定义验证能力。这些验证帮助开发者尽早发现问题，但不会在生产环境执行，避免性能开销。

## 验证的触发时机

验证发生在 `initProps` 中：

```typescript
export function initProps(instance, rawProps, isStateful, isSSR) {
  // ... 设置 props
  
  if (__DEV__) {
    validateProps(rawProps || {}, props, instance)
  }
}
```

`__DEV__` 确保验证只在开发环境执行。

## validateProps 源码

```typescript
function validateProps(
  rawProps: Data,
  props: Data,
  instance: ComponentInternalInstance
) {
  const resolvedValues = toRaw(props)
  const options = instance.propsOptions[0]
  
  for (const key in options) {
    let opt = options[key]
    if (opt == null) continue
    
    validateProp(
      key,
      resolvedValues[key],
      opt,
      !hasOwn(rawProps, key) && !hasOwn(rawProps, hyphenate(key))
    )
  }
}
```

遍历所有声明的 props，逐个验证。

## validateProp

单个 prop 的验证：

```typescript
function validateProp(
  name: string,
  value: unknown,
  prop: PropOptions,
  isAbsent: boolean
) {
  const { type, required, validator } = prop
  
  // 1. required 检查
  if (required && isAbsent) {
    warn('Missing required prop: "' + name + '"')
    return
  }
  
  // 2. 允许 null 和 undefined（除非 required）
  if (value == null && !prop.required) {
    return
  }
  
  // 3. 类型检查
  if (type != null && type !== true) {
    let isValid = false
    const types = isArray(type) ? type : [type]
    const expectedTypes: string[] = []
    
    for (let i = 0; i < types.length && !isValid; i++) {
      const { valid, expectedType } = assertType(value, types[i])
      expectedTypes.push(expectedType || '')
      isValid = valid
    }
    
    if (!isValid) {
      warn(getInvalidTypeMessage(name, value, expectedTypes))
      return
    }
  }
  
  // 4. 自定义验证器
  if (validator && !validator(value)) {
    warn('Invalid prop: custom validator check failed for prop "' + name + '".')
  }
}
```

## 类型检查详解

`assertType` 检查值是否匹配类型：

```typescript
function assertType(value: unknown, type: PropType<any>): AssertionResult {
  let valid
  const expectedType = getType(type)
  
  if (isSimpleType(expectedType)) {
    // 简单类型
    const t = typeof value
    valid = t === expectedType.toLowerCase()
    
    // 处理包装类型
    if (!valid && t === 'object') {
      valid = value instanceof type
    }
  } else if (expectedType === 'Object') {
    valid = isObject(value)
  } else if (expectedType === 'Array') {
    valid = isArray(value)
  } else if (expectedType === 'null') {
    valid = value === null
  } else {
    // 自定义类型
    valid = value instanceof type
  }
  
  return {
    valid,
    expectedType
  }
}
```

简单类型包括：

```typescript
const isSimpleType = makeMap('String,Number,Boolean,Function,Symbol,BigInt')
```

## getType

获取类型名称：

```typescript
function getType(ctor: Prop<any>): string {
  const match = ctor && ctor.toString().match(/^\s*(function|class) (\w+)/)
  return match ? match[2] : ctor === null ? 'null' : ''
}
```

通过解析构造函数的字符串表示获取类型名。

## 支持的类型

Vue 支持以下类型检查：

```javascript
props: {
  // 原始类型
  propA: String,
  propB: Number,
  propC: Boolean,
  propD: Function,
  propE: Symbol,
  propF: BigInt,
  
  // 引用类型
  propG: Object,
  propH: Array,
  propI: Date,
  propJ: RegExp,
  
  // 自定义类
  propK: MyClass,
  
  // 多类型
  propL: [String, Number],
  
  // 允许 null
  propM: null
}
```

## 多类型检查

当声明多个类型时，满足任一即可：

```javascript
props: {
  value: [String, Number]
}

// 通过
<Comp :value="'hello'" />
<Comp :value="42" />

// 不通过
<Comp :value="true" />
```

## Required 验证

```javascript
props: {
  title: {
    type: String,
    required: true
  }
}

// 不传会警告
<Comp />  // [Vue warn]: Missing required prop: "title"
```

## 自定义验证器

```javascript
props: {
  age: {
    type: Number,
    validator: (value) => {
      return value >= 0 && value <= 150
    }
  },
  
  status: {
    type: String,
    validator: (value) => {
      return ['pending', 'success', 'error'].includes(value)
    }
  }
}
```

验证器返回 `false` 时触发警告：

```
[Vue warn]: Invalid prop: custom validator check failed for prop "age".
```

## 错误信息生成

`getInvalidTypeMessage` 生成友好的错误信息：

```typescript
function getInvalidTypeMessage(
  name: string,
  value: unknown,
  expectedTypes: string[]
): string {
  let message =
    `Invalid prop: type check failed for prop "${name}".` +
    ` Expected ${expectedTypes.map(capitalize).join(' | ')}`
  
  const expectedType = expectedTypes[0]
  const receivedType = toRawType(value)
  const expectedValue = styleValue(value, expectedType)
  const receivedValue = styleValue(value, receivedType)
  
  if (
    expectedTypes.length === 1 &&
    isExplicable(expectedType) &&
    !isBoolean(expectedType, receivedType)
  ) {
    message += ` with value ${expectedValue}`
  }
  message += `, got ${receivedType} `
  if (isExplicable(receivedType)) {
    message += `with value ${receivedValue}.`
  }
  
  return message
}
```

输出示例：

```
Invalid prop: type check failed for prop "count". 
Expected Number with value 42, got String with value "42".
```

## 与 TypeScript 的关系

Vue 的运行时验证和 TypeScript 的静态类型是互补的：

```typescript
// TypeScript 类型（编译时）
interface Props {
  title: string
  count: number
}

// Vue 运行时验证
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

TypeScript 在编译时捕获类型错误，Vue 验证在运行时检查（开发环境），两者结合提供完整的类型安全。

## 性能考虑

验证代码被 `__DEV__` 条件包裹：

```typescript
if (__DEV__) {
  validateProps(rawProps || {}, props, instance)
}
```

构建工具（如 Vite、webpack）在生产构建时会将 `__DEV__` 替换为 `false`，整个验证代码会被 tree-shaking 移除。

这确保了开发体验不影响生产性能。

## 验证顺序

验证按以下顺序进行：

1. **Required 检查**：如果 required 且值缺失，立即警告
2. **Null/Undefined 检查**：非 required 时允许 null/undefined
3. **类型检查**：检查值是否匹配声明的类型
4. **自定义验证器**：执行用户提供的验证函数

## 最佳实践

**使用完整的 prop 声明**：

```javascript
// 好
props: {
  title: {
    type: String,
    required: true
  }
}

// 不推荐
props: ['title']
```

**为对象和数组提供默认值工厂**：

```javascript
props: {
  items: {
    type: Array,
    default: () => []  // 工厂函数
  },
  config: {
    type: Object,
    default: () => ({})
  }
}
```

**使用验证器限制值范围**：

```javascript
props: {
  size: {
    type: String,
    validator: value => ['small', 'medium', 'large'].includes(value)
  }
}
```

## 小结

Vue 的 props 验证机制包括：

1. **Required 验证**：确保必需的 props 被传入
2. **类型检查**：验证值的类型匹配
3. **自定义验证器**：支持复杂的业务验证逻辑
4. **友好的错误信息**：帮助快速定位问题

验证只在开发环境执行，生产环境完全移除。这在开发效率和运行性能之间取得了良好的平衡。

在下一章中，我们将分析 Props 默认值的处理机制。
