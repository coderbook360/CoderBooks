# Props 和事件

组件通信是构建复杂应用的关键。Props 实现父子数据传递，事件实现子父通信。在 SSR 中，我们需要正确处理这些机制。

## Props 定义

```typescript
// src/shared/props.ts

export type PropType<T> = new (...args: any[]) => T

export interface PropOptions<T = any> {
  type?: PropType<T> | PropType<T>[] | null
  required?: boolean
  default?: T | (() => T)
  validator?: (value: T) => boolean
}

export type Props = Record<string, PropOptions>

// 从 props 定义中提取类型
export type ExtractPropTypes<P extends Props> = {
  [K in keyof P]: P[K]['type'] extends PropType<infer T>
    ? T
    : any
}
```

## Props 解析

```typescript
// 完整的 props 解析系统
export function resolveProps(
  propsOptions: Props | undefined,
  rawProps: Record<string, any> | null,
  isSSR = false
): {
  props: Record<string, any>
  attrs: Record<string, any>
} {
  const props: Record<string, any> = {}
  const attrs: Record<string, any> = {}
  
  const options = propsOptions || {}
  
  // 处理原始 props
  if (rawProps) {
    for (const key in rawProps) {
      const value = rawProps[key]
      
      // 事件监听器跳过（SSR 不需要）
      if (key.startsWith('on') && !isSSR) {
        continue
      }
      
      // 区分 props 和 attrs
      if (key in options) {
        props[key] = value
      } else {
        attrs[key] = value
      }
    }
  }
  
  // 处理缺失的 props
  for (const key in options) {
    if (!(key in props)) {
      const opt = options[key]
      
      // 应用默认值
      if (opt.default !== undefined) {
        props[key] = typeof opt.default === 'function'
          ? (opt.default as Function)()
          : opt.default
      }
      
      // 检查必填
      if (opt.required && props[key] === undefined) {
        console.warn(`Missing required prop: "${key}"`)
      }
    }
  }
  
  // 验证 props
  for (const key in options) {
    const opt = options[key]
    const value = props[key]
    
    // 类型验证
    if (opt.type && value !== undefined) {
      const valid = validateType(value, opt.type)
      if (!valid) {
        console.warn(
          `Invalid prop: type check failed for prop "${key}". ` +
          `Expected ${getTypeName(opt.type)}, got ${typeof value}`
        )
      }
    }
    
    // 自定义验证
    if (opt.validator && value !== undefined) {
      if (!opt.validator(value)) {
        console.warn(`Invalid prop: custom validator failed for prop "${key}"`)
      }
    }
  }
  
  return { props, attrs }
}

// 类型验证
function validateType(value: any, type: PropType<any> | PropType<any>[]): boolean {
  const types = Array.isArray(type) ? type : [type]
  
  return types.some(t => {
    switch (t) {
      case String:
        return typeof value === 'string'
      case Number:
        return typeof value === 'number'
      case Boolean:
        return typeof value === 'boolean'
      case Array:
        return Array.isArray(value)
      case Object:
        return value !== null && typeof value === 'object'
      case Function:
        return typeof value === 'function'
      case Date:
        return value instanceof Date
      default:
        return value instanceof t
    }
  })
}

function getTypeName(type: PropType<any> | PropType<any>[]): string {
  const types = Array.isArray(type) ? type : [type]
  return types.map(t => t.name).join(' | ')
}
```

## Boolean 特殊处理

```typescript
// Boolean 类型的特殊转换规则
function resolveBooleanProp(
  key: string,
  value: any,
  options: Props
): any {
  const opt = options[key]
  if (!opt?.type) return value
  
  const types = Array.isArray(opt.type) ? opt.type : [opt.type]
  const hasBoolean = types.includes(Boolean)
  const hasString = types.includes(String)
  
  if (hasBoolean) {
    // 空字符串转为 true（如 <comp disabled="" />）
    if (value === '' && !hasString) {
      return true
    }
    
    // 属性存在但无值转为 true
    if (value === undefined && key in options) {
      return opt.default ?? false
    }
  }
  
  return value
}

// 示例
const propsOptions = {
  disabled: { type: Boolean, default: false },
  size: { type: [String, Number] }
}

resolveProps(propsOptions, { disabled: '' })
// => { props: { disabled: true, size: undefined }, attrs: {} }
```

## 事件处理

```typescript
// src/shared/events.ts

export type EventHandler<T = any> = (payload: T) => void

export interface EmitOptions {
  [event: string]: {
    payload?: any
    validator?: (payload: any) => boolean
  }
}

// 创建 emit 函数
export function createEmit(
  instance: { props: Record<string, any> },
  options?: EmitOptions
): (event: string, ...args: any[]) => void {
  return (event: string, ...args: any[]) => {
    // 验证事件
    if (options?.[event]?.validator) {
      const valid = options[event].validator(args[0])
      if (!valid) {
        console.warn(`Invalid emit payload for event "${event}"`)
      }
    }
    
    // 查找事件处理器
    const handlerName = `on${capitalize(event)}`
    const handler = instance.props[handlerName]
    
    if (handler) {
      handler(...args)
    }
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
```

## SSR 中的事件

```typescript
// SSR 中事件处理器不执行
// 但需要正确处理以下情况：

// 1. 事件属性不渲染到 HTML
function shouldRenderAttr(key: string): boolean {
  // 事件属性以 on 开头
  if (key.startsWith('on')) {
    return false
  }
  
  // 其他特殊属性
  if (key === 'ref' || key === 'key') {
    return false
  }
  
  return true
}

// 2. 收集事件用于 hydration
interface SSRContext {
  eventHandlers: Map<string, Record<string, EventHandler>>
}

function collectEventHandlers(
  vnode: VNode,
  context: SSRContext,
  nodeId: string
) {
  const props = vnode.props || {}
  const handlers: Record<string, EventHandler> = {}
  
  for (const key in props) {
    if (key.startsWith('on') && typeof props[key] === 'function') {
      const eventName = key.slice(2).toLowerCase()
      handlers[eventName] = props[key]
    }
  }
  
  if (Object.keys(handlers).length > 0) {
    context.eventHandlers.set(nodeId, handlers)
  }
}
```

## 组件示例

```typescript
// 定义带 props 和 events 的组件
const Counter: Component = {
  name: 'Counter',
  
  props: {
    initialValue: {
      type: Number,
      default: 0
    },
    min: {
      type: Number,
      default: 0
    },
    max: {
      type: Number,
      default: 100
    },
    step: {
      type: Number,
      default: 1,
      validator: (v: number) => v > 0
    }
  },
  
  setup(props, { emit }) {
    let count = props.initialValue
    
    function increment() {
      if (count < props.max) {
        count += props.step
        emit('change', count)
      }
    }
    
    function decrement() {
      if (count > props.min) {
        count -= props.step
        emit('change', count)
      }
    }
    
    // SSR 只渲染初始状态
    return () => h('div', { class: 'counter' }, [
      h('button', { 
        onClick: decrement,
        disabled: count <= props.min
      }, '-'),
      h('span', null, String(count)),
      h('button', { 
        onClick: increment,
        disabled: count >= props.max
      }, '+')
    ])
  }
}

// 使用
const App: Component = {
  render() {
    return h(Counter, {
      initialValue: 10,
      min: 0,
      max: 20,
      step: 2,
      onChange: (value: number) => {
        console.log('Count changed:', value)
      }
    })
  }
}
```

## SSR Props 渲染

```typescript
// 将 props 渲染为 HTML 属性
function renderProps(props: Record<string, any>): string {
  const attrs: string[] = []
  
  for (const key in props) {
    // 跳过不渲染的属性
    if (!shouldRenderAttr(key)) continue
    
    const value = props[key]
    
    // 跳过 undefined 和 null
    if (value == null) continue
    
    // 转换属性名
    const attrName = toKebabCase(key)
    
    // 处理不同类型
    if (typeof value === 'boolean') {
      if (value) {
        attrs.push(attrName)
      }
    } else if (typeof value === 'string') {
      attrs.push(`${attrName}="${escapeHtml(value)}"`)
    } else if (typeof value === 'number') {
      attrs.push(`${attrName}="${value}"`)
    } else if (key === 'style' && typeof value === 'object') {
      attrs.push(`style="${renderStyle(value)}"`)
    } else if (key === 'class' && Array.isArray(value)) {
      attrs.push(`class="${value.filter(Boolean).join(' ')}"`)
    } else if (typeof value === 'object') {
      attrs.push(`${attrName}="${escapeHtml(JSON.stringify(value))}"`)
    }
  }
  
  return attrs.length > 0 ? ' ' + attrs.join(' ') : ''
}

function toKebabCase(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase()
}

function renderStyle(style: Record<string, string | number>): string {
  return Object.entries(style)
    .map(([key, value]) => {
      const prop = toKebabCase(key)
      const val = typeof value === 'number' ? `${value}px` : value
      return `${prop}: ${val}`
    })
    .join('; ')
}
```

## v-model 处理

```typescript
// v-model 是 props + events 的语法糖
// 在编译时转换为：
// v-model="value" => :modelValue="value" @update:modelValue="value = $event"

// SSR 渲染时只处理 props 部分
const Input: Component = {
  name: 'Input',
  
  props: {
    modelValue: { type: String, default: '' },
    type: { type: String, default: 'text' }
  },
  
  setup(props, { emit }) {
    // SSR 渲染初始值
    return () => h('input', {
      type: props.type,
      value: props.modelValue,
      onInput: (e: Event) => {
        emit('update:modelValue', (e.target as HTMLInputElement).value)
      }
    })
  }
}

// 渲染结果：<input type="text" value="">
// hydration 后会绑定 onInput 事件
```

## Props 继承

```typescript
// 组件的 attrs 自动继承到根元素
const Wrapper: Component = {
  name: 'Wrapper',
  
  // 禁用继承
  inheritAttrs: false,
  
  setup(props, { attrs }) {
    // 手动处理 attrs
    return () => h('div', { class: 'wrapper' }, [
      h('span', attrs, 'Content')
    ])
  }
}

// 默认行为：attrs 会合并到组件根元素
function mergeAttrs(
  existingProps: Record<string, any>,
  attrs: Record<string, any>
): Record<string, any> {
  const merged = { ...existingProps }
  
  for (const key in attrs) {
    if (key === 'class') {
      // 合并 class
      merged.class = mergeClass(existingProps.class, attrs.class)
    } else if (key === 'style') {
      // 合并 style
      merged.style = { ...existingProps.style, ...attrs.style }
    } else if (key.startsWith('on')) {
      // 合并事件监听器
      const existing = existingProps[key]
      if (existing) {
        merged[key] = [existing, attrs[key]].flat()
      } else {
        merged[key] = attrs[key]
      }
    } else {
      // 其他属性覆盖
      merged[key] = attrs[key]
    }
  }
  
  return merged
}

function mergeClass(a: any, b: any): string {
  const classA = normalizeClass(a)
  const classB = normalizeClass(b)
  return [classA, classB].filter(Boolean).join(' ')
}

function normalizeClass(value: any): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.filter(Boolean).join(' ')
  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(' ')
  }
  return ''
}
```

## 小结

Props 和事件处理的关键点：

1. **Props 解析**：类型验证、默认值、必填检查
2. **事件处理**：SSR 中收集但不执行
3. **属性渲染**：转换为 HTML 属性
4. **v-model**：处理双向绑定语法糖
5. **继承机制**：attrs 自动合并到根元素
