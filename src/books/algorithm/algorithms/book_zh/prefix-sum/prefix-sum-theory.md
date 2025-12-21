# 前缀和原理与应用

前缀和是一种**预处理技巧**，通过提前计算数组的累积和，将区间求和的时间复杂度从 O(n) 降到 O(1)。

---

## 什么是前缀和？

对于数组 `nums`，前缀和数组 `prefix` 定义为：

```
prefix[i] = nums[0] + nums[1] + ... + nums[i-1]
```

其中 `prefix[0] = 0`（表示空前缀）。

**示例**：
```
nums:   [1, 2, 3, 4, 5]
prefix: [0, 1, 3, 6, 10, 15]
         ↑  ↑  ↑   ↑   ↑   ↑
         空  1  1+2 1+2+3 ...
```

---

## 区间和查询

有了前缀和，任意区间 `[i, j]` 的和可以 O(1) 计算：

```
sum(i, j) = prefix[j+1] - prefix[i]
```

**推导**：
```
prefix[j+1] = nums[0] + nums[1] + ... + nums[j]
prefix[i]   = nums[0] + nums[1] + ... + nums[i-1]
差值        = nums[i] + nums[i+1] + ... + nums[j]
```

---

## 代码实现

```typescript
class PrefixSum {
  private prefix: number[];
  
  constructor(nums: number[]) {
    const n = nums.length;
    this.prefix = new Array(n + 1).fill(0);
    
    for (let i = 0; i < n; i++) {
      this.prefix[i + 1] = this.prefix[i] + nums[i];
    }
  }
  
  // 查询区间 [left, right] 的和
  query(left: number, right: number): number {
    return this.prefix[right + 1] - this.prefix[left];
  }
}
```

---

## 为什么 prefix 长度是 n+1？

设 `prefix[i]` 表示前 i 个元素的和：

```
prefix[0] = 0              // 前 0 个元素的和
prefix[1] = nums[0]        // 前 1 个元素的和
prefix[2] = nums[0] + nums[1]  // 前 2 个元素的和
...
```

这样定义的好处：
- `prefix[0] = 0` 避免边界特判
- 区间和公式统一：`sum(i, j) = prefix[j+1] - prefix[i]`

---

## 应用场景

### 1. 多次区间求和

```typescript
// 预处理 O(n)，每次查询 O(1)
const ps = new PrefixSum([1, 2, 3, 4, 5]);
ps.query(0, 2);  // 1 + 2 + 3 = 6
ps.query(2, 4);  // 3 + 4 + 5 = 12
```

### 2. 子数组和等于 k

结合哈希表，可以 O(n) 找到和为 k 的子数组。

### 3. 二维区域和

可以扩展到二维矩阵，O(1) 查询任意矩形区域的和。

---

## 时空复杂度

| 操作 | 暴力法 | 前缀和 |
|-----|-------|-------|
| 预处理 | - | O(n) |
| 单次查询 | O(n) | O(1) |
| m 次查询 | O(mn) | O(n + m) |

当查询次数多时，前缀和优势明显。

---

## 本章目标

通过本章学习，你将掌握：
- 前缀和的构建与查询
- 差分数组及其应用
- 结合哈希表解决"和为 k"类问题
- 二维前缀和
