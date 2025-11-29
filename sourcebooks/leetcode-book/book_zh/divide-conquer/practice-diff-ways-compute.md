# 实战：为运算表达式设计优先级

这道题展示了分治在表达式求值中的应用。

## 问题描述

给你一个由数字和运算符组成的字符串`expression`，按不同优先级组合数字和运算符，计算并返回所有可能组合的结果。

答案可以按**任意顺序**返回。

## 思路分析

### 问题转化

表达式`"2*3-4*5"`可以有不同的计算顺序：
- `(2*(3-(4*5)))` = -34
- `((2*3)-(4*5))` = -14
- `((2*(3-4))*5)` = -10
- `(2*((3-4)*5))` = -10
- `(((2*3)-4)*5)` = 10

### 分治思路

以每个运算符为分割点：
1. 递归计算左边表达式的所有可能结果
2. 递归计算右边表达式的所有可能结果
3. 将左右结果用当前运算符组合

## 代码实现

```javascript
function diffWaysToCompute(expression) {
    const results = [];
    
    for (let i = 0; i < expression.length; i++) {
        const char = expression[i];
        
        if (char === '+' || char === '-' || char === '*') {
            // 以当前运算符为分割点
            const left = expression.slice(0, i);
            const right = expression.slice(i + 1);
            
            // 递归计算左右两边的所有可能
            const leftResults = diffWaysToCompute(left);
            const rightResults = diffWaysToCompute(right);
            
            // 组合所有可能
            for (const l of leftResults) {
                for (const r of rightResults) {
                    if (char === '+') results.push(l + r);
                    else if (char === '-') results.push(l - r);
                    else results.push(l * r);
                }
            }
        }
    }
    
    // 基准情况：没有运算符，是一个纯数字
    if (results.length === 0) {
        results.push(parseInt(expression));
    }
    
    return results;
}
```

## 图解

```
expression = "2*3-4"

i=1, char='*':
  left = "2", right = "3-4"
  leftResults = [2]
  rightResults:
    i=1, char='-':
      left="3", right="4"
      [3] - [4] = [-1]
    rightResults = [-1]
  2 * (-1) = -2

i=3, char='-':
  left = "2*3", right = "4"
  leftResults:
    i=1, char='*':
      [2] * [3] = [6]
    leftResults = [6]
  rightResults = [4]
  6 - 4 = 2

结果: [-2, 2]
```

## 记忆化优化

相同的子表达式可能被多次计算：

```javascript
function diffWaysToCompute(expression) {
    const memo = new Map();
    return compute(expression, memo);
}

function compute(expression, memo) {
    if (memo.has(expression)) {
        return memo.get(expression);
    }
    
    const results = [];
    
    for (let i = 0; i < expression.length; i++) {
        const char = expression[i];
        
        if (char === '+' || char === '-' || char === '*') {
            const left = expression.slice(0, i);
            const right = expression.slice(i + 1);
            
            const leftResults = compute(left, memo);
            const rightResults = compute(right, memo);
            
            for (const l of leftResults) {
                for (const r of rightResults) {
                    if (char === '+') results.push(l + r);
                    else if (char === '-') results.push(l - r);
                    else results.push(l * r);
                }
            }
        }
    }
    
    if (results.length === 0) {
        results.push(parseInt(expression));
    }
    
    memo.set(expression, results);
    return results;
}
```

## 为什么分治有效？

### 子问题独立

每个子表达式的计算互不影响。

### 可以合并

子表达式的结果可以通过运算符组合。

### 递归结构

表达式的结构天然适合递归分解。

## 边界情况

### 单个数字

如果表达式只有一个数字，直接返回。

### 负数

题目保证没有负数输入，所以不用处理。

### 多位数

`parseInt`可以正确解析多位数。

## 复杂度分析

**时间复杂度**：O(4^n / √n)
- 结果数量是卡特兰数
- 每个结果需要O(n)时间生成

**空间复杂度**：O(4^n / √n)
- 存储所有结果

## 扩展：支持更多运算符

可以扩展支持除法、指数等：

```javascript
function calculate(l, r, op) {
    switch (op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': return Math.trunc(l / r);
        case '^': return Math.pow(l, r);
    }
}
```

## 小结

表达式优先级问题展示了分治在表达式处理中的应用：
1. 以运算符为分割点
2. 递归计算左右子表达式
3. 组合所有可能的结果
4. 记忆化避免重复计算
