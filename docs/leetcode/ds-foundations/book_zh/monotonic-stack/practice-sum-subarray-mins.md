# 实战：子数组的最小值之和

给定一个数组，计算所有子数组的最小值之和。这道题用单调栈来高效计算每个元素作为最小值的贡献。

---

## 问题描述

**LeetCode 907. Sum of Subarray Minimums**

给定一个整数数组 arr，找到 min(b) 的总和，其中 b 的范围为 arr 的每个（连续）子数组。

**示例**：
```
输入：arr = [3,1,2,4]
输出：17
解释：
子数组为 [3],[1],[2],[4],[3,1],[1,2],[2,4],[3,1,2],[1,2,4],[3,1,2,4]
最小值为 3,1,2,4,1,1,2,1,1,1
总和 = 17
```

---

## 思路分析

对于每个元素 arr[i]，计算它作为最小值的子数组有多少个。

- 向左找第一个更小的元素位置 left[i]
- 向右找第一个更小或等于的元素位置 right[i]
- 以 arr[i] 为最小值的子数组数量 = (i - left[i]) × (right[i] - i)

---

## 解法

```javascript
function sumSubarrayMins(arr) {
  const MOD = 1e9 + 7;
  const n = arr.length;
  
  // 计算左边界（第一个更小的）
  const left = new Array(n);
  const stack1 = [];
  for (let i = 0; i < n; i++) {
    while (stack1.length > 0 && arr[i] <= arr[stack1[stack1.length - 1]]) {
      stack1.pop();
    }
    left[i] = stack1.length > 0 ? stack1[stack1.length - 1] : -1;
    stack1.push(i);
  }
  
  // 计算右边界（第一个更小的，用 < 处理相等）
  const right = new Array(n);
  const stack2 = [];
  for (let i = n - 1; i >= 0; i--) {
    while (stack2.length > 0 && arr[i] < arr[stack2[stack2.length - 1]]) {
      stack2.pop();
    }
    right[i] = stack2.length > 0 ? stack2[stack2.length - 1] : n;
    stack2.push(i);
  }
  
  // 计算贡献
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const count = (i - left[i]) * (right[i] - i);
    sum = (sum + arr[i] * count) % MOD;
  }
  
  return sum;
}
```

---

## 处理相等元素

为了避免重复计算，左边用 `<=`，右边用 `<`。这样相等的元素只会被左边的那个计算一次。

---

## 执行过程

```
arr = [3, 1, 2, 4]

left:  [-1, -1, 1, 2]  （左边第一个更小的位置）
right: [1, 4, 4, 4]    （右边第一个更小的位置）

贡献计算：
arr[0]=3: (0-(-1)) × (1-0) = 1×1 = 1, 贡献 3×1=3
arr[1]=1: (1-(-1)) × (4-1) = 2×3 = 6, 贡献 1×6=6
arr[2]=2: (2-1) × (4-2) = 1×2 = 2, 贡献 2×2=4
arr[3]=4: (3-2) × (4-3) = 1×1 = 1, 贡献 4×1=4

总和 = 3+6+4+4 = 17
```

---

## 复杂度

- 时间：O(n)
- 空间：O(n)
