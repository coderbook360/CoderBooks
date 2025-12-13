# 实战：水果成篮

> LeetCode 904. 水果成篮 | 难度：中等

这道题本质是"最多包含两种元素的最长子数组"，是滑动窗口的经典变体。

---

## 题目描述

你正在探访一家农场，沿着一排果树走。这些树用整数数组 `fruits` 表示，`fruits[i]` 是第 i 棵树的果实种类。

你有两个篮子，每个篮子只能装一种类型的水果。你可以从任意一棵树开始，但每棵树只能采摘一次，且必须**连续**采摘。

返回你可以收集的水果的**最大数目**。

**示例**：
```
输入：fruits = [1, 2, 1, 2, 3]
输出：4
解释：可以采摘 [2, 1, 2, 1] 或 [1, 2, 1, 2]

输入：fruits = [0, 1, 2, 2]
输出：3
解释：可以采摘 [1, 2, 2]

输入：fruits = [3, 3, 3, 1, 2, 1, 1, 2, 3, 3, 4]
输出：5
解释：可以采摘 [1, 2, 1, 1, 2]
```

---

## 思路分析

### 题意转化

去掉故事背景，问题变成：**找最长的子数组，使得其中最多只有 2 种不同的元素**。

这是典型的"最长满足条件的子数组"问题：
- **条件**：窗口内最多 2 种元素
- **收缩时机**：种类超过 2 时收缩
- **目标**：最大化窗口长度

### 滑动窗口策略

1. 右指针不断扩展，将新元素加入窗口
2. 当种类超过 2 时，收缩左指针
3. 每次更新最大长度

---

## 代码实现

```typescript
function totalFruit(fruits: number[]): number {
  const basket = new Map<number, number>(); // 类型 -> 数量
  let left = 0;
  let maxLen = 0;
  
  for (let right = 0; right < fruits.length; right++) {
    const fruit = fruits[right];
    basket.set(fruit, (basket.get(fruit) || 0) + 1);
    
    // 种类超过 2，收缩左边界
    while (basket.size > 2) {
      const leftFruit = fruits[left];
      basket.set(leftFruit, basket.get(leftFruit)! - 1);
      if (basket.get(leftFruit) === 0) {
        basket.delete(leftFruit);
      }
      left++;
    }
    
    maxLen = Math.max(maxLen, right - left + 1);
  }
  
  return maxLen;
}
```

---

## 执行过程可视化

```
fruits = [1, 2, 1, 2, 3]

right=0, fruit=1:
  basket = {1: 1}
  size=1 <= 2, 有效
  maxLen = 1

right=1, fruit=2:
  basket = {1: 1, 2: 1}
  size=2 <= 2, 有效
  maxLen = 2

right=2, fruit=1:
  basket = {1: 2, 2: 1}
  size=2 <= 2, 有效
  maxLen = 3

right=3, fruit=2:
  basket = {1: 2, 2: 2}
  size=2 <= 2, 有效
  maxLen = 4

right=4, fruit=3:
  basket = {1: 2, 2: 2, 3: 1}
  size=3 > 2, 需要收缩

  收缩 left=0: fruits[0]=1
    basket = {1: 1, 2: 2, 3: 1}
    size=3 > 2, 继续收缩

  收缩 left=1: fruits[1]=2
    basket = {1: 1, 2: 1, 3: 1}
    size=3 > 2, 继续收缩

  收缩 left=2: fruits[2]=1
    basket = {2: 1, 3: 1}
    size=2 <= 2, 停止收缩

  maxLen = max(4, 4-2) = 4

返回 4 ✓
```

---

## 为什么用 Map 而不是数组

**Map 的优势**：
- 可以直接获取种类数量 `basket.size`
- 删除操作简洁

**数组实现**也可以，但需要额外维护种类计数：

```typescript
function totalFruit(fruits: number[]): number {
  const count: number[] = [];
  let left = 0;
  let maxLen = 0;
  let kinds = 0;  // 需要额外维护
  
  for (let right = 0; right < fruits.length; right++) {
    const fruit = fruits[right];
    count[fruit] = (count[fruit] || 0) + 1;
    if (count[fruit] === 1) kinds++;
    
    while (kinds > 2) {
      const leftFruit = fruits[left];
      count[leftFruit]--;
      if (count[leftFruit] === 0) kinds--;
      left++;
    }
    
    maxLen = Math.max(maxLen, right - left + 1);
  }
  
  return maxLen;
}
```

---

## 复杂度分析

**时间复杂度**：O(n)
- 每个元素最多进入窗口一次，离开窗口一次
- left 和 right 都只向右移动

**空间复杂度**：O(1)
- Map 中最多 3 种水果（暂时超过 2 种时）

---

## 推广：最多 k 种元素

将条件从 2 改为 k，代码几乎不变：

```typescript
function maxLengthWithKTypes(arr: number[], k: number): number {
  const map = new Map<number, number>();
  let left = 0;
  let maxLen = 0;
  
  for (let right = 0; right < arr.length; right++) {
    const item = arr[right];
    map.set(item, (map.get(item) || 0) + 1);
    
    while (map.size > k) {
      const leftItem = arr[left];
      map.set(leftItem, map.get(leftItem)! - 1);
      if (map.get(leftItem) === 0) {
        map.delete(leftItem);
      }
      left++;
    }
    
    maxLen = Math.max(maxLen, right - left + 1);
  }
  
  return maxLen;
}
```

---

## 常见错误

**错误1：忘记删除计数为 0 的元素**
```typescript
// 错误：size 不会减少
basket.set(leftFruit, basket.get(leftFruit)! - 1);
// 忘记 delete  ❌

// 正确
if (basket.get(leftFruit) === 0) {
  basket.delete(leftFruit);  // ✅
}
```

**错误2：更新 maxLen 的时机**
```typescript
// 应该在每次循环结束时更新，而不是在 while 内部
```

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [3. 无重复字符的最长子串](https://leetcode.com/problems/longest-substring-without-repeating-characters/) | 中等 | 所有字符不同 |
| [159. 至多包含两个不同字符的最长子串](https://leetcode.com/problems/longest-substring-with-at-most-two-distinct-characters/) | 中等 | 本题的字符串版 |
| [340. 至多包含 K 个不同字符的最长子串](https://leetcode.com/problems/longest-substring-with-at-most-k-distinct-characters/) | 中等 | k 种字符 |

---

## 总结

水果成篮的核心要点：

1. **题意转化**：最多 2 种元素的最长子数组
2. **窗口条件**：`basket.size <= 2`
3. **收缩时机**：种类超过 2 时
4. **Map 技巧**：利用 size 属性判断种类数量
5. **推广能力**：改成 k 种元素只需改一个数字
  
  for (let right = 0; right < arr.length; right++) {
    map.set(arr[right], (map.get(arr[right]) || 0) + 1);
    
    while (map.size > k) {
      const leftVal = arr[left];
      map.set(leftVal, map.get(leftVal)! - 1);
      if (map.get(leftVal) === 0) map.delete(leftVal);
      left++;
    }
    
    maxLen = Math.max(maxLen, right - left + 1);
  }
  
  return maxLen;
}
```
