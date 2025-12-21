# 实战：长度最小的子数组

> LeetCode 209. 长度最小的子数组 | 难度：中等

滑动窗口求"最短满足条件的子数组"的模板题，是理解可变窗口的最佳入门题。

---

## 题目描述

给定一个含有 n 个正整数的数组和一个正整数 `target`，找出该数组中满足其总和大于等于 `target` 的长度最小的**连续子数组**，并返回其长度。如果不存在符合条件的子数组，返回 0。

**示例**：
```
输入：target = 7, nums = [2, 3, 1, 2, 4, 3]
输出：2
解释：子数组 [4, 3] 是满足条件的最短子数组

输入：target = 4, nums = [1, 4, 4]
输出：1
解释：子数组 [4] 满足条件

输入：target = 11, nums = [1, 1, 1, 1, 1, 1, 1, 1]
输出：0
解释：不存在满足条件的子数组
```

---

## 思路分析

### 为什么能用滑动窗口？

1. **正整数约束**：数组元素都是正数
2. **单调性**：窗口扩大，和增大；窗口缩小，和减小
3. **连续子数组**：滑动窗口天然维护连续区间

### 滑动窗口策略

这是"求最短"类型的可变窗口问题：
- **满足条件**：窗口和 >= target
- **收缩时机**：满足条件时收缩（试图找更短的）
- **更新时机**：收缩前更新（当前已满足条件）

---

## 代码实现

### 标准版本

```typescript
function minSubArrayLen(target: number, nums: number[]): number {
  let left = 0;
  let sum = 0;
  let minLen = Infinity;
  
  for (let right = 0; right < nums.length; right++) {
    // 1. 扩展窗口：加入右边元素
    sum += nums[right];
    
    // 2. 满足条件时，收缩并更新
    while (sum >= target) {
      minLen = Math.min(minLen, right - left + 1);
      sum -= nums[left];
      left++;
    }
  }
  
  // 3. 处理无解情况
  return minLen === Infinity ? 0 : minLen;
}
```

### 带注释版本

```typescript
function minSubArrayLen(target: number, nums: number[]): number {
  let left = 0;          // 窗口左边界
  let sum = 0;           // 窗口内元素和
  let minLen = Infinity; // 最小长度（初始化为无穷大）
  
  // 右边界不断扩展
  for (let right = 0; right < nums.length; right++) {
    // 加入右边元素
    sum += nums[right];
    
    // 只要满足条件，就尝试收缩
    while (sum >= target) {
      // 当前窗口满足条件，记录长度
      const len = right - left + 1;
      minLen = Math.min(minLen, len);
      
      // 收缩：移除左边元素
      sum -= nums[left];
      left++;
    }
  }
  
  return minLen === Infinity ? 0 : minLen;
}
```

---

## 执行过程可视化

```
nums = [2, 3, 1, 2, 4, 3], target = 7

right=0: sum=2 < 7，继续扩展
right=1: sum=5 < 7，继续扩展
right=2: sum=6 < 7，继续扩展
right=3: sum=8 >= 7
         窗口 [2,3,1,2]，长度=4，minLen=4
         收缩：sum=6，left=1
         sum=6 < 7，停止收缩
         
right=4: sum=10 >= 7
         窗口 [3,1,2,4]，长度=4，minLen=4
         收缩：sum=7，left=2
         仍 >= 7，窗口 [1,2,4]，长度=3，minLen=3
         收缩：sum=6，left=3
         sum=6 < 7，停止收缩
         
right=5: sum=9 >= 7
         窗口 [2,4,3]，长度=3，minLen=3
         收缩：sum=7，left=4
         仍 >= 7，窗口 [4,3]，长度=2，minLen=2 ⭐
         收缩：sum=3，left=5
         sum=3 < 7，停止收缩

遍历结束，返回 minLen = 2 ✓
```

---

## 为什么用 while 而不是 if？

```typescript
// 错误：只收缩一次
if (sum >= target) {
  minLen = Math.min(minLen, right - left + 1);
  sum -= nums[left++];
}

// 正确：持续收缩直到不满足
while (sum >= target) {
  minLen = Math.min(minLen, right - left + 1);
  sum -= nums[left++];
}
```

**反例**：`nums = [1, 1, 1, 100]`，target = 3

如果用 if：
- right=3，sum=103 >= 3
- 只收缩一次，sum=102，长度=3
- 错过了 sum=100（长度=1）这个更优解！

---

## 复杂度分析

**时间复杂度**：O(n)
- 虽然有嵌套循环，但每个元素最多入窗一次、出窗一次
- 左指针和右指针各自只向右移动，总移动 2n 次

**空间复杂度**：O(1)
- 只使用常数额外变量

---

## 方法对比

| 方法 | 时间复杂度 | 思路 |
|-----|-----------|-----|
| 暴力枚举 | O(n²) | 枚举所有起点，计算每个起点的最短长度 |
| 前缀和+二分 | O(n log n) | 前缀和后，二分查找满足条件的右边界 |
| 滑动窗口 | O(n) | 双指针维护窗口和 |

### 前缀和+二分（备选方案）

```typescript
function minSubArrayLen(target: number, nums: number[]): number {
  const n = nums.length;
  const prefix = [0];
  
  // 计算前缀和
  for (const num of nums) {
    prefix.push(prefix[prefix.length - 1] + num);
  }
  
  let minLen = Infinity;
  
  // 对每个起点，二分找最小终点
  for (let i = 0; i < n; i++) {
    // 找最小的 j 使得 prefix[j+1] - prefix[i] >= target
    // 即 prefix[j+1] >= prefix[i] + target
    const need = prefix[i] + target;
    const j = lowerBound(prefix, need);
    
    if (j <= n) {
      minLen = Math.min(minLen, j - i);
    }
  }
  
  return minLen === Infinity ? 0 : minLen;
}
```

---

## 常见错误

**错误1：忘记处理无解情况**
```typescript
// 错误：直接返回
return minLen;  // ❌ 可能返回 Infinity

// 正确
return minLen === Infinity ? 0 : minLen;  // ✅
```

**错误2：更新位置错误**
```typescript
// 错误：收缩后才更新
while (sum >= target) {
  sum -= nums[left++];
  minLen = Math.min(minLen, right - left + 1);  // ❌ 收缩后长度变了
}
```

**错误3：初始值设置错误**
```typescript
let minLen = 0;  // ❌ 无法区分"无解"和"长度为0"

let minLen = Infinity;  // ✅ 正确
```

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [76. 最小覆盖子串](https://leetcode.com/problems/minimum-window-substring/) | 困难 | 包含所有字符的最短子串 |
| [3. 无重复字符的最长子串](https://leetcode.com/problems/longest-substring-without-repeating-characters/) | 中等 | 求最长，收缩逻辑不同 |
| [713. 乘积小于 K 的子数组](https://leetcode.com/problems/subarray-product-less-than-k/) | 中等 | 乘积版本 |
| [862. 和至少为 K 的最短子数组](https://leetcode.com/problems/shortest-subarray-with-sum-at-least-k/) | 困难 | 允许负数，需要单调队列 |

---

## 滑动窗口"求最短"模板

```typescript
function minWindow(nums: number[], target: number): number {
  let left = 0;
  let state = /* 初始状态 */;
  let minLen = Infinity;
  
  for (let right = 0; right < nums.length; right++) {
    // 1. 扩展：更新状态
    state = update(state, nums[right]);
    
    // 2. 满足条件时收缩
    while (满足条件) {
      minLen = Math.min(minLen, right - left + 1);
      state = remove(state, nums[left]);
      left++;
    }
  }
  
  return minLen === Infinity ? 0 : minLen;
}
```

---

## 总结

长度最小的子数组核心要点：

1. **正整数 + 连续**：滑动窗口的理想场景
2. **求最短**：满足条件时更新，然后收缩
3. **while 收缩**：一次满足可能对应多个有效窗口
4. **时间 O(n)**：每个元素最多进出窗口各一次
5. **无解处理**：初始化 Infinity，最后检查
| **滑动窗口** | O(n) | 左右指针同向移动 |
