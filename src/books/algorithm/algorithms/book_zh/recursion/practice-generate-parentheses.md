# 实战:括号生成

括号生成是回溯算法的经典问题,也是递归思维的绝佳训练。它要求我们生成所有有效的括号组合,这需要在递归过程中维护约束条件,确保每一步都是合法的。

📎 [LeetCode 22. 括号生成](https://leetcode.cn/problems/generate-parentheses/)

---

## 题目描述

给定正整数 `n`,生成所有由 `n` 对括号组成的有效括号组合。

**有效括号定义**:
- 左括号必须以正确的顺序闭合
- 每个右括号都有一个对应的左括号

**示例**:

```
输入: n = 3
输出: ["((()))","(()())","(())()","()(())","()()()"]

输入: n = 1
输出: ["()"]

输入: n = 2
输出: ["(())","()()"]
```

**约束**:
- 1 <= n <= 8

---

## 思路分析

### 这道题在考什么?

1. 回溯算法的基本框架
2. 剪枝优化(提前终止无效分支)
3. 递归中维护约束条件

### 暴力法:生成所有组合再过滤

**思路**:生成所有 2^(2n) 种括号序列,然后过滤出有效的。

**问题**:效率极低。n=8 时,2^16 = 65536 种组合,但有效组合只有 1430 种(卡特兰数)。

### 优化思路:递归 + 剪枝

**核心洞察**:在构造过程中就保证有效性,而不是构造完再检查。

**有效括号的约束**:
1. 左括号数量 <= n
2. 右括号数量 <= 左括号数量(任何时刻)

```
示例:n = 2

决策树(✓ 表示有效分支,✗ 表示剪枝):
                    ""
                 /      \
            "("          ")" ✗ (右括号数 > 左括号数)
           /    \
      "(("      "()" 
      /  \      /  \
  "(((" ✗  "(()""()("   "())" ✗
           |     |
        "(())" "()()"
```

**剪枝条件**:
- 左括号数量 > n:剪枝
- 右括号数量 > 左括号数量:剪枝

---

## 解法一:回溯(递归)

### 代码实现

```typescript
/**
 * 回溯生成有效括号
 * 时间复杂度:O(4^n / √n) - 第 n 个卡特兰数
 * 空间复杂度:O(n) - 递归栈深度
 */
function generateParenthesis(n: number): string[] {
  const result: string[] = [];
  
  /**
   * 回溯函数
   * @param current - 当前构造的字符串
   * @param left - 已使用的左括号数量
   * @param right - 已使用的右括号数量
   */
  function backtrack(current: string, left: number, right: number): void {
    // 终止条件:用完了所有括号
    if (current.length === 2 * n) {
      result.push(current);
      return;
    }
    
    // 选择 1:添加左括号(如果还有剩余)
    if (left < n) {
      backtrack(current + '(', left + 1, right);
    }
    
    // 选择 2:添加右括号(如果不会导致无效)
    if (right < left) {
      backtrack(current + ')', left, right + 1);
    }
  }
  
  backtrack('', 0, 0);
  return result;
}
```

### 递归过程详解

以 `n = 2` 为例:

```
backtrack("", 0, 0)
├─ left < 2 ✓ → backtrack("(", 1, 0)
│  ├─ left < 2 ✓ → backtrack("((", 2, 0)
│  │  ├─ left < 2 ✗ (剪枝)
│  │  └─ right < 2 ✓ → backtrack("(()", 2, 1)
│  │     ├─ left < 2 ✗
│  │     └─ right < 2 ✓ → backtrack("(())", 2, 2)
│  │        → 收集结果 "(())"
│  │
│  └─ right < 1 ✓ → backtrack("()", 1, 1)
│     ├─ left < 2 ✓ → backtrack("()(", 2, 1)
│     │  ├─ left < 2 ✗
│     │  └─ right < 2 ✓ → backtrack("()()", 2, 2)
│     │     → 收集结果 "()()"
│     │
│     └─ right < 1 ✗ (剪枝)
│
└─ right < 0 ✗ (剪枝,初始就不能添加右括号)

最终结果:["(())", "()()"]
```

**关键理解**:
- `left < n`:确保左括号不超过 n 个
- `right < left`:确保任何时刻右括号不超过左括号
- 递归树的每一条路径都是有效的括号序列

---

## 解法二:动态规划

### 思路

**递推关系**:
```
f(n) 的每个括号序列可以分解为:
"(" + f(p) + ")" + f(q)
其中 p + q = n - 1
```

**示例**:
```
f(0) = [""]
f(1) = ["()"]
f(2) = ["()()", "(())"]
       ↑ p=0,q=1  ↑ p=1,q=0
```

### 代码实现

```typescript
/**
 * 动态规划生成括号
 * 时间复杂度:O(4^n / √n)
 * 空间复杂度:O(4^n / √n) - 存储所有结果
 */
function generateParenthesisDP(n: number): string[] {
  const dp: string[][] = [[""]];  // dp[0] = [""]
  
  for (let i = 1; i <= n; i++) {
    dp[i] = [];
    
    // 枚举 p + q = i - 1 的所有情况
    for (let p = 0; p < i; p++) {
      const q = i - 1 - p;
      
      // 组合 f(p) 和 f(q)
      for (const left of dp[p]) {
        for (const right of dp[q]) {
          dp[i].push(`(${left})${right}`);
        }
      }
    }
  }
  
  return dp[n];
}
```

### DP 过程

```
n = 3:

dp[0] = [""]
dp[1] = ["()"]

dp[2]:
p=0, q=1: "(" + "" + ")" + "()" = "()()"
p=1, q=0: "(" + "()" + ")" + "" = "(())"
→ dp[2] = ["()()", "(())"]

dp[3]:
p=0, q=2: "(" + "" + ")" + ["()()", "(())"] = ["()()()", "()(())"]
p=1, q=1: "(" + "()" + ")" + "()" = "(())()"
p=2, q=0: "(" + ["()()", "(())"] + ")" + "" = ["(()())", "((()))"]
→ dp[3] = ["()()()", "()(())", "(())()", "(()())", "((()))"]
```

---

## 解法对比

| 解法 | 时间复杂度 | 空间复杂度 | 优势 | 劣势 |
|-----|-----------|-----------|------|------|
| 回溯 | O(4^n / √n) | O(n) | 空间效率高,剪枝清晰 | 需要理解递归 |
| DP | O(4^n / √n) | O(4^n / √n) | 思路独特,可扩展 | 空间开销大 |

**实际应用**:
- **回溯法**:首选,代码简洁,空间效率高
- **DP 法**:适合需要复用子问题结果的场景

---

## 扩展:括号有效性检查

### 问题

检查给定的括号序列是否有效(LeetCode 20)。

### 代码实现

```typescript
/**
 * 用栈检查括号有效性
 * 时间复杂度:O(n)
 * 空间复杂度:O(n)
 */
function isValid(s: string): boolean {
  const stack: string[] = [];
  const map: Record<string, string> = {
    ')': '(',
    ']': '[',
    '}': '{'
  };
  
  for (const char of s) {
    if (char === '(' || char === '[' || char === '{') {
      stack.push(char);
    } else {
      if (stack.length === 0 || stack.pop() !== map[char]) {
        return false;
      }
    }
  }
  
  return stack.length === 0;
}
```

---

## 扩展:括号的最长有效长度

### 问题

给定括号字符串,求最长有效括号子串的长度(LeetCode 32)。

### 思路

用动态规划或栈。

### 代码实现(DP)

```typescript
/**
 * DP 求最长有效括号长度
 * 时间复杂度:O(n)
 * 空间复杂度:O(n)
 */
function longestValidParentheses(s: string): number {
  const n = s.length;
  const dp = new Array(n).fill(0);  // dp[i]:以 i 结尾的最长有效长度
  let maxLen = 0;
  
  for (let i = 1; i < n; i++) {
    if (s[i] === ')') {
      if (s[i - 1] === '(') {
        // 情况 1:"....()"
        dp[i] = (i >= 2 ? dp[i - 2] : 0) + 2;
      } else if (i - dp[i - 1] > 0 && s[i - dp[i - 1] - 1] === '(') {
        // 情况 2:"....))"-需要跳过中间的有效部分
        dp[i] = dp[i - 1] + 2 + (i - dp[i - 1] >= 2 ? dp[i - dp[i - 1] - 2] : 0);
      }
      maxLen = Math.max(maxLen, dp[i]);
    }
  }
  
  return maxLen;
}
```

---

## 易错点

### 1. 剪枝条件错误

```typescript
// ❌ 错误:允许右括号数量等于 n 就添加
function generateParenthesisWrong(n: number): string[] {
  const result: string[] = [];
  
  function backtrack(current: string, left: number, right: number): void {
    if (current.length === 2 * n) {
      result.push(current);
      return;
    }
    
    if (left < n) {
      backtrack(current + '(', left + 1, right);
    }
    
    // 错误:应该是 right < left,而不是 right < n
    if (right < n) {
      backtrack(current + ')', left, right + 1);
    }
  }
  
  backtrack('', 0, 0);
  return result;
}

// 会生成无效序列,如")((())"
```

### 2. 终止条件不正确

```typescript
// ❌ 错误:只检查长度,没有检查左右括号数量
function backtrackWrong(current: string, left: number, right: number): void {
  if (current.length === 2 * n) {
    result.push(current);
    return;
  }
  // ...可能生成 left !== n 或 right !== n 的序列
}
```

### 3. 忘记剪枝

```typescript
// ❌ 错误:没有剪枝,生成所有序列再过滤
function generateParenthesisBruteForce(n: number): string[] {
  const result: string[] = [];
  
  function backtrack(current: string): void {
    if (current.length === 2 * n) {
      if (isValid(current)) {  // 效率低
        result.push(current);
      }
      return;
    }
    
    backtrack(current + '(');
    backtrack(current + ')');
  }
  
  backtrack('');
  return result;
}

// n=8 时生成 65536 个序列,但只有 1430 个有效
```

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [22. 括号生成](https://leetcode.cn/problems/generate-parentheses/) | 中等 | 本题 |
| [20. 有效的括号](https://leetcode.cn/problems/valid-parentheses/) | 简单 | 括号有效性检查 |
| [32. 最长有效括号](https://leetcode.cn/problems/longest-valid-parentheses/) | 困难 | DP/栈求最长有效长度 |
| [301. 删除无效的括号](https://leetcode.cn/problems/remove-invalid-parentheses/) | 困难 | BFS/回溯 |

---

## 举一反三

括号生成教会我们:

1. **回溯算法的标准框架**:
   - 选择列表(添加左括号/右括号)
   - 路径(当前构造的字符串)
   - 终止条件(长度达到 2n)
   - 剪枝(维护约束条件)

2. **剪枝的重要性**:
   - 暴力法:2^(2n) 种组合
   - 剪枝后:第 n 个卡特兰数 ≈ 4^n / (n^(3/2) √π)
   - n=8:65536 → 1430,提升 45 倍

3. **递归中的约束维护**:
   - `left < n`:控制左括号数量
   - `right < left`:保证有效性
   - 约束即剪枝条件

4. **DP 的另类思路**:
   - 括号序列的递归结构:"(" + f(p) + ")" + f(q)
   - 状态转移:f(n) 由 f(0)...f(n-1) 构成

---

## 本章小结

括号生成是回溯算法的经典问题:
- **核心思想**:在递归构造过程中维护约束条件
- **剪枝策略**:`left < n` 和 `right < left`
- **时间复杂度**:第 n 个卡特兰数 O(4^n / √n)
- **扩展应用**:括号有效性检查、最长有效括号

掌握这道题,你就理解了回溯算法的核心思想:在搜索过程中剪枝,避免无效计算。

---

## 练习

1. 实现括号有效性检查(LeetCode 20)
2. 求最长有效括号子串(LeetCode 32)
3. 修改代码支持多种括号:`()`, `[]`, `{}`
4. 统计 n=10 时的有效括号数量(第 10 个卡特兰数)
