# 事件处理器缓存实现

事件缓存（Cache Handlers）避免每次渲染时创建新的事件处理函数。

## 问题背景

```typescript
// 未缓存：每次渲染创建新函数
function render() {
  return h('button', {
    onClick: () => ctx.count++  // 新函数实例
  })
}

// 导致：子组件 props 变化，触发不必要更新
```

## 缓存原理

```typescript
// 缓存后：复用函数引用
function render(_ctx, _cache) {
  return h('button', {
    onClick: _cache[0] || (_cache[0] = ($event) => (_ctx.count++))
  })
}
```

## 编译实现

```typescript
function transformOn(
  dir: DirectiveNode,
  node: ElementNode,
  context: TransformContext
) {
  const { exp, arg } = dir

  // 生成事件处理器
  let handler = exp

  // 需要包装为内联函数
  if (shouldWrap) {
    handler = createCompoundExpression([
      `$event => (`,
      exp,
      `)`
    ])
  }

  // 启用缓存
  if (context.cacheHandlers && !hasDynamicKeyBinding) {
    handler = context.cache(handler)
  }

  return {
    props: [createObjectProperty(eventName, handler)]
  }
}
```

## context.cache

```typescript
cache(exp: JSChildNode, isVNode: boolean = false): CacheExpression {
  const cacheIndex = context.cached++
  return createCacheExpression(cacheIndex, exp, isVNode)
}

interface CacheExpression extends Node {
  type: NodeTypes.JS_CACHE_EXPRESSION
  index: number
  value: JSChildNode
  isVNode: boolean
}
```

## 代码生成

```typescript
function genCacheExpression(
  node: CacheExpression,
  context: CodegenContext
) {
  const { push, helper } = context
  const { index, value, isVNode } = node

  if (isVNode) {
    push(`_cache[${index}] || (`)
    push(`_setBlockTracking(-1),`)
    push(`_cache[${index}] = `)
    genNode(value, context)
    push(`,`)
    push(`_setBlockTracking(1),`)
    push(`_cache[${index}]`)
    push(`)`)
  } else {
    push(`_cache[${index}] || (_cache[${index}] = `)
    genNode(value, context)
    push(`)`)
  }
}
```

## 生成示例

```html
<button @click="count++">Add</button>
```

```typescript
_createElementVNode("button", {
  onClick: _cache[0] || (_cache[0] = ($event) => (_ctx.count++))
}, "Add")
```

## 多事件缓存

```html
<input
  @focus="onFocus"
  @blur="onBlur"
  @input="onInput"
>
```

```typescript
_createElementVNode("input", {
  onFocus: _cache[0] || (_cache[0] = (...args) => (_ctx.onFocus && _ctx.onFocus(...args))),
  onBlur: _cache[1] || (_cache[1] = (...args) => (_ctx.onBlur && _ctx.onBlur(...args))),
  onInput: _cache[2] || (_cache[2] = (...args) => (_ctx.onInput && _ctx.onInput(...args)))
})
```

## 不缓存的情况

```html
<!-- 动态事件名：不能缓存 -->
<button @[eventName]="handler">Click</button>

<!-- 生成 -->
_createElementVNode("button", {
  [_toHandlerKey(_ctx.eventName)]: _ctx.handler
}, "Click", 16 /* FULL_PROPS */)
```

## VNode 缓存

```html
<component :is="currentView" @update="onUpdate">
  <template #default>
    <div>Static content</div>
  </template>
</component>
```

```typescript
// 插槽 VNode 也可以缓存
default: _withCtx(() => [
  _cache[0] || (
    _setBlockTracking(-1),
    _cache[0] = _createElementVNode("div", null, "Static content"),
    _setBlockTracking(1),
    _cache[0]
  )
])
```

## setBlockTracking

```typescript
// VNode 缓存需要禁用 Block 追踪
_setBlockTracking(-1)  // 禁用
_cache[0] = _createElementVNode(...)
_setBlockTracking(1)   // 恢复

// 否则缓存的 VNode 会被错误地添加到 dynamicChildren
```

## _cache 初始化

```typescript
// 组件实例上的缓存数组
instance.renderCache = []

// 渲染时传入
const render = (_ctx, _cache) => {
  // _cache 就是 instance.renderCache
}
```

## 性能收益

```typescript
// 未缓存：每次创建新函数
// props: { onClick: [Function] } !== { onClick: [Function] }
// 导致子组件认为 props 变化

// 缓存后：复用同一引用
// props: { onClick: cachedFn } === { onClick: cachedFn }
// 子组件可以跳过更新
```

## 小结

事件缓存的关键点：

1. **惰性初始化**：首次渲染时创建并缓存
2. **引用复用**：后续渲染使用缓存
3. **动态事件例外**：无法缓存
4. **VNode 缓存**：需要禁用 Block 追踪

下一章将分析 Block 和 dynamicChildren 的实现。
