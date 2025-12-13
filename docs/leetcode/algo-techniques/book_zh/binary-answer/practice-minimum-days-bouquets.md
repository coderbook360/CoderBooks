# 实战：制作 m 束花所需的最少天数

> LeetCode 1482. 制作 m 束花所需的最少天数 | 难度：中等

二分答案在"时间"维度上的应用，展示了 check 函数需要处理"连续性"约束的情况。

---

## 题目描述

给你一个整数数组 `bloomDay`，以及两个整数 `m` 和 `k`。

你需要制作 `m` 束花。每束花需要**相邻的 k 朵**花。

`bloomDay[i]` 表示第 i 朵花的开放时间。每朵花只能用于一束花。

请返回需要等待的**最少天数**。如果无法制作 m 束花，返回 -1。

**示例**：
```
输入：bloomDay = [1, 10, 3, 10, 2], m = 3, k = 1
输出：3
解释：
  第1天：位置 0 开放 → [开, 未, 未, 未, 未]
  第2天：位置 4 开放 → [开, 未, 未, 未, 开]
  第3天：位置 2 开放 → [开, 未, 开, 未, 开]
  第3天有3朵不相邻的花开放，每束只需1朵，可以制作3束

输入：bloomDay = [1, 10, 3, 10, 2], m = 3, k = 2
输出：-1
解释：需要6朵花制作3束（每束2朵），但只有5朵花

输入：bloomDay = [7, 7, 7, 7, 12, 7, 7], m = 2, k = 3
输出：12
```

---

## 思路分析

### 为什么能用二分？

1. **答案空间确定**：天数 ∈ [min(bloomDay), max(bloomDay)]
2. **单调性**：天数越多，开放的花越多，能制作的花束越多
3. **可验证性**：给定天数，可以 O(n) 判断能否制作 m 束

### check 函数的关键

- 需要 k 朵**连续**的花
- 遇到未开放的花，连续计数归零
- 统计能凑成多少个"连续 k 朵"

---

## 代码实现

```typescript
function minDays(bloomDay: number[], m: number, k: number): number {
  const n = bloomDay.length;
  
  // 如果花不够，直接返回 -1
  if (n < m * k) return -1;
  
  let left = Math.min(...bloomDay);
  let right = Math.max(...bloomDay);
  
  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    
    if (canMake(bloomDay, mid, m, k)) {
      right = mid;  // 可以制作，尝试更少的天数
    } else {
      left = mid + 1;  // 不能制作，需要更多天数
    }
  }
  
  return left;
}

function canMake(
  bloomDay: number[], 
  day: number, 
  m: number, 
  k: number
): boolean {
  let bouquets = 0;     // 已制作的花束数
  let consecutive = 0;  // 当前连续开放的花朵数
  
  for (const d of bloomDay) {
    if (d <= day) {
      // 这朵花已开放
      consecutive++;
      if (consecutive === k) {
        bouquets++;      // 凑够一束
        consecutive = 0; // 重置
      }
    } else {
      // 这朵花未开放，断开连续
      consecutive = 0;
    }
  }
  
  return bouquets >= m;
}
```

---

## 执行过程可视化

```
bloomDay = [1, 10, 3, 10, 2], m = 3, k = 1

left = 1, right = 10

第1轮：mid = 5
       day=5 的开放情况：[开, 未, 开, 未, 开]
       位置：             0   1   2   3   4
       
       遍历：
         d=1 <= 5: consecutive=1, bouquets=1, reset
         d=10 > 5: consecutive=0
         d=3 <= 5: consecutive=1, bouquets=2, reset
         d=10 > 5: consecutive=0
         d=2 <= 5: consecutive=1, bouquets=3, reset
       
       bouquets=3 >= 3 ✓
       right = 5

第2轮：mid = 3
       day=3 的开放情况：[开, 未, 开, 未, 开]
       bouquets=3 >= 3 ✓
       right = 3

第3轮：mid = 2
       day=2 的开放情况：[开, 未, 未, 未, 开]
       bouquets=2 < 3 ✗
       left = 3

left === right === 3，返回 3 ✓
```

---

## 更复杂的例子

```
bloomDay = [7, 7, 7, 7, 12, 7, 7], m = 2, k = 3

需要 2 束，每束 3 朵相邻的花

left = 7, right = 12

mid = 9:
  开放情况：[开, 开, 开, 开, 未, 开, 开]
  
  遍历：
    d=7: consecutive=1
    d=7: consecutive=2
    d=7: consecutive=3, bouquets=1, reset
    d=7: consecutive=1
    d=12 > 9: consecutive=0  ← 断开！
    d=7: consecutive=1
    d=7: consecutive=2
  
  bouquets=1 < 2 ✗
  left = 10

mid = 11:
  开放情况同上，bouquets=1 < 2 ✗
  left = 12

mid = 12:
  开放情况：[开, 开, 开, 开, 开, 开, 开]
  
  遍历：
    d=7: consecutive=1
    d=7: consecutive=2
    d=7: consecutive=3, bouquets=1, reset
    d=7: consecutive=1
    d=12: consecutive=2
    d=7: consecutive=3, bouquets=2, reset
    d=7: consecutive=1
  
  bouquets=2 >= 2 ✓
  right = 12

返回 12 ✓
```

---

## 复杂度分析

**时间复杂度**：O(n log M)
- M = max(bloomDay) - min(bloomDay)
- 二分 O(log M) 次
- 每次 check O(n)

**空间复杂度**：O(1)

---

## 常见错误

**错误1：忘记判断花不够的情况**
```typescript
// 必须先检查
if (n < m * k) return -1;  // ✅
```

**错误2：连续计数处理错误**
```typescript
// 错误：凑够一束后不重置
if (consecutive === k) {
  bouquets++;
  // 忘记 consecutive = 0  ❌
}

// 正确
if (consecutive === k) {
  bouquets++;
  consecutive = 0;  // ✅ 必须重置
}
```

**错误3：使用 consecutive >= k**
```typescript
// 错误：一束花只能用 k 朵
if (consecutive >= k) {  // ❌

// 正确：恰好 k 朵
if (consecutive === k) {  // ✅
```

---

## 与其他二分答案题的对比

| 题目 | 二分对象 | check 的特点 |
|-----|---------|-------------|
| 875 吃香蕉 | 速度 | 求总时间 |
| 1011 运货 | 运载能力 | 贪心装载 |
| 本题 | 天数 | 连续性约束 |

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [875. 爱吃香蕉的珂珂](https://leetcode.com/problems/koko-eating-bananas/) | 中等 | 时间约束 |
| [1011. 在 D 天内送达包裹](https://leetcode.com/problems/capacity-to-ship-packages-within-d-days/) | 中等 | 顺序约束 |
| [1283. 使结果不超过阈值的最小除数](https://leetcode.com/problems/find-the-smallest-divisor-given-a-threshold/) | 中等 | 除法运算 |

---

## 总结

制作 m 束花所需的最少天数核心要点：

1. **二分对象**：天数（时间维度）
2. **连续性约束**：每束需要相邻的 k 朵花
3. **断开处理**：未开放的花使连续计数归零
4. **凑束重置**：凑够一束后，连续计数归零
5. **边界检查**：先判断花的总数是否足够
