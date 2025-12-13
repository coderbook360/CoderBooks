# 双端 Diff 算法

上一章我们看到简单 Diff 的局限：处理 `[A,B,C,D] → [D,A,B,C]` 时需要 3 次移动，而最优解只需 1 次。问题在于 lastIndex 策略"顺序敏感"——第一个处理的节点决定了后续决策。

**双端 Diff 采用了不同的思路**：**同时从两端进行比较**，利用实际场景中列表变化往往发生在两端的特点。这正是 Vue 2 采用的 Diff 策略，**理解它能帮助你更好地理解 Vue 3 的快速 Diff**。

## 核心思想

双端 Diff 使用四个指针，分别指向新旧列表的头和尾：

```
旧列表: [A, B, C, D]
         ↑        ↑
      oldStart  oldEnd

新列表: [D, A, B, C]
         ↑        ↑
      newStart  newEnd
```

每轮循环进行四次比较，按顺序尝试命中：

1. **头头比较**：oldStart vs newStart
2. **尾尾比较**：oldEnd vs newEnd
3. **头尾比较**：oldStart vs newEnd
4. **尾头比较**：oldEnd vs newStart

一旦命中，处理对应节点，移动指针，进入下一轮。

为什么这样更优？因为它能识别出"首部/尾部不变"或"首尾交换"等常见场景，直接命中而无需遍历查找。

## 四种命中情况

让我们详细分析每种命中情况：

**情况一：头头命中**

```
旧: [A, B, C]    新: [A, X, Y]
     ↑               ↑
  oldStart        newStart
  
A === A，命中！
→ patch 更新 A
→ 两个 start 指针右移
```

头头命中意味着列表首部元素不变，无需移动，只需更新内容。

**情况二：尾尾命中**

```
旧: [X, Y, C]    新: [A, B, C]
           ↑              ↑
        oldEnd         newEnd
        
C === C，命中！
→ patch 更新 C
→ 两个 end 指针左移
```

尾尾命中意味着列表尾部元素不变，同样无需移动。

**情况三：头尾命中（旧头 = 新尾）**

```
旧: [A, B, C]    新: [X, Y, A]
     ↑                    ↑
  oldStart             newEnd
  
A === A，命中！
→ patch 更新 A
→ 将 A 移动到当前旧列表尾部的后面
→ oldStart 右移，newEnd 左移
```

这意味着某个元素从头部移动到了尾部。

**情况四：尾头命中（旧尾 = 新头）**

```
旧: [A, B, C]    新: [C, X, Y]
           ↑         ↑
        oldEnd    newStart
        
C === C，命中！
→ patch 更新 C
→ 将 C 移动到当前旧列表头部的前面
→ oldEnd 左移，newStart 右移
```

这意味着某个元素从尾部移动到了头部。

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
    // 跳过已处理的节点（undefined 标记）
    if (!oldStartVNode) {
      oldStartVNode = c1[++oldStartIdx]
    } else if (!oldEndVNode) {
      oldEndVNode = c1[--oldEndIdx]
    }
    // 情况一：头头命中
    else if (oldStartVNode.key === newStartVNode.key) {
      patch(oldStartVNode, newStartVNode, container)
      oldStartVNode = c1[++oldStartIdx]
      newStartVNode = c2[++newStartIdx]
    }
    // 情况二：尾尾命中
    else if (oldEndVNode.key === newEndVNode.key) {
      patch(oldEndVNode, newEndVNode, container)
      oldEndVNode = c1[--oldEndIdx]
      newEndVNode = c2[--newEndIdx]
    }
    // 情况三：头尾命中
    else if (oldStartVNode.key === newEndVNode.key) {
      patch(oldStartVNode, newEndVNode, container)
      // 将旧头移动到旧尾后面
      insert(oldStartVNode.el, container, oldEndVNode.el.nextSibling)
      oldStartVNode = c1[++oldStartIdx]
      newEndVNode = c2[--newEndIdx]
    }
    // 情况四：尾头命中
    else if (oldEndVNode.key === newStartVNode.key) {
      patch(oldEndVNode, newStartVNode, container)
      // 将旧尾移动到旧头前面
      insert(oldEndVNode.el, container, oldStartVNode.el)
      oldEndVNode = c1[--oldEndIdx]
      newStartVNode = c2[++newStartIdx]
    }
    // 非理想情况：四次比较都未命中
    else {
      // 在旧列表中查找 newStartVNode
      const idxInOld = findIndex(c1, newStartVNode.key, oldStartIdx, oldEndIdx)
      
      if (idxInOld > -1) {
        // 找到可复用节点
        const vnodeToMove = c1[idxInOld]
        patch(vnodeToMove, newStartVNode, container)
        // 移动到旧头前面
        insert(vnodeToMove.el, container, oldStartVNode.el)
        // 标记为已处理
        c1[idxInOld] = undefined
      } else {
        // 未找到，创建新节点
        mount(newStartVNode, container, oldStartVNode.el)
      }
      newStartVNode = c2[++newStartIdx]
    }
  }
  
  // 处理剩余节点
  if (oldStartIdx > oldEndIdx) {
    // 旧列表已遍历完，新列表有剩余 → 新增
    for (let i = newStartIdx; i <= newEndIdx; i++) {
      const anchor = c2[newEndIdx + 1] ? c2[newEndIdx + 1].el : null
      mount(c2[i], container, anchor)
    }
  } else if (newStartIdx > newEndIdx) {
    // 新列表已遍历完，旧列表有剩余 → 删除
    for (let i = oldStartIdx; i <= oldEndIdx; i++) {
      if (c1[i]) {
        unmount(c1[i])
      }
    }
  }
}

function findIndex(list, key, start, end) {
  for (let i = start; i <= end; i++) {
    if (list[i] && list[i].key === key) {
      return i
    }
  }
  return -1
}
```

## 图解执行过程

让我们用之前的"难题"来验证双端 Diff 的效果：

```
旧列表: [A, B, C, D]
新列表: [D, A, B, C]

初始状态:
  oldStart=0, oldEnd=3
  newStart=0, newEnd=3
  
Round 1:
  头头: A vs D ✗
  尾尾: D vs C ✗
  头尾: A vs C ✗
  尾头: D vs D ✓ 命中！
  
  → patch(D, D)
  → 将 D 移动到 A 前面
  → oldEnd=2, newStart=1
  
  DOM: D → A → B → C

Round 2:
  头头: A vs A ✓ 命中！
  
  → patch(A, A)
  → 无需移动
  → oldStart=1, newStart=2
  
  DOM: D → A → B → C (不变)

Round 3:
  头头: B vs B ✓ 命中！
  
  → patch(B, B)
  → 无需移动
  → oldStart=2, newStart=3
  
  DOM: D → A → B → C (不变)

Round 4:
  头头: C vs C ✓ 命中！
  
  → patch(C, C)
  → 无需移动
  → oldStart=3, newStart=4
  
  DOM: D → A → B → C (不变)

循环结束：oldStart(3) > oldEnd(2)
结果：仅 1 次移动操作！
```

对比简单 Diff 的 3 次移动，双端 Diff 只需 1 次！关键在于第一轮的"尾头命中"直接识别出 D 从尾部移动到了头部。

## 非理想情况处理

当四次比较都未命中时，需要在旧列表中查找 newStart 节点：

```
旧列表: [A, B, C, D]
新列表: [B, D, A, C]

Round 1:
  头头: A vs B ✗
  尾尾: D vs C ✗
  头尾: A vs C ✗
  尾头: D vs B ✗
  
  四次都未命中！
  
  → 在旧列表 [A,B,C,D] 中查找 B
  → 找到 B 在索引 1
  → patch(B, B)
  → 将 B 移动到 A 前面
  → 标记 c1[1] = undefined
  → newStart=1
  
  DOM: B → A → C → D
  旧列表变为: [A, undefined, C, D]
```

标记 `undefined` 的作用是避免重复处理已移动的节点。后续循环会跳过这些位置。

## 新增和删除的处理

循环结束后，可能还有剩余节点需要处理：

```javascript
// 情况一：旧列表先遍历完 → 新列表有新增节点
if (oldStartIdx > oldEndIdx) {
  // 旧: [A, B]     →  处理完毕
  // 新: [A, B, C, D] →  C、D 需要新增
  for (let i = newStartIdx; i <= newEndIdx; i++) {
    mount(c2[i], container, anchor)
  }
}

// 情况二：新列表先遍历完 → 旧列表有多余节点
else if (newStartIdx > newEndIdx) {
  // 旧: [A, B, C, D] →  C、D 需要删除
  // 新: [A, B]       →  处理完毕
  for (let i = oldStartIdx; i <= oldEndIdx; i++) {
    if (c1[i]) {
      unmount(c1[i])
    }
  }
}
```

## 复杂度分析

**时间复杂度**：O(n)

最好情况下，所有节点都能通过四次比较命中，每轮处理一个节点。

最坏情况下，每轮都需要遍历查找，退化到 O(n²)。但可以通过构建 key → index 的 Map 优化到 O(n)。

**空间复杂度**：O(1) 或 O(n)

如果不使用 Map 优化查找，只需要常数级别的指针变量。使用 Map 则需要 O(n) 额外空间。

## 双端 Diff 的优势与局限

**优势**：
- 利用列表变化往往发生在两端的特点
- 头头/尾尾命中无需移动
- 头尾/尾头命中能识别交换场景

**局限**：
- 非理想情况仍需遍历查找
- 移动策略不是最优——仍可能存在更少移动的方案

思考一下：有没有办法找出**真正**不需要移动的节点？

这就是 Vue 3 快速 Diff 的核心思想——使用**最长递增子序列**（LIS）来确定哪些节点保持相对顺序不变，从而实现最少移动。

## 本章小结

本章实现了双端 Diff 算法：

- **核心策略**：四个指针同时从两端比较
- **四种命中**：头头、尾尾、头尾、尾头
- **非理想情况**：遍历查找 + undefined 标记
- **优势**：高效处理首尾变化场景
- **局限**：非理想情况效率下降，移动不一定最优

双端 Diff 是 Vue 2 的选择，已经比简单 Diff 优秀很多。但 Vue 3 更进一步，采用了快速 Diff 算法。

下一章，我们将深入快速 Diff——看看如何通过预处理和最长递增子序列实现真正的最小移动。
