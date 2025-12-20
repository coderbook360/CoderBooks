# 实战：为运算表达式设计优先级

> LeetCode 241. 为运算表达式设计优先级 | 难度：中等

分治思想在表达式求值中的巧妙应用：以每个运算符为分界点。

---

## 问题描述

给定一个含有数字和运算符的字符串，为表达式添加括号，返回所有可能的计算结果。

**示例**：
```
输入："2-1-1"
输出：[0, 2]

解释：
((2-1)-1) = 0
(2-(1-1)) = 2
```

---

## 分治思路

遇到运算符时，将表达式分为左右两部分：
- 左部分的所有可能结果
- 右部分的所有可能结果
- 用运算符组合所有结果

```
"2*3-4*5"
   ↓ 遇到 *
左: "2"     → [2]
右: "3-4*5" → [3-4*5的所有结果]
组合: 2 * 右边每个结果
```

---

## 代码实现

```typescript
function diffWaysToCompute(expression: string): number[] {
  const result: number[] = [];
  
  // 遍历每个字符
  for (let i = 0; i < expression.length; i++) {
    const char = expression[i];
    
    // 如果是运算符
    if (char === '+' || char === '-' || char === '*') {
      // 分治：左右两部分
      const left = diffWaysToCompute(expression.slice(0, i));
      const right = diffWaysToCompute(expression.slice(i + 1));
      
      // 组合所有可能的结果
      for (const l of left) {
        for (const r of right) {
          if (char === '+') result.push(l + r);
          else if (char === '-') result.push(l - r);
          else if (char === '*') result.push(l * r);
        }
      }
    }
  }
  
  // 基础情况：纯数字
  if (result.length === 0) {
    result.push(parseInt(expression));
  }
  
  return result;
}
```

---

## 执行过程详解

以 `"2-1-1"` 为例：

**第一次分割**（第一个 `-`）：
```
左: "2"     → [2]
右: "1-1"
  第二次分割：
  左: "1"   → [1]
  右: "1"   → [1]
  组合: 1-1 = 0
  → [0]
组合: 2-0 = 2
```

**第二次分割**（第二个 `-`）：
```
左: "2-1"
  第一次分割：
  左: "2"   → [2]
  右: "1"   → [1]
  组合: 2-1 = 1
  → [1]
右: "1"     → [1]
组合: 1-1 = 0
```

**最终结果**：`[2, 0]`

---

## 记忆化优化

```typescript
function diffWaysToCompute(expression: string): number[] {
  const memo = new Map<string, number[]>();
  
  function compute(expr: string): number[] {
    if (memo.has(expr)) {
      return memo.get(expr)!;
    }
    
    const result: number[] = [];
    
    for (let i = 0; i < expr.length; i++) {
      const char = expr[i];
      
      if (char === '+' || char === '-' || char === '*') {
        const left = compute(expr.slice(0, i));
        const right = compute(expr.slice(i + 1));
        
        for (const l of left) {
          for (const r of right) {
            if (char === '+') result.push(l + r);
            else if (char === '-') result.push(l - r);
            else if (char === '*') result.push(l * r);
          }
        }
      }
    }
    
    if (result.length === 0) {
      result.push(parseInt(expr));
    }
    
    memo.set(expr, result);
    return result;
  }
  
  return compute(expression);
}
```

---

## 复杂度分析

**时间复杂度**：O(4ⁿ / √n)
- 这是卡特兰数级别
- 因为不同的括号组合数是卡特兰数
- n 是表达式中运算符的数量

**空间复杂度**：O(4ⁿ / √n)
- 存储所有可能的结果
- 递归栈深度为 O(n)

---

## 分治的本质理解

这道题的分治思想可以用决策树来理解：

```
表达式："2*3-4*5"

                 "2*3-4*5"
                /    |    \
         分割*    分割-   分割*
             |        |       |
         "2" * "3-4*5"   ...
                  |
              /   |   \
           分割-  ...
              |
          "3" - "4*5"
                  |
              "4" * "5"
```

**每个运算符都可以成为"最后一个计算的"**：
- 选择 `*` 作为最外层：`2 * (3-4*5)`
- 选择 `-` 作为最外层：`(2*3) - (4*5)`
- 选择第二个 `*`：`(2*3-4) * 5`

---

## 预处理优化

可以先解析表达式，提取数字和运算符，避免重复切分字符串：

```typescript
function diffWaysToCompute(expression: string): number[] {
  // 预处理：提取数字和运算符
  const nums: number[] = [];
  const ops: string[] = [];
  let num = 0;
  
  for (const char of expression) {
    if (char === '+' || char === '-' || char === '*') {
      nums.push(num);
      ops.push(char);
      num = 0;
    } else {
      num = num * 10 + parseInt(char);
    }
  }
  nums.push(num);  // 最后一个数字
  
  const memo = new Map<string, number[]>();
  
  function compute(lo: number, hi: number): number[] {
    const key = `${lo},${hi}`;
    if (memo.has(key)) return memo.get(key)!;
    
    const result: number[] = [];
    
    if (lo === hi) {
      result.push(nums[lo]);
    } else {
      // 枚举分割点（运算符位置）
      for (let i = lo; i < hi; i++) {
        const left = compute(lo, i);
        const right = compute(i + 1, hi);
        
        for (const l of left) {
          for (const r of right) {
            if (ops[i] === '+') result.push(l + r);
            else if (ops[i] === '-') result.push(l - r);
            else result.push(l * r);
          }
        }
      }
    }
    
    memo.set(key, result);
    return result;
  }
  
  return compute(0, nums.length - 1);
}
```

**优化效果**：
- 避免了字符串切分和重复解析
- 使用数字索引而非字符串作为缓存键
- 更高效的内存使用

---

## 常见错误

### 错误1：忘记基础情况

```typescript
// ❌ 错误：纯数字时result为空，没有返回任何值
for (let i = 0; i < expression.length; i++) {
  if (isOperator(expression[i])) {
    // ...
  }
}
return result;  // 纯数字时为空！

// ✅ 正确：显式处理纯数字情况
if (result.length === 0) {
  result.push(parseInt(expression));
}
```

### 错误2：运算符判断遗漏

```typescript
// ❌ 容易遗漏某个运算符
if (char === '+' || char === '-') {  // 忘了 '*'

// ✅ 完整判断
if (char === '+' || char === '-' || char === '*') {
```

### 错误3：多位数解析错误

```typescript
// ❌ 错误：只能处理个位数
const num = parseInt(char);  // "12" 会被拆成 1 和 2

// ✅ 正确：使用slice提取完整子串
parseInt(expression.slice(0, i));
```

---

## 与其他题目的联系

**相似题目**：
- **LeetCode 95. 不同的二叉搜索树 II**：枚举根节点作为分割点
- **LeetCode 96. 不同的二叉搜索树**：只需计数，不用生成

**共同模式**：
```
for 每个可能的分割点:
    左部分所有可能 = 递归(左边)
    右部分所有可能 = 递归(右边)
    组合所有 (左, 右) 对
```

**结果数量**：都是卡特兰数级别 C(n) = C(2n, n) / (n+1)

---

## 关键要点

1. **分治策略**：以每个运算符为分割点
2. **笛卡尔积组合**：左右子问题结果的所有组合
3. **基础情况**：纯数字字符串直接返回
4. **记忆化优化**：缓存相同子表达式的结果
5. **预处理技巧**：提取数字和运算符，避免重复解析
6. **卡特兰数**：时间复杂度的数学本质
