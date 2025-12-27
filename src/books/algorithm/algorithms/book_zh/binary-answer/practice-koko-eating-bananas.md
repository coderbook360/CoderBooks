# 实战：爱吃香蕉的珂珂

> LeetCode 875. 爱吃香蕉的珂珂 | 难度：中等

二分答案的入门经典题，完美诠释了"求最值"类问题的解题框架。

---

## 题目描述

珂珂喜欢吃香蕉。这里有 n 堆香蕉，第 i 堆有 `piles[i]` 根香蕉。警卫已经离开了，将在 h 小时后回来。

珂珂可以决定她吃香蕉的速度 k（每小时吃 k 根）。每小时她选择一堆香蕉开始吃，如果这堆香蕉少于 k 根，她将吃完这堆的所有香蕉，然后这一小时内不会再吃更多。

返回她可以在 h 小时内吃掉所有香蕉的**最小速度** k。

**示例**：
```
输入：piles = [3, 6, 7, 11], h = 8
输出：4
解释：速度为4时，各堆耗时 1+2+2+3=8 小时，刚好吃完

输入：piles = [30, 11, 23, 4, 20], h = 5
输出：30
解释：每堆必须1小时吃完，需要最大堆的数量
```

---

## 二分答案框架分析

**为什么能用二分？**

1. **答案空间确定**：k ∈ [1, max(piles)]
2. **单调性**：速度越快，耗时越少
3. **可验证性**：给定 k，可以 O(n) 判断是否可行

```
速度 k:  1  2  3  4  5  6  ...  11
可行性:  ✗  ✗  ✗  ✓  ✓  ✓  ...  ✓
                 ↑
                最小可行解
```

---

## 代码实现

### 基础版本

```typescript
/**
 * 爱吃香蕉的珂珂 - 二分答案经典题
 * 
 * 【问题抽象】
 * - 给定 n 堆香蕉和时间限制 h
 * - 求满足条件的最小吃香蕉速度 k
 * 
 * 【二分答案思路】
 * - 答案空间：k ∈ [1, max(piles)]
 *   - 最慢：1 根/小时
 *   - 最快：每堆1小时吃完，速度 = 最大堆的数量
 * - 单调性：速度越快，耗时越少
 *   - 存在临界点：低于它不行，高于它都行
 * - 我们要找的是第一个能完成的速度（最小可行解）
 * 
 * 时间复杂度：O(n log m)，n=piles长度，m=max(piles)
 * 空间复杂度：O(1)
 */
function minEatingSpeed(piles: number[], h: number): number {
  // 答案空间的边界
  let left = 1;                    // 最小速度：1根/小时
  let right = Math.max(...piles);  // 最大速度：最大堆的数量
  
  // 二分查找第一个使 canFinish 为 true 的速度
  // 不变量：答案在 [left, right] 区间内
  while (left < right) {
    // 取中间速度
    const mid = left + Math.floor((right - left) / 2);
    
    if (canFinish(piles, mid, h)) {
      // 速度 mid 可以在 h 小时内吃完
      // mid 可能就是答案，但也许更慢的速度也行
      // 所以在 [left, mid] 中继续寻找更小的可行速度
      right = mid;
    } else {
      // 速度 mid 不够快，吃不完
      // 需要更快的速度，在 [mid+1, right] 中寻找
      left = mid + 1;
    }
  }
  
  // 循环结束时 left == right，即为最小可行速度
  return left;
}

/**
 * 检查函数：以速度 speed 能否在 h 小时内吃完所有香蕉
 * 
 * @param piles - 各堆香蕉数量
 * @param speed - 尝试的吃香蕉速度（根/小时）
 * @param h - 时间限制（小时）
 * @returns 是否能在 h 小时内吃完
 * 
 * 【计算逻辑】
 * 对于每堆香蕉 pile：
 * - 需要 ceil(pile / speed) 小时吃完
 * - 因为每小时只能吃一堆，且一堆没吃完不能换下一堆
 */
function canFinish(piles: number[], speed: number, h: number): boolean {
  let hours = 0;  // 总耗时
  
  for (const pile of piles) {
    // 吃完这一堆需要多少小时？
    // pile=7, speed=3 → 需要 3 小时（第1小时吃3根，第2小时吃3根，第3小时吃1根）
    // 数学上就是 ceil(7/3) = 3
    hours += Math.ceil(pile / speed);
  }
  
  // 总耗时不超过 h 小时则可行
  return hours <= h;
}
```

### 内联 check 函数

```typescript
function minEatingSpeed(piles: number[], h: number): number {
  let left = 1;
  let right = Math.max(...piles);
  
  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    
    // 计算速度 mid 所需总时间
    let hours = 0;
    for (const pile of piles) {
      hours += Math.ceil(pile / mid);
    }
    
    if (hours <= h) {
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
piles = [3, 6, 7, 11], h = 8

初始：left = 1, right = 11

第1轮：mid = 6
  耗时：ceil(3/6) + ceil(6/6) + ceil(7/6) + ceil(11/6)
      = 1 + 1 + 2 + 2 = 6 <= 8 ✓
  可行，right = 6

第2轮：mid = 3
  耗时：ceil(3/3) + ceil(6/3) + ceil(7/3) + ceil(11/3)
      = 1 + 2 + 3 + 4 = 10 > 8 ✗
  不可行，left = 4

第3轮：mid = 5
  耗时：1 + 2 + 2 + 3 = 8 <= 8 ✓
  可行，right = 5

第4轮：mid = 4
  耗时：1 + 2 + 2 + 3 = 8 <= 8 ✓
  可行，right = 4

left === right = 4，结束
返回 4 ✓
```

---

## check 函数设计要点

### 1. 向上取整的计算

```typescript
// 标准写法
Math.ceil(pile / speed)

// 等价的整数运算（避免浮点精度问题）
Math.floor((pile + speed - 1) / speed)

// 或使用位运算（仅适用于正整数）
((pile - 1) / speed | 0) + 1
```

### 2. 边界条件

```typescript
// 考虑：如果 h < piles.length，一定无解
// 但题目保证有解，所以可以不处理

// 考虑：如果 h === piles.length
// 每堆只能用1小时，速度必须是 max(piles)
```

---

## 为什么是 right = mid 而非 right = mid - 1？

这道题求的是**最小速度**（左边界问题）：

```typescript
// 当 check(mid) 为 true 时：
// - mid 是一个可行解
// - 但可能存在更小的可行解
// - 所以保留 mid：right = mid

// 当 check(mid) 为 false 时：
// - mid 不可行
// - 比 mid 更小的也不可行
// - 所以排除 mid：left = mid + 1
```

---

## 复杂度分析

**时间复杂度**：O(n log M)
- 二分范围：log(max(piles))
- check 函数：O(n)

**空间复杂度**：O(1)

---

## 常见错误

**错误1：边界设置错误**
```typescript
// 错误：right 从 max(piles) - 1 开始
let right = Math.max(...piles) - 1;  // ❌

// 如果只有一堆且 h=1，正确答案就是 max(piles)
let right = Math.max(...piles);  // ✅
```

**错误2：mid 计算溢出**
```typescript
// 在其他语言可能溢出
const mid = (left + right) / 2;  // ⚠️

// 安全写法
const mid = left + Math.floor((right - left) / 2);  // ✅
```

**错误3：向上取整计算错误**
```typescript
// 错误：整数除法向下取整
hours += pile / speed;  // ❌

// 正确
hours += Math.ceil(pile / speed);  // ✅
```

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [1011. 在 D 天内送达包裹的能力](https://leetcode.com/problems/capacity-to-ship-packages-within-d-days/) | 中等 | 同类型 |
| [410. 分割等和子集](https://leetcode.com/problems/split-array-largest-sum/) | 困难 | 最大值最小 |
| [774. 最小化去加油站的最大距离](https://leetcode.com/problems/minimize-max-distance-to-gas-station/) | 困难 | 浮点二分 |

---

## 二分答案模板总结

```typescript
// 求满足条件的最小值（左边界）
function findMin(params): number {
  let left = MIN_POSSIBLE;
  let right = MAX_POSSIBLE;
  
  while (left < right) {
    const mid = left + ((right - left) >> 1);
    
    if (check(mid)) {
      right = mid;      // 可行，尝试更小
    } else {
      left = mid + 1;   // 不可行，排除
    }
  }
  
  return left;
}
```

---

## 总结

爱吃香蕉的珂珂是学习二分答案的最佳入门题：

1. **答案空间明确**：[1, max(piles)]
2. **单调性清晰**：速度↑ → 时间↓
3. **check 函数简单**：一次遍历计算总时间
4. **二分方向**：求最小值，用左边界模板

掌握这道题后，其他二分答案题目只是 check 函数的变化。
