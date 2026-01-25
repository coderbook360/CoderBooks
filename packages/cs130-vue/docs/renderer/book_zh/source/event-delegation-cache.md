# 事件委托与缓存

Vue 在组件级别实现了事件处理函数的缓存机制，避免在每次渲染时创建新的函数引用。这个优化对于减少不必要的子组件更新和 diff 操作至关重要。

## 问题背景

考虑这个常见的模式：

```html
<template>
  <button @click="() => doSomething(item)">Click</button>
</template>
```

如果不做优化，每次渲染都会创建新的箭头函数，导致 props 比较时认为发生了变化，触发不必要的更新。

## 缓存机制

编译器会为内联事件处理函数生成缓存：

```html
<template>
  <button @click="handleClick">Static</button>
  <button @click="() => handleAction(item)">Dynamic</button>
</template>
```

编译结果：

```typescript
import { renderList as _renderList, Fragment as _Fragment, openBlock as _openBlock, createElementBlock as _createElementBlock, createElementVNode as _createElementVNode } from "vue"

export function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock(_Fragment, null, [
    _createElementVNode("button", {
      onClick: _ctx.handleClick
    }, "Static"),
    _createElementVNode("button", {
      onClick: _cache[0] || (_cache[0] = () => _ctx.handleAction(_ctx.item))
    }, "Dynamic")
  ], 64))
}
```

关键在于 `_cache[0] || (_cache[0] = ...)`：首次渲染时创建函数并存入缓存，后续渲染直接使用缓存的引用。

## 缓存数组

每个组件实例维护一个缓存数组：

```typescript
interface ComponentInternalInstance {
  // ...
  renderCache: (Function | VNode)[]
  // ...
}
```

编译器为每个需要缓存的项分配一个索引。渲染函数通过 `_cache` 参数访问这个数组：

```typescript
function render(_ctx, _cache) {
  // _cache 就是 instance.renderCache
}
```

## 缓存策略

并非所有事件处理函数都需要缓存：

```html
<!-- 不需要缓存：直接引用方法 -->
<button @click="handleClick">

<!-- 需要缓存：内联表达式 -->
<button @click="handleClick()">

<!-- 需要缓存：带参数的调用 -->
<button @click="handleClick(item)">

<!-- 需要缓存：箭头函数 -->
<button @click="() => handleClick(item)">

<!-- 需要缓存：复杂表达式 -->
<button @click="a && b ? handleA() : handleB()">
```

直接引用方法时，每次渲染得到的都是同一个函数引用，不需要缓存。而表达式每次求值会产生新函数，需要缓存来稳定引用。

## 编译器分析

编译器通过 AST 分析来决定是否需要缓存：

```typescript
// 简化的编译器逻辑
function processExpression(node: ExpressionNode, context: TransformContext) {
  const isInlineHandler = isInlineEventHandler(node)
  
  if (isInlineHandler) {
    // 需要包装并缓存
    return createCachedExpression(
      createCallExpression(context.helper(CREATE_HANDLER), [
        node
      ])
    )
  }
  
  // 直接使用
  return node
}
```

## 元素的事件缓存

在 patchEvent 中，元素级别也有缓存：

```typescript
export function patchEvent(
  el: Element & { _vei?: Record<string, Invoker | undefined> },
  rawName: string,
  prevValue: EventValue | null,
  nextValue: EventValue | null,
  instance: ComponentInternalInstance | null = null
) {
  const invokers = el._vei || (el._vei = {})
  const existingInvoker = invokers[rawName]

  if (nextValue && existingInvoker) {
    // 更新 value 而不是重新绑定
    existingInvoker.value = nextValue
  }
  // ...
}
```

这是两级缓存：
1. 组件级缓存（_cache）：稳定处理函数的引用，避免 props diff 认为变化
2. 元素级缓存（_vei）：避免重复的 addEventListener/removeEventListener

## 列表渲染场景

在 v-for 中缓存特别重要：

```html
<template>
  <div v-for="item in items" :key="item.id">
    <button @click="() => select(item)">Select</button>
  </div>
</template>
```

编译为：

```typescript
export function render(_ctx, _cache) {
  return (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.items, (item, __key, __index) => {
    return (_openBlock(), _createElementBlock("div", { key: item.id }, [
      _createElementVNode("button", {
        onClick: () => _ctx.select(item)
      }, "Select")
    ]))
  }), 128))
}
```

注意这里没有使用 _cache——因为每个列表项需要不同的处理函数（捕获不同的 item）。这种情况下缓存不适用，每次都创建新函数。

但如果处理函数不依赖循环变量：

```html
<template>
  <div v-for="item in items" :key="item.id">
    <button @click="handleClick">Static</button>
  </div>
</template>
```

直接引用方法不需要缓存，每次都是同一个函数引用。

## 事件委托的考量

Vue 没有实现真正的事件委托（将事件绑定在父元素上），原因是：

1. **语义清晰**：每个元素上的事件绑定直观清晰
2. **组件边界**：事件委托跨组件会有问题
3. **修饰符支持**：.stop、.prevent 等修饰符需要在正确的位置处理
4. **灵活性**：某些场景需要精确控制

但 invoker 模式提供了类似的性能优势——更新只是替换 value 引用，不涉及 DOM API 调用。

## 与 React 的对比

React 使用合成事件系统实现真正的事件委托：

```jsx
// React：所有事件实际绑定在 root 上
<button onClick={handleClick}>Click</button>
```

Vue 选择了不同的权衡：

```html
<!-- Vue：事件绑定在实际元素上，但使用 invoker 优化 -->
<button @click="handleClick">Click</button>
```

Vue 的方式更接近原生行为，在某些场景（如 Shadow DOM）中兼容性更好。

## 缓存失效

某些情况会导致缓存失效：

```html
<template>
  <button @click="condition ? handlerA : handlerB">
    Conditional
  </button>
</template>
```

这里的表达式每次可能返回不同的函数，编译器会生成：

```typescript
onClick: _ctx.condition ? _ctx.handlerA : _ctx.handlerB
```

没有缓存，因为结果可能变化。invoker 模式仍然有效——元素级的 _vei 缓存确保不需要重新绑定事件。

## 性能影响

事件缓存的性能收益主要体现在：

1. **减少函数创建**：内联处理函数只创建一次
2. **稳定 props 引用**：避免子组件不必要的更新
3. **减少 diff 工作**：props 比较更快
4. **避免 DOM 操作**：不需要反复绑定/解绑事件

在有大量事件处理的复杂界面中，这些优化累积起来的效果显著。

## 小结

Vue 通过组件级的 `_cache` 数组和元素级的 `_vei` 对象实现两级事件缓存。编译器分析事件表达式，为需要缓存的内联处理函数生成缓存逻辑。这种设计在保持语义清晰的同时，避免了事件委托的复杂性，又获得了相近的性能优势。
