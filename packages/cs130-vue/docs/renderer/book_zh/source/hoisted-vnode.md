# Hoisted VNode 提升节点

Hoisted VNode 是 Vue 编译优化的核心策略之一。通过将不变的 VNode 提升到渲染函数外部，避免在每次渲染时重复创建，同时让 diff 算法可以快速跳过这些节点。

## 提升的原理

考虑这个模板：

```vue
<template>
  <div>
    <span class="static">Hello</span>
    <span>{{ message }}</span>
  </div>
</template>
```

未优化的渲染函数每次都创建所有 VNode：

```typescript
function render(_ctx) {
  return createVNode('div', null, [
    createVNode('span', { class: 'static' }, 'Hello'),
    createVNode('span', null, _ctx.message)
  ])
}
```

优化后，静态节点被提升：

```typescript
const _hoisted_1 = createVNode('span', { class: 'static' }, 'Hello', -1 /* HOISTED */)

function render(_ctx) {
  return createVNode('div', null, [
    _hoisted_1,  // 复用
    createVNode('span', null, _ctx.message, 1 /* TEXT */)
  ])
}
```

`_hoisted_1` 在模块加载时创建一次，每次渲染都复用同一个对象。

## PatchFlags.HOISTED

提升的 VNode 使用 HOISTED 标记：

```typescript
export const enum PatchFlags {
  // ...
  HOISTED = -1,
  BAIL = -2
}
```

`-1` 表示这个节点永远不变，渲染器可以完全跳过对它的 patch。

## 渲染器的处理

patch 函数检测 HOISTED 标记：

```typescript
const patch: PatchFn = (n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized) => {
  // 相同节点直接返回
  if (n1 === n2) {
    return
  }
  
  // ...
}
```

由于提升的 VNode 每次都是同一个对象引用，`n1 === n2` 会成立，patch 直接返回。这是最快的路径——连类型判断都不需要。

## 首次挂载

第一次渲染时，n1 为 null，需要正常挂载：

```typescript
if (n1 == null) {
  // mount
  if (shapeFlag & ShapeFlags.ELEMENT) {
    mountElement(n2, container, anchor, /* ... */)
  }
}
```

挂载完成后，el 属性被设置：

```typescript
_hoisted_1.el = actualDOMElement
```

后续更新时，这个 el 会被复用。

## Block 优化的配合

提升的 VNode 不会出现在 dynamicChildren 中：

```typescript
// openBlock 时只收集动态子节点
const block = createBlock('div', null, [
  _hoisted_1,           // 不在 dynamicChildren
  createVNode('span', null, message, 1)  // 在 dynamicChildren
])
```

patchBlockChildren 只处理 dynamicChildren，提升的节点被完全跳过：

```typescript
const patchBlockChildren: PatchBlockChildrenFn = (oldChildren, newChildren, /* ... */) => {
  for (let i = 0; i < newChildren.length; i++) {
    const oldVNode = oldChildren[i]
    const newVNode = newChildren[i]
    // 这里只处理动态节点
    patch(oldVNode, newVNode, /* ... */)
  }
}
```

## 提升的条件

编译器通过 AST 分析决定是否提升：

```typescript
// 简化的逻辑
function shouldHoist(node: ElementNode, context: TransformContext): boolean {
  // 不能有动态绑定
  if (hasDynamicKeyOrRef(node)) return false
  if (hasDynamicProps(node)) return false
  
  // 不能有动态子节点
  if (hasNestedComponents(node)) return false
  if (hasDynamicChildren(node)) return false
  
  return true
}
```

满足条件的节点会被标记为提升候选。

## 提升层级

编译器可以配置提升的激进程度：

```typescript
interface CompilerOptions {
  hoistStatic?: boolean  // 是否启用静态提升
}
```

提升不仅限于元素，还包括静态 props 对象：

```typescript
// props 也可以提升
const _hoisted_props = { class: 'static', id: 'header' }

function render(_ctx) {
  return createVNode('div', _hoisted_props, [
    // 子节点可能是动态的
    createVNode('span', null, _ctx.message)
  ])
}
```

## 与 cloneVNode 的配合

某些场景下需要使用提升节点的副本：

```typescript
// v-for 中使用提升的节点
const _hoisted_1 = createVNode('span', null, 'Static')

function render(_ctx) {
  return createVNode(Fragment, null, 
    _ctx.items.map(item => 
      cloneVNode(_hoisted_1)  // 克隆，每个位置需要独立的 el
    )
  )
}
```

cloneVNode 创建浅拷贝，但清除 el 引用：

```typescript
export function cloneVNode(vnode: VNode, extraProps?: Data | null): VNode {
  const { props, ref, patchFlag, children } = vnode
  const cloned: VNode = {
    __v_isVNode: true,
    type: vnode.type,
    props: mergeProps ? mergeProps(props, extraProps) : props,
    // ...
    el: null,     // 清除 el
    anchor: null  // 清除 anchor
  }
  return cloned
}
```

## 开发环境差异

开发环境下，HMR 可能需要"取消提升"：

```typescript
// 开发环境编译选项
{
  hoistStatic: !__DEV__  // 开发环境可能禁用
}
```

或者保留提升但支持热更新。具体策略取决于编译器配置。

## 实际收益

提升优化的收益：

1. **内存**：减少 VNode 对象创建
2. **CPU**：跳过 VNode 创建和 patch
3. **GC**：减少垃圾回收压力

在大型应用中，静态内容可能占 70-80%，提升优化的累积效果非常显著。

## 手写渲染函数

手写渲染函数时也可以利用提升：

```typescript
import { h } from 'vue'

// 手动提升
const StaticHeader = h('header', { class: 'app-header' }, [
  h('h1', null, 'My App'),
  h('nav', null, [/* ... */])
])

export default {
  render() {
    return h('div', null, [
      StaticHeader,  // 每次复用
      h('main', null, this.content)
    ])
  }
}
```

这实现了与编译器相同的优化效果。

## v-once 指令

v-once 强制组件/元素只渲染一次：

```vue
<template>
  <div v-once>
    <ComplexComponent :data="data" />
  </div>
</template>
```

这类似于手动的终极提升——即使内容有动态部分，也只计算一次。编译器生成的代码会缓存整个 VNode 树：

```typescript
function render(_ctx, _cache) {
  return _cache[0] || (_cache[0] = createVNode('div', null, [
    createVNode(ComplexComponent, { data: _ctx.data })
  ]))
}
```

## 小结

Hoisted VNode 通过将不变的 VNode 提升到渲染函数外部，实现真正的"零成本"静态节点。HOISTED 标记和 Block 机制配合，让渲染器在更新时完全跳过这些节点。这是 Vue 编译时优化策略的核心之一，对于包含大量静态内容的应用效果显著。
