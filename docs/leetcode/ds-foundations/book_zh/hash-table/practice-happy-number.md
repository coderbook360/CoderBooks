# 实战：快乐数

这道题很有趣——用哈希表检测**循环**。

## 题目描述

> **LeetCode 202. 快乐数**
>
> 编写一个算法来判断一个数 n 是不是快乐数。
>
> **「快乐数」定义**：对于一个正整数，每一次将该数替换为它每个位置上的数字的平方和，重复这个过程直到这个数变为 1，也可能是**无限循环**但始终变不到 1。如果最终为 1，就是快乐数。

**示例 1**：

```
输入：n = 19
输出：true
解释：
1² + 9² = 82
8² + 2² = 68
6² + 8² = 100
1² + 0² + 0² = 1  ✓
```

**示例 2**：

```
输入：n = 2
输出：false
解释：会进入循环 2 → 4 → 16 → 37 → 58 → 89 → 145 → 42 → 20 → 4 → ...
```

## 问题分析

核心问题：这个序列要么最终变成 1，要么进入**循环**。

如何检测循环？用哈希表记录出现过的数字，如果某个数字再次出现，说明进入循环。

## 辅助函数：计算各位数字平方和

```javascript
function getNext(n) {
    let sum = 0;
    while (n > 0) {
        const digit = n % 10;
        sum += digit * digit;
        n = Math.floor(n / 10);
    }
    return sum;
}
```

执行过程：

```
n = 19
19 % 10 = 9 → 9² = 81
19 / 10 = 1
1 % 10 = 1 → 1² = 1
1 / 10 = 0
sum = 81 + 1 = 82
```

## 解法一：哈希集合检测循环

```javascript
function isHappy(n) {
    const seen = new Set();
    
    while (n !== 1 && !seen.has(n)) {
        seen.add(n);
        n = getNext(n);
    }
    
    return n === 1;
}

function getNext(n) {
    let sum = 0;
    while (n > 0) {
        const digit = n % 10;
        sum += digit * digit;
        n = Math.floor(n / 10);
    }
    return sum;
}
```

### 执行过程

```
n = 19

n=19: seen = {19}, n = 82
n=82: seen = {19, 82}, n = 68
n=68: seen = {19, 82, 68}, n = 100
n=100: seen = {..., 100}, n = 1

n === 1，return true
```

### 复杂度

- **时间**：取决于循环长度，最坏 O(log n × log n)
- **空间**：O(log n)，存储出现过的数字

## 解法二：快慢指针

这道题本质上是**判断链表是否有环**！

把每个数看作链表节点，`getNext(n)` 就是指向下一个节点的指针。用快慢指针检测环：

```javascript
function isHappy(n) {
    let slow = n;
    let fast = getNext(n);
    
    while (fast !== 1 && slow !== fast) {
        slow = getNext(slow);
        fast = getNext(getNext(fast));
    }
    
    return fast === 1;
}

function getNext(n) {
    let sum = 0;
    while (n > 0) {
        const digit = n % 10;
        sum += digit * digit;
        n = Math.floor(n / 10);
    }
    return sum;
}
```

- 如果 fast 先到达 1，是快乐数
- 如果 slow 和 fast 相遇，说明有环，不是快乐数

### 复杂度

- **时间**：O(log n)
- **空间**：O(1)，不需要额外存储

## 为什么一定会循环或到达 1？

有人可能会问：会不会无限增长，永远不循环也不到达 1？

**不会**。因为对于任意 n 位数，各位数字平方和最大是 n × 81（每位都是 9）。

- 3 位数最大是 999，各位平方和最大 243
- 4 位数最大是 9999，各位平方和最大 324

所以数字会快速下降到一个有限范围内，最终要么到达 1，要么进入循环。

## 本章小结

快乐数展示了哈希表检测循环的应用：

1. **问题抽象**：数列变化 → 链表遍历
2. **循环检测**：用 Set 记录历史状态
3. **空间优化**：快慢指针可以 O(1) 空间检测环

这种"用哈希表检测循环"的思路，在很多问题中都有应用。
