# 实战：快乐数

这道题看似是数学问题，实际上是**检测循环**的问题。哈希表用于记录已经出现过的数，判断是否进入循环。

## 问题描述

编写一个算法来判断一个数`n`是不是快乐数。

**快乐数**的定义：
- 对于一个正整数，每一次将该数替换为它每个位置上的数字的平方和
- 重复这个过程直到这个数变为1，或者无限循环但始终不能到达1
- 如果可以变为1，那么这个数就是快乐数

**示例**：
```
输入: n = 19
输出: true
解释:
1² + 9² = 82
8² + 2² = 68
6² + 8² = 100
1² + 0² + 0² = 1

输入: n = 2
输出: false
解释: 2 → 4 → 16 → 37 → 58 → 89 → 145 → 42 → 20 → 4 → ...（循环）
```

## 思路分析

### 两种结局

1. 最终变成1（快乐数）
2. 进入一个不包含1的**循环**

所以问题变成：**检测是否有循环**。

### 如何检测循环？

方法一：用Set记录所有出现过的数，如果重复出现就是循环

方法二：快慢指针（Floyd判圈法）

## 方法一：哈希表

```javascript
/**
 * @param {number} n
 * @return {boolean}
 */
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

## 执行过程图解

以`n = 19`为例：

```
n = 19:
  seen = {}
  seen.add(19)
  n = 1² + 9² = 82

n = 82:
  seen = {19}
  seen.add(82)
  n = 8² + 2² = 68

n = 68:
  seen = {19, 82}
  seen.add(68)
  n = 6² + 8² = 100

n = 100:
  seen = {19, 82, 68}
  seen.add(100)
  n = 1² + 0² + 0² = 1

n = 1:
  循环结束，返回 true
```

以`n = 2`为例：

```
2 → 4 → 16 → 37 → 58 → 89 → 145 → 42 → 20 → 4

当再次到达4时，seen.has(4) = true
循环结束，返回 false
```

## 方法二：快慢指针

链表判圈的思想同样适用：

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

**原理**：
- 如果有循环，快指针最终会追上慢指针
- 如果到达1，1→1自成循环，快指针先到达1

## 两种方法对比

| 方法 | 时间复杂度 | 空间复杂度 |
|------|------------|------------|
| 哈希表 | O(log n) | O(log n) |
| 快慢指针 | O(log n) | O(1) |

快慢指针空间更优，但哈希表更直观。

## 为什么是O(log n)？

一个d位数的各位平方和最大是`9² × d = 81d`。

- 对于n位数，最大值是`10^d - 1`
- 平方和最大是`81d`

当d≥4时，`81d < 10^d`，说明数字会**变小**。

最终数字会稳定在3位数以内的有限范围内，所以迭代次数是O(log n)。

## 提取数字的各位

```javascript
function getNext(n) {
    let sum = 0;
    while (n > 0) {
        const digit = n % 10;    // 取最后一位
        sum += digit * digit;     // 累加平方
        n = Math.floor(n / 10);  // 去掉最后一位
    }
    return sum;
}
```

另一种写法，使用字符串：

```javascript
function getNext(n) {
    return String(n)
        .split('')
        .reduce((sum, digit) => sum + digit * digit, 0);
}
```

字符串写法更简洁，但效率稍低。

## 边界情况

| 输入 | 分析 | 结果 |
|------|------|------|
| 1 | 直接是1 | true |
| 7 | 7→49→97→130→10→1 | true |
| 116 | 最终到1 | true |
| 2 | 进入循环 | false |

## 数学背景

所有非快乐数最终都会进入这个循环：

```
4 → 16 → 37 → 58 → 89 → 145 → 42 → 20 → 4
```

这是一个数学事实。所以理论上可以直接判断是否进入这个循环，但这样做失去了通用性。

## 小结

快乐数问题的核心：

1. **问题转化**：判断快乐数 → 检测是否有循环
2. **循环检测**：哈希表记录历史 或 快慢指针
3. **数位处理**：提取每一位数字并计算平方和

这道题展示了哈希表在"检测重复/循环"问题中的应用——用O(1)时间判断一个状态是否之前出现过。
