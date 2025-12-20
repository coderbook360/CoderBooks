# 简单 Diff 算法

上一章我们了解了 Diff 算法的核心思想：通过比较新旧虐拟 DOM，找出最小的更新路径。现在让我们从最简单的实现开始——简单 Diff 算法。

**虽然 Vue 3 并未采用这种策略，但理解它是理解后续算法的基础——就像学排序要先学冒泡排序一样。** 简单 Diff 的思路直观、易于实现，能帮我们建立 Diff 算法的基本思维框架。

## 核心思想

简单 Diff 的策略非常直接：

1. 遍历新列表的每个节点
2. 在旧列表中查找具有相同 key 的节点
3. 如果找到，复用并决定是否移动
4. 如果没找到，创建新节点
5. 最后移除旧列表中多余的节点

问题来了：如何判断一个节点是否需要移动？

## lastIndex 策略

这里引入一个关键概念：**lastIndex**——记录上一个复用节点在旧列表中的索引。

核心逻辑：如果当前复用节点在旧列表中的索引**小于** lastIndex，说明它相对于上一个复用节点的位置"后退"了，需要移动。

让我们通过一个例子理解这个策略：

```
旧列表: A(索引0)  B(索引1)  C(索引2)
新列表: C         B         A

遍历新列表：
Step 1: 处理 C
  - C 在旧列表的索引 = 2
  - lastIndex = 0（初始值）
  - 2 > 0，不需要移动
  - 更新 lastIndex = 2

Step 2: 处理 B
  - B 在旧列表的索引 = 1
  - lastIndex = 2
  - 1 < 2，需要移动！
  - 将 B 移动到 C 的后面

Step 3: 处理 A
  - A 在旧列表的索引 = 0
  - lastIndex = 2
  - 0 < 2，需要移动！
  - 将 A 移动到 B 的后面

结果：C → B → A（完成 2 次移动）
```

为什么这个策略有效？思考一下：如果遍历新列表时，旧索引始终递增，说明这些节点的相对顺序没变，无需移动。一旦出现递减，就意味着某个节点需要移动。

## 完整实现

理解了核心思想，让我们实现完整的简单 Diff 算法：

```javascript
function patchKeyedChildren(c1, c2, container) {
  let lastIndex = 0
  
  // 阶段一：遍历新列表，查找可复用节点
  for (let i = 0; i < c2.length; i++) {
    const newVNode = c2[i]
    let find = false
    
    // 在旧列表中查找相同 key 的节点
    for (let j = 0; j < c1.length; j++) {
      const oldVNode = c1[j]
      
      if (newVNode.key === oldVNode.key) {
        find = true
        // 复用节点：更新 props 和 children
        patch(oldVNode, newVNode, container)
        
        if (j < lastIndex) {
          // 需要移动：当前节点的旧索引小于 lastIndex
          // 将节点移动到前一个新节点的后面
          const prevVNode = c2[i - 1]
          if (prevVNode) {
            const anchor = prevVNode.el.nextSibling
            insert(newVNode.el, container, anchor)
          }
        } else {
          // 不需要移动：更新 lastIndex
          lastIndex = j
        }
        break
      }
    }
    
    // 阶段二：处理新增节点
    if (!find) {
      const prevVNode = c2[i - 1]
      let anchor
      
      if (prevVNode) {
        // 插入到前一个节点的后面
        anchor = prevVNode.el.nextSibling
      } else {
        // 作为第一个子节点插入
        anchor = container.firstChild
      }
      
      mount(newVNode, container, anchor)
    }
  }
  
  // 阶段三：移除多余的旧节点
  for (let i = 0; i < c1.length; i++) {
    const oldVNode = c1[i]
    const stillExists = c2.find(n => n.key === oldVNode.key)
    
    if (!stillExists) {
      unmount(oldVNode)
    }
  }
}
```

代码分为三个阶段：

1. **查找复用**：遍历新列表，在旧列表中查找可复用节点，决定是否移动
2. **新增节点**：处理新列表中新增的节点
3. **删除节点**：移除旧列表中不再需要的节点

## 图解执行过程

让我们用一个完整的例子来追踪算法的执行：

```
初始状态:
  DOM: p-1[A] → p-2[B] → p-3[C]
  
  旧列表: [{ key: 'p-1' }, { key: 'p-2' }, { key: 'p-3' }]
  新列表: [{ key: 'p-3' }, { key: 'p-2' }, { key: 'p-1' }]

Step 1: 处理 p-3
  - 在旧列表找到 p-3，旧索引 = 2
  - lastIndex = 0
  - 2 > 0，不移动
  - lastIndex = 2
  - patch(oldVNode, newVNode) 更新内容
  
  DOM: p-1[A] → p-2[B] → p-3[C]  (不变)

Step 2: 处理 p-2
  - 在旧列表找到 p-2，旧索引 = 1
  - lastIndex = 2
  - 1 < 2，需要移动！
  - 移动到 p-3 后面（c2[0].el.nextSibling）
  
  DOM: p-1[A] → p-3[C] → p-2[B]

Step 3: 处理 p-1
  - 在旧列表找到 p-1，旧索引 = 0
  - lastIndex = 2
  - 0 < 2，需要移动！
  - 移动到 p-2 后面（c2[1].el.nextSibling）
  
  DOM: p-3[C] → p-2[B] → p-1[A]

结果：2 次移动操作完成列表逆序
```

## 简单 Diff 的局限性

简单 Diff 实现简单，但在某些场景下效率不够理想。考虑这个例子：

```
旧列表: [A, B, C, D]
新列表: [D, A, B, C]

简单 Diff 执行：
Step 1: D
  - 旧索引 = 3, lastIndex = 0
  - 3 > 0，不移动
  - lastIndex = 3

Step 2: A
  - 旧索引 = 0, lastIndex = 3
  - 0 < 3，移动 A 到 D 后面

Step 3: B
  - 旧索引 = 1, lastIndex = 3
  - 1 < 3，移动 B 到 A 后面

Step 4: C
  - 旧索引 = 2, lastIndex = 3
  - 2 < 3，移动 C 到 B 后面

总计：3 次移动
```

但如果仔细观察，最优解只需要 **1 次移动**——把 D 移动到最前面即可！

```
最优方案：
  [A, B, C, D] → 将 D 移动到开头 → [D, A, B, C]
  
  总计：1 次移动
```

问题出在哪里？简单 Diff 的 lastIndex 策略是"顺序敏感"的——第一个处理的节点决定了后续的移动策略。如果第一个节点恰好是"最不应该动"的（D 在旧列表末尾），就会导致后续所有节点都需要移动。

这正是双端 Diff 和快速 Diff 要解决的问题。

## 复杂度分析

**时间复杂度**：O(n²)

简单 Diff 使用了两层循环：外层遍历新列表，内层在旧列表中查找。如果列表长度为 n，最坏情况下需要 n × n 次比较。

可以优化吗？可以。提前构建 key → index 的映射：

```javascript
// 优化版本：使用 Map 加速查找
function patchKeyedChildrenOptimized(c1, c2, container) {
  // O(n) 构建映射
  const oldKeyToIdx = new Map()
  c1.forEach((vnode, index) => {
    if (vnode.key != null) {
      oldKeyToIdx.set(vnode.key, index)
    }
  })
  
  let lastIndex = 0
  
  for (let i = 0; i < c2.length; i++) {
    const newVNode = c2[i]
    // O(1) 查找
    const oldIndex = oldKeyToIdx.get(newVNode.key)
    
    if (oldIndex !== undefined) {
      patch(c1[oldIndex], newVNode, container)
      
      if (oldIndex < lastIndex) {
        // 移动逻辑...
      } else {
        lastIndex = oldIndex
      }
    } else {
      // 新增逻辑...
    }
  }
  
  // 删除逻辑...
}
```

使用 Map 后，查找复杂度从 O(n) 降到 O(1)，整体复杂度降到 O(n)。

**空间复杂度**：O(n)

需要 Map 存储 key → index 映射，额外空间与列表长度成正比。

## 本章小结

本章实现了简单 Diff 算法：

- **核心策略**：遍历新列表，在旧列表中查找可复用节点
- **移动判断**：使用 lastIndex 标记，索引递减则需要移动
- **三个阶段**：查找复用、新增节点、删除节点
- **局限性**：对首部插入等场景效率不够理想

简单 Diff 的价值在于建立了 Diff 算法的基本框架。它清晰地展示了"查找-复用-移动"的核心流程。

但它的 lastIndex 策略有明显的局限：第一个处理的节点对后续决策影响太大。我们需要一种更智能的策略——这就是双端 Diff 要解决的问题。

下一章，我们将看到双端 Diff 如何通过"从两端同时比较"来优化移动策略。
