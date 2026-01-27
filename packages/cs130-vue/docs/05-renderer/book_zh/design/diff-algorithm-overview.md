# Diff 算法概述

Diff 算法是 Virtual DOM 的核心。这一章概述 Vue 3 Diff 算法的设计思想和核心策略。

## Diff 的本质

Diff 算法解决的问题是：给定两棵 VNode 树（旧的和新的），找出最小的 DOM 操作序列，将旧 DOM 转换为新 DOM。

理论上，两棵任意树的完全 Diff 是 O(n³) 复杂度，这在实际应用中不可接受。因此，所有前端框架的 Diff 算法都基于一些实践假设来降低复杂度。

## Vue 的 Diff 策略

Vue 的 Diff 算法基于以下假设和策略：

**同层比较**。只比较同一层级的节点，不跨层级比较。当节点跨层级移动时，视为删除旧节点、创建新节点。这个假设在实际应用中很少违反，因为组件结构通常是稳定的。

**类型相同才比较**。如果两个节点类型不同，直接替换整棵子树，不继续深入比较。例如 `div` 变成 `span`，直接卸载旧 `div`，挂载新 `span`。

**key 标识同一节点**。通过 `key` 属性识别节点身份。相同 key 的节点被认为是同一个节点，可以复用和移动，而非销毁重建。

这些策略将复杂度降低到 O(n)，n 是节点数量。

## Patch 流程

Vue 的 Diff 在 `patch` 函数中进行。patch 比较新旧 VNode，决定如何更新 DOM：

```javascript
function patch(n1, n2, container) {
  // n1 是旧 VNode，n2 是新 VNode
  
  // 类型不同，直接替换
  if (n1 && !isSameVNodeType(n1, n2)) {
    unmount(n1)
    n1 = null
  }
  
  const { shapeFlag } = n2
  
  // 根据节点类型分发处理
  if (shapeFlag & ShapeFlags.ELEMENT) {
    processElement(n1, n2, container)
  } else if (shapeFlag & ShapeFlags.COMPONENT) {
    processComponent(n1, n2, container)
  }
  // ... 其他类型
}
```

如果 `n1` 为空，说明是首次渲染，执行挂载。如果 `n1` 存在，说明是更新，执行 Diff。

## 元素 Diff

元素的 Diff 分为属性比较和子节点比较：

```javascript
function patchElement(n1, n2) {
  const el = n2.el = n1.el  // 复用 DOM 元素
  
  // 比较属性
  patchProps(el, n1.props, n2.props)
  
  // 比较子节点
  patchChildren(n1, n2, el)
}
```

属性比较利用 PatchFlags 优化，只比较动态属性。子节点比较是 Diff 算法的核心难点。

## 子节点 Diff

子节点有三种情况：文本、数组、空。需要处理所有可能的新旧组合：

```javascript
function patchChildren(n1, n2, container) {
  const c1 = n1.children
  const c2 = n2.children
  const prevShapeFlag = n1.shapeFlag
  const shapeFlag = n2.shapeFlag
  
  // 新子节点是文本
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // 旧的是数组，卸载所有旧子节点
      unmountChildren(c1)
    }
    if (c1 !== c2) {
      // 设置新文本
      container.textContent = c2
    }
  } else {
    // 新子节点是数组或空
    if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 新旧都是数组，核心 Diff
        patchKeyedChildren(c1, c2, container)
      } else {
        // 新的为空，卸载旧子节点
        unmountChildren(c1)
      }
    } else {
      // 旧的是文本或空
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        container.textContent = ''
      }
      if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        mountChildren(c2, container)
      }
    }
  }
}
```

## 数组子节点 Diff

当新旧子节点都是数组时，需要执行核心的 Diff 算法。Vue 3 采用的是快速 Diff 算法，结合了双端比较和最长递增子序列。

核心步骤如下：

**前置处理**：从头部开始比较，相同类型的节点直接 patch。

```javascript
// 从头部开始
while (i <= e1 && i <= e2) {
  const n1 = c1[i]
  const n2 = c2[i]
  if (isSameVNodeType(n1, n2)) {
    patch(n1, n2, container)
  } else {
    break
  }
  i++
}
```

**后置处理**：从尾部开始比较，相同类型的节点直接 patch。

```javascript
// 从尾部开始
while (i <= e1 && i <= e2) {
  const n1 = c1[e1]
  const n2 = c2[e2]
  if (isSameVNodeType(n1, n2)) {
    patch(n1, n2, container)
  } else {
    break
  }
  e1--
  e2--
}
```

**处理特殊情况**：前后处理后，可能出现简单的新增或删除情况。

**核心 Diff**：剩余的中间部分，使用最长递增子序列算法最小化移动操作。

## Vue 3 vs Vue 2 的 Diff

Vue 2 使用双端对比算法，从两端向中间比较。Vue 3 改进了算法，先处理公共前缀和后缀，再对中间乱序部分使用最长递增子序列。

这种改进在大多数实际场景下更高效，因为列表的变化通常只涉及少量节点，公共前缀和后缀往往很长。

## Key 的重要性

没有 `key` 时，Vue 只能按索引比较，无法识别节点移动：

```javascript
// 旧：[A, B, C]
// 新：[C, A, B]
// 无 key：比较 A-C、B-A、C-B，全部需要更新内容
// 有 key：识别出 C 移动到最前，A、B 不变
```

使用稳定的 `key`（如 id）让 Diff 算法能够正确识别节点身份，最大化复用。

## 后续章节预告

接下来的章节将深入 Diff 算法的具体实现：

- 双端对比算法的原理
- 最长递增子序列算法
- Block Tree 如何优化 Diff
- Vue 3 快速 Diff 的完整流程

这些内容将帮助你理解 Vue 渲染器如何高效地更新 DOM。
