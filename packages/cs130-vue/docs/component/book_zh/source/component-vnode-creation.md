# 组件 VNode 创建

VNode（虚拟节点）是 Vue 渲染系统的核心数据结构。当你在模板中使用组件时，Vue 会创建一个组件 VNode 来描述这个组件。理解 VNode 的创建过程是理解渲染机制的基础。

## 什么是组件 VNode

VNode 是对 UI 结构的 JavaScript 描述。对于组件，VNode 包含：

```javascript
// 模板中使用组件
// <MyComponent :title="title" @click="onClick">内容</MyComponent>

// 对应的 VNode
{
  type: MyComponent,           // 组件对象
  props: { title: 'Hello', onClick: handleClick },
  children: '内容',
  key: null,
  ref: null,
  // ... 其他属性
}
```

`type` 是组件对象（而不是字符串），这是组件 VNode 与元素 VNode 的主要区别。

## h 函数

`h` 是创建 VNode 的核心函数：

```javascript
import { h } from 'vue'

// 创建元素 VNode
h('div', { class: 'container' }, 'Hello')

// 创建组件 VNode
h(MyComponent, { title: 'Hello' }, '内容')
```

## h 函数源码

`h` 函数定义在 `runtime-core/src/h.ts`：

```typescript
export function h(type: any, propsOrChildren?: any, children?: any): VNode {
  const l = arguments.length
  if (l === 2) {
    if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
      // 单个 VNode 子节点
      if (isVNode(propsOrChildren)) {
        return createVNode(type, null, [propsOrChildren])
      }
      // 只有 props
      return createVNode(type, propsOrChildren)
    } else {
      // 只有 children
      return createVNode(type, null, propsOrChildren)
    }
  } else {
    if (l > 3) {
      children = Array.prototype.slice.call(arguments, 2)
    } else if (l === 3 && isVNode(children)) {
      children = [children]
    }
    return createVNode(type, propsOrChildren, children)
  }
}
```

`h` 函数处理参数的各种形式，最终调用 `createVNode`。

## createVNode

`createVNode` 是真正创建 VNode 的函数：

```typescript
// runtime-core/src/vnode.ts
export const createVNode = (
  __DEV__ ? createVNodeWithArgsTransform : _createVNode
) as typeof _createVNode

function _createVNode(
  type: VNodeTypes | ClassComponent | typeof NULL_DYNAMIC_COMPONENT,
  props: (Data & VNodeProps) | null = null,
  children: unknown = null,
  patchFlag: number = 0,
  dynamicProps: string[] | null = null,
  isBlockNode = false
): VNode {
  // 1. 处理无效类型
  if (!type || type === NULL_DYNAMIC_COMPONENT) {
    type = Comment
  }
  
  // 2. 如果 type 已经是 VNode，克隆它
  if (isVNode(type)) {
    const cloned = cloneVNode(type, props, true)
    if (children) {
      normalizeChildren(cloned, children)
    }
    return cloned
  }
  
  // 3. 处理类组件
  if (isClassComponent(type)) {
    type = type.__vccOpts
  }
  
  // 4. 规范化 class 和 style
  if (props) {
    props = guardReactiveProps(props)
    let { class: klass, style } = props
    if (klass && !isString(klass)) {
      props.class = normalizeClass(klass)
    }
    if (isObject(style)) {
      if (isProxy(style) && !isArray(style)) {
        style = extend({}, style)
      }
      props.style = normalizeStyle(style)
    }
  }
  
  // 5. 确定 shapeFlag
  const shapeFlag = isString(type)
    ? ShapeFlags.ELEMENT
    : __FEATURE_SUSPENSE__ && isSuspense(type)
    ? ShapeFlags.SUSPENSE
    : isTeleport(type)
    ? ShapeFlags.TELEPORT
    : isObject(type)
    ? ShapeFlags.STATEFUL_COMPONENT
    : isFunction(type)
    ? ShapeFlags.FUNCTIONAL_COMPONENT
    : 0
  
  // 6. 创建 VNode 对象
  return createBaseVNode(
    type,
    props,
    children,
    patchFlag,
    dynamicProps,
    shapeFlag,
    isBlockNode,
    true
  )
}
```

## shapeFlag

`shapeFlag` 是用于快速判断 VNode 类型的位标记：

```typescript
export const enum ShapeFlags {
  ELEMENT = 1,                          // 普通元素
  FUNCTIONAL_COMPONENT = 1 << 1,        // 函数式组件
  STATEFUL_COMPONENT = 1 << 2,          // 有状态组件
  TEXT_CHILDREN = 1 << 3,               // 文本子节点
  ARRAY_CHILDREN = 1 << 4,              // 数组子节点
  SLOTS_CHILDREN = 1 << 5,              // 插槽子节点
  TELEPORT = 1 << 6,                    // Teleport
  SUSPENSE = 1 << 7,                    // Suspense
  COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8, // 应该被 KeepAlive
  COMPONENT_KEPT_ALIVE = 1 << 9,        // 已被 KeepAlive
  COMPONENT = STATEFUL_COMPONENT | FUNCTIONAL_COMPONENT
}
```

使用位运算可以高效地判断和组合类型：

```typescript
// 判断是否是组件
if (shapeFlag & ShapeFlags.COMPONENT) { ... }

// 判断是否有数组子节点
if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) { ... }
```

## createBaseVNode

创建实际的 VNode 对象：

```typescript
function createBaseVNode(
  type: VNodeTypes | ClassComponent | typeof NULL_DYNAMIC_COMPONENT,
  props: (Data & VNodeProps) | null = null,
  children: unknown = null,
  patchFlag = 0,
  dynamicProps: string[] | null = null,
  shapeFlag = type === Fragment ? 0 : ShapeFlags.ELEMENT,
  isBlockNode = false,
  needFullChildrenNormalization = false
): VNode {
  const vnode = {
    __v_isVNode: true,
    __v_skip: true,
    type,
    props,
    key: props && normalizeKey(props),
    ref: props && normalizeRef(props),
    scopeId: currentScopeId,
    slotScopeIds: null,
    children,
    component: null,
    suspense: null,
    ssContent: null,
    ssFallback: null,
    dirs: null,
    transition: null,
    el: null,
    anchor: null,
    target: null,
    targetAnchor: null,
    staticCount: 0,
    shapeFlag,
    patchFlag,
    dynamicProps,
    dynamicChildren: null,
    appContext: null,
    ctx: currentRenderingInstance
  } as VNode
  
  // 规范化子节点
  if (needFullChildrenNormalization) {
    normalizeChildren(vnode, children)
  } else if (children) {
    vnode.shapeFlag |= isString(children)
      ? ShapeFlags.TEXT_CHILDREN
      : ShapeFlags.ARRAY_CHILDREN
  }
  
  // 添加到 block
  if (
    isBlockTreeEnabled > 0 &&
    !isBlockNode &&
    currentBlock &&
    (vnode.patchFlag > 0 || shapeFlag & ShapeFlags.COMPONENT) &&
    vnode.patchFlag !== PatchFlags.HYDRATE_EVENTS
  ) {
    currentBlock.push(vnode)
  }
  
  return vnode
}
```

## VNode 的关键属性

```typescript
interface VNode {
  type: VNodeTypes                    // 类型：组件、标签名、Fragment 等
  props: VNodeProps | null            // 属性和事件
  key: string | number | symbol | null // diff 用的唯一标识
  ref: VNodeNormalizedRef | null      // ref 引用
  children: VNodeNormalizedChildren   // 子节点
  
  component: ComponentInternalInstance | null  // 组件实例（挂载后填充）
  el: HostNode | null                 // 真实 DOM 节点（挂载后填充）
  
  shapeFlag: number                   // 类型标记
  patchFlag: number                   // 更新标记（编译时优化）
  dynamicProps: string[] | null       // 动态属性名（编译时优化）
  dynamicChildren: VNode[] | null     // 动态子节点（Block 优化）
  
  appContext: AppContext | null       // 应用上下文
}
```

挂载前，`component` 和 `el` 是 null。挂载过程中，渲染器会填充这些属性。

## 模板编译的 VNode

模板编译后会生成优化的 `createVNode` 调用：

```html
<template>
  <MyComponent :title="title" @click="onClick">
    {{ message }}
  </MyComponent>
</template>
```

编译结果：

```javascript
import { createVNode as _createVNode, toDisplayString as _toDisplayString } from 'vue'

function render(_ctx, _cache) {
  return _createVNode(_component_MyComponent, {
    title: _ctx.title,
    onClick: _ctx.onClick
  }, {
    default: () => [_toDisplayString(_ctx.message)]
  }, 8 /* PROPS */, ["title"])
}
```

`8` 是 `PatchFlags.PROPS`，表示有动态 props。`["title"]` 是动态属性名列表。这些信息帮助渲染器优化更新。

## PatchFlags

编译时确定的更新标记：

```typescript
export const enum PatchFlags {
  TEXT = 1,                    // 动态文本
  CLASS = 1 << 1,              // 动态 class
  STYLE = 1 << 2,              // 动态 style
  PROPS = 1 << 3,              // 动态 props（需要 dynamicProps）
  FULL_PROPS = 1 << 4,         // 有动态 key，需要完整 diff
  HYDRATE_EVENTS = 1 << 5,     // 需要水合事件
  STABLE_FRAGMENT = 1 << 6,    // 稳定的 Fragment
  KEYED_FRAGMENT = 1 << 7,     // 有 key 的 Fragment
  UNKEYED_FRAGMENT = 1 << 8,   // 无 key 的 Fragment
  NEED_PATCH = 1 << 9,         // 需要非 props 的 patch
  DYNAMIC_SLOTS = 1 << 10,     // 动态插槽
  DEV_ROOT_FRAGMENT = 1 << 11, // 开发环境根 Fragment
  HOISTED = -1,                // 静态提升
  BAIL = -2                    // 退出优化
}
```

渲染器根据 `patchFlag` 决定如何更新：

```typescript
if (patchFlag & PatchFlags.CLASS) {
  // 只更新 class
}
if (patchFlag & PatchFlags.STYLE) {
  // 只更新 style
}
```

## cloneVNode

克隆 VNode，用于动态组件等场景：

```typescript
export function cloneVNode<T, U>(
  vnode: VNode<T, U>,
  extraProps?: (Data & VNodeProps) | null,
  mergeRef = false
): VNode<T, U> {
  const { props, ref, patchFlag, children } = vnode
  
  const mergedProps = extraProps ? mergeProps(props || {}, extraProps) : props
  
  const cloned: VNode<T, U> = {
    __v_isVNode: true,
    __v_skip: true,
    type: vnode.type,
    props: mergedProps,
    key: mergedProps && normalizeKey(mergedProps),
    ref: extraProps && extraProps.ref
      ? mergeRef && ref
        ? isArray(ref) ? ref.concat(normalizeRef(extraProps)!) : [ref, normalizeRef(extraProps)!]
        : normalizeRef(extraProps)
      : ref,
    // ... 复制其他属性
    children,
    component: vnode.component,
    // ...
  }
  
  return cloned
}
```

克隆时可以合并额外的 props。

## 小结

组件 VNode 是组件在虚拟 DOM 中的表示。`h` 函数和 `createVNode` 是创建 VNode 的核心。

`shapeFlag` 使用位标记高效判断 VNode 类型。`patchFlag` 和 `dynamicProps` 是编译时优化，帮助渲染器跳过不必要的 diff。

VNode 创建后，`component` 和 `el` 是空的。挂载过程中，渲染器会创建组件实例、创建 DOM 元素，并填充这些属性。

在下一章中，我们将分析 `setupComponent`——组件初始化的核心流程。
