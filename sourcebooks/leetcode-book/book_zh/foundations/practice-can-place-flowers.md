# 种花问题

> LeetCode 605. Can Place Flowers

给定一个花坛（用数组表示），其中 1 表示已种花，0 表示空位。花不能种在相邻的位置。判断能否在花坛中种入 n 朵花。

这道题考察的是**贪心策略**——能种就种，尽早种花。

## 问题描述

```javascript
输入：flowerbed = [1, 0, 0, 0, 1], n = 1
输出：true
解释：位置 2 可以种花，左右都是空的

输入：flowerbed = [1, 0, 0, 0, 1], n = 2
输出：false
解释：只有位置 2 可以种，种不下 2 朵花
```

**规则**：
- 花不能种在相邻位置（包括已有的花旁边）
- 只能在值为 0 的位置种花

## 思路分析

### 贪心策略

从左到右扫描，只要能种就立刻种。

**为什么贪心是对的**？

假设位置 i 可以种花（左右都是空的），如果我们不种：
- 位置 i 仍然是空的
- 位置 i+1 可能也是空的，但它左边是空的，对它没坏处
- 不种花不会让后面能种更多

所以"能种就种"不会错过任何机会。

### 相邻条件判断

一个位置能种花，需要满足三个条件：
1. 当前位置是空的（`flowerbed[i] === 0`）
2. 左边是空的，或者是边界
3. 右边是空的，或者是边界

## 解法详解

```javascript
function canPlaceFlowers(flowerbed, n) {
    let count = 0;
    const len = flowerbed.length;
    
    for (let i = 0; i < len; i++) {
        // 只考虑空位
        if (flowerbed[i] === 0) {
            // 检查左边：首位置视为"左边是空的"
            const leftEmpty = (i === 0) || (flowerbed[i - 1] === 0);
            // 检查右边：末位置视为"右边是空的"
            const rightEmpty = (i === len - 1) || (flowerbed[i + 1] === 0);
            
            if (leftEmpty && rightEmpty) {
                // 可以种花
                flowerbed[i] = 1;
                count++;
                
                // 提前返回，避免不必要的遍历
                if (count >= n) return true;
            }
        }
    }
    
    return count >= n;
}
```

**边界处理技巧**：

```javascript
// i === 0 时，认为左边是空的
const leftEmpty = (i === 0) || (flowerbed[i - 1] === 0);

// i === len - 1 时，认为右边是空的
const rightEmpty = (i === len - 1) || (flowerbed[i + 1] === 0);
```

### 执行过程

以 `flowerbed = [1, 0, 0, 0, 1]`，`n = 1` 为例：

```
len = 5

i=0: flowerbed[0]=1 ≠ 0, 跳过（已有花）

i=1: flowerbed[1]=0
     左边: flowerbed[0]=1 ≠ 0, leftEmpty=false
     不能种

i=2: flowerbed[2]=0
     左边: flowerbed[1]=0, leftEmpty=true
     右边: flowerbed[3]=0, rightEmpty=true
     可以种! flowerbed[2]=1, count=1
     现在: [1, 0, 1, 0, 1]

count=1 >= n=1, 返回 true
```

以 `n = 2` 为例：

```
继续上面的过程...

i=3: flowerbed[3]=0
     左边: flowerbed[2]=1, leftEmpty=false
     不能种

i=4: flowerbed[4]=1, 跳过

遍历结束, count=1 < n=2, 返回 false
```

## 复杂度分析

**时间复杂度：O(n)**
- 最多遍历一次数组
- 如果提前达到目标，会提前返回

**空间复杂度：O(1)**
- 只用了几个变量
- 直接修改原数组（如果不允许修改，可以跳过 `i+1` 来模拟"种花"效果）

## 不修改原数组的写法

如果要求不修改输入数组：

```javascript
function canPlaceFlowers(flowerbed, n) {
    let count = 0;
    const len = flowerbed.length;
    
    for (let i = 0; i < len; i++) {
        if (flowerbed[i] === 0) {
            const leftEmpty = (i === 0) || (flowerbed[i - 1] === 0);
            const rightEmpty = (i === len - 1) || (flowerbed[i + 1] === 0);
            
            if (leftEmpty && rightEmpty) {
                count++;
                i++;  // 跳过下一个位置（因为它旁边已经"种了花"）
                
                if (count >= n) return true;
            }
        }
    }
    
    return count >= n;
}
```

种花后跳过 `i++`，等价于把下一个位置的左边标记为"有花"。

## 边界情况

```javascript
// 只有一个空位
canPlaceFlowers([0], 1)  // true

// 只有一个已种的位置
canPlaceFlowers([1], 1)  // false

// n = 0
canPlaceFlowers([1, 0, 1], 0)  // true（不需要种花）

// 连续的空位
canPlaceFlowers([0, 0, 0, 0, 0], 3)  // true（位置0, 2, 4可种）
```

## 常见误区

**误区一：忘记边界处理**

```javascript
// ❌ 错误：i=0 时访问 flowerbed[-1]
const leftEmpty = flowerbed[i - 1] === 0;

// ✅ 正确
const leftEmpty = (i === 0) || (flowerbed[i - 1] === 0);
```

**误区二：种花后忘记标记**

```javascript
// ❌ 错误：没有标记种花
if (leftEmpty && rightEmpty) {
    count++;
    // 忘了 flowerbed[i] = 1;
}
// 下一个位置会错误地认为这里是空的
```

## 小结

这道题的关键点：

1. **贪心策略**：能种就种，不会错过最优解
2. **边界处理**：首尾位置需要特殊判断
3. **标记已种**：种花后要更新数组（或跳过下一位置）

贪心算法的核心是证明"局部最优能导致全局最优"。在这道题中，尽早种花不会影响后续的种植机会，所以贪心是正确的。
