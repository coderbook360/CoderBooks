# 事件绑定

事件绑定是 Hydration 的核心工作。服务端渲染的 HTML 只有静态结构，需要在客户端绑定事件处理器才能响应用户交互。

## 事件系统设计

```typescript
// src/runtime/events.ts

// 事件处理器类型
export type EventHandler<E = Event> = (event: E) => void

// 事件选项
export interface EventOptions {
  capture?: boolean
  once?: boolean
  passive?: boolean
}

// 事件修饰符
export interface EventModifiers {
  stop?: boolean
  prevent?: boolean
  self?: boolean
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
  exact?: boolean
}

// 扩展的事件处理器
export interface EventInvoker extends EventListener {
  value: EventHandler | EventHandler[]
  attached?: number
  modifiers?: EventModifiers
}
```

## 事件绑定实现

```typescript
// 创建事件调用器
function createInvoker(
  initialValue: EventHandler | EventHandler[],
  modifiers?: EventModifiers
): EventInvoker {
  const invoker: EventInvoker = (event: Event) => {
    // 处理修饰符
    if (modifiers) {
      if (modifiers.stop) {
        event.stopPropagation()
      }
      if (modifiers.prevent) {
        event.preventDefault()
      }
      if (modifiers.self && event.target !== event.currentTarget) {
        return
      }
      // 检查按键修饰符
      if (modifiers.ctrl && !(event as KeyboardEvent).ctrlKey) return
      if (modifiers.shift && !(event as KeyboardEvent).shiftKey) return
      if (modifiers.alt && !(event as KeyboardEvent).altKey) return
      if (modifiers.meta && !(event as KeyboardEvent).metaKey) return
    }
    
    // 执行处理器
    const handlers = Array.isArray(invoker.value)
      ? invoker.value
      : [invoker.value]
    
    for (const handler of handlers) {
      handler(event)
    }
  }
  
  invoker.value = initialValue
  invoker.modifiers = modifiers
  invoker.attached = Date.now()
  
  return invoker
}

// 绑定事件到元素
export function bindEvent(
  el: Element,
  eventName: string,
  handler: EventHandler,
  options?: EventOptions,
  modifiers?: EventModifiers
) {
  const invokers = el._vei || (el._vei = {})
  const key = `${eventName}${options?.capture ? 'Capture' : ''}`
  
  const existingInvoker = invokers[key]
  
  if (handler && existingInvoker) {
    // 更新现有 invoker
    existingInvoker.value = handler
    existingInvoker.modifiers = modifiers
  } else if (handler) {
    // 创建新 invoker
    const invoker = createInvoker(handler, modifiers)
    invokers[key] = invoker
    
    el.addEventListener(eventName, invoker, {
      capture: options?.capture,
      once: options?.once,
      passive: options?.passive
    })
  } else if (existingInvoker) {
    // 移除 invoker
    el.removeEventListener(eventName, existingInvoker)
    delete invokers[key]
  }
}

// 从元素解绑所有事件
export function unbindAllEvents(el: Element) {
  const invokers = el._vei
  if (!invokers) return
  
  for (const key in invokers) {
    const eventName = key.replace('Capture', '')
    const capture = key.endsWith('Capture')
    el.removeEventListener(eventName, invokers[key], { capture })
  }
  
  el._vei = undefined
}
```

## 解析事件名

```typescript
// 解析带修饰符的事件名
// onClick.stop.prevent -> { name: 'click', modifiers: { stop, prevent } }

interface ParsedEvent {
  name: string
  modifiers: EventModifiers
  options: EventOptions
}

export function parseEventName(key: string): ParsedEvent | null {
  if (!key.startsWith('on')) return null
  
  const parts = key.slice(2).split('.')
  const name = parts[0].toLowerCase()
  
  const modifiers: EventModifiers = {}
  const options: EventOptions = {}
  
  for (let i = 1; i < parts.length; i++) {
    const mod = parts[i]
    
    switch (mod) {
      case 'stop':
        modifiers.stop = true
        break
      case 'prevent':
        modifiers.prevent = true
        break
      case 'self':
        modifiers.self = true
        break
      case 'ctrl':
        modifiers.ctrl = true
        break
      case 'shift':
        modifiers.shift = true
        break
      case 'alt':
        modifiers.alt = true
        break
      case 'meta':
        modifiers.meta = true
        break
      case 'exact':
        modifiers.exact = true
        break
      case 'capture':
        options.capture = true
        break
      case 'once':
        options.once = true
        break
      case 'passive':
        options.passive = true
        break
    }
  }
  
  return { name, modifiers, options }
}
```

## Hydration 时绑定事件

```typescript
// Hydration 过程中的事件绑定
export function hydrateEvents(el: Element, props: Record<string, any>) {
  for (const key in props) {
    const parsed = parseEventName(key)
    
    if (parsed) {
      bindEvent(
        el,
        parsed.name,
        props[key],
        parsed.options,
        parsed.modifiers
      )
    }
  }
}

// 批量绑定优化
interface EventBinding {
  el: Element
  name: string
  handler: EventHandler
  options?: EventOptions
  modifiers?: EventModifiers
}

const pendingBindings: EventBinding[] = []
let flushScheduled = false

export function scheduleEventBinding(binding: EventBinding) {
  pendingBindings.push(binding)
  
  if (!flushScheduled) {
    flushScheduled = true
    requestAnimationFrame(flushPendingBindings)
  }
}

function flushPendingBindings() {
  for (const binding of pendingBindings) {
    bindEvent(
      binding.el,
      binding.name,
      binding.handler,
      binding.options,
      binding.modifiers
    )
  }
  pendingBindings.length = 0
  flushScheduled = false
}
```

## 事件委托

```typescript
// 事件委托减少监听器数量
export class EventDelegator {
  private root: Element
  private handlers: Map<string, Map<Element, EventHandler>>
  
  constructor(root: Element) {
    this.root = root
    this.handlers = new Map()
  }
  
  // 添加委托事件
  delegate(
    eventName: string,
    el: Element,
    handler: EventHandler
  ) {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Map())
      this.setupDelegation(eventName)
    }
    
    this.handlers.get(eventName)!.set(el, handler)
  }
  
  // 移除委托
  undelegate(eventName: string, el: Element) {
    this.handlers.get(eventName)?.delete(el)
  }
  
  // 设置根级监听
  private setupDelegation(eventName: string) {
    this.root.addEventListener(eventName, (event) => {
      let target = event.target as Element | null
      
      // 向上冒泡查找处理器
      while (target && target !== this.root) {
        const handler = this.handlers.get(eventName)?.get(target)
        
        if (handler) {
          handler(event)
          if (event.cancelBubble) break
        }
        
        target = target.parentElement
      }
    })
  }
  
  // 清理
  destroy() {
    this.handlers.clear()
  }
}

// 使用事件委托
const delegator = new EventDelegator(document.body)

function hydrateWithDelegation(el: Element, props: Record<string, any>) {
  for (const key in props) {
    if (key.startsWith('on')) {
      const eventName = key.slice(2).toLowerCase()
      delegator.delegate(eventName, el, props[key])
    }
  }
}
```

## 键盘事件处理

```typescript
// 键盘事件修饰符
const keyNames: Record<string, string[]> = {
  enter: ['Enter'],
  tab: ['Tab'],
  delete: ['Backspace', 'Delete'],
  esc: ['Escape'],
  space: [' '],
  up: ['ArrowUp'],
  down: ['ArrowDown'],
  left: ['ArrowLeft'],
  right: ['ArrowRight']
}

function checkKeyModifier(event: KeyboardEvent, modifier: string): boolean {
  const keys = keyNames[modifier]
  if (keys) {
    return keys.includes(event.key)
  }
  // 支持直接指定按键
  return event.key.toLowerCase() === modifier.toLowerCase()
}

// 键盘事件包装器
export function withKeyModifiers(
  handler: EventHandler<KeyboardEvent>,
  modifiers: string[]
): EventHandler<KeyboardEvent> {
  return (event: KeyboardEvent) => {
    // 检查所有键盘修饰符
    for (const mod of modifiers) {
      if (!checkKeyModifier(event, mod)) {
        return
      }
    }
    handler(event)
  }
}

// 使用示例
// onKeydown.enter.ctrl -> 按 Ctrl+Enter 触发
const handleKeydown = withKeyModifiers(
  (e) => console.log('Ctrl+Enter pressed'),
  ['enter', 'ctrl']
)
```

## 鼠标事件处理

```typescript
// 鼠标按键修饰符
const mouseButtons: Record<string, number> = {
  left: 0,
  middle: 1,
  right: 2
}

function checkMouseButton(event: MouseEvent, modifier: string): boolean {
  const button = mouseButtons[modifier]
  return button !== undefined && event.button === button
}

// 鼠标事件包装器
export function withMouseModifiers(
  handler: EventHandler<MouseEvent>,
  modifiers: string[]
): EventHandler<MouseEvent> {
  return (event: MouseEvent) => {
    for (const mod of modifiers) {
      if (mod in mouseButtons && !checkMouseButton(event, mod)) {
        return
      }
    }
    handler(event)
  }
}
```

## 表单事件处理

```typescript
// v-model 事件处理
export function createModelHandler(
  emit: (event: string, value: any) => void,
  propName: string = 'modelValue'
): EventHandler {
  return (event: Event) => {
    const target = event.target as HTMLInputElement | HTMLSelectElement
    let value: any
    
    if (target.type === 'checkbox') {
      value = (target as HTMLInputElement).checked
    } else if (target.type === 'radio') {
      value = (target as HTMLInputElement).value
    } else if (target.type === 'number' || target.type === 'range') {
      value = parseFloat(target.value)
    } else {
      value = target.value
    }
    
    emit(`update:${propName}`, value)
  }
}

// Composition 事件处理（IME 输入）
export function createCompositionHandler(
  emit: (event: string, value: any) => void
): {
  onCompositionstart: EventHandler
  onCompositionend: EventHandler
  onInput: EventHandler
} {
  let isComposing = false
  
  return {
    onCompositionstart: () => {
      isComposing = true
    },
    onCompositionend: (event: Event) => {
      isComposing = false
      const target = event.target as HTMLInputElement
      emit('update:modelValue', target.value)
    },
    onInput: (event: Event) => {
      if (isComposing) return
      const target = event.target as HTMLInputElement
      emit('update:modelValue', target.value)
    }
  }
}
```

## 完整事件绑定示例

```typescript
// 组件示例
const Form: Component = {
  setup(props, { emit }) {
    const handleSubmit = (e: Event) => {
      e.preventDefault()
      console.log('Form submitted')
      emit('submit')
    }
    
    const handleInput = (e: Event) => {
      const value = (e.target as HTMLInputElement).value
      emit('update:modelValue', value)
    }
    
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        handleSubmit(e)
      }
    }
    
    return () => h('form', {
      onSubmit: handleSubmit,
      'onSubmit.prevent': true
    }, [
      h('input', {
        type: 'text',
        value: props.modelValue,
        onInput: handleInput,
        onKeydown: handleKeydown
      }),
      h('button', { type: 'submit' }, 'Submit')
    ])
  }
}

// Hydration 后，所有事件都会绑定
// 用户可以正常输入和提交表单
```

## 性能优化

```typescript
// 1. 延迟非关键事件绑定
function bindEventsWithPriority(el: Element, props: Record<string, any>) {
  const critical = ['onClick', 'onSubmit', 'onInput']
  const deferred: Array<[string, any]> = []
  
  for (const key in props) {
    if (!key.startsWith('on')) continue
    
    if (critical.includes(key)) {
      // 立即绑定关键事件
      const parsed = parseEventName(key)
      if (parsed) {
        bindEvent(el, parsed.name, props[key], parsed.options)
      }
    } else {
      // 延迟绑定非关键事件
      deferred.push([key, props[key]])
    }
  }
  
  if (deferred.length > 0) {
    requestIdleCallback(() => {
      for (const [key, handler] of deferred) {
        const parsed = parseEventName(key)
        if (parsed) {
          bindEvent(el, parsed.name, handler, parsed.options)
        }
      }
    })
  }
}

// 2. 复用 invoker
const invokerCache = new WeakMap<Function, EventInvoker>()

function getCachedInvoker(handler: EventHandler): EventInvoker {
  let invoker = invokerCache.get(handler)
  
  if (!invoker) {
    invoker = createInvoker(handler)
    invokerCache.set(handler, invoker)
  }
  
  return invoker
}
```

## 小结

事件绑定的核心要点：

1. **Invoker 模式**：包装事件处理器，支持动态更新
2. **修饰符处理**：stop、prevent、self、按键修饰符
3. **事件委托**：减少监听器数量，提升性能
4. **批量绑定**：使用 requestAnimationFrame 批量处理
5. **优先级控制**：关键事件立即绑定，非关键延迟

正确的事件绑定让 SSR 应用在 Hydration 后立即可交互。
