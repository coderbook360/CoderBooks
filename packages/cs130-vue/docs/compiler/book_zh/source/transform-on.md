# transformOn 事件转换

`transformOn` 处理 v-on 指令，将事件监听器转换为 props。

## 函数结构

```typescript
export const transformOn: DirectiveTransform = (
  dir,
  node,
  context,
  augmentor
) => {
  const { loc, modifiers, arg } = dir
  if (!dir.exp && !modifiers.length) {
    context.onError(createCompilerError(ErrorCodes.X_V_ON_NO_EXPRESSION, loc))
  }
  let eventName: ExpressionNode
  
  if (arg.type === NodeTypes.SIMPLE_EXPRESSION) {
    if (arg.isStatic) {
      let rawName = arg.content
      // 处理 vnode 生命周期事件
      if (rawName.startsWith('vue:')) {
        rawName = `vnode-${rawName.slice(4)}`
      }
      eventName = createSimpleExpression(
        toHandlerKey(camelize(rawName)),
        true,
        arg.loc
      )
    } else {
      eventName = createCompoundExpression([
        `${context.helperString(TO_HANDLER_KEY)}(`,
        arg,
        `)`
      ])
    }
  } else {
    eventName = arg
    eventName.children.unshift(`${context.helperString(TO_HANDLER_KEY)}(`)
    eventName.children.push(`)`)
  }

  // 处理表达式
  let exp: ExpressionNode | undefined = dir.exp as SimpleExpressionNode
  if (exp && !exp.content.trim()) {
    exp = undefined
  }

  let shouldCache = context.cacheHandlers && !exp && !context.inVOnce
  if (exp) {
    const isMemberExp = isMemberExpression(exp.content)
    const isInlineStatement = !(isMemberExp || isFnExpression(exp.content))
    const hasMultipleStatements = exp.content.includes(`;`)

    if (isInlineStatement) {
      exp = createCompoundExpression([
        `${isInlineStatement ? `$event` : `(...args)`} => ${hasMultipleStatements ? `{` : `(`}`,
        exp,
        hasMultipleStatements ? `}` : `)`
      ])
    }
  }

  let ret: DirectiveTransformResult = {
    props: [
      createObjectProperty(
        eventName,
        exp || createSimpleExpression(`() => {}`, false, loc)
      )
    ]
  }

  if (augmentor) {
    ret = augmentor(ret)
  }

  if (shouldCache) {
    ret.props[0].value = context.cache(ret.props[0].value)
  }

  ret.props.forEach(p => (p.key.isHandlerKey = true))
  return ret
}
```

## 事件名转换

```typescript
// click → onClick
// custom-event → onCustomEvent
toHandlerKey(camelize(rawName))
```

```typescript
function toHandlerKey(str: string): string {
  return str ? `on${capitalize(str)}` : ``
}
```

## 动态事件名

```html
<div @[eventName]="handler"></div>
```

生成：

```typescript
eventName = createCompoundExpression([
  `toHandlerKey(`,
  eventName,
  `)`
])
// toHandlerKey(eventName)
```

## vnode 生命周期

```html
<div @vue:mounted="handler"></div>
```

转换为：

```typescript
rawName = `vnode-${rawName.slice(4)}`
// vnode-mounted → onVnodeMounted
```

## 表达式处理

### 成员表达式（方法引用）

```html
<button @click="handleClick"></button>
```

直接使用，不包装：

```typescript
exp = { content: 'handleClick' }
```

### 函数表达式

```html
<button @click="() => count++"></button>
<button @click="function() { count++ }"></button>
```

直接使用，不包装。

### 内联语句

```html
<button @click="count++"></button>
<button @click="doA(); doB()"></button>
```

需要包装为箭头函数：

```typescript
exp = createCompoundExpression([
  `$event => (`,
  { content: 'count++' },
  `)`
])
// $event => (count++)

// 多语句
exp = createCompoundExpression([
  `$event => {`,
  { content: 'doA(); doB()' },
  `}`
])
// $event => { doA(); doB() }
```

## 没有表达式

```html
<button @click></button>
```

生成空函数：

```typescript
exp || createSimpleExpression(`() => {}`, false, loc)
```

## 事件缓存

```typescript
let shouldCache = context.cacheHandlers && !exp && !context.inVOnce
```

当启用缓存且没有内联表达式时，缓存事件处理器：

```typescript
if (shouldCache) {
  ret.props[0].value = context.cache(ret.props[0].value)
}
```

生成：

```typescript
onClick: _cache[0] || (_cache[0] = ($event) => handleClick($event))
```

## 增强器（augmentor）

compiler-dom 通过 augmentor 添加修饰符处理：

```typescript
// 在 compiler-dom 的 transformOn 中
const baseResult = baseTransformOn(dir, node, context)
return augment(baseResult)

function augment(result) {
  // 添加修饰符处理
  if (modifiers.length) {
    result.props[0].value = createCallExpression(
      context.helper(V_ON_WITH_MODIFIERS),
      [result.props[0].value, JSON.stringify(modifiers)]
    )
  }
  return result
}
```

## 修饰符处理

基本的修饰符在 compiler-dom 中处理：

```html
<button @click.stop.prevent="handler"></button>
```

生成：

```typescript
onClick: withModifiers(handler, ["stop", "prevent"])
```

运行时：

```typescript
function withModifiers(fn, modifiers) {
  return (event, ...args) => {
    for (const mod of modifiers) {
      if (mod === 'stop') event.stopPropagation()
      if (mod === 'prevent') event.preventDefault()
      // ...
    }
    return fn(event, ...args)
  }
}
```

## 按键修饰符

```html
<input @keyup.enter="submit">
```

生成：

```typescript
onKeyup: withKeys(submit, ["enter"])
```

## isHandlerKey 标记

```typescript
ret.props.forEach(p => (p.key.isHandlerKey = true))
```

标记属性键是事件处理器。这影响后续处理：

```typescript
// 在 buildProps 中
if (key.isHandlerKey) {
  hasHydrationEventBinding = true
}
```

## 完整示例

```html
<button 
  @click="handleClick" 
  @submit.prevent="onSubmit"
  @[dynamicEvent]="dynamicHandler"
  @keyup.enter="submit"
>
```

生成 props：

```typescript
{
  onClick: handleClick,
  onSubmit: withModifiers(onSubmit, ["prevent"]),
  [toHandlerKey(dynamicEvent)]: dynamicHandler,
  onKeyup: withKeys(submit, ["enter"])
}
```

## 小结

transformOn 将 v-on 转换为事件 props。事件名转为 onXxx 格式。内联语句包装为箭头函数。启用缓存时，处理器被缓存避免不必要的更新。修饰符通过 withModifiers 和 withKeys 在运行时处理。动态事件名使用 toHandlerKey 辅助函数。
