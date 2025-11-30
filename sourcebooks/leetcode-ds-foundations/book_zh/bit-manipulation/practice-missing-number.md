# 实战：缺失数字

在 0 到 n 的数组中，找出缺失的那个数。

---

## 问题描述

**LeetCode 268. Missing Number**

给定一个包含 [0, n] 中 n 个数的数组 nums，找出 [0, n] 这个范围内没有出现在数组中的那个数。

**示例**：
```
输入：nums = [3,0,1]
输出：2
```

---

## 解法一：数学

```javascript
function missingNumber(nums) {
  const n = nums.length;
  const expectedSum = n * (n + 1) / 2;
  const actualSum = nums.reduce((a, b) => a + b, 0);
  return expectedSum - actualSum;
}
```

---

## 解法二：异或

```javascript
function missingNumber(nums) {
  let xor = nums.length;
  
  for (let i = 0; i < nums.length; i++) {
    xor ^= i ^ nums[i];
  }
  
  return xor;
}
```

---

## 异或原理

把 0 到 n 和数组中的数都异或：
- 存在的数出现两次，抵消为 0
- 缺失的数只出现一次，留下来

```
nums = [3, 0, 1], n = 3

异或 (0, 1, 2, 3) 和 (3, 0, 1)：
0^1^2^3^3^0^1 = 2

结果：2
```

---

## 执行过程

```
nums = [3, 0, 1]

xor = 3 (n = 3)
xor ^= 0 ^ 3 = 3 ^ 0 ^ 3 = 0
xor ^= 1 ^ 0 = 0 ^ 1 ^ 0 = 1
xor ^= 2 ^ 1 = 1 ^ 2 ^ 1 = 2

结果：2
```

---

## 两种方法对比

| 方法 | 时间 | 空间 | 特点 |
|------|------|------|------|
| 求和 | O(n) | O(1) | 可能溢出 |
| 异或 | O(n) | O(1) | 不会溢出 |

---

## 复杂度

- 时间：O(n)
- 空间：O(1)

---

## 详细执行过程

以 nums = [3, 0, 1] 为例，用异或法：

```
初始：xor = 3（n = nums.length = 3）

i = 0: xor ^= 0 ^ 3 = 3 ^ 0 ^ 3 = 0
i = 1: xor ^= 1 ^ 0 = 0 ^ 1 ^ 0 = 1
i = 2: xor ^= 2 ^ 1 = 1 ^ 2 ^ 1 = 2

结果：2
```

验证：`0 ^ 1 ^ 2 ^ 3 ^ 3 ^ 0 ^ 1 = 2`（0、1、3 各出现两次抵消，2 只出现一次）

---

## 边界情况

```javascript
// 缺失 0
missingNumber([1]);  // 0
missingNumber([1, 2]);  // 0

// 缺失 n
missingNumber([0]);  // 1
missingNumber([0, 1]);  // 2

// 缺失中间的数
missingNumber([0, 2]);  // 1
missingNumber([0, 1, 3]);  // 2
```

---

## 常见错误

### 错误一：求和溢出（数学方法）

```javascript
// 大数组可能溢出
const n = nums.length;
const expectedSum = n * (n + 1) / 2;  // 可能溢出
```

异或法不会溢出。

### 错误二：异或初始值设错

```javascript
// 错误：初始值为 0
let xor = 0;
for (let i = 0; i < nums.length; i++) {
  xor ^= i ^ nums[i];
}
return xor;  // 漏了 n！

// 正确：初始值为 n
let xor = nums.length;
for (let i = 0; i < nums.length; i++) {
  xor ^= i ^ nums[i];
}
return xor;
```

---

## 其他解法

### 解法三：排序

```javascript
function missingNumber(nums) {
  nums.sort((a, b) => a - b);
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] !== i) return i;
  }
  return nums.length;
}
```

时间 O(n log n)，空间 O(1)（原地排序）。

### 解法四：哈希表

```javascript
function missingNumber(nums) {
  const set = new Set(nums);
  for (let i = 0; i <= nums.length; i++) {
    if (!set.has(i)) return i;
  }
}
```

时间 O(n)，空间 O(n)。

---

## 三种 O(n) 方法对比

| 方法 | 时间 | 空间 | 优点 | 缺点 |
|------|------|------|------|------|
| 求和 | O(n) | O(1) | 直观 | 可能溢出 |
| 异或 | O(n) | O(1) | 不溢出 | 稍难理解 |
| 哈希 | O(n) | O(n) | 通用 | 空间大 |

---

## 相关题目

| 题目 | 难度 | 关键点 |
|------|------|--------|
| 268. 丢失的数字 | 简单 | 本题 |
| 136. 只出现一次的数字 | 简单 | 相同思路 |
| 287. 寻找重复数 | 中等 | 快慢指针 |
| 41. 缺失的第一个正数 | 困难 | 原地哈希 |

---

## 总结

1. **数学法**：期望和 - 实际和，注意溢出
2. **异或法**：利用 a ^ a = 0，不会溢出
3. **核心思想**：出现两次的数抵消，只出现一次的数留下
4. **推荐方法**：异或法，安全且高效
