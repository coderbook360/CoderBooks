# 实战：在 D 天内送达包裹的能力

> LeetCode 1011. 在 D 天内送达包裹的能力 | 难度：中等

与"爱吃香蕉的珂珂"齐名的二分答案经典题，场景不同但思路一致。

---

## 题目描述

传送带上的包裹必须在 `days` 天内从一个港口运送到另一个港口。

传送带上第 i 个包裹的重量为 `weights[i]`。每天，我们都会按给出重量的顺序往传送带上装载包裹，但不能超过船的**最大运载重量**。

返回能在 `days` 天内将所有包裹送达的船的**最低运载能力**。

**示例**：
```
输入：weights = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], days = 5
输出：15
解释：
第1天: 1, 2, 3, 4, 5（和=15）
第2天: 6, 7（和=13）
第3天: 8（和=8）
第4天: 9（和=9）
第5天: 10（和=10）

输入：weights = [3, 2, 2, 4, 1, 4], days = 3
输出：6
```

---

## 二分答案框架分析

**为什么能用二分？**

1. **答案空间确定**：capacity ∈ [max(weights), sum(weights)]
   - 最小：至少能装下最重的包裹
   - 最大：一天运完所有包裹

2. **单调性**：运载能力越大，所需天数越少

3. **可验证性**：给定 capacity，可以 O(n) 模拟判断

```
运载能力:   10  11  12  13  14  15  16  ...  55
所需天数:   10   9   8   7   6   5   4  ...   1
可行性:     ✗   ✗   ✗   ✗   ✗   ✓   ✓  ...   ✓
                              ↑
                          最小可行解
```

---

## 代码实现

### 基础版本

```typescript
function shipWithinDays(weights: number[], days: number): number {
  let left = Math.max(...weights);
  let right = weights.reduce((a, b) => a + b, 0);
  
  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    
    if (canShip(weights, mid, days)) {
      right = mid;  // 可行，尝试更小的运载能力
    } else {
      left = mid + 1;  // 不可行，需要更大
    }
  }
  
  return left;
}

function canShip(weights: number[], capacity: number, days: number): boolean {
  let dayCount = 1;      // 至少需要1天
  let currentLoad = 0;   // 当天已装载重量
  
  for (const weight of weights) {
    if (currentLoad + weight > capacity) {
      // 装不下了，开新的一天
      dayCount++;
      currentLoad = weight;
    } else {
      currentLoad += weight;
    }
  }
  
  return dayCount <= days;
}
```

### 内联版本

```typescript
function shipWithinDays(weights: number[], days: number): number {
  let left = Math.max(...weights);
  let right = weights.reduce((a, b) => a + b, 0);
  
  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    
    // 模拟装载过程
    let dayCount = 1;
    let currentLoad = 0;
    
    for (const weight of weights) {
      if (currentLoad + weight > mid) {
        dayCount++;
        currentLoad = weight;
      } else {
        currentLoad += weight;
      }
    }
    
    if (dayCount <= days) {
      right = mid;
    } else {
      left = mid + 1;
    }
  }
  
  return left;
}
```

---

## 执行过程可视化

```
weights = [1,2,3,4,5,6,7,8,9,10], days = 5

初始：left = 10, right = 55

第1轮：mid = 32
  模拟：[1,2,3,4,5,6,7] = 28, [8,9,10] = 27
  2天 <= 5天 ✓，right = 32

第2轮：mid = 21
  模拟：[1,2,3,4,5,6] = 21, [7,8] = 15, [9,10] = 19
  3天 <= 5天 ✓，right = 21

第3轮：mid = 15
  模拟：[1,2,3,4,5] = 15, [6,7] = 13, [8] = 8, [9] = 9, [10] = 10
  5天 <= 5天 ✓，right = 15

第4轮：mid = 12
  模拟：[1,2,3,4] = 10, [5,6] = 11, [7] = 7, [8] = 8, [9] = 9, [10] = 10
  6天 > 5天 ✗，left = 13

第5轮：mid = 14
  模拟：[1,2,3,4] = 10, [5,6] = 11, [7] = 7, [8] = 8, [9] = 9, [10] = 10
  等等，让我重新算：[1,2,3,4]=10 < 14，加5变15 > 14
  [1,2,3,4] = 10, [5,6] = 11, [7] = 7加8=15 > 14
  [1,2,3,4], [5,6], [7], [8], [9], [10] = 6天 > 5天 ✗，left = 15

left === right = 15，返回 15 ✓
```

---

## 与"爱吃香蕉的珂珂"对比

| 维度 | 爱吃香蕉 | 送包裹 |
|-----|---------|--------|
| 答案含义 | 速度（每小时吃几根） | 运载能力（船容量） |
| 答案下界 | 1 | max(weights) |
| 答案上界 | max(piles) | sum(weights) |
| 任务单位 | 每堆独立 | 可合并多个 |
| check 逻辑 | 累加 ceil(pile/speed) | 贪心装载模拟 |

---

## check 函数设计要点

### 贪心装载策略

```typescript
// 贪心：能装就装，装不下就开新的一天
for (const weight of weights) {
  if (currentLoad + weight > capacity) {
    dayCount++;          // 开新的一天
    currentLoad = weight; // 这个包裹放到新的一天
  } else {
    currentLoad += weight;
  }
}
```

**为什么贪心是正确的？**

因为包裹必须**按顺序**装载，贪心策略最大化利用每天的运载能力，不会产生更差的结果。

### 边界情况

```typescript
// 注意：weight 永远不会超过 capacity
// 因为 left 从 max(weights) 开始
// 所以不需要额外检查单个包裹超重
```

---

## 复杂度分析

**时间复杂度**：O(n log S)
- S = sum(weights)
- 二分范围：log(S - max(weights))
- check 函数：O(n)

**空间复杂度**：O(1)

---

## 常见错误

**错误1：left 初始值错误**
```typescript
// 错误：从1开始
let left = 1;  // ❌

// 正确：必须能装下最重的包裹
let left = Math.max(...weights);  // ✅
```

**错误2：check 函数初始化错误**
```typescript
// 错误：dayCount 从0开始
let dayCount = 0;  // ❌

// 正确：至少需要1天
let dayCount = 1;  // ✅
```

**错误3：装不下时处理错误**
```typescript
// 错误：忘记把当前包裹放到新的一天
if (currentLoad + weight > capacity) {
  dayCount++;
  currentLoad = 0;  // ❌ 当前包裹丢失了！
}

// 正确
if (currentLoad + weight > capacity) {
  dayCount++;
  currentLoad = weight;  // ✅ 当前包裹放到新的一天
}
```

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [875. 爱吃香蕉的珂珂](https://leetcode.com/problems/koko-eating-bananas/) | 中等 | 任务独立 |
| [410. 分割等和子集](https://leetcode.com/problems/split-array-largest-sum/) | 困难 | 同构问题 |
| [1231. 分享巧克力](https://leetcode.com/problems/divide-chocolate/) | 困难 | 最大化最小 |

---

## 送包裹与分割数组的等价性

**送包裹**：将数组分成最多 days 段，使得每段和不超过 capacity

**分割数组（410题）**：将数组分成恰好 m 段，最小化最大段和

两道题本质相同！只是问法不同：
- 送包裹：给定上界，问能否分成 k 段
- 分割数组：给定段数，求最小上界

---

## 总结

在 D 天内送达包裹的核心要点：

1. **答案空间**：[max(weights), sum(weights)]
2. **单调性**：运载能力↑ → 天数↓
3. **check 函数**：贪心模拟装载过程
4. **二分方向**：求最小值，用左边界模板
5. **关键区别**：与吃香蕉不同，这里任务可合并
