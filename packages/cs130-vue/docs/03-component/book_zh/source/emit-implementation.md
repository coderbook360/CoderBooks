# emit 事件触发

组件通过 `emit` 向父组件发送事件。这是子向父通信的标准方式。

## 基本使用

```html
<!-- 子组件 -->
<script setup>
const emit = defineEmits(['update', 'delete'])

function handleClick() {
  emit('update', newValue)
}
</script>

<!-- 父组件 -->
<template>
  <Child @update="handleUpdate" />
</template>
```

## emit 的创建

组件实例创建时设置 emit：

```typescript
// createComponentInstance 中
instance.emit = emit.bind(null, instance)
```

绑定实例后，调用时自动传入当前实例。

## emit 函数

核心实现：

```typescript
export function emit(
  instance: ComponentInternalInstance,
  event: string,
  ...rawArgs: any[]
) {
  // 组件已卸载则跳过
  if (instance.isUnmounted) return
  
  const props = instance.vnode.props || EMPTY_OBJ

  // 开发环境验证事件
  if (__DEV__) {
    const { emitsOptions, propsOptions: [propsOptions] } = instance
    if (emitsOptions) {
      if (
        !(event in emitsOptions) &&
        !(
          __COMPAT__ &&
          (event.startsWith('hook:') ||
            event.startsWith(compatModelEventPrefix))
        )
      ) {
        if (!propsOptions || !(toHandlerKey(event) in propsOptions)) {
          warn(
            `Component emitted event "${event}" but it is neither declared in ` +
              `the emits option nor as an "${toHandlerKey(event)}" prop.`
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

  let args = rawArgs
  
  // v-model 特殊处理
  const isModelListener = event.startsWith('update:')
  const modelArg = isModelListener && event.slice(7)
  
  if (modelArg && modelArg in props) {
    const modifiersKey = `${modelArg === 'modelValue' ? 'model' : modelArg}Modifiers`
    const { number, trim } = props[modifiersKey] || EMPTY_OBJ
    if (trim) {
      args = rawArgs.map(a => (isString(a) ? a.trim() : a))
    }
    if (number) {
      args = rawArgs.map(looseToNumber)
    }
  }

  // 调用处理器
  let handlerName
  let handler =
    props[(handlerName = toHandlerKey(event))] ||
    props[(handlerName = toHandlerKey(camelize(event)))]
  
  // kebab-case 事件
  if (!handler && isModelListener) {
    handler = props[(handlerName = toHandlerKey(hyphenate(event)))]
  }

  if (handler) {
    callWithAsyncErrorHandling(
      handler,
      instance,
      ErrorCodes.COMPONENT_EVENT_HANDLER,
      args
    )
  }

  // once 处理器
  const onceHandler = props[handlerName + `Once`]
  if (onceHandler) {
    if (!instance.emitted) {
      instance.emitted = {}
    } else if (instance.emitted[handlerName]) {
      return
    }
    instance.emitted[handlerName] = true
    callWithAsyncErrorHandling(
      onceHandler,
      instance,
      ErrorCodes.COMPONENT_EVENT_HANDLER,
      args
    )
  }
}
```

## toHandlerKey

事件名转换为处理器属性名：

```typescript
const cacheStringFunction = <T extends (str: string) => string>(fn: T): T => {
  const cache: Record<string, string> = Object.create(null)
  return ((str: string) => {
    const hit = cache[str]
    return hit || (cache[str] = fn(str))
  }) as T
}

export const toHandlerKey = cacheStringFunction((str: string) =>
  str ? `on${capitalize(str)}` : ``
)
```

`update` → `onUpdate`，`item-click` → `onItemClick`。

## 事件名处理

支持多种命名格式：

```typescript
let handler =
  props[(handlerName = toHandlerKey(event))] ||  // 原始名
  props[(handlerName = toHandlerKey(camelize(event)))]  // 驼峰

if (!handler && isModelListener) {
  handler = props[(handlerName = toHandlerKey(hyphenate(event)))]  // 短横线
}
```

所以这些都等价：

```html
<Child @item-click="..." />
<Child @itemClick="..." />
```

## v-model 修饰符

`update:` 事件处理 v-model 修饰符：

```typescript
if (modelArg && modelArg in props) {
  const modifiersKey = `${modelArg === 'modelValue' ? 'model' : modelArg}Modifiers`
  const { number, trim } = props[modifiersKey] || EMPTY_OBJ
  if (trim) {
    args = rawArgs.map(a => (isString(a) ? a.trim() : a))
  }
  if (number) {
    args = rawArgs.map(looseToNumber)
  }
}
```

使用示例：

```html
<Input v-model.trim.number="value" />
```

`emit('update:modelValue', '  123  ')` 会自动转换为 `123`。

## 事件验证

定义验证函数：

```javascript
defineEmits({
  update: (value) => {
    if (typeof value !== 'number') {
      console.warn('update 事件需要 number 类型')
      return false
    }
    return true
  }
})
```

源码中的验证：

```typescript
const validator = emitsOptions[event]
if (isFunction(validator)) {
  const isValid = validator(...rawArgs)
  if (!isValid) {
    warn(`Invalid event arguments...`)
  }
}
```

## once 事件

只触发一次的事件：

```html
<Child @update.once="handleUpdate" />
```

实现：

```typescript
const onceHandler = props[handlerName + `Once`]
if (onceHandler) {
  if (!instance.emitted) {
    instance.emitted = {}
  } else if (instance.emitted[handlerName]) {
    return  // 已触发过，跳过
  }
  instance.emitted[handlerName] = true
  callWithAsyncErrorHandling(onceHandler, ...)
}
```

使用 `emitted` 对象记录已触发的事件。

## 错误处理

事件处理器的错误被统一捕获：

```typescript
callWithAsyncErrorHandling(
  handler,
  instance,
  ErrorCodes.COMPONENT_EVENT_HANDLER,
  args
)
```

错误会正确传播到错误处理链。

## 原生事件 vs 组件事件

```html
<!-- 原生事件 -->
<button @click="...">

<!-- 组件事件 -->
<MyButton @click="...">
```

如果组件没有声明 `click` 事件，会透传到根元素作为原生事件。

## emitsOptions 处理

初始化时规范化 emits 选项：

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

  // 合并 mixins
  let hasExtends = false
  if (__FEATURE_OPTIONS_API__ && !isFunction(comp)) {
    const extendEmits = (raw: ComponentOptions) => {
      const normalizedFromExtend = normalizeEmitsOptions(raw, appContext, true)
      if (normalizedFromExtend) {
        hasExtends = true
        extend(normalized, normalizedFromExtend)
      }
    }
    if (!asMixin && appContext.mixins.length) {
      appContext.mixins.forEach(extendEmits)
    }
    if (comp.extends) {
      extendEmits(comp.extends)
    }
    if (comp.mixins) {
      comp.mixins.forEach(extendEmits)
    }
  }

  if (!raw && !hasExtends) {
    cache.set(comp, null)
    return null
  }

  // 规范化为对象
  if (isArray(raw)) {
    raw.forEach(key => (normalized[key] = null))
  } else {
    extend(normalized, raw)
  }

  cache.set(comp, normalized)
  return normalized
}
```

数组形式转换为对象：

```javascript
// 输入
emits: ['update', 'delete']

// 规范化后
{ update: null, delete: null }
```

## 类型推导

TypeScript 类型：

```typescript
defineEmits<{
  (e: 'update', value: number): void
  (e: 'delete', id: string): void
}>()
```

或使用 3.3+ 语法：

```typescript
defineEmits<{
  update: [value: number]
  delete: [id: string]
}>()
```

## 小结

`emit` 的实现要点：

1. **事件名转换**：支持多种命名格式
2. **v-model 修饰符**：处理 trim、number
3. **事件验证**：开发环境验证参数
4. **once 支持**：记录已触发事件
5. **错误处理**：统一的错误捕获

emit 是组件通信的核心机制，连接了子组件的数据变更和父组件的响应逻辑。

下一章将分析 emits 选项的规范化过程。
