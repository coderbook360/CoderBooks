# 实战：括号生成

> LeetCode 22. 括号生成 | 难度：中等

生成n对括号的所有有效组合。这是回溯算法中的经典题目，也是理解"隐式约束"剪枝的绝佳案例。

---

## 问题描述

给定n对括号，生成所有有效的括号组合。

**示例**：
```
输入：n = 3
输出：["((()))","(()())","(())()","()(())","()()()"]

输入：n = 1
输出：["()"]
```

**有效括号的定义**：
- 每个左括号都有对应的右括号
- 任意前缀中，左括号数量 ≥ 右括号数量

---

## 思路分析

### 暴力思路：生成所有可能，然后过滤

最直接的想法：生成所有长度为2n的括号字符串，然后检查哪些是有效的。

```typescript
// 暴力解法 - 仅用于理解，实际效率低
function generateParenthesisBruteForce(n: number): string[] {
  const result: string[] = [];
  
  function generate(current: string) {
    if (current.length === 2 * n) {
      if (isValid(current)) {
        result.push(current);
      }
      return;
    }
    generate(current + '(');
    generate(current + ')');
  }
  
  function isValid(s: string): boolean {
    let balance = 0;
    for (const c of s) {
      balance += c === '(' ? 1 : -1;
      if (balance < 0) return false;
    }
    return balance === 0;
  }
  
  generate('');
  return result;
}
```

**问题**：生成了2^(2n)个字符串，大部分是无效的。

**优化思路**：在生成过程中就排除无效分支，而不是生成后再过滤。

---

### 回溯思路：边生成边剪枝

**核心洞察**：有效括号必须满足两个约束：
1. 左括号最多使用n个
2. 任意时刻，已使用的右括号 ≤ 已使用的左括号

这两个约束可以在生成过程中实时检查，**无效分支直接剪掉**。

### 决策树可视化（n=2）

```
                      ""
                      |
                     "("
                   /     \
               "(("      "()"
               /           \
            "(()"         "()("
              |             |
           "(())"        "()()"

有效结果：["(())", "()()"]
```

注意：在`"()"`状态下，不能添加`")"`（右括号数会超过左括号），所以只能添加`"("`。

---

## 解法一：回溯（推荐）

```typescript
function generateParenthesis(n: number): string[] {
  const result: string[] = [];
  
  /**
   * @param left - 已使用的左括号数量
   * @param right - 已使用的右括号数量
   * @param path - 当前构建的括号字符串
   */
  function backtrack(left: number, right: number, path: string) {
    // 终止条件：达到目标长度
    if (path.length === 2 * n) {
      result.push(path);
      return;
    }
    
    // 选择1：添加左括号（前提：left < n）
    if (left < n) {
      backtrack(left + 1, right, path + '(');
    }
    
    // 选择2：添加右括号（前提：right < left）
    if (right < left) {
      backtrack(left, right + 1, path + ')');
    }
  }
  
  backtrack(0, 0, '');
  return result;
}
```

### 代码解析

**状态定义**：
- `left`：已使用的左括号数
- `right`：已使用的右括号数
- `path`：当前构建的字符串

**约束条件**：
- `left ≤ n`：左括号最多用n个
- `right ≤ left`：右括号不能超过左括号（否则无法配对）

**终止条件**：
- `path.length === 2n`：字符串达到目标长度

**为什么不需要显式撤销？**
- 因为使用了字符串拼接`path + '('`，这创建了新字符串
- 原始`path`没有被修改，天然满足"回溯"语义
- 如果使用数组`path.push()`，则需要显式`path.pop()`

---

## 解法二：使用数组优化

字符串拼接会创建新字符串，性能略低。可以用数组优化：

```typescript
function generateParenthesis(n: number): string[] {
  const result: string[] = [];
  const path: string[] = [];
  
  function backtrack(left: number, right: number) {
    if (path.length === 2 * n) {
      result.push(path.join(''));
      return;
    }
    
    if (left < n) {
      path.push('(');       // 做选择
      backtrack(left + 1, right);
      path.pop();           // 撤销选择
    }
    
    if (right < left) {
      path.push(')');       // 做选择
      backtrack(left, right + 1);
      path.pop();           // 撤销选择
    }
  }
  
  backtrack(0, 0);
  return result;
}
```

---

## 解法三：动态规划

括号生成也可以用DP思想：`n`对括号 = `"(" + (a对括号) + ")" + (b对括号)`，其中`a + b = n - 1`。

```typescript
function generateParenthesis(n: number): string[] {
  const dp: string[][] = [['']];
  
  for (let i = 1; i <= n; i++) {
    dp[i] = [];
    // 枚举括号内部和外部右侧的分配
    for (let j = 0; j < i; j++) {
      const inner = dp[j];       // 括号内部
      const outer = dp[i - 1 - j]; // 括号右侧
      
      for (const a of inner) {
        for (const b of outer) {
          dp[i].push(`(${a})${b}`);
        }
      }
    }
  }
  
  return dp[n];
}
```

**DP思路**：
- `dp[0] = [""]`（0对括号）
- `dp[1] = ["()"]`（1对括号）
- `dp[2] = ["(())", "()()"]`（2对括号）
- `dp[i]`由`dp[0...i-1]`推导而来

---

## 复杂度分析

**时间复杂度**：O(4^n / √n)
- 这是第n个卡特兰数Cn的渐进复杂度
- Cn = C(2n, n) / (n + 1)
- 卡特兰数描述了有效括号组合的数量

**空间复杂度**：O(n)
- 递归栈深度为2n
- 不计结果存储空间

**卡特兰数的应用**：
- 有效括号组合数
- 二叉搜索树数量
- 凸多边形三角剖分数
- 出栈序列数

---

## 边界情况

```typescript
// n = 0
generateParenthesis(0);  // 返回 [""] 或 []（取决于定义）

// n = 1
generateParenthesis(1);  // 返回 ["()"]

// n = 2
generateParenthesis(2);  // 返回 ["(())", "()()"]
```

---

## 常见错误

**错误1：约束条件写反**
```typescript
// 错误：right < left 写成 right < n
if (right < n) {  // ❌ 会生成无效括号如 ")("
  backtrack(left, right + 1, path + ')');
}

// 正确
if (right < left) {  // ✅
  backtrack(left, right + 1, path + ')');
}
```

**错误2：忘记终止条件**
```typescript
// 错误：没有终止条件，会无限递归
function backtrack(left: number, right: number, path: string) {
  // 忘记 if (path.length === 2 * n) { ... }
  
  if (left < n) backtrack(left + 1, right, path + '(');
  if (right < left) backtrack(left, right + 1, path + ')');
}
```

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [20. 有效的括号](https://leetcode.com/problems/valid-parentheses/) | 简单 | 验证括号有效性 |
| [32. 最长有效括号](https://leetcode.com/problems/longest-valid-parentheses/) | 困难 | DP/栈 |
| [301. 删除无效的括号](https://leetcode.com/problems/remove-invalid-parentheses/) | 困难 | BFS/回溯 |

---

## 总结

括号生成问题展示了回溯算法的精髓：

1. **隐式约束剪枝**：不是生成后过滤，而是在生成过程中实时排除无效分支
2. **状态设计**：用`left`和`right`两个变量精确描述状态
3. **约束条件**：`right ≤ left ≤ n`是问题的核心
4. **卡特兰数**：有效括号组合的数量是卡特兰数，有深刻的组合意义

这道题的回溯模板非常简洁，但蕴含了"边界约束"和"实时剪枝"的核心思想。
