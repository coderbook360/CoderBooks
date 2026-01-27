# Props 默认值处理

当父组件没有传递某个 prop 时，Vue 会使用声明的默认值。默认值的处理涉及工厂函数调用、缓存优化和响应式考量。

## 默认值的声明方式

Props 默认值可以是静态值或工厂函数：

```javascript
props: {
  // 静态默认值
  count: {
    type: Number,
    default: 0
  },
  
  // 工厂函数（对象/数组必须使用）
  items: {
    type: Array,
    default: () => []
  },
  
  config: {
    type: Object,
    default: () => ({
      theme: 'light',
      size: 'medium'
    })
  },
  
  // 函数类型的默认值
  formatter: {
    type: Function,
    default: (value) => value.toString()
  }
}
```

## 为什么对象需要工厂函数

对象和数组是引用类型。如果直接使用对象字面量作为默认值，所有组件实例会共享同一个对象：

```javascript
// 错误做法
props: {
  config: {
    type: Object,
    default: { theme: 'light' }  // 所有实例共享这个对象！
  }
}

// 正确做法
props: {
  config: {
    type: Object,
    default: () => ({ theme: 'light' })  // 每个实例独立对象
  }
}
```

## resolvePropValue

默认值的处理在 `resolvePropValue` 函数中：

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
    
    // 值是 undefined 且有默认值
    if (hasDefault && value === undefined) {
      const defaultValue = opt.default
      
      // 类型不是 Function 且默认值是函数 → 工厂函数
      if (opt.type !== Function && isFunction(defaultValue)) {
        const { propsDefaults } = instance
        
        // 检查缓存
        if (key in propsDefaults) {
          value = propsDefaults[key]
        } else {
          // 调用工厂函数
          setCurrentInstance(instance)
          value = propsDefaults[key] = defaultValue.call(null, props)
          unsetCurrentInstance()
        }
      } else {
        // 静态默认值
        value = defaultValue
      }
    }
    
    // ... 布尔值转换
  }
  
  return value
}
```

## 工厂函数的上下文

工厂函数调用时，`getCurrentInstance()` 是有效的：

```javascript
props: {
  config: {
    type: Object,
    default: (props) => {
      // 可以访问其他 props
      return {
        theme: props.darkMode ? 'dark' : 'light'
      }
    }
  }
}
```

注意工厂函数接收 `props` 对象作为参数，可以基于其他 props 计算默认值。

## 默认值缓存

工厂函数的返回值被缓存在 `instance.propsDefaults` 中：

```typescript
const { propsDefaults } = instance

if (key in propsDefaults) {
  // 使用缓存
  value = propsDefaults[key]
} else {
  // 首次调用，缓存结果
  value = propsDefaults[key] = defaultValue.call(null, props)
}
```

这意味着工厂函数只会被调用一次。如果组件更新时父组件仍然没传这个 prop，会使用缓存的值而不是重新调用工厂函数。

## 函数类型的特殊处理

当 prop 类型是 `Function` 时，默认值不会被当作工厂函数：

```typescript
if (opt.type !== Function && isFunction(defaultValue)) {
  // 工厂函数
} else {
  // 静态值（包括函数类型的默认值）
  value = defaultValue
}
```

这允许你为函数类型的 prop 提供默认函数：

```javascript
props: {
  formatter: {
    type: Function,
    default: (value) => String(value)  // 这是默认的格式化函数
  }
}
```

## 与 undefined 的区别

只有显式的 `undefined` 会触发默认值：

```javascript
// 触发默认值
<Comp />
<Comp :count="undefined" />

// 不触发默认值
<Comp :count="null" />
<Comp :count="0" />
<Comp :count="''" />
```

这是因为检查的是 `value === undefined`：

```typescript
if (hasDefault && value === undefined) {
  // 应用默认值
}
```

## 响应式与默认值

默认值会被 `shallowReactive` 包装（因为整个 props 对象是 shallowReactive）：

```javascript
props: {
  config: {
    type: Object,
    default: () => ({ count: 0 })
  }
}

// 组件内
// props.config 是响应式的（浅层）
// 修改 props.config.count 不会触发更新（除非 config 对象本身变化）
```

如果需要默认值内部也是响应式的，需要在工厂函数中使用 `reactive`：

```javascript
import { reactive } from 'vue'

props: {
  config: {
    type: Object,
    default: () => reactive({ count: 0 })
  }
}
```

但通常不推荐这样做——props 应该是只读的。

## 开发环境的验证

开发环境会检查对象/数组默认值是否使用了工厂函数：

```typescript
if (__DEV__ && isObject(defaultValue)) {
  warn(
    `Invalid default value for prop "${key}": ` +
    `Props with type Object/Array must use a factory function to ` +
    `return the default value.`
  )
}
```

这个检查帮助开发者避免共享引用的问题。

## 默认值与 required

`required: true` 和 `default` 可以同时存在，但没有意义：

```javascript
props: {
  title: {
    type: String,
    required: true,
    default: 'Hello'  // 永远不会使用
  }
}
```

如果 prop 是 required 但未传入，会触发警告，默认值不会被应用。

## 更新时的处理

组件更新时，如果父组件开始或停止传递某个 prop：

```javascript
// 首次渲染，传递了 config
<Comp :config="myConfig" />

// 更新，不再传递 config
<Comp />
```

此时会重新应用默认值（使用缓存）。`updateProps` 中处理这种情况：

```typescript
function updateProps(instance, rawProps, rawPrevProps) {
  // ...
  for (const key in instance.propsOptions[0]) {
    if (!(key in rawProps)) {
      // 之前有值，现在没有了
      if (key in rawPrevProps) {
        props[key] = resolvePropValue(...)  // 应用默认值
      }
    }
  }
}
```

## 最佳实践

**对象和数组始终使用工厂函数**：

```javascript
// ✓ 正确
default: () => []
default: () => ({})

// ✗ 错误
default: []
default: {}
```

**基于其他 props 计算默认值**：

```javascript
props: {
  mode: String,
  theme: {
    type: String,
    default: (props) => props.mode === 'dark' ? 'dark' : 'light'
  }
}
```

**避免在默认值中使用副作用**：

```javascript
// ✗ 不推荐
default: () => {
  console.log('Creating default')  // 只会执行一次
  return []
}
```

## 小结

Props 默认值处理的关键点：

1. **静态值直接使用**，工厂函数需要调用
2. **类型是 Function 时**，默认值本身就是函数，不作为工厂函数
3. **工厂函数结果被缓存**，只调用一次
4. **只有 undefined 触发默认值**，null 和其他假值不触发
5. **对象/数组必须用工厂函数**，避免引用共享

理解这些机制有助于正确使用默认值，避免常见的陷阱。

在下一章中，我们将分析 `initSlots`——插槽是如何初始化的。
