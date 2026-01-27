# renderComponentSubTree 组件子树

上一章我们分析了 `renderComponentVNode`，它负责创建组件实例并执行 setup。现在让我们看看 `renderComponentSubTree`，它负责渲染组件的实际内容。

## 函数职责

`renderComponentSubTree` 的职责是：调用组件的渲染函数获取子虚拟节点树，然后递归渲染这些节点。

```typescript
function renderComponentSubTree(
  instance: ComponentInternalInstance,
  slotScopeId: string | undefined,
  context: SSRContext,
  push: PushFn
): Promise<void> | undefined
```

## 核心实现

让我们看一下简化的实现：

```typescript
function renderComponentSubTree(
  instance: ComponentInternalInstance,
  slotScopeId: string | undefined,
  context: SSRContext,
  push: PushFn
): Promise<void> | undefined {
  const Component = instance.type
  const { ssrRender, render } = Component
  
  // 优先使用 SSR 优化的渲染函数
  if (ssrRender) {
    // 准备 SSR 渲染上下文
    let attrs = instance.attrs
    let renderAttrs = createSSRRenderAttrs(attrs)
    
    // 调用 SSR 渲染函数
    ssrRender(
      instance.setupState,
      push,
      instance,
      renderAttrs,
      instance.props,
      instance.slots,
      context
    )
  } else if (render) {
    // 使用通用渲染函数
    setCurrentRenderingInstance(instance)
    const subTree = render.call(instance.proxy, instance.proxy)
    setCurrentRenderingInstance(null)
    
    // 递归渲染子树
    return renderVNode(subTree, instance, slotScopeId, context, push)
  }
}
```

这段代码展示了两条渲染路径：SSR 优化渲染和通用渲染。

## SSR 优化渲染

Vue 的编译器会为组件生成专门的 SSR 渲染函数 `ssrRender`。这个函数直接输出 HTML 字符串，跳过了虚拟 DOM 的创建和 diff。

```javascript
// 原始模板
<template>
  <div class="container">
    <h1>{{ title }}</h1>
    <p>{{ content }}</p>
  </div>
</template>

// 编译生成的 ssrRender
function ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div class="container"${_ssrRenderAttrs(_attrs)}>`)
  _push(`<h1>${_ssrInterpolate(_ctx.title)}</h1>`)
  _push(`<p>${_ssrInterpolate(_ctx.content)}</p>`)
  _push(`</div>`)
}
```

SSR 渲染函数直接调用 `push` 输出 HTML 片段。没有虚拟节点创建，没有属性比较，非常高效。

编译器在生成代码时会：

1. 将模板转换为字符串拼接操作
2. 使用 `_ssrInterpolate` 处理插值表达式（转义 HTML）
3. 使用 `_ssrRenderAttrs` 处理动态属性
4. 保留指令和动态绑定的正确处理

## 通用渲染路径

如果组件没有 `ssrRender`（比如手写的 render 函数），会使用通用渲染路径：

```typescript
if (render) {
  // 设置当前渲染实例
  setCurrentRenderingInstance(instance)
  
  // 调用 render 函数获取虚拟节点
  const subTree = render.call(instance.proxy, instance.proxy)
  
  // 重置
  setCurrentRenderingInstance(null)
  
  // 递归渲染虚拟节点
  return renderVNode(subTree, instance, slotScopeId, context, push)
}
```

这条路径会创建完整的虚拟节点树，然后由 `renderVNode` 将其转换为 HTML。虽然比 `ssrRender` 慢一些，但可以处理任意的渲染函数。

## render 函数的执行

调用 render 函数时，`setCurrentRenderingInstance` 设置了当前实例。这让 render 函数内部可以访问组件上下文：

```typescript
function render() {
  // getCurrentInstance() 可以获取当前组件实例
  // 这是通过 setCurrentRenderingInstance 实现的
  return h('div', this.title)
}
```

render 函数返回虚拟节点树，描述组件应该渲染成什么样子。

## 插槽处理

如果组件使用了插槽，渲染时需要处理插槽内容：

```typescript
function renderComponentSubTree(instance, slotScopeId, context, push) {
  const { slots } = instance
  
  if (ssrRender) {
    // SSR 渲染函数接收 slots 参数
    ssrRender(
      instance.setupState,
      push,
      instance,
      renderAttrs,
      instance.props,
      slots,  // 传入插槽
      context
    )
  }
  
  // ...
}
```

插槽内容会在渲染时被调用。SSR 渲染函数会在适当的位置调用 slot 函数获取内容。

```javascript
// 使用插槽的组件的 ssrRender
function ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div>`)
  
  // 渲染默认插槽
  _ssrRenderSlot(_ctx.$slots, "default", {}, null, _push, _parent)
  
  _push(`</div>`)
}
```

## scoped slots 的 ID 处理

Vue 的 scoped CSS 需要在元素上添加特殊属性。在 SSR 中，这通过 `slotScopeId` 参数传递：

```typescript
function renderComponentSubTree(instance, slotScopeId, context, push) {
  // 获取组件自己的 scope ID
  const scopeId = instance.type.__scopeId
  
  // 合并父组件传来的 slot scope ID
  const resolvedScopeId = scopeId || slotScopeId
  
  if (ssrRender) {
    // 传递给 SSR 渲染函数
    ssrRender(..., resolvedScopeId, ...)
  }
}
```

渲染元素时，scope ID 会被添加到元素属性中，确保 scoped CSS 能够正确应用。

## 指令处理

SSR 环境下，指令的处理有所不同。大多数指令只在客户端有意义（如 `v-focus`），但有些指令需要在 SSR 时处理：

```typescript
// v-show 在 SSR 中需要设置初始样式
// v-model 需要设置初始 value
// v-cloak 不需要在 SSR 中输出

function ssrRender(_ctx, _push, ...) {
  // v-show="visible" 编译为
  _push(`<div${_ssrRenderAttrs({
    style: _ctx.visible ? null : { display: 'none' }
  })}>`)
}
```

编译器会识别需要 SSR 处理的指令，生成相应的代码。

## Suspense 边界内的渲染

如果组件在 Suspense 边界内，异步依赖的处理方式会不同：

```typescript
function renderComponentSubTree(instance, slotScopeId, context, push) {
  // 检查是否在 Suspense 边界内
  const suspenseBoundary = instance.suspense
  
  if (suspenseBoundary) {
    // 异步依赖会被 Suspense 收集
    const result = renderAsync()
    suspenseBoundary.registerDep(instance, result)
    return
  }
  
  // 正常渲染
  // ...
}
```

Suspense 边界会收集其子组件的异步依赖，统一处理加载状态。

## 错误处理

渲染过程中的错误会被捕获：

```typescript
function renderComponentSubTree(instance, ...) {
  try {
    // 渲染逻辑
  } catch (err) {
    // 调用错误处理钩子
    handleError(err, instance, 'render')
    
    // 可能渲染错误边界的内容
    if (instance.type.__ssrInlineRender) {
      push(`<!-- error -->`)
    }
  }
}
```

这让应用可以优雅地处理渲染错误，而不是整个 SSR 失败。

## 性能考量

`renderComponentSubTree` 的性能对整体 SSR 性能有重大影响。几个优化点：

SSR 渲染函数避免了虚拟 DOM 的创建和处理开销。尽量使用模板而不是手写 render 函数，让编译器生成优化的 ssrRender。

组件实例的创建是有开销的。对于纯展示性的组件，考虑使用函数式组件减少开销。

避免在 SSR 渲染期间进行不必要的计算。computed 属性会被缓存，但方法调用每次都会执行。

## 小结

`renderComponentSubTree` 负责组件内容的实际渲染：

1. 优先使用编译器生成的 `ssrRender` 函数
2. 回退到通用的 render 函数路径
3. 处理插槽、scoped CSS、指令等特性
4. 在 Suspense 边界内协调异步依赖
5. 提供错误处理机制

在下一章中，我们将分析 `renderElementVNode`，看看普通 HTML 元素是如何被渲染的。
