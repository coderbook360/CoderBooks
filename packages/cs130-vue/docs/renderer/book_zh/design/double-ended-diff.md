# 双端对比算法

双端对比是 Virtual DOM Diff 的经典算法。这一章分析其原理和实现。

## 算法思想

双端对比从数组的两端同时进行比较，而不是只从一端顺序比较。这样可以更高效地处理常见的列表操作：头部插入、尾部追加、整体翻转等。

假设有两个数组：
- 旧：`[a, b, c, d]`
- 新：`[d, a, b, c]`

如果只从头部顺序比较，会发现所有位置都不匹配。但双端比较可以发现：旧数组尾部的 `d` 与新数组头部的 `d` 是同一个节点，只需要移动它。

## 四个指针

双端对比使用四个指针：

```javascript
let oldStartIdx = 0
let oldEndIdx = oldChildren.length - 1
let newStartIdx = 0
let newEndIdx = newChildren.length - 1

let oldStartVNode = oldChildren[oldStartIdx]
let oldEndVNode = oldChildren[oldEndIdx]
let newStartVNode = newChildren[newStartIdx]
let newEndVNode = newChildren[newEndIdx]
```

## 比较顺序

每轮循环按以下顺序尝试比较：

**情况 1：旧头 vs 新头**

```javascript
if (isSameVNode(oldStartVNode, newStartVNode)) {
  // 头部节点相同，patch 后指针右移
  patch(oldStartVNode, newStartVNode, container)
  oldStartVNode = oldChildren[++oldStartIdx]
  newStartVNode = newChildren[++newStartIdx]
}
```

**情况 2：旧尾 vs 新尾**

```javascript
else if (isSameVNode(oldEndVNode, newEndVNode)) {
  // 尾部节点相同，patch 后指针左移
  patch(oldEndVNode, newEndVNode, container)
  oldEndVNode = oldChildren[--oldEndIdx]
  newEndVNode = newChildren[--newEndIdx]
}
```

**情况 3：旧头 vs 新尾**

```javascript
else if (isSameVNode(oldStartVNode, newEndVNode)) {
  // 旧头匹配新尾，需要移动
  patch(oldStartVNode, newEndVNode, container)
  // 将旧头移动到旧尾之后
  insert(oldStartVNode.el, container, oldEndVNode.el.nextSibling)
  oldStartVNode = oldChildren[++oldStartIdx]
  newEndVNode = newChildren[--newEndIdx]
}
```

**情况 4：旧尾 vs 新头**

```javascript
else if (isSameVNode(oldEndVNode, newStartVNode)) {
  // 旧尾匹配新头，需要移动
  patch(oldEndVNode, newStartVNode, container)
  // 将旧尾移动到旧头之前
  insert(oldEndVNode.el, container, oldStartVNode.el)
  oldEndVNode = oldChildren[--oldEndIdx]
  newStartVNode = newChildren[++newStartIdx]
}
```

**情况 5：非理想情况**

如果以上四种情况都不匹配，需要在旧数组中查找与新头匹配的节点：

```javascript
else {
  // 在旧数组中查找新头
  const idxInOld = oldChildren.findIndex(
    vnode => vnode && isSameVNode(vnode, newStartVNode)
  )
  
  if (idxInOld >= 0) {
    // 找到了，移动到最前面
    const vnodeToMove = oldChildren[idxInOld]
    patch(vnodeToMove, newStartVNode, container)
    insert(vnodeToMove.el, container, oldStartVNode.el)
    // 标记为已处理
    oldChildren[idxInOld] = undefined
  } else {
    // 没找到，是新节点，直接挂载
    mount(newStartVNode, container, oldStartVNode.el)
  }
  
  newStartVNode = newChildren[++newStartIdx]
}
```

## 循环结束条件

当 `oldStartIdx > oldEndIdx` 或 `newStartIdx > newEndIdx` 时循环结束。

```javascript
while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
  // 双端对比逻辑
}
```

## 处理剩余节点

循环结束后，可能还有未处理的节点：

**新数组有剩余**：这些是新增节点，需要挂载。

```javascript
if (oldStartIdx > oldEndIdx) {
  // 新数组还有剩余，挂载
  while (newStartIdx <= newEndIdx) {
    const anchor = newChildren[newEndIdx + 1]?.el || null
    mount(newChildren[newStartIdx++], container, anchor)
  }
}
```

**旧数组有剩余**：这些节点需要卸载。

```javascript
if (newStartIdx > newEndIdx) {
  // 旧数组有剩余，卸载
  while (oldStartIdx <= oldEndIdx) {
    if (oldChildren[oldStartIdx]) {
      unmount(oldChildren[oldStartIdx])
    }
    oldStartIdx++
  }
}
```

## 完整实现

```javascript
function patchKeyedChildren(c1, c2, container) {
  let oldStartIdx = 0
  let oldEndIdx = c1.length - 1
  let newStartIdx = 0
  let newEndIdx = c2.length - 1
  
  let oldStartVNode = c1[oldStartIdx]
  let oldEndVNode = c1[oldEndIdx]
  let newStartVNode = c2[newStartIdx]
  let newEndVNode = c2[newEndIdx]
  
  while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
    // 跳过已处理的 undefined
    if (!oldStartVNode) {
      oldStartVNode = c1[++oldStartIdx]
    } else if (!oldEndVNode) {
      oldEndVNode = c1[--oldEndIdx]
    }
    // 四种理想情况
    else if (isSameVNode(oldStartVNode, newStartVNode)) {
      patch(oldStartVNode, newStartVNode, container)
      oldStartVNode = c1[++oldStartIdx]
      newStartVNode = c2[++newStartIdx]
    } else if (isSameVNode(oldEndVNode, newEndVNode)) {
      patch(oldEndVNode, newEndVNode, container)
      oldEndVNode = c1[--oldEndIdx]
      newEndVNode = c2[--newEndIdx]
    } else if (isSameVNode(oldStartVNode, newEndVNode)) {
      patch(oldStartVNode, newEndVNode, container)
      insert(oldStartVNode.el, container, oldEndVNode.el.nextSibling)
      oldStartVNode = c1[++oldStartIdx]
      newEndVNode = c2[--newEndIdx]
    } else if (isSameVNode(oldEndVNode, newStartVNode)) {
      patch(oldEndVNode, newStartVNode, container)
      insert(oldEndVNode.el, container, oldStartVNode.el)
      oldEndVNode = c1[--oldEndIdx]
      newStartVNode = c2[++newStartIdx]
    }
    // 非理想情况
    else {
      const idxInOld = c1.findIndex(
        (vnode, i) => vnode && i >= oldStartIdx && i <= oldEndIdx && 
                      isSameVNode(vnode, newStartVNode)
      )
      
      if (idxInOld >= 0) {
        const vnodeToMove = c1[idxInOld]
        patch(vnodeToMove, newStartVNode, container)
        insert(vnodeToMove.el, container, oldStartVNode.el)
        c1[idxInOld] = undefined
      } else {
        mount(newStartVNode, container, oldStartVNode.el)
      }
      
      newStartVNode = c2[++newStartIdx]
    }
  }
  
  // 处理剩余
  if (oldStartIdx > oldEndIdx) {
    while (newStartIdx <= newEndIdx) {
      mount(c2[newStartIdx++], container, c2[newEndIdx + 1]?.el)
    }
  } else if (newStartIdx > newEndIdx) {
    while (oldStartIdx <= oldEndIdx) {
      if (c1[oldStartIdx]) unmount(c1[oldStartIdx])
      oldStartIdx++
    }
  }
}
```

## 算法复杂度

双端对比的平均时间复杂度是 O(n)，但在非理想情况下的 findIndex 查找是 O(n)，最坏情况可能达到 O(n²)。

Vue 3 对此进行了优化：使用 key 到索引的 Map 来加速查找，并结合最长递增子序列减少移动次数。

## Vue 2 vs Vue 3

Vue 2 使用的就是双端对比算法。Vue 3 改用了快速 Diff 算法，先处理公共前缀和后缀，再对中间部分使用 LIS（最长递增子序列）优化移动顺序。

下一章我们将分析最长递增子序列算法的原理和应用。
