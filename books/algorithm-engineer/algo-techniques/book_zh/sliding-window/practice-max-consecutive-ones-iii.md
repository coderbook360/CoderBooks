# 实战：最大连续 1 的个数 III

> LeetCode 1004. 最大连续 1 的个数 III | 难度：中等

这道题与"替换后的最长重复字符"思路相似，但更简洁。

---

## 题目描述

给定一个二进制数组 `nums` 和一个整数 `k`，如果可以翻转最多 `k` 个 0，返回数组中**连续 1 的最大个数**。

**示例**：
```
输入：nums = [1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0], k = 2
输出：6
解释：翻转两个 0（索引 5 和 10），得到连续的 6 个 1
```

---

## 思路分析

**转化思路**：找最长的子数组，使得其中 0 的个数不超过 k。

滑动窗口维护 0 的个数：
- 0 的个数 <= k：窗口有效，继续扩展
- 0 的个数 > k：收缩左边界

---

## 代码实现

```typescript
function longestOnes(nums: number[], k: number): number {
  let left = 0;
  let zeros = 0;  // 窗口内 0 的个数
  let maxLen = 0;
  
  for (let right = 0; right < nums.length; right++) {
    if (nums[right] === 0) {
      zeros++;
    }
    
    // 0 的个数超过 k，收缩左边界
    while (zeros > k) {
      if (nums[left] === 0) {
        zeros--;
      }
      left++;
    }
    
    maxLen = Math.max(maxLen, right - left + 1);
  }
  
  return maxLen;
}
```

---

## 图示过程

```
nums = [1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0], k = 2

Step 1-3: right=0,1,2，全是 1
  zeros=0，窗口 [1,1,1]，maxLen=3

Step 4: right=3, nums[3]=0
  zeros=1 <= k，窗口 [1,1,1,0]，maxLen=4

Step 5: right=4, nums[4]=0
  zeros=2 <= k，窗口 [1,1,1,0,0]，maxLen=5

Step 6: right=5, nums[5]=0
  zeros=3 > k！需要收缩
  left=0, nums[0]=1, left++
  left=1, nums[1]=1, left++
  left=2, nums[2]=1, left++
  left=3, nums[3]=0, zeros--=2, left++
  窗口 [0,0,1,1,1,1]，maxLen=5

Step 7-10: right=6,7,8,9，全是 1
  zeros=2，窗口不断扩展
  窗口 [0,0,1,1,1,1]，maxLen=6

Step 11: right=10, nums[10]=0
  zeros=3 > k！收缩
  left=4, nums[4]=0, zeros--=2, left++
  窗口 [0,1,1,1,1,0]，maxLen=6

最终：maxLen = 6
```

---

## 优化：不收缩版本

一个有趣的优化：我们可以只让窗口**变大或保持**，不主动缩小。

```typescript
function longestOnes(nums: number[], k: number): number {
  let left = 0;
  let zeros = 0;
  
  for (let right = 0; right < nums.length; right++) {
    if (nums[right] === 0) zeros++;
    
    if (zeros > k) {
      if (nums[left] === 0) zeros--;
      left++;
    }
  }
  
  return nums.length - left;
}
```

**为什么这样有效？**

1. 当 zeros > k 时，窗口左右边界同时右移一格
2. 窗口大小**不会变小**，只会变大或保持
3. 最终 `nums.length - left` 就是曾经达到过的最大窗口

**本质理解**：我们不关心"当前窗口是否有效"，只关心"是否找到更大的有效窗口"。

---

## 复杂度分析

- **时间复杂度**：O(n)
  - 每个元素最多被访问两次（标准版本）
  - 每个元素只被访问一次（优化版本）
  
- **空间复杂度**：O(1)
  - 只用了几个变量

---

## 常见错误

### 错误1：收缩条件写成 while (zeros >= k)

```typescript
// ❌ 错误：应该是 > k，不是 >= k
while (zeros >= k) {  // 允许恰好 k 个 0
  ...
}

// ✓ 正确：0 的个数可以等于 k
while (zeros > k) {
  ...
}
```

### 错误2：忘记在收缩时更新 zeros

```typescript
// ❌ 错误：只移动 left，不更新 zeros
while (zeros > k) {
  left++;
}

// ✓ 正确：如果移除的是 0，要减少 zeros
while (zeros > k) {
  if (nums[left] === 0) {
    zeros--;
  }
  left++;
}
```

### 错误3：边界情况

```typescript
// k = 0：不能翻转任何 0
longestOnes([0, 0, 1, 1], 0)  // 应返回 2

// 全是 1：不需要翻转
longestOnes([1, 1, 1, 1], 2)  // 应返回 4

// 全是 0：最多翻转 k 个
longestOnes([0, 0, 0, 0], 2)  // 应返回 2
```

---

## 与上一题的关系

| 题目 | 本质 |
|-----|-----|
| 替换后的最长重复字符 | 最长子数组，需替换的字符 <= k |
| 最大连续 1 的个数 III | 最长子数组，0 的个数 <= k |

两者都是"限制某种元素数量"的滑动窗口问题。

---

## 相关题目

- **424. 替换后的最长重复字符**：更一般化的版本
- **487. 最大连续 1 的个数 II**：k = 1 的特殊情况
- **1493. 删掉一个元素后全为 1 的最长子数组**：必须删除一个元素

---

## 总结

这道题的核心思想：

1. **问题转化**：翻转 k 个 0 → 找最长子数组使得 0 的个数 ≤ k
2. **滑动窗口**：维护 0 的个数，超限时收缩
3. **优化技巧**：不收缩版本利用"窗口只增不减"的特性
