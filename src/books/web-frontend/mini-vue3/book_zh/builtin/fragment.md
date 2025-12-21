# Fragment 实现

Vue 2 要求组件必须有单个根元素。**Vue 3 打破了这个限制，组件可以有多个根节点。** 这是如何实现的？

**理解 Fragment，你就能明白 Vue 3 为什么更灵活。** 本章将分析 Fragment 的实现原理。

## 问题：单根限制

Vue 2 中：

```vue
<!-- ❌ Vue 2 报错 -->
<template>
  <header>...</header>
  <main>...</main>
  <footer>...</footer>
</template>

<!-- ✅ 必须包裹 -->
<template>
  <div>
    <header>...</header>
    <main>...</main>
    <footer>...</footer>
  </div>
</template>
```

问题：多余的包裹元素可能影响 CSS 布局。

Vue 3 中：

```vue
<!-- ✅ Vue 3 支持多根节点 -->
<template>
  <header>...</header>
  <main>...</main>
  <footer>...</footer>
</template>
```

## Fragment 是什么

Fragment 是一种特殊的 VNode 类型，表示"一组节点"：

```javascript
const Fragment = Symbol(__DEV__ ? 'Fragment' : undefined)

// 多根节点编译为 Fragment
h(Fragment, null, [
  h('header', ...),
  h('main', ...),
  h('footer', ...)
])
```

Fragment 本身不渲染任何 DOM 元素，只是其子节点的容器。

## Fragment VNode 结构

```javascript
function createVNode(type, props, children) {
  // Fragment VNode
  {
    type: Fragment,
    props: null,
    children: [
      /* 子 VNode 数组 */
    ],
    shapeFlag: ShapeFlags.FRAGMENT,
    el: null,       // 开始锚点
    anchor: null,   // 结束锚点
    patchFlag: PatchFlags.STABLE_FRAGMENT
  }
}
```

关键属性：
- `type: Fragment`：标识这是 Fragment
- `children`：子节点数组
- `el`：开始位置的锚点（注释节点）
- `anchor`：结束位置的锚点（注释节点）

## Fragment 的 PatchFlags

```javascript
const PatchFlags = {
  STABLE_FRAGMENT: 64,      // 静态 Fragment
  KEYED_FRAGMENT: 128,      // 带 key 的 v-for
  UNKEYED_FRAGMENT: 256     // 无 key 的 v-for
}
```

不同类型的 Fragment 使用不同的 Diff 策略。

## 锚点系统

Fragment 没有对应的 DOM 元素，如何确定其位置？

答案：使用注释节点作为锚点。

```html
<!-- 渲染结果 -->
<!--[-->        <!-- Fragment 开始锚点 -->
<header>...</header>
<main>...</main>
<footer>...</footer>
<!--]-->        <!-- Fragment 结束锚点 -->
```

锚点作用：
1. 标记 Fragment 的边界
2. 作为插入和移动的参考点
3. 支持多个相邻 Fragment

## 挂载 Fragment

```javascript
function processFragment(n1, n2, container, anchor, parentComponent,
                         parentSuspense, isSVG, slotScopeIds, optimized) {
  // 创建锚点
  const fragmentStartAnchor = n2.el = n1 
    ? n1.el 
    : hostCreateText('')
  const fragmentEndAnchor = n2.anchor = n1
    ? n1.anchor
    : hostCreateText('')
  
  if (n1 == null) {
    // 挂载锚点
    hostInsert(fragmentStartAnchor, container, anchor)
    hostInsert(fragmentEndAnchor, container, anchor)
    
    // 挂载子节点
    mountChildren(
      n2.children,
      container,
      fragmentEndAnchor,  // 插入到结束锚点之前
      parentComponent,
      parentSuspense,
      isSVG,
      slotScopeIds,
      optimized
    )
  } else {
    // 更新...
  }
}
```

挂载流程：
1. 插入开始锚点
2. 插入结束锚点
3. 在两个锚点之间挂载子节点

## 更新 Fragment

```javascript
function processFragment(n1, n2, container, anchor, ...) {
  if (n1 == null) {
    // 挂载...
  } else {
    // 复用锚点
    n2.el = n1.el
    n2.anchor = n1.anchor
    
    const { patchFlag } = n2
    
    if (patchFlag & PatchFlags.KEYED_FRAGMENT) {
      // 带 key 的 v-for，使用 keyed diff
      patchKeyedChildren(
        n1.children,
        n2.children,
        container,
        fragmentEndAnchor,
        parentComponent,
        parentSuspense,
        isSVG,
        slotScopeIds,
        optimized
      )
    } else if (patchFlag & PatchFlags.UNKEYED_FRAGMENT) {
      // 无 key 的 v-for
      patchUnkeyedChildren(
        n1.children,
        n2.children,
        container,
        fragmentEndAnchor,
        parentComponent,
        parentSuspense,
        isSVG,
        slotScopeIds,
        optimized
      )
    } else {
      // 普通 Fragment
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

## 卸载 Fragment

```javascript
function unmount(vnode, parentComponent, parentSuspense, doRemove) {
  const { type, children, anchor } = vnode
  
  if (type === Fragment) {
    // 移除开始锚点
    if (doRemove) {
      hostRemove(vnode.el)
    }
    
    // 卸载所有子节点
    unmountChildren(children, parentComponent, parentSuspense, doRemove)
    
    // 移除结束锚点
    if (doRemove) {
      hostRemove(anchor)
    }
  }
}
```

## v-for 与 Fragment

v-for 编译为 Fragment：

```vue
<template v-for="item in items" :key="item.id">
  <div>{{ item.name }}</div>
  <span>{{ item.value }}</span>
</template>
```

编译结果：

```javascript
h(Fragment, { key: item.id }, [
  h('div', item.name),
  h('span', item.value)
])
```

每次迭代产生一个 Fragment，包含多个子节点。

## 多个相邻 Fragment

```vue
<template v-if="showA">
  <header>A Header</header>
  <main>A Main</main>
</template>
<template v-else>
  <header>B Header</header>
  <main>B Main</main>
</template>
```

两个 Fragment 相邻，锚点帮助区分它们的边界：

```html
<!--[-->        <!-- Fragment A 开始 -->
<header>A Header</header>
<main>A Main</main>
<!--]-->        <!-- Fragment A 结束 -->
<!--[-->        <!-- Fragment B 开始 -->
<header>B Header</header>
<main>B Main</main>
<!--]-->        <!-- Fragment B 结束 -->
```

## 移动 Fragment

移动 Fragment 需要移动其所有子节点：

```javascript
function move(vnode, container, anchor, moveType) {
  const { el, type, children } = vnode
  
  if (type === Fragment) {
    // 移动开始锚点
    hostInsert(el, container, anchor)
    
    // 移动所有子节点
    for (let i = 0; i < children.length; i++) {
      move(children[i], container, anchor, moveType)
    }
    
    // 移动结束锚点
    hostInsert(vnode.anchor, container, anchor)
    return
  }
  
  // 普通元素
  hostInsert(el, container, anchor)
}
```

## 获取 Fragment 的下一个兄弟

```javascript
function getNextHostNode(vnode) {
  if (vnode.type === Fragment) {
    // Fragment 的下一个兄弟是结束锚点的下一个兄弟
    return hostNextSibling(vnode.anchor)
  }
  
  return hostNextSibling(vnode.el)
}
```

## 本章小结

本章分析了 Fragment 的实现：

- **解决问题**：打破 Vue 2 的单根限制
- **VNode 结构**：type 为 Fragment Symbol
- **锚点系统**：使用注释节点标记边界
- **PatchFlags**：区分 KEYED/UNKEYED/STABLE Fragment
- **挂载**：插入锚点，挂载子节点
- **更新**：根据 patchFlag 选择 Diff 策略
- **移动**：移动锚点和所有子节点

Fragment 是 Vue 3 的重要改进，它让模板结构更灵活，避免了不必要的包裹元素。

至此，我们完成了内置组件的分析。下一部分，我们将深入编译器——Vue 3 如何将模板编译为渲染函数。
