# Fragment 组件

Fragment 是 Vue 3 引入的虚拟节点类型，允许组件返回多个根节点。它不会渲染任何真实 DOM 元素，只作为子节点的容器。

## 使用场景

Vue 2 要求组件必须有单个根节点，Vue 3 移除了这个限制：

```vue
<!-- Vue 3：多根节点 -->
<template>
  <header>Header</header>
  <main>Content</main>
  <footer>Footer</footer>
</template>
```

编译后会自动包裹 Fragment：

```javascript
import { Fragment } from 'vue'

render() {
  return h(Fragment, null, [
    h('header', 'Header'),
    h('main', 'Content'),
    h('footer', 'Footer')
  ])
}
```

## Fragment 定义

```typescript
export const Fragment = Symbol(__DEV__ ? 'Fragment' : undefined) as any as {
  __isFragment: true
  new (): {
    $props: VNodeProps
  }
}
```

Fragment 就是一个 Symbol，用作 VNode 的 type 标识。

## VNode 创建

```typescript
function _createVNode(
  type: VNodeTypes,
  props: VNodeProps | null,
  children: unknown,
  patchFlag: number,
  dynamicProps: string[] | null,
  isBlockNode: boolean
): VNode {
  // ...
  
  // 规范化子节点
  if (needFullChildrenNormalization) {
    normalizeChildren(vnode, children)
  } else if (children) {
    vnode.children = isString(children)
      ? children
      : isArray(children)
      ? children
      : [children]
  }

  // Fragment 需要设置 shapeFlag
  if (type === Fragment && children) {
    // 检查子节点是否有 key
    if (isArray(children)) {
      const hasKeyedChild = children.some(c => c && c.key != null)
      vnode.patchFlag |= hasKeyedChild 
        ? PatchFlags.KEYED_FRAGMENT 
        : PatchFlags.UNKEYED_FRAGMENT
    }
  }

  return vnode
}
```

## Fragment 的 patch

```typescript
const patch = (
  n1: VNode | null,
  n2: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  // ...
) => {
  const { type, shapeFlag } = n2

  switch (type) {
    case Fragment:
      processFragment(
        n1,
        n2,
        container,
        anchor,
        parentComponent,
        parentSuspense,
        isSVG,
        slotScopeIds,
        optimized
      )
      break
    // ...
  }
}
```

## processFragment

处理 Fragment 的核心逻辑：

```typescript
const processFragment = (
  n1: VNode | null,
  n2: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  isSVG: boolean,
  slotScopeIds: string[] | null,
  optimized: boolean
) => {
  // Fragment 使用两个空文本节点作为边界标记
  const fragmentStartAnchor = (n2.el = n1 ? n1.el : hostCreateText(''))!
  const fragmentEndAnchor = (n2.anchor = n1 ? n1.anchor : hostCreateText(''))!

  let { patchFlag, dynamicChildren, slotScopeIds: fragmentSlotScopeIds } = n2

  if (fragmentSlotScopeIds) {
    slotScopeIds = slotScopeIds
      ? slotScopeIds.concat(fragmentSlotScopeIds)
      : fragmentSlotScopeIds
  }

  if (n1 == null) {
    // 首次挂载
    hostInsert(fragmentStartAnchor, container, anchor)
    hostInsert(fragmentEndAnchor, container, anchor)
    
    // 挂载子节点
    mountChildren(
      n2.children as VNodeArrayChildren,
      container,
      fragmentEndAnchor,  // 插入到结束锚点之前
      parentComponent,
      parentSuspense,
      isSVG,
      slotScopeIds,
      optimized
    )
  } else {
    // 更新
    if (
      patchFlag > 0 &&
      patchFlag & PatchFlags.STABLE_FRAGMENT &&
      dynamicChildren &&
      n1.dynamicChildren
    ) {
      // 优化：只更新动态子节点
      patchBlockChildren(
        n1.dynamicChildren,
        dynamicChildren,
        container,
        parentComponent,
        parentSuspense,
        isSVG,
        slotScopeIds
      )
    } else {
      // 完整 diff
      patchChildren(
        n1,
        n2,
        container,
        fragmentEndAnchor,
        parentComponent,
        parentSuspense,
        isSVG,
        slotScopeIds,
        optimized
      )
    }
  }
}
```

## 锚点机制

Fragment 使用两个空文本节点作为边界：

```
[fragmentStartAnchor] child1 child2 child3 [fragmentEndAnchor]
```

这样在更新时可以准确定位插入位置。

## patchFlag 优化

Fragment 有三种优化标记：

```typescript
export const enum PatchFlags {
  KEYED_FRAGMENT = 128,      // 子节点有 key
  UNKEYED_FRAGMENT = 256,    // 子节点无 key
  STABLE_FRAGMENT = 64       // 结构稳定，可跳过 diff
}
```

## STABLE_FRAGMENT

v-if/v-for 外部的静态结构：

```vue
<template>
  <div>Static</div>
  <div>{{ dynamic }}</div>
</template>
```

编译为：

```javascript
export function render(_ctx) {
  return (_openBlock(), _createElementBlock(_Fragment, null, [
    _createElementVNode("div", null, "Static"),
    _createElementVNode("div", null, _toDisplayString(_ctx.dynamic), 1 /* TEXT */)
  ], 64 /* STABLE_FRAGMENT */))
}
```

结构稳定时只需更新动态子节点。

## KEYED_FRAGMENT

v-for 带 key：

```vue
<template>
  <div v-for="item in list" :key="item.id">{{ item.text }}</div>
</template>
```

编译为：

```javascript
export function render(_ctx) {
  return (_openBlock(true), _createElementBlock(_Fragment, null, 
    _renderList(_ctx.list, (item) => {
      return (_openBlock(), _createElementBlock("div", {
        key: item.id
      }, _toDisplayString(item.text), 1))
    }), 
    128 /* KEYED_FRAGMENT */
  ))
}
```

## UNKEYED_FRAGMENT

v-for 无 key：

```vue
<template>
  <div v-for="item in list">{{ item.text }}</div>
</template>
```

编译为 256 (UNKEYED_FRAGMENT)，使用就地复用策略。

## Fragment 的卸载

```typescript
const unmount = (
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  doRemove: boolean = false,
  optimized: boolean = false
) => {
  const { type, children, anchor, shapeFlag, transition } = vnode

  // Fragment 需要递归卸载子节点
  if (type === Fragment) {
    if (doRemove) {
      // 移除开始锚点
      hostRemove(vnode.el!)
    }
    // 卸载所有子节点
    unmountChildren(
      children as VNode[],
      parentComponent,
      parentSuspense,
      doRemove,
      optimized
    )
    if (doRemove) {
      // 移除结束锚点
      hostRemove(anchor!)
    }
    return
  }
  // ...
}
```

## 嵌套 Fragment

Fragment 可以嵌套：

```javascript
h(Fragment, [
  h(Fragment, [
    h('div', 'a'),
    h('div', 'b')
  ]),
  h('div', 'c')
])
```

渲染器会正确处理嵌套结构。

## v-if 的 Fragment

```vue
<template>
  <template v-if="show">
    <div>A</div>
    <div>B</div>
  </template>
</template>
```

编译为条件 Fragment：

```javascript
export function render(_ctx) {
  return (_ctx.show)
    ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
        _createElementVNode("div", null, "A"),
        _createElementVNode("div", null, "B")
      ]))
    : _createCommentVNode("v-if", true)
}
```

## 与组件的关系

组件返回 Fragment：

```vue
<script setup>
</script>

<template>
  <header />
  <main />
</template>
```

组件的 render 结果被包装为 Fragment，组件实例的 el 指向第一个子元素。

## 小结

Fragment 的核心要点：

1. **多根支持**：允许组件有多个根节点
2. **锚点定位**：使用两个文本节点标记边界
3. **优化标记**：通过 patchFlag 区分不同更新策略
4. **透明容器**：不产生额外 DOM 元素
5. **嵌套处理**：正确处理嵌套 Fragment

Fragment 是 Vue 3 编译优化的重要基础。

下一章将分析静态节点和注释节点的处理。
