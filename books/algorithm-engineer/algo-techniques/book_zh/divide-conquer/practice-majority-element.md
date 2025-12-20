# 实战：多数元素

> LeetCode 169. 多数元素 | 难度：简单

这道题展示了分治思想的另一种应用：利用多数元素的性质进行递归。

---

## 问题描述

给定数组 `nums`，找到出现次数超过 `⌊n/2⌋` 的元素。

**示例**：
```
输入：[3,2,3]
输出：3

输入：[2,2,1,1,1,2,2]
输出：2
```

**假设**：多数元素一定存在。

---

## 方法一：哈希表（最直观）

```typescript
function majorityElement(nums: number[]): number {
  const count = new Map<number, number>();
  
  for (const num of nums) {
    count.set(num, (count.get(num) || 0) + 1);
    if (count.get(num)! > nums.length / 2) {
      return num;
    }
  }
  
  return -1;  // 不会到这里
}
```

**时间**：O(n)，**空间**：O(n)

---

## 方法二：排序（巧妙）

```typescript
function majorityElement(nums: number[]): number {
  nums.sort((a, b) => a - b);
  return nums[Math.floor(nums.length / 2)];
}
```

**为什么可行？**

因为多数元素出现次数 > n/2，所以排序后中间位置一定是多数元素。

```
[2,2,1,1,1,2,2] → 排序 → [1,1,1,2,2,2,2]
                            ↑
                         中间位置
```

**时间**：O(n log n)，**空间**：O(1)

---

## 方法三：分治（最优雅）

**核心思想**：
- 如果 `a` 是数组的多数元素
- 则 `a` 至少是左半部分或右半部分的多数元素

```typescript
function majorityElement(nums: number[]): number {
  function divideConquer(left: number, right: number): number {
    // 基础情况
    if (left === right) {
      return nums[left];
    }
    
    const mid = Math.floor((left + right) / 2);
    
    // 递归找左右两部分的多数元素
    const leftMajor = divideConquer(left, mid);
    const rightMajor = divideConquer(mid + 1, right);
    
    // 如果左右相同，直接返回
    if (leftMajor === rightMajor) {
      return leftMajor;
    }
    
    // 否则，统计两者在整个范围内的出现次数
    const leftCount = countInRange(nums, leftMajor, left, right);
    const rightCount = countInRange(nums, rightMajor, left, right);
    
    return leftCount > rightCount ? leftMajor : rightMajor;
  }
  
  function countInRange(nums: number[], target: number, left: number, right: number): number {
    let count = 0;
    for (let i = left; i <= right; i++) {
      if (nums[i] === target) count++;
    }
    return count;
  }
  
  return divideConquer(0, nums.length - 1);
}
```

---

## 执行过程示例

```
[2,2,1,1,1,2,2]
      ↓
左: [2,2,1,1]  右: [1,2,2]
  ↓              ↓
[2,2] [1,1]   [1] [2,2]
 ↓     ↓       ↓    ↓
 2     1       1    2
```

**合并过程**：
1. `[2,2]` → 2
2. `[1,1]` → 1
3. 合并 `[2,2,1,1]`：2出现2次，1出现2次 → 平局（但实际会选一个）
4. `[1]` → 1
5. `[2,2]` → 2
6. 合并 `[1,2,2]`：1出现1次，2出现2次 → 2
7. 最终合并：2出现4次，1出现3次 → 2

---

## 方法四：摩尔投票（最优）

```typescript
function majorityElement(nums: number[]): number {
  let candidate = nums[0];
  let count = 1;
  
  for (let i = 1; i < nums.length; i++) {
    if (count === 0) {
      candidate = nums[i];
      count = 1;
    } else if (nums[i] === candidate) {
      count++;
    } else {
      count--;
    }
  }
  
  return candidate;
}
```

**直觉**：多数元素的票数一定能抵消其他所有元素。

**时间**：O(n)，**空间**：O(1) — **最优解**！

---

## 方法对比

| 方法 | 时间 | 空间 | 特点 |
|-----|------|------|-----|
| **哈希表** | O(n) | O(n) | 最直观 |
| **排序** | O(n log n) | O(1) | 巧妙利用性质 |
| **分治** | O(n log n) | O(log n) | 优雅但非最优 |
| **摩尔投票** | O(n) | O(1) | **最优解** |

---

## 分治的价值

虽然分治不是这道题的最优解，但它展示了：
1. **分治思维**：将问题分解为子问题
2. **信息传递**：从子问题合并信息
3. **性质利用**：多数元素的传递性

---

## 扩展：多数元素 II

> LeetCode 229：找出所有出现次数 > n/3 的元素

**关键**：最多有 2 个这样的元素。

```typescript
function majorityElement(nums: number[]): number[] {
  let candidate1 = 0, candidate2 = 0;
  let count1 = 0, count2 = 0;
  
  // 第一遍：找候选者
  for (const num of nums) {
    if (num === candidate1) {
      count1++;
    } else if (num === candidate2) {
      count2++;
    } else if (count1 === 0) {
      candidate1 = num;
      count1 = 1;
    } else if (count2 === 0) {
      candidate2 = num;
      count2 = 1;
    } else {
      count1--;
      count2--;
    }
  }
  
  // 第二遍：验证候选者
  count1 = count2 = 0;
  for (const num of nums) {
    if (num === candidate1) count1++;
    else if (num === candidate2) count2++;
  }
  
  const result: number[] = [];
  if (count1 > nums.length / 3) result.push(candidate1);
  if (count2 > nums.length / 3) result.push(candidate2);
  
  return result;
}
```

---

## 关键要点

1. **多解法对比**：理解不同方法的权衡
2. **分治思维**：多数元素的传递性
3. **摩尔投票**：最优解，O(n) 时间 O(1) 空间
4. **扩展问题**：n/3 情况下的双候选者
