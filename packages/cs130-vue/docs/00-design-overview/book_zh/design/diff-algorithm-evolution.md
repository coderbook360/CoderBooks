# Diff 算法的演进与选择

虚拟 DOM 的核心价值在于通过 Diff 算法找出新旧节点树的差异，实现最小化的真实 DOM 更新。Vue3 在 Diff 算法上做出了关键的演进，既吸收了前人的智慧，又针对实际场景进行了创新优化。

## 传统 Diff 算法的困境

最朴素的树比较算法复杂度为 O(n³)，对于稍大的节点树来说完全不可接受。React 首先提出了同层比较的策略，将复杂度降低到 O(n)，但代价是放弃了跨层级移动节点的检测能力。这个权衡在实践中被证明是合理的——跨层级移动节点在真实应用中极为罕见。

Vue2 采用的是双端比较算法，通过维护新旧节点列表的头尾四个指针，在常见场景下能够高效地识别节点移动。

```javascript
// Vue2 双端比较的核心思路
function updateChildren(oldCh, newCh) {
  let oldStartIdx = 0
  let oldEndIdx = oldCh.length - 1
  let newStartIdx = 0
  let newEndIdx = newCh.length - 1

  let oldStartVnode = oldCh[oldStartIdx]
  let oldEndVnode = oldCh[oldEndIdx]
  let newStartVnode = newCh[newStartIdx]
  let newEndVnode = newCh[newEndIdx]

  while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
    if (sameVnode(oldStartVnode, newStartVnode)) {
      // 头头比较
      patchVnode(oldStartVnode, newStartVnode)
      oldStartVnode = oldCh[++oldStartIdx]
      newStartVnode = newCh[++newStartIdx]
    } else if (sameVnode(oldEndVnode, newEndVnode)) {
      // 尾尾比较
      patchVnode(oldEndVnode, newEndVnode)
      oldEndVnode = oldCh[--oldEndIdx]
      newEndVnode = newCh[--newEndIdx]
    } else if (sameVnode(oldStartVnode, newEndVnode)) {
      // 头尾比较
      patchVnode(oldStartVnode, newEndVnode)
      // 移动节点
      insertBefore(parentElm, oldStartVnode.elm, nextSibling(oldEndVnode.elm))
      oldStartVnode = oldCh[++oldStartIdx]
      newEndVnode = newCh[--newEndIdx]
    } else if (sameVnode(oldEndVnode, newStartVnode)) {
      // 尾头比较
      patchVnode(oldEndVnode, newStartVnode)
      insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm)
      oldEndVnode = oldCh[--oldEndIdx]
      newStartVnode = newCh[++newStartIdx]
    } else {
      // 需要通过 key 查找
      // ...
    }
  }
}
```

双端比较在处理列表首尾操作时非常高效，但在复杂的节点移动场景下可能需要额外的查找开销。

## Vue3 的快速 Diff 算法

Vue3 引入了快速 Diff 算法，这个算法借鉴了 ivi 和 inferno 等高性能框架的思路，在保持良好可读性的同时实现了更优的性能。

快速 Diff 算法的核心策略是先处理简单情况，再处理复杂情况。算法首先从两端向中间扫描，处理相同的前置和后置节点，这一步能够覆盖大部分实际场景。

```javascript
function patchKeyedChildren(n1, n2, container) {
  const oldChildren = n1.children
  const newChildren = n2.children

  // 第一步：处理前置相同节点
  let i = 0
  let e1 = oldChildren.length - 1
  let e2 = newChildren.length - 1

  while (i <= e1 && i <= e2) {
    const n1 = oldChildren[i]
    const n2 = newChildren[i]
    if (isSameVNodeType(n1, n2)) {
      patch(n1, n2, container)
    } else {
      break
    }
    i++
  }

  // 第二步：处理后置相同节点
  while (i <= e1 && i <= e2) {
    const n1 = oldChildren[e1]
    const n2 = newChildren[e2]
    if (isSameVNodeType(n1, n2)) {
      patch(n1, n2, container)
    } else {
      break
    }
    e1--
    e2--
  }

  // 第三步：处理剩余情况
  if (i > e1) {
    // 旧节点已处理完，有新节点需要挂载
    while (i <= e2) {
      const anchor = newChildren[e2 + 1]?.el
      patch(null, newChildren[i], container, anchor)
      i++
    }
  } else if (i > e2) {
    // 新节点已处理完，有旧节点需要卸载
    while (i <= e1) {
      unmount(oldChildren[i])
      i++
    }
  } else {
    // 中间部分需要复杂处理
    patchKeyedMiddle(oldChildren, newChildren, i, e1, e2, container)
  }
}
```

当前置和后置节点处理完毕后，如果仍有未处理的节点，算法会进入复杂处理阶段。这个阶段的核心是构建最长递增子序列（Longest Increasing Subsequence，LIS）来最小化 DOM 移动操作。

## 最长递增子序列的应用

最长递增子序列是一个经典的算法问题，在 Diff 中的应用思路是：找出新节点序列中不需要移动的最长子序列，只移动其他节点。

```javascript
function patchKeyedMiddle(oldCh, newCh, i, e1, e2, container) {
  const s1 = i
  const s2 = i

  // 构建新节点的 key 到 index 映射
  const keyToNewIndexMap = new Map()
  for (let j = s2; j <= e2; j++) {
    const nextChild = newCh[j]
    if (nextChild.key != null) {
      keyToNewIndexMap.set(nextChild.key, j)
    }
  }

  const toBePatched = e2 - s2 + 1
  const newIndexToOldIndexMap = new Array(toBePatched).fill(0)
  let moved = false
  let maxNewIndexSoFar = 0
  let patched = 0

  // 遍历旧节点，尝试复用
  for (let j = s1; j <= e1; j++) {
    const prevChild = oldCh[j]

    if (patched >= toBePatched) {
      // 新节点已全部处理，剩余旧节点删除
      unmount(prevChild)
      continue
    }

    const newIndex = keyToNewIndexMap.get(prevChild.key)

    if (newIndex === undefined) {
      // 旧节点在新列表中不存在
      unmount(prevChild)
    } else {
      // 记录新旧索引映射
      newIndexToOldIndexMap[newIndex - s2] = j + 1

      // 检测是否需要移动
      if (newIndex >= maxNewIndexSoFar) {
        maxNewIndexSoFar = newIndex
      } else {
        moved = true
      }

      patch(prevChild, newCh[newIndex], container)
      patched++
    }
  }

  // 只有在需要移动时才计算 LIS
  if (moved) {
    const increasingNewIndexSequence = getSequence(newIndexToOldIndexMap)
    let j = increasingNewIndexSequence.length - 1

    // 倒序遍历，确保锚点正确
    for (let k = toBePatched - 1; k >= 0; k--) {
      const nextIndex = s2 + k
      const nextChild = newCh[nextIndex]
      const anchor = nextIndex + 1 < newCh.length ? newCh[nextIndex + 1].el : null

      if (newIndexToOldIndexMap[k] === 0) {
        // 新节点，需要挂载
        patch(null, nextChild, container, anchor)
      } else if (moved) {
        if (j < 0 || k !== increasingNewIndexSequence[j]) {
          // 不在递增子序列中，需要移动
          move(nextChild, container, anchor)
        } else {
          j--
        }
      }
    }
  }
}
```

LIS 算法的复杂度为 O(n log n)，但只在确实需要移动节点时才会执行，这是一个重要的优化策略。

## 为什么不用其他算法

社区中存在多种 Diff 算法的变体，每种都有其权衡。

**简单 Diff**：直接遍历比较，实现简单但性能较差，适合小规模列表。

**双端 Diff**：Vue2 的选择，在首尾操作场景下高效，但中间节点处理需要额外查找。

**快速 Diff**：Vue3 的选择，通过 LIS 优化移动操作，在各种场景下都有稳定表现。

**Inferno 的 Diff**：更激进的优化策略，但代码复杂度较高。

Vue3 选择快速 Diff 的考量是多方面的：性能在各场景下都足够优秀；代码相对清晰，便于维护和调试；与 Vue3 的其他优化（如 Block Tree、PatchFlags）能够良好配合。

## 与编译时优化的协同

Vue3 的 Diff 算法并非孤立存在，而是与编译时优化紧密配合。通过 PatchFlags，运行时能够知道哪些节点是动态的、动态的部分是什么，从而跳过静态节点的比较。通过 Block Tree，运行时能够直接定位到动态节点，避免递归遍历整棵树。

```javascript
// 带有 PatchFlags 的 VNode
const vnode = {
  type: 'div',
  children: 'Hello, ' + name,
  patchFlag: PatchFlags.TEXT,  // 只有文本是动态的
  dynamicChildren: [...]       // Block 收集的动态子节点
}

// Diff 时可以利用 patchFlag
function patchElement(n1, n2) {
  const el = n2.el = n1.el
  const patchFlag = n2.patchFlag

  if (patchFlag & PatchFlags.TEXT) {
    // 只更新文本
    if (n1.children !== n2.children) {
      hostSetElementText(el, n2.children)
    }
  }
  // 无需比较静态属性
}
```

这种编译时与运行时的协同，使得 Vue3 的 Diff 在保持算法通用性的同时，能够在具体场景下获得接近手写命令式代码的性能。

## 设计权衡的反思

Diff 算法的选择本质上是多个维度的权衡：时间复杂度、空间复杂度、实现复杂度、与框架其他部分的配合程度。Vue3 的选择体现了实用主义的工程思维——不追求理论上的最优，而是追求实践中的最佳平衡。

快速 Diff 算法的分层处理策略也值得借鉴：先用简单逻辑处理大多数情况，再用复杂逻辑处理边缘情况。这种策略在保证最坏情况性能的同时，让常见情况获得最优性能。
