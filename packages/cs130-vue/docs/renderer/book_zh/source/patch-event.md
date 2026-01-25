# patchEvent 事件更新

patchEvent 处理元素的事件监听器更新。Vue 对事件处理进行了优化设计，使用缓存和包装器来避免频繁的 addEventListener/removeEventListener 调用。

## 核心设计

Vue 的事件处理使用"invoker"模式——不是直接绑定用户的事件处理函数，而是绑定一个包装器，包装器内部调用用户函数：

```typescript
interface Invoker extends EventListener {
  value: EventValue
  attached: number
}

type EventValue = Function | Function[]
```

这种设计的好处是更新事件处理函数时不需要重新绑定事件，只需替换 invoker.value。

## 函数实现

patchEvent 的完整实现：

```typescript
export function patchEvent(
  el: Element & { _vei?: Record<string, Invoker | undefined> },
  rawName: string,
  prevValue: EventValue | null,
  nextValue: EventValue | null,
  instance: ComponentInternalInstance | null = null
) {
  // 获取或创建事件缓存对象
  const invokers = el._vei || (el._vei = {})
  const existingInvoker = invokers[rawName]

  if (nextValue && existingInvoker) {
    // 更新：只需替换 value
    existingInvoker.value = nextValue
  } else {
    const [name, options] = parseName(rawName)

    if (nextValue) {
      // 添加：创建新的 invoker
      const invoker = (invokers[rawName] = createInvoker(nextValue, instance))
      addEventListener(el, name, invoker, options)
    } else if (existingInvoker) {
      // 移除
      removeEventListener(el, name, existingInvoker, options)
      invokers[rawName] = undefined
    }
  }
}
```

`_vei` 是 "vue event invokers" 的缩写，存储在元素上。每个事件名对应一个 invoker，更新时只需替换 invoker.value，无需重新绑定事件。

## createInvoker

invoker 的创建：

```typescript
function createInvoker(
  initialValue: EventValue,
  instance: ComponentInternalInstance | null
) {
  const invoker: Invoker = (e: Event) => {
    // 处理事件时间戳，防止冒泡事件被错误处理
    const timeStamp = e.timeStamp || _getNow()

    if (skipTimestampCheck || timeStamp >= invoker.attached - 1) {
      callWithAsyncErrorHandling(
        patchStopImmediatePropagation(e, invoker.value),
        instance,
        ErrorCodes.NATIVE_EVENT_HANDLER,
        [e]
      )
    }
  }

  invoker.value = initialValue
  invoker.attached = getNow()
  
  return invoker
}
```

invoker 是一个闭包函数，它捕获了 instance 引用用于错误处理。timeStamp 检查用于处理一个微妙的时序问题——当事件处理中动态添加新的监听器时，该监听器可能立即收到正在冒泡的事件，attached 时间戳可以过滤这种情况。

## 事件名解析

parseName 从事件名中提取事件类型和选项：

```typescript
const optionsModifierRE = /(?:Once|Passive|Capture)$/

function parseName(name: string): [string, EventListenerOptions | undefined] {
  let options: EventListenerOptions | undefined
  
  if (optionsModifierRE.test(name)) {
    options = {}
    let m
    while ((m = name.match(optionsModifierRE))) {
      name = name.slice(0, name.length - m[0].length)
      ;(options as any)[m[0].toLowerCase()] = true
    }
  }
  
  // 'onClick' -> 'click'
  const event = name[2] === ':' 
    ? name.slice(3) 
    : hyphenate(name.slice(2)).toLowerCase()
  
  return [event, options]
}
```

Vue 支持在事件名中编码选项：

```vue
<!-- 普通事件 -->
<div @click="handler">

<!-- 带修饰符 -->
<div @clickOnce="handler">     <!-- { once: true } -->
<div @clickCapture="handler">  <!-- { capture: true } -->
<div @clickPassive="handler">  <!-- { passive: true } -->
<div @clickOnceCapture="handler">  <!-- { once: true, capture: true } -->
```

这些修饰符在编译时被转换为事件名后缀。

## 事件缓存

事件缓存存储在元素的 `_vei` 属性上：

```typescript
const invokers = el._vei || (el._vei = {})
const existingInvoker = invokers[rawName]
```

每个事件名对应一个 invoker。当同一事件的处理函数更新时，只需替换 value：

```typescript
if (nextValue && existingInvoker) {
  existingInvoker.value = nextValue
}
```

这避免了 removeEventListener + addEventListener 的开销。

## 多处理函数支持

value 可以是函数数组：

```typescript
type EventValue = Function | Function[]

// 处理时展开调用
callWithAsyncErrorHandling(
  patchStopImmediatePropagation(e, invoker.value),
  instance,
  ErrorCodes.NATIVE_EVENT_HANDLER,
  [e]
)
```

patchStopImmediatePropagation 处理数组情况：

```typescript
function patchStopImmediatePropagation(
  e: Event,
  value: EventValue
): EventValue {
  if (isArray(value)) {
    const originalStop = e.stopImmediatePropagation
    e.stopImmediatePropagation = () => {
      originalStop.call(e)
      ;(e as any)._stopped = true
    }
    return value.map(fn => (e: Event) => !(e as any)._stopped && fn && fn(e))
  } else {
    return value
  }
}
```

这确保了 stopImmediatePropagation 能正确阻止后续处理函数的执行。

## 时间戳检查

invoker 中的时间戳检查解决一个边界问题：

```typescript
if (skipTimestampCheck || timeStamp >= invoker.attached - 1) {
  // 执行处理函数
}
```

考虑这个场景：

```vue
<div @click="toggle">
  <div v-if="show" @click="childHandler">Child</div>
</div>
```

点击父元素触发 toggle，show 变为 true，子元素被创建并绑定事件。由于事件冒泡和 Vue 的异步更新，同一个点击事件可能触发子元素的处理函数。时间戳检查过滤掉这种情况——如果事件发生在 invoker 创建之前，就不应该触发。

## 错误处理

事件处理函数的调用被包装在错误处理中：

```typescript
callWithAsyncErrorHandling(
  /* handler */,
  instance,
  ErrorCodes.NATIVE_EVENT_HANDLER,
  [e]
)
```

即使处理函数抛出错误，也不会阻止其他处理函数的执行，错误会被报告给应用的错误处理机制。

## 与模板编译的配合

模板中的事件绑定会被编译为特定格式：

```vue
<button @click.stop.prevent="handler">
```

编译为：

```typescript
_createElementVNode("button", {
  onClick: _withModifiers(_ctx.handler, ["stop", "prevent"])
}, null)
```

_withModifiers 包装处理函数：

```typescript
function withModifiers(fn: Function, modifiers: string[]) {
  return (event: Event, ...args: unknown[]) => {
    for (let i = 0; i < modifiers.length; i++) {
      const guard = modifierGuards[modifiers[i]]
      if (guard && guard(event, modifiers)) return
    }
    return fn(event, ...args)
  }
}

const modifierGuards: Record<string, Function> = {
  stop: (e: Event) => e.stopPropagation(),
  prevent: (e: Event) => e.preventDefault(),
  self: (e: Event) => e.target !== e.currentTarget,
  ctrl: (e: Event) => !(e as KeyboardEvent).ctrlKey,
  shift: (e: Event) => !(e as KeyboardEvent).shiftKey,
  alt: (e: Event) => !(e as KeyboardEvent).altKey,
  meta: (e: Event) => !(e as KeyboardEvent).metaKey,
  // ...
}
```

修饰符在调用用户处理函数之前被处理。

## 自定义事件 vs 原生事件

patchEvent 处理的是原生 DOM 事件。组件的自定义事件通过 emit 系统处理：

```typescript
// 原生事件（在 patchEvent 中处理）
<button @click="handler">

// 自定义事件（通过 emit 系统）
<MyComponent @custom-event="handler">
```

自定义事件的监听器存储在 props 中，由组件的 emit 函数触发，不涉及 addEventListener。

## 小结

patchEvent 使用 invoker 模式优化事件处理。绑定一次 invoker，后续只需更新 invoker.value。事件缓存存储在元素的 `_vei` 属性上。时间戳检查防止异步更新导致的误触发。与编译器配合，修饰符被转换为运行时守卫函数。这套机制确保了事件处理的高效和正确。
