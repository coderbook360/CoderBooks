# 实战：K 个不同整数的子数组

> LeetCode 992. K 个不同整数的子数组 | 难度：困难

这道题展示了一个重要技巧：**恰好 k 个 = 最多 k 个 - 最多 (k-1) 个**。

---

## 题目描述

给定一个正整数数组 `nums` 和一个整数 `k`，返回 `nums` 中**恰好**有 k 个不同整数的子数组的个数。

**示例**：
```
输入：nums = [1, 2, 1, 2, 3], k = 2
输出：7
解释：恰好有 2 种不同整数的子数组：
[1,2], [2,1], [1,2], [2,3], [1,2,1], [2,1,2], [1,2,1,2]

输入：nums = [1, 2, 1, 3, 4], k = 3
输出：3
解释：[1,2,1,3], [2,1,3], [1,3,4]
```

---

## 思路分析

### 为什么直接滑动窗口困难？

如果我们维护一个"恰好 k 种"的窗口：
- 种类少于 k：扩展右边界
- 种类等于 k：？收缩还是扩展？
- 种类大于 k：收缩左边界

问题在于"种类等于 k"时，收缩和扩展的边界很难把握。

### 转化技巧

```
恰好 k 种 = 最多 k 种 - 最多 (k-1) 种
```

而"最多 k 种"是标准的滑动窗口问题，每次扩展后统计以 right 结尾的有效子数组数量。

---

## 代码实现

```typescript
function subarraysWithKDistinct(nums: number[], k: number): number {
  return atMostK(nums, k) - atMostK(nums, k - 1);
}

// 最多包含 k 种不同整数的子数组个数
function atMostK(nums: number[], k: number): number {
  const map = new Map<number, number>();
  let left = 0;
  let count = 0;
  
  for (let right = 0; right < nums.length; right++) {
    const num = nums[right];
    map.set(num, (map.get(num) || 0) + 1);
    
    // 种类超过 k，收缩
    while (map.size > k) {
      const leftNum = nums[left];
      map.set(leftNum, map.get(leftNum)! - 1);
      if (map.get(leftNum) === 0) {
        map.delete(leftNum);
      }
      left++;
    }
    
    // 以 right 结尾、满足条件的子数组个数
    count += right - left + 1;
  }
  
  return count;
}
```

---

## 为什么 count += right - left + 1？

以 right 结尾、起点在 [left, right] 范围内的子数组都满足"最多 k 种"：

```
left              right
  ↓                 ↓
  [a, b, c, d, e]

有效子数组：
- [left, right]     = [a, b, c, d, e]
- [left+1, right]   = [b, c, d, e]
- [left+2, right]   = [c, d, e]
- ...
- [right, right]    = [e]

共 right - left + 1 个
```

---

## 执行过程可视化

```
nums = [1, 2, 1, 2, 3], k = 2

atMostK(nums, 2) 的执行：

right=0, num=1:
  map = {1: 1}, size=1 <= 2
  count = 0 + 1 = 1
  子数组：[1]

right=1, num=2:
  map = {1: 1, 2: 1}, size=2 <= 2
  count = 1 + 2 = 3
  子数组：[1,2], [2]

right=2, num=1:
  map = {1: 2, 2: 1}, size=2 <= 2
  count = 3 + 3 = 6
  子数组：[1,2,1], [2,1], [1]

right=3, num=2:
  map = {1: 2, 2: 2}, size=2 <= 2
  count = 6 + 4 = 10
  子数组：[1,2,1,2], [2,1,2], [1,2], [2]

right=4, num=3:
  map = {1: 2, 2: 2, 3: 1}, size=3 > 2
  收缩 left=0: map = {1: 1, 2: 2, 3: 1}, size=3
  收缩 left=1: map = {1: 1, 2: 1, 3: 1}, size=3
  收缩 left=2: map = {2: 1, 3: 1}, size=2 <= 2
  count = 10 + 2 = 12
  子数组：[2,3], [3]

atMostK(nums, 2) = 12
```

```
atMostK(nums, 1) 的执行：

只有连续相同元素或单个元素的子数组
[1], [2], [1], [2], [3] → 5 个

atMostK(nums, 1) = 5
```

```
恰好 2 种 = 12 - 5 = 7 ✓
```

---

## 另一种方法：双滑动窗口

维护两个窗口，分别对应"恰好 k 种"的左边界和右边界：

```typescript
function subarraysWithKDistinct(nums: number[], k: number): number {
  let count = 0;
  let left1 = 0, left2 = 0;  // 两个左边界
  const map1 = new Map<number, number>();
  const map2 = new Map<number, number>();
  
  for (let right = 0; right < nums.length; right++) {
    const num = nums[right];
    
    // 更新两个窗口
    map1.set(num, (map1.get(num) || 0) + 1);
    map2.set(num, (map2.get(num) || 0) + 1);
    
    // left1：保持恰好 k 种（或更少）
    while (map1.size > k) {
      const n = nums[left1];
      map1.set(n, map1.get(n)! - 1);
      if (map1.get(n) === 0) map1.delete(n);
      left1++;
    }
    
    // left2：保持至多 k-1 种
    while (map2.size >= k) {
      const n = nums[left2];
      map2.set(n, map2.get(n)! - 1);
      if (map2.get(n) === 0) map2.delete(n);
      left2++;
    }
    
    // [left1, right] 到 [left2-1, right] 都恰好 k 种
    count += left2 - left1;
  }
  
  return count;
}
```

这种方法更直观但代码更复杂。

---

## 复杂度分析

**时间复杂度**：O(n)
- 两次滑动窗口，每次 O(n)

**空间复杂度**：O(k)
- Map 中最多 k+1 个元素

---

## 常见错误

**错误1：直接求"恰好 k"**
```typescript
// 很难正确处理边界
while (map.size === k) {  // ❌ 这样写很容易出错
```

**错误2：忘记删除计数为 0 的元素**
```typescript
if (map.get(leftNum) === 0) {
  map.delete(leftNum);  // ✅ 必须删除
}
```

**错误3：计数公式错误**
```typescript
count += right - left;  // ❌ 少了 1
count += right - left + 1;  // ✅
```

---

## 技巧推广

"恰好 k"转"最多 k"的技巧适用于很多场景：

- 恰好 k 个不同字符的子串
- 恰好 k 个 0 的子数组
- 恰好 k 对满足条件的数

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [340. 至多包含 K 个不同字符的最长子串](https://leetcode.com/problems/longest-substring-with-at-most-k-distinct-characters/) | 中等 | 最多 k 种 |
| [904. 水果成篮](https://leetcode.com/problems/fruit-into-baskets/) | 中等 | 最多 2 种 |
| [1248. 统计「优美子数组」](https://leetcode.com/problems/count-number-of-nice-subarrays/) | 中等 | 恰好 k 个奇数 |

---

## 总结

K 个不同整数的子数组核心要点：

1. **问题转化**：恰好 k = 最多 k - 最多 (k-1)
2. **atMostK**：标准滑动窗口
3. **计数公式**：以 right 结尾的子数组数 = right - left + 1
4. **Map 维护**：记得删除计数为 0 的元素
5. **适用场景**：任何"恰好 k"问题都可以尝试这种转化
