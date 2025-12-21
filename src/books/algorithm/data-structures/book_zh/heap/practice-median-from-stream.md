# 实战：数据流的中位数

设计一个数据结构，支持动态添加数字并随时获取中位数。这是堆的经典应用之一。

---

## 问题描述

**LeetCode 295. Find Median from Data Stream**

实现 MedianFinder 类：
- `addNum(num)`：添加一个整数
- `findMedian()`：返回当前所有元素的中位数

中位数是有序整数列表中间的数。如果列表长度是偶数，中位数是中间两个数的平均值。

**示例**：
```
输入：
["MedianFinder", "addNum", "addNum", "findMedian", "addNum", "findMedian"]
[[], [1], [2], [], [3], []]

输出：[null, null, null, 1.5, null, 2.0]

解释：
MedianFinder medianFinder = new MedianFinder();
medianFinder.addNum(1);    // arr = [1]
medianFinder.addNum(2);    // arr = [1, 2]
medianFinder.findMedian(); // 返回 1.5 ((1 + 2) / 2)
medianFinder.addNum(3);    // arr = [1, 2, 3]
medianFinder.findMedian(); // 返回 2.0
```

**约束条件**：
- `-10^5 <= num <= 10^5`
- 最多调用 `addNum` 和 `findMedian` 各 `5 * 10^4` 次

---

## 问题分析

### 暴力方法

- 每次 `addNum` 后排序：O(n log n) / 次
- 或者插入到正确位置：O(n) / 次

这两种方法都太慢，需要更高效的数据结构。

### 核心洞察

中位数将数组分成两半：
- 左半部分：所有比中位数小（或等于）的数
- 右半部分：所有比中位数大（或等于）的数

如果我们能快速获取：
- 左半部分的**最大值**
- 右半部分的**最小值**

那么中位数就在这两个值之间！

**解决方案**：用两个堆
- **最大堆**：存储左半部分，堆顶是左半部分的最大值
- **最小堆**：存储右半部分，堆顶是右半部分的最小值

---

## 数据结构设计

```
数据流：[1, 2, 3, 4, 5]

存储结构：
  最大堆（左半部分）     最小堆（右半部分）
       [2, 1]                [3, 4, 5]
         ↑                      ↑
     堆顶 = 2               堆顶 = 3

中位数在 2 和 3 之间
- 奇数个元素：取较大堆的堆顶
- 偶数个元素：两个堆顶的平均值
```

**平衡策略**：
- 最大堆大小 = 最小堆大小（偶数个元素）
- 最大堆大小 = 最小堆大小 + 1（奇数个元素）

---

## 解法

```javascript
class MedianFinder {
  constructor() {
    // 最大堆：存储较小的一半（左半部分）
    this.maxHeap = new MaxHeap();
    // 最小堆：存储较大的一半（右半部分）
    this.minHeap = new MinHeap();
  }
  
  addNum(num) {
    // 步骤1：先加入最大堆（左半部分）
    this.maxHeap.insert(num);
    
    // 步骤2：把最大堆的最大值移到最小堆
    // 这确保了左半部分的所有值都 <= 右半部分
    this.minHeap.insert(this.maxHeap.extract());
    
    // 步骤3：平衡两个堆的大小
    // 确保 maxHeap.size >= minHeap.size
    if (this.minHeap.size() > this.maxHeap.size()) {
      this.maxHeap.insert(this.minHeap.extract());
    }
  }
  
  findMedian() {
    if (this.maxHeap.size() > this.minHeap.size()) {
      // 奇数个元素，中位数在最大堆堆顶
      return this.maxHeap.peek();
    }
    // 偶数个元素，中位数是两个堆顶的平均值
    return (this.maxHeap.peek() + this.minHeap.peek()) / 2;
  }
}
```

---

## 执行过程详解

```
操作序列：addNum(1), addNum(2), findMedian(), addNum(3), findMedian()

【addNum(1)】
  Step 1: maxHeap.insert(1) → maxHeap = [1]
  Step 2: 移动到 minHeap → maxHeap = [], minHeap = [1]
  Step 3: minHeap 更大，平衡 → maxHeap = [1], minHeap = []

【addNum(2)】
  Step 1: maxHeap.insert(2) → maxHeap = [2, 1]
  Step 2: 移动堆顶到 minHeap → maxHeap = [1], minHeap = [2]
  Step 3: 大小相等，不需要平衡

【findMedian()】
  maxHeap.size == minHeap.size（偶数个）
  返回 (1 + 2) / 2 = 1.5

【addNum(3)】
  Step 1: maxHeap.insert(3) → maxHeap = [3, 1]
  Step 2: 移动堆顶到 minHeap → maxHeap = [1], minHeap = [2, 3]
  Step 3: minHeap 更大，平衡 → maxHeap = [2, 1], minHeap = [3]

【findMedian()】
  maxHeap.size > minHeap.size（奇数个）
  返回 maxHeap.peek() = 2
```

**可视化**：

```
添加 1:      添加 2:      添加 3:
  [1]          [1]          [2]
   |            |            |
maxHeap      maxHeap      maxHeap
               |            |
   []         [2]          [3]
               |            |
            minHeap      minHeap

中位数:1     中位数:1.5   中位数:2
```

---

## 为什么这样设计？

**问题**：为什么不直接用一个堆？

**回答**：单个堆只能快速获取最大值或最小值，无法直接获取中位数。

**问题**：为什么 addNum 要经过三步？

**回答**：
1. **先加入 maxHeap**：确保新元素参与左半部分的比较
2. **移动到 minHeap**：确保 maxHeap 的所有元素 ≤ minHeap 的所有元素
3. **平衡大小**：确保中位数总是可以从堆顶获取

这三步组合保证了两个**不变量**：
- `maxHeap` 的所有元素 ≤ `minHeap` 的所有元素
- `maxHeap.size()` ≥ `minHeap.size()` 且差值最多为 1

---

## 复杂度分析

- `addNum`：O(log n)
  - 三次堆操作，每次 O(log n)
- `findMedian`：O(1)
  - 只访问堆顶
- 空间：O(n)
  - 存储所有 n 个元素

---

## 边界情况

```javascript
// 测试用例
const mf = new MedianFinder();

// 单个元素
mf.addNum(5);
mf.findMedian();  // 5

// 两个元素
mf.addNum(3);
mf.findMedian();  // (3 + 5) / 2 = 4

// 负数
mf.addNum(-1);
mf.findMedian();  // 3

// 重复元素
mf.addNum(3);
mf.findMedian();  // (3 + 3) / 2 = 3
```

---

## 常见错误

### 1. 堆的类型搞反

```javascript
// ❌ 错误：左半部分用最小堆
this.minHeap = new MinHeap();  // 左半部分
this.maxHeap = new MaxHeap();  // 右半部分

// ✅ 正确：左半部分用最大堆（要获取最大值）
this.maxHeap = new MaxHeap();  // 左半部分
this.minHeap = new MinHeap();  // 右半部分
```

### 2. 平衡逻辑错误

```javascript
// ❌ 错误：平衡方向搞反
if (this.maxHeap.size() > this.minHeap.size() + 1) {
  this.minHeap.insert(this.maxHeap.extract());
}

// ✅ 正确：根据设计，应该是 minHeap 给 maxHeap
if (this.minHeap.size() > this.maxHeap.size()) {
  this.maxHeap.insert(this.minHeap.extract());
}
```

### 3. 忘记处理堆为空的情况

```javascript
// ❌ 可能出错：堆为空时 peek 返回 undefined
return (this.maxHeap.peek() + this.minHeap.peek()) / 2;

// ✅ 安全：确保至少有一个元素
// 题目保证了至少有一个元素才会调用 findMedian
```

---

## 进阶思考

### 如果数据流中 99% 的元素都在某个范围内？

可以用**桶 + 堆**的混合策略：
- 常见范围内的数用桶计数
- 极端值用堆存储

### 如果需要支持删除操作？

可以用**延迟删除**的技巧：
- 用一个 Map 记录待删除的元素
- 每次访问堆顶时，如果堆顶在待删除集合中，就弹出

---

## 相关题目

| 题目 | 难度 | 关联点 |
|------|------|--------|
| [480. 滑动窗口中位数](https://leetcode.cn/problems/sliding-window-median/) | 困难 | 需要支持删除 |
| [703. 数据流中的第 K 大元素](https://leetcode.cn/problems/kth-largest-element-in-a-stream/) | 简单 | 单堆问题 |
| [1825. 求出 MK 平均值](https://leetcode.cn/problems/finding-mk-average/) | 困难 | 多堆 + 窗口 |

---

## 小结

本题展示了**双堆**技巧的经典应用：

1. **问题分解**：把求中位数分解为求两个"边界值"
2. **数据结构选择**：用两个堆分别维护左右两半
3. **不变量维护**：通过三步操作保持堆的性质

**核心技巧**：
- 最大堆存左半部分，最小堆存右半部分
- 每次插入后保持平衡
- 中位数从堆顶直接获取

这种双堆技巧还可以扩展到其他问题，如滑动窗口中位数、动态排名统计等。
