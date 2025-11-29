# 实战：有效的完全平方数

判断一个数是否是完全平方数，是平方根问题的变体。

## 问题描述

给定一个正整数`num`，如果`num`是一个完全平方数，返回true，否则返回false。

**完全平方数**：可以写成某个整数的平方的数。例如1、4、9、16都是完全平方数。

**示例**：
```
输入：num = 16
输出：true

输入：num = 14
输出：false
```

**要求**：不使用内置库函数。

## 思路分析

找一个整数`k`，使得`k * k === num`。

用二分查找在`[1, num]`范围内搜索。

## 完整实现

```javascript
/**
 * @param {number} num
 * @return {boolean}
 */
function isPerfectSquare(num) {
    if (num < 2) return true;
    
    let left = 1;
    let right = Math.floor(num / 2);
    
    while (left <= right) {
        const mid = left + Math.floor((right - left) / 2);
        const square = mid * mid;
        
        if (square === num) {
            return true;
        } else if (square < num) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    
    return false;
}
```

## 与求平方根的区别

| 问题 | 目标 | 返回值 |
|-----|------|-------|
| 求平方根 | 找最大k使得k²≤x | 整数k |
| 判断完全平方数 | 找k使得k²=num | boolean |

完全平方数要求**精确相等**，找到就返回true，找不到就返回false。

## 执行过程

```
num = 16

left=1, right=8

step 1: mid=4, 4*4=16 = num
返回 true
```

```
num = 14

left=1, right=7

step 1: mid=4, 4*4=16 > 14, right=3
step 2: mid=2, 2*2=4 < 14, left=3
step 3: mid=3, 3*3=9 < 14, left=4

left=4 > right=3, 结束
返回 false
```

## 牛顿迭代法

```javascript
function isPerfectSquare(num) {
    if (num < 2) return true;
    
    let guess = num;
    
    while (guess * guess > num) {
        guess = Math.floor((guess + num / guess) / 2);
    }
    
    return guess * guess === num;
}
```

## 数学方法

完全平方数可以表示为连续奇数之和：
- 1 = 1
- 4 = 1 + 3
- 9 = 1 + 3 + 5
- 16 = 1 + 3 + 5 + 7
- n² = 1 + 3 + 5 + ... + (2n-1)

```javascript
function isPerfectSquare(num) {
    let i = 1;
    
    while (num > 0) {
        num -= i;
        i += 2;
    }
    
    return num === 0;
}
```

时间O(√n)，不如二分查找O(log n)快。

## 复杂度分析

**二分查找**：
- 时间复杂度：O(log n)
- 空间复杂度：O(1)

## 小结

判断完全平方数的要点：

1. **二分查找**：在[1, num/2]范围内搜索
2. **精确匹配**：找到k²=num就是完全平方数
3. **避免溢出**：大数时用`mid > num / mid`
4. **多种方法**：二分、牛顿迭代、奇数和

这是二分查找用于数值判断的简单应用。
