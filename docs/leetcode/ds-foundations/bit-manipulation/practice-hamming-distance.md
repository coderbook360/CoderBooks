# 实战：汉明距离

计算两个整数二进制表示中不同位的个数。

---

## 问题描述

**LeetCode 461. Hamming Distance**

两个整数之间的汉明距离指的是这两个数字对应二进制位不同的位置的数目。

给你两个整数 x 和 y，计算并返回它们之间的汉明距离。

**示例**：
```
输入：x = 1, y = 4
输出：2

解释：
1 = 0001
4 = 0100
     ↑↑ 两位不同
```

---

## 思路

异或运算找出不同的位，然后统计 1 的个数。

---

## 解法

```javascript
function hammingDistance(x, y) {
  let xor = x ^ y;
  let count = 0;
  
  while (xor !== 0) {
    xor &= xor - 1;  // 清除最右边的 1
    count++;
  }
  
  return count;
}
```

---

## 执行过程

```
x = 1 = 0001
y = 4 = 0100

xor = 0001 ^ 0100 = 0101

第1轮：xor = 0101 & 0100 = 0100, count = 1
第2轮：xor = 0100 & 0011 = 0000, count = 2

结果：2
```

---

## 一行解法

```javascript
function hammingDistance(x, y) {
  return (x ^ y).toString(2).replace(/0/g, '').length;
}
```

但这种方法效率较低。

---

## 应用

汉明距离在以下领域有应用：
- 错误检测与纠正
- 图像处理（相似度比较）
- 密码学
- 基因序列比对

---

## 复杂度

- 时间：O(1)，最多 32 位
- 空间：O(1)

---

## 详细执行过程

以 x = 1, y = 4 为例：

```
x = 1 = 0001
y = 4 = 0100

第1步：异或找出不同位
  xor = 0001 ^ 0100 = 0101

第2步：统计 1 的个数
  xor = 0101, xor - 1 = 0100
  xor = 0101 & 0100 = 0100, count = 1

  xor = 0100, xor - 1 = 0011
  xor = 0100 & 0011 = 0000, count = 2

结果：2
```

---

## 边界情况

```javascript
// 相同数字
hammingDistance(5, 5);  // 0

// 0 和任意数
hammingDistance(0, 7);  // 3 (7 = 111)

// 连续数字
hammingDistance(0, 1);  // 1
hammingDistance(1, 2);  // 2 (01 vs 10)

// 最大距离（32位）
hammingDistance(0, 0xFFFFFFFF);  // 32（如果考虑负数）
```

---

## 常见错误

### 错误一：直接比较而不异或

```javascript
// 错误：逐位比较复杂且低效
function hammingDistance(x, y) {
  let count = 0;
  for (let i = 0; i < 32; i++) {
    if ((x & (1 << i)) !== (y & (1 << i))) count++;
  }
  return count;
}

// 正确：先异或，再统计
function hammingDistance(x, y) {
  return countOnes(x ^ y);
}
```

### 错误二：字符串方法效率低

```javascript
// 可行但效率低
function hammingDistance(x, y) {
  return (x ^ y).toString(2).replace(/0/g, '').length;
}
```

---

## 批量汉明距离

计算数组中所有数对的汉明距离之和（LeetCode 477）：

```javascript
// 暴力：O(n²)
function totalHammingDistance(nums) {
  let total = 0;
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      total += hammingDistance(nums[i], nums[j]);
    }
  }
  return total;
}

// 优化：按位统计 O(32n)
function totalHammingDistance(nums) {
  let total = 0;
  for (let bit = 0; bit < 32; bit++) {
    let ones = 0;
    for (const num of nums) {
      if (num & (1 << bit)) ones++;
    }
    total += ones * (nums.length - ones);
  }
  return total;
}
```

---

## 相关题目

| 题目 | 难度 | 关键点 |
|------|------|--------|
| 461. 汉明距离 | 简单 | 本题 |
| 477. 汉明距离总和 | 中等 | 按位统计优化 |
| 191. 位1的个数 | 简单 | n & (n-1) 技巧 |
| 136. 只出现一次的数字 | 简单 | XOR 基础 |

---

## 总结

1. **核心思路**：XOR 找不同位，然后统计 1 的个数
2. **技巧应用**：`n & (n-1)` 高效统计 1
3. **时间复杂度**：O(1)，最多 32 次循环
4. **扩展应用**：错误检测、图像相似度、密码学
