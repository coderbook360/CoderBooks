# 差分数组原理与应用

差分数组是前缀和的"逆运算"，专门用于处理**区间更新**问题。

---

## 什么是差分数组？

对于数组 `nums`，差分数组 `diff` 定义为：

```
diff[0] = nums[0]
diff[i] = nums[i] - nums[i-1]  (i > 0)
```

**示例**：
```
nums: [1, 3, 6, 10, 15]
diff: [1, 2, 3,  4,  5]
       ↑  ↑  ↑   ↑   ↑
       1  3-1 6-3 10-6 15-10
```

---

## 差分与前缀和的关系

**差分是前缀和的逆操作**：
- 对 `nums` 做前缀和得到累积和数组
- 对累积和数组做差分得到原 `nums`

**反过来**：
- 对 `diff` 做前缀和可以还原 `nums`

```typescript
// 从差分数组还原原数组
function restore(diff: number[]): number[] {
  const nums = new Array(diff.length);
  nums[0] = diff[0];
  for (let i = 1; i < diff.length; i++) {
    nums[i] = nums[i - 1] + diff[i];
  }
  return nums;
}
```

---

## 区间更新的魔力

差分数组的核心价值：**O(1) 完成区间更新**。

假设要将区间 `[i, j]` 的所有元素都加上 `val`：

```typescript
diff[i] += val;      // i 位置开始增加 val
diff[j + 1] -= val;  // j+1 位置抵消，不影响后面
```

**原理**：
```
原数组:    [a, b, c, d, e]
区间 [1,3] 加 3:
新数组:    [a, b+3, c+3, d+3, e]

差分数组变化:
diff[1] += 3  → 从位置 1 开始，前缀和增加 3
diff[4] -= 3  → 从位置 4 开始，前缀和抵消 3
```

---

## 代码实现

```typescript
class DifferenceArray {
  private diff: number[];
  
  constructor(nums: number[]) {
    const n = nums.length;
    // 初始化差分数组
    this.diff = new Array(n).fill(0);
    this.diff[0] = nums[0];  // 第一个元素就是原值
    
    // diff[i] = nums[i] - nums[i-1]
    // 表示相邻元素的差值
    for (let i = 1; i < n; i++) {
      this.diff[i] = nums[i] - nums[i - 1];
    }
  }
  
  // 区间 [left, right] 的所有元素都加上 val
  // 时间复杂度：O(1)，这是差分数组的核心优势！
  update(left: number, right: number, val: number): void {
    // 从 left 开始，所有元素都增加 val
    this.diff[left] += val;
    
    // 从 right+1 开始，抵消之前的增加
    // 如果 right+1 超出范围，不需要处理（不影响结果）
    if (right + 1 < this.diff.length) {
      this.diff[right + 1] -= val;
    }
  }
  
  // 将差分数组还原为原数组
  // 时间复杂度：O(n)
  restore(): number[] {
    const nums = new Array(this.diff.length);
    nums[0] = this.diff[0];  // 第一个元素直接取
    
    // 前缀和还原：nums[i] = nums[i-1] + diff[i]
    for (let i = 1; i < this.diff.length; i++) {
      nums[i] = nums[i - 1] + this.diff[i];
    }
    return nums;
  }
}
```

**图示理解**：

```
原数组 nums:    [1,  3,  6, 10, 15]
差分数组 diff:  [1,  2,  3,  4,  5]

区间 [1, 3] 加 10:
diff[1] += 10  →  [1, 12,  3,  4,  5]
diff[4] -= 10  →  [1, 12,  3,  4, -5]

还原后 nums:    [1, 13, 16, 20, 15]
验证：原 [3,6,10] → 新 [13,16,20]，确实各加了 10 ✓
```

---

## 应用场景

### 1. 多次区间加法

```typescript
const da = new DifferenceArray([1, 2, 3, 4, 5]);
da.update(0, 2, 10);   // [1,2,3] 都加 10
da.update(1, 4, 5);    // [2,3,4,5] 都加 5
da.restore();          // [11, 17, 18, 9, 10]
```

### 2. 航班预订统计

给定多个预订 `[first, last, seats]`，求每个航班的座位总数。

### 3. 拼车问题

乘客在不同站点上下车，判断车辆容量是否足够。

---

## 时空复杂度对比

| 操作 | 暴力法 | 差分数组 |
|-----|-------|---------|
| 单次区间更新 | O(n) | O(1) |
| m 次更新 | O(mn) | O(m) |
| 最终还原 | - | O(n) |
| 总复杂度 | O(mn) | O(m + n) |

---

## 前缀和 vs 差分数组

| 技巧 | 擅长 | 不擅长 |
|-----|-----|-------|
| 前缀和 | 区间查询 | 区间更新 |
| 差分数组 | 区间更新 | 区间查询 |

两者互补，有时需要结合使用。
