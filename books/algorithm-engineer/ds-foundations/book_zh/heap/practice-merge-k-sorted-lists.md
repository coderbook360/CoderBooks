# 实战：合并 K 个升序链表（堆解法）

使用最小堆来高效合并 K 个有序链表。这是一道经典的多路归并问题。

---

## 问题描述

**LeetCode 23. Merge K Sorted Lists**

给你一个链表数组，每个链表都已经按升序排列。请你将所有链表合并到一个升序链表中。

**示例 1**：
```
输入：lists = [[1,4,5],[1,3,4],[2,6]]
输出：[1,1,2,3,4,4,5,6]
```

**示例 2**：
```
输入：lists = []
输出：[]
```

**示例 3**：
```
输入：lists = [[]]
输出：[]
```

**约束条件**：
- `k == lists.length`
- `0 <= k <= 10^4`
- `0 <= lists[i].length <= 500`
- `-10^4 <= lists[i][j] <= 10^4`
- 所有 `lists[i]` 都按升序排列

---

## 思路分析

### 暴力方法

每次从 k 个链表头中找最小的节点，需要比较 k 次。

- 总节点数 n，每个节点都要比较 k 次
- 时间复杂度：O(nk)

### 堆优化思路

**关键洞察**：用最小堆快速找到 k 个链表头中的最小值。

算法流程：
1. 把 k 个链表的头节点加入最小堆
2. 每次取出堆顶（最小节点），加入结果链表
3. 如果该节点有下一个节点，把下一个节点加入堆
4. 重复直到堆为空

---

## 解法

```javascript
function mergeKLists(lists) {
  // 过滤空链表
  if (!lists || lists.length === 0) return null;
  
  // 最小堆，按节点值比较
  const heap = new MinHeap((a, b) => a.val - b.val);
  
  // 把所有链表头加入堆
  for (const head of lists) {
    if (head) heap.insert(head);
  }
  
  // 虚拟头节点，简化边界处理
  const dummy = new ListNode(0);
  let current = dummy;
  
  while (heap.size() > 0) {
    // 取出值最小的节点
    const node = heap.extract();
    
    // 加入结果链表
    current.next = node;
    current = current.next;
    
    // 如果该节点有后续，把后续加入堆
    if (node.next) {
      heap.insert(node.next);
    }
  }
  
  return dummy.next;
}
```

---

## 执行过程可视化

```
lists = [[1,4,5], [1,3,4], [2,6]]

初始状态：
  链表0: 1 → 4 → 5
  链表1: 1 → 3 → 4
  链表2: 2 → 6

Step 0: 初始化堆
  堆 = [1(链表0), 1(链表1), 2(链表2)]
  结果: dummy →

Step 1: 取出 1(链表0)
  加入其后继 4 到堆
  堆 = [1(链表1), 2(链表2), 4(链表0)]
  结果: dummy → 1

Step 2: 取出 1(链表1)
  加入其后继 3 到堆
  堆 = [2(链表2), 3(链表1), 4(链表0)]
  结果: dummy → 1 → 1

Step 3: 取出 2(链表2)
  加入其后继 6 到堆
  堆 = [3(链表1), 4(链表0), 6(链表2)]
  结果: dummy → 1 → 1 → 2

Step 4: 取出 3(链表1)
  加入其后继 4 到堆
  堆 = [4(链表0), 4(链表1), 6(链表2)]
  结果: dummy → 1 → 1 → 2 → 3

Step 5: 取出 4(链表0)
  加入其后继 5 到堆
  堆 = [4(链表1), 5(链表0), 6(链表2)]
  结果: dummy → 1 → 1 → 2 → 3 → 4

Step 6: 取出 4(链表1)
  无后继
  堆 = [5(链表0), 6(链表2)]
  结果: dummy → 1 → 1 → 2 → 3 → 4 → 4

Step 7: 取出 5(链表0)
  无后继
  堆 = [6(链表2)]
  结果: dummy → 1 → 1 → 2 → 3 → 4 → 4 → 5

Step 8: 取出 6(链表2)
  无后继
  堆 = []
  结果: dummy → 1 → 1 → 2 → 3 → 4 → 4 → 5 → 6

最终输出: [1,1,2,3,4,4,5,6]
```

---

## 复杂度分析

设 n 是所有节点总数，k 是链表个数：

**时间复杂度：O(n log k)**
- 每个节点入堆出堆各一次
- 堆的大小最多为 k
- 每次操作 O(log k)

**空间复杂度：O(k)**
- 堆最多存储 k 个节点

---

## 其他解法对比

| 方法 | 时间 | 空间 | 特点 |
|------|------|------|------|
| 暴力比较 | O(nk) | O(1) | 每次遍历所有链表头 |
| 最小堆 | O(n log k) | O(k) | 推荐，代码简洁 |
| 分治合并 | O(n log k) | O(log k) | 递归栈空间 |
| 两两合并 | O(nk) | O(1) | 不推荐，时间复杂度高 |

---

## 分治解法（补充）

另一种 O(n log k) 的解法是分治：

```javascript
function mergeKLists(lists) {
  if (!lists || lists.length === 0) return null;
  return mergeLists(lists, 0, lists.length - 1);
}

function mergeLists(lists, left, right) {
  if (left === right) return lists[left];
  
  const mid = Math.floor((left + right) / 2);
  const l1 = mergeLists(lists, left, mid);
  const l2 = mergeLists(lists, mid + 1, right);
  
  return mergeTwoLists(l1, l2);
}

function mergeTwoLists(l1, l2) {
  const dummy = new ListNode(0);
  let current = dummy;
  
  while (l1 && l2) {
    if (l1.val <= l2.val) {
      current.next = l1;
      l1 = l1.next;
    } else {
      current.next = l2;
      l2 = l2.next;
    }
    current = current.next;
  }
  
  current.next = l1 || l2;
  return dummy.next;
}
```

---

## 边界情况

```javascript
// 测试用例
mergeKLists([]);                    // 空数组 → null
mergeKLists([[]]);                  // 单个空链表 → null
mergeKLists([[1]]);                 // 单个单元素链表 → [1]
mergeKLists([[1], [2], [3]]);       // 多个单元素链表 → [1,2,3]
mergeKLists([[1,2], null, [3,4]]);  // 含 null 的数组 → [1,2,3,4]
```

---

## 常见错误

### 1. 忘记处理空链表

```javascript
// ❌ 错误：直接遍历添加
for (const head of lists) {
  heap.insert(head);  // head 可能是 null
}

// ✅ 正确：过滤空链表
for (const head of lists) {
  if (head) heap.insert(head);
}
```

### 2. 堆的比较函数错误

```javascript
// ❌ 错误：比较节点本身而非值
const heap = new MinHeap((a, b) => a - b);

// ✅ 正确：比较节点的 val 属性
const heap = new MinHeap((a, b) => a.val - b.val);
```

### 3. 忘记移动 current 指针

```javascript
// ❌ 错误：忘记移动
current.next = node;
// current 没有移动，下一个节点会覆盖当前

// ✅ 正确：移动 current
current.next = node;
current = current.next;
```

---

## 应用场景

1. **外部排序**：多个有序文件合并
2. **多路归并**：Map-Reduce 中的 Reduce 阶段
3. **日志合并**：多个有序日志流合并成一个
4. **实时数据流**：多个有序数据源的合并

---

## 相关题目

| 题目 | 难度 | 关联点 |
|------|------|--------|
| [21. 合并两个有序链表](https://leetcode.cn/problems/merge-two-sorted-lists/) | 简单 | 基础版本 |
| [88. 合并两个有序数组](https://leetcode.cn/problems/merge-sorted-array/) | 简单 | 数组版本 |
| [378. 有序矩阵中第K小的元素](https://leetcode.cn/problems/kth-smallest-element-in-a-sorted-matrix/) | 中等 | 多路归并变体 |

---

## 小结

本题是多路归并问题的经典代表：

1. **问题本质**：从 k 个有序序列中不断选择最小元素
2. **堆的作用**：快速找到 k 个候选中的最小值，时间 O(log k)
3. **推广意义**：掌握此题后，可以解决各种多路归并场景

**关键技巧**：
- 堆中存储的是**节点引用**，不是值
- 取出节点后，将其**后继节点**加入堆
- 使用 dummy 节点简化边界处理
