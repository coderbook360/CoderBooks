# 实战：种花问题

这道题是**贪心算法**的入门题。通过一个生动的种花场景，我们来理解什么是贪心策略以及为什么它是正确的。

---

## 题目描述

**LeetCode 605. Can Place Flowers**

假设有一个很长的花坛，一部分地块种植了花，另一部分却没有。可是，花不能种植在相邻的地块上，它们会争夺水源，两者都会死去。

给你一个整数数组 `flowerbed` 表示花坛，由若干 `0` 和 `1` 组成，其中 `0` 表示没种植花，`1` 表示种植了花。另有一个数 `n`，能否在不打破种植规则的情况下种入 `n` 朵花？能则返回 `true`，不能则返回 `false`。

**示例 1**：

```
输入：flowerbed = [1,0,0,0,1], n = 1
输出：true
```

**示例 2**：

```
输入：flowerbed = [1,0,0,0,1], n = 2
输出：false
```

**提示**：
- 1 <= flowerbed.length <= 2 × 10^4
- flowerbed[i] 为 0 或 1
- flowerbed 中不存在相邻的两朵花（初始状态合法）
- 0 <= n <= flowerbed.length

---

## 问题分析

首先要问一个问题：**什么位置可以种花？**

一个位置可以种花，需要同时满足三个条件：
1. 当前位置是空的（值为 0）
2. 左边是空的（值为 0 或者是边界）
3. 右边是空的（值为 0 或者是边界）

再问第二个问题：**遇到可以种的位置，应该种还是跳过？**

这就是贪心策略的核心：**能种就种**。

---

## 为什么贪心策略正确？

你可能会想：现在种了，会不会影响后面，导致总体能种的更少？

让我们用反证法：假设在某个可种位置不种，而是跳过去种后面的。

- 如果后面能种，那现在种也不会影响后面
- 如果后面不能种，那现在种更划算

所以"能种就种"**永远不会更差**，这就是贪心策略正确的原因。

---

## 解法：贪心遍历

```javascript
function canPlaceFlowers(flowerbed, n) {
  let count = 0;
  
  for (let i = 0; i < flowerbed.length; i++) {
    if (flowerbed[i] === 0) {
      // 检查左右是否为空（边界视为空）
      const leftEmpty = (i === 0) || (flowerbed[i - 1] === 0);
      const rightEmpty = (i === flowerbed.length - 1) || (flowerbed[i + 1] === 0);
      
      if (leftEmpty && rightEmpty) {
        flowerbed[i] = 1;  // 种花
        count++;
        
        // 提前终止：已经够了
        if (count >= n) {
          return true;
        }
      }
    }
  }
  
  return count >= n;
}
```

**复杂度分析**：
- 时间复杂度：O(n)
- 空间复杂度：O(1)

---

## 执行过程可视化

用 `flowerbed = [1, 0, 0, 0, 1], n = 1` 走一遍：

```
初始状态：[1, 0, 0, 0, 1]

i=0: flowerbed[0]=1，已有花，跳过
i=1: flowerbed[1]=0，检查左右
     左 = flowerbed[0] = 1 ≠ 0，不能种
i=2: flowerbed[2]=0，检查左右
     左 = flowerbed[1] = 0 ✓
     右 = flowerbed[3] = 0 ✓
     可以种！count=1，flowerbed=[1,0,1,0,1]
     count >= n，提前返回 true

输出：true
```

图示：
```
原始：  [1, 0, 0, 0, 1]
             ↑
           可以种

结果：  [1, 0, 1, 0, 1]
             ↑
           种了花
```

---

## 关键细节解析

### 边界处理

数组的首尾需要特殊处理：
- 第一个位置：左边视为空
- 最后一个位置：右边视为空

```javascript
const leftEmpty = (i === 0) || (flowerbed[i - 1] === 0);
const rightEmpty = (i === flowerbed.length - 1) || (flowerbed[i + 1] === 0);
```

**顺序很重要**：先判断边界条件，利用短路求值避免数组越界。

### 为什么要标记种花？

种花后，我们修改 `flowerbed[i] = 1`。这样后续遍历时，下一个位置检查左邻居就会发现"有花"，不会种在相邻位置。

### 另一种写法：跳过下一个位置

也可以不修改数组，而是跳过：

```javascript
function canPlaceFlowers(flowerbed, n) {
  let count = 0;
  let i = 0;
  
  while (i < flowerbed.length) {
    if (flowerbed[i] === 0) {
      const leftEmpty = (i === 0) || (flowerbed[i - 1] === 0);
      const rightEmpty = (i === flowerbed.length - 1) || (flowerbed[i + 1] === 0);
      
      if (leftEmpty && rightEmpty) {
        count++;
        i += 2;  // 跳过下一个位置（一定不能种）
        continue;
      }
    }
    i++;
  }
  
  return count >= n;
}
```

---

## 边界情况

- **n = 0**：不需要种，直接返回 true
- **全是 0**：如 `[0, 0, 0]`，可以种 2 朵（首尾各一朵）
- **全是 1**：无法种花，能种 0 朵
- **单个位置**：`[0]` 可以种 1 朵

---

## 常见错误

### 错误1：边界访问越界

```javascript
// ❌ 可能越界
if (flowerbed[i - 1] === 0 && flowerbed[i + 1] === 0)

// ✅ 先检查边界
if ((i === 0 || flowerbed[i - 1] === 0) && 
    (i === len - 1 || flowerbed[i + 1] === 0))
```

### 错误2：种花后不标记

```javascript
// ❌ 不标记会导致相邻位置也被种
if (leftEmpty && rightEmpty) {
  count++;
  // 忘了 flowerbed[i] = 1;
}
```

---

## 本章小结

这道题展示了贪心算法的基本思想：
- **局部最优**：遇到能种的位置就种
- **全局最优**：这样做能种最多的花

贪心策略的正确性需要证明。本题中，"能种就种"不会让后续更差，所以是正确的。

关键技巧：
1. 边界处理：首尾位置特殊判断
2. 状态更新：种花后标记，或跳过下一个位置
3. 提前终止：满足条件就返回，不必遍历完

## 相关题目

- **495. 提莫攻击**：区间合并的贪心问题
- **860. 柠檬水找零**：贪心策略的经典应用
- **455. 分发饼干**：贪心匹配问题
