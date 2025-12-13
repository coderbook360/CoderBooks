# 实战：切割木头

> 经典问题

给定一些木头和目标数量，求能切出的最大长度。这是"最大化最小值"的经典问题。

---

## 题目描述

有 n 根木头，第 i 根长度为 `lengths[i]`。要切割成 k 段**等长**的小段（不能拼接，即一根木头只能切割，不能与其他木头合并）。

求能切出的小段的**最大长度**。如果无法切出 k 段，返回 0。

**示例**：
```
输入：lengths = [232, 124, 456], k = 7
输出：114
解释：
  232 / 114 = 2 段（余 4）
  124 / 114 = 1 段（余 10）
  456 / 114 = 4 段（余 0）
  共 2 + 1 + 4 = 7 段 ✓

输入：lengths = [1, 2, 3], k = 7
输出：0
解释：即使每段长度为 1，也只能切出 1+2+3=6 段 < 7
```

---

## 思路分析

### 二分答案框架

**为什么能用二分？**

1. **答案空间确定**：段长 ∈ [1, max(lengths)]
2. **单调性**：段长越短，能切出的段数越多
3. **可验证性**：给定段长，可以 O(n) 计算能切出多少段

```
段长:   1   10  50  100 114 115 120 ...
段数:   812 81  15  8   7   6   6  ...
>=7:    ✓   ✓   ✓   ✓   ✓   ✗   ✗
                        ↑
                    最大可行解
```

### 求最大值 vs 求最小值

| 类型 | 目标 | 二分方向 |
|-----|------|---------|
| 求最小值 | 第一个满足条件 | `right = mid` |
| 求最大值 | 最后一个满足条件 | `left = mid` |

本题是**求最大值**，需要特别注意 mid 的计算方式。

---

## 代码实现

### 方法一：left < right + mid 上取整

```typescript
function cutWood(lengths: number[], k: number): number {
  const maxLen = Math.max(...lengths);
  
  // 特殊情况：即使段长为 1 也无法切出 k 段
  const totalLen = lengths.reduce((a, b) => a + b, 0);
  if (totalLen < k) return 0;
  
  let left = 1;
  let right = maxLen;
  
  while (left < right) {
    // 关键：求最大值时，mid 要向上取整
    const mid = left + Math.ceil((right - left) / 2);
    
    if (canCut(lengths, mid, k)) {
      left = mid;  // mid 可行，尝试更大
    } else {
      right = mid - 1;  // mid 不可行，排除
    }
  }
  
  return left;
}

function canCut(lengths: number[], len: number, k: number): boolean {
  let count = 0;
  
  for (const l of lengths) {
    count += Math.floor(l / len);
    // 剪枝：已经够了就提前返回
    if (count >= k) return true;
  }
  
  return count >= k;
}
```

### 方法二：left <= right

```typescript
function cutWood(lengths: number[], k: number): number {
  const totalLen = lengths.reduce((a, b) => a + b, 0);
  if (totalLen < k) return 0;
  
  let left = 1;
  let right = Math.max(...lengths);
  let result = 0;
  
  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    
    if (canCut(lengths, mid, k)) {
      result = mid;  // 记录可行解
      left = mid + 1;  // 尝试更大
    } else {
      right = mid - 1;
    }
  }
  
  return result;
}
```

---

## 关键点：mid 向上取整

**为什么求最大值时 mid 要向上取整？**

当 `left < right` 且用 `left = mid` 更新时：

```
普通取整（向下）：
left = 3, right = 4
mid = (3 + 4) / 2 = 3
如果 check(3) = true，left = 3
→ 死循环！

向上取整：
left = 3, right = 4
mid = ceil((4 - 3) / 2) + 3 = 4
如果 check(4) = true，left = 4，结束
如果 check(4) = false，right = 3，结束
→ 不会死循环 ✓
```

**向上取整公式**：
```typescript
// 方法1
const mid = left + Math.ceil((right - left) / 2);

// 方法2（等价）
const mid = Math.floor((left + right + 1) / 2);

// 方法3（整数除法技巧）
const mid = left + Math.floor((right - left + 1) / 2);
```

---

## 执行过程可视化

```
lengths = [232, 124, 456], k = 7
max = 456

初始：left = 1, right = 456

第1轮：mid = ceil((456-1)/2) + 1 = 229
       check(229): 232/229=1 + 124/229=0 + 456/229=1 = 2 < 7 ✗
       right = 228

第2轮：mid = ceil((228-1)/2) + 1 = 115
       check(115): 2 + 1 + 3 = 6 < 7 ✗
       right = 114

第3轮：mid = ceil((114-1)/2) + 1 = 58
       check(58): 4 + 2 + 7 = 13 >= 7 ✓
       left = 58

第4轮：mid = ceil((114-58)/2) + 58 = 86
       check(86): 2 + 1 + 5 = 8 >= 7 ✓
       left = 86

第5轮：mid = ceil((114-86)/2) + 86 = 100
       check(100): 2 + 1 + 4 = 7 >= 7 ✓
       left = 100

第6轮：mid = ceil((114-100)/2) + 100 = 107
       check(107): 2 + 1 + 4 = 7 >= 7 ✓
       left = 107

第7轮：mid = ceil((114-107)/2) + 107 = 111
       check(111): 2 + 1 + 4 = 7 >= 7 ✓
       left = 111

第8轮：mid = ceil((114-111)/2) + 111 = 113
       check(113): 2 + 1 + 4 = 7 >= 7 ✓
       left = 113

第9轮：mid = ceil((114-113)/2) + 113 = 114
       check(114): 2 + 1 + 4 = 7 >= 7 ✓
       left = 114

left === right = 114，返回 114 ✓
```

---

## 复杂度分析

**时间复杂度**：O(n log M)
- M = max(lengths)
- 二分 log M 次
- 每次 check O(n)

**空间复杂度**：O(1)

---

## 常见错误

**错误1：mid 使用普通下取整**
```typescript
// 求最大值时可能死循环
const mid = left + Math.floor((right - left) / 2);  // ❌

// 正确
const mid = left + Math.ceil((right - left) / 2);  // ✅
```

**错误2：边界设置错误**
```typescript
// 错误：left 从 0 开始
let left = 0;  // ❌ 段长不能为 0

// 正确
let left = 1;  // ✅
```

**错误3：忘记处理无解情况**
```typescript
// 需要检查是否能切出 k 段
if (lengths.reduce((a, b) => a + b, 0) < k) return 0;
```

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [875. 爱吃香蕉的珂珂](https://leetcode.com/problems/koko-eating-bananas/) | 中等 | 求最小速度 |
| [1011. 在 D 天内送达包裹](https://leetcode.com/problems/capacity-to-ship-packages-within-d-days/) | 中等 | 求最小运载能力 |
| [410. 分割等和子集](https://leetcode.com/problems/split-array-largest-sum/) | 困难 | 最大值最小化 |

---

## 二分答案模板对比

```typescript
// 求最小值（左边界）
while (left < right) {
  const mid = left + Math.floor((right - left) / 2);
  if (check(mid)) {
    right = mid;      // mid 可行，尝试更小
  } else {
    left = mid + 1;   // mid 不可行，排除
  }
}
return left;

// 求最大值（右边界）
while (left < right) {
  const mid = left + Math.ceil((right - left) / 2);  // 向上取整！
  if (check(mid)) {
    left = mid;       // mid 可行，尝试更大
  } else {
    right = mid - 1;  // mid 不可行，排除
  }
}
return left;
```

---

## 总结

切割木头的核心要点：

1. **求最大值**：找最后一个满足条件的值
2. **mid 上取整**：防止死循环
3. **check 函数**：计算能切出的段数
4. **答案空间**：[1, max(lengths)]
5. **无解处理**：总长度 < k 时返回 0
  共 3 段 < 7，不可行
  right = 227

mid = 114:
  232/114=2, 124/114=1, 456/114=4
  共 7 段 >= 7，可行
  left = 114

继续二分...最终答案 114
```

---

## 复杂度分析

- **时间复杂度**：O(n log M)，M = max(lengths)
- **空间复杂度**：O(1)
