# 实战：x的平方根

这是二分查找应用于数学问题的典型例子。不是在数组中搜索，而是在数值范围内搜索。

## 问题描述

给你一个非负整数`x`，计算并返回`x`的算术平方根。

由于返回类型是整数，结果只保留整数部分，小数部分将被舍去。

**示例**：
```
输入：x = 4
输出：2

输入：x = 8
输出：2
解释：8 的算术平方根是 2.82842...，取整后是 2
```

## 思路分析

找最大的整数`k`，使得`k * k <= x`。

这是在`[0, x]`范围内搜索满足条件的最大值，用二分查找。

## 完整实现

```javascript
/**
 * @param {number} x
 * @return {number}
 */
function mySqrt(x) {
    if (x < 2) return x;
    
    let left = 1;
    let right = Math.floor(x / 2);  // 平方根不会超过 x/2
    
    while (left <= right) {
        const mid = left + Math.floor((right - left) / 2);
        const square = mid * mid;
        
        if (square === x) {
            return mid;
        } else if (square < x) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    
    // right 是最大的 k 使得 k*k <= x
    return right;
}
```

## 为什么返回right？

循环结束时：
- `left = right + 1`
- `right * right <= x`
- `left * left > x`

所以`right`就是我们要找的答案。

## 执行过程

```
x = 8

left=1, right=4

step 1: mid=2, 2*2=4 < 8, left=3
step 2: mid=3, 3*3=9 > 8, right=2
step 3: mid=2, 2*2=4 < 8, left=3

left=3 > right=2, 结束
返回 right=2
```

## 另一种写法：找第一个平方大于x的数

```javascript
function mySqrt(x) {
    let left = 0;
    let right = x + 1;
    
    while (left < right) {
        const mid = left + Math.floor((right - left) / 2);
        
        if (mid > x / mid) {  // 避免溢出
            right = mid;
        } else {
            left = mid + 1;
        }
    }
    
    return left - 1;
}
```

## 优化：缩小搜索范围

```javascript
function mySqrt(x) {
    if (x < 2) return x;
    
    // 平方根的位数约为 x 位数的一半
    // 所以 sqrt(x) < 2^((log2(x)/2)+1) = 2^(bits/2+1)
    const bits = Math.floor(Math.log2(x));
    let left = 1 << (bits >> 1);
    let right = 1 << ((bits >> 1) + 1);
    
    while (left <= right) {
        const mid = left + ((right - left) >> 1);
        
        if (mid === x / mid) {
            return mid;
        } else if (mid < x / mid) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    
    return right;
}
```

## 牛顿迭代法（更快）

```javascript
function mySqrt(x) {
    if (x < 2) return x;
    
    let guess = x;
    
    while (guess > x / guess) {
        guess = Math.floor((guess + x / guess) / 2);
    }
    
    return guess;
}
```

牛顿迭代法收敛速度更快，但二分查找更直观。

## 复杂度分析

**二分查找**：
- 时间复杂度：O(log x)
- 空间复杂度：O(1)

**牛顿迭代**：
- 时间复杂度：O(log x)，但常数更小
- 空间复杂度：O(1)

## 小结

求平方根的要点：

1. **问题转化**：找最大的k使得k² ≤ x
2. **搜索范围**：[1, x/2]
3. **避免溢出**：用`mid > x / mid`代替`mid * mid > x`
4. **返回值**：循环结束时返回right

这道题展示了二分查找不只用于数组搜索，还可以用于数值搜索。
