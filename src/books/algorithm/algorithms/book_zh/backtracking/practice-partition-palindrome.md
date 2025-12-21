# 实战：分割回文串

> LeetCode 131. 分割回文串 | 难度：中等

字符串分割问题的典型代表：将字符串分割成若干回文子串。

---

## 问题描述

给你一个字符串`s`，请你将`s`分割成一些子串，使每个子串都是回文串。返回所有可能的分割方案。

**示例**：
```
输入：s = "aab"
输出：[["a","a","b"], ["aa","b"]]

输入：s = "a"
输出：[["a"]]
```

---

## 思路分析

### 问题建模

- **状态**：当前分割位置start
- **选择**：从start开始，选择不同长度的子串
- **约束**：选择的子串必须是回文串
- **目标**：分割完整个字符串

### 决策树模型

以`s = "aab"`为例：

```
start=0
├─ 选"a"（回文✓）
│  └─ start=1
│     ├─ 选"a"（回文✓）
│     │  └─ start=2
│     │     └─ 选"b"（回文✓）
│     │        └─ start=3 → 收集["a","a","b"]
│     └─ 选"ab"（非回文✗）
└─ 选"aa"（回文✓）
   └─ start=2
      └─ 选"b"（回文✓）
         └─ start=3 → 收集["aa","b"]
```

### 关键区别：分割 vs 组合

| 对比项 | 组合问题 | 分割问题 |
|-------|---------|---------|
| 选择对象 | 单个元素 | 连续子串 |
| 起始位置 | 可跳过元素 | 必须连续 |
| 终止条件 | 达到目标数量 | 到达字符串末尾 |

---

## 解法一：基础回溯

```typescript
function partition(s: string): string[][] {
  const result: string[][] = [];
  
  function backtrack(start: number, path: string[]) {
    // 终止条件：分割到字符串末尾
    if (start === s.length) {
      result.push([...path]);
      return;
    }
    
    // 尝试不同长度的子串
    for (let end = start; end < s.length; end++) {
      const substr = s.slice(start, end + 1);
      
      // 剪枝：只有回文才继续
      if (!isPalindrome(substr)) continue;
      
      path.push(substr);
      backtrack(end + 1, path);  // 从下一个位置继续
      path.pop();
    }
  }
  
  function isPalindrome(str: string): boolean {
    let left = 0, right = str.length - 1;
    while (left < right) {
      if (str[left++] !== str[right--]) return false;
    }
    return true;
  }
  
  backtrack(0, []);
  return result;
}
```

---

## 解法二：动态规划预处理回文

每次调用`isPalindrome`是O(n)，可以预处理所有子串的回文状态：

```typescript
function partition(s: string): string[][] {
  const n = s.length;
  const result: string[][] = [];
  
  // 预处理：dp[i][j]表示s[i..j]是否是回文
  const dp: boolean[][] = Array.from(
    { length: n },
    () => Array(n).fill(false)
  );
  
  // 从短到长填充
  for (let len = 1; len <= n; len++) {
    for (let i = 0; i + len - 1 < n; i++) {
      const j = i + len - 1;
      if (len === 1) {
        dp[i][j] = true;  // 单字符
      } else if (len === 2) {
        dp[i][j] = s[i] === s[j];  // 双字符
      } else {
        dp[i][j] = s[i] === s[j] && dp[i + 1][j - 1];
      }
    }
  }
  
  function backtrack(start: number, path: string[]) {
    if (start === n) {
      result.push([...path]);
      return;
    }
    
    for (let end = start; end < n; end++) {
      // O(1)查询是否回文
      if (!dp[start][end]) continue;
      
      path.push(s.slice(start, end + 1));
      backtrack(end + 1, path);
      path.pop();
    }
  }
  
  backtrack(0, []);
  return result;
}
```

---

## 解法三：记忆化回文判断

用Map缓存已计算的回文结果：

```typescript
function partition(s: string): string[][] {
  const result: string[][] = [];
  const memo = new Map<string, boolean>();
  
  function isPalindrome(start: number, end: number): boolean {
    const key = `${start}-${end}`;
    if (memo.has(key)) return memo.get(key)!;
    
    let left = start, right = end;
    while (left < right) {
      if (s[left++] !== s[right--]) {
        memo.set(key, false);
        return false;
      }
    }
    memo.set(key, true);
    return true;
  }
  
  function backtrack(start: number, path: string[]) {
    if (start === s.length) {
      result.push([...path]);
      return;
    }
    
    for (let end = start; end < s.length; end++) {
      if (!isPalindrome(start, end)) continue;
      
      path.push(s.slice(start, end + 1));
      backtrack(end + 1, path);
      path.pop();
    }
  }
  
  backtrack(0, []);
  return result;
}
```

---

## 复杂度分析

**时间复杂度**：O(n × 2^n)
- 最坏情况（全是相同字符如"aaaa"），每个位置都可分可不分 → 2^n种分割
- 每种分割需要O(n)时间构建结果

**空间复杂度**：
- 基础版：O(n)递归栈
- DP预处理版：O(n²)存储回文表

---

## 执行过程可视化

以`s = "aab"`为例：

```
backtrack(0, [])
├─ 尝试"a"（回文）
│  └─ backtrack(1, ["a"])
│     ├─ 尝试"a"（回文）
│     │  └─ backtrack(2, ["a","a"])
│     │     └─ 尝试"b"（回文）
│     │        └─ backtrack(3, ["a","a","b"])
│     │           → 收集结果 ✓
│     └─ 尝试"ab"（非回文）
│        └─ 跳过
└─ 尝试"aa"（回文）
   └─ backtrack(2, ["aa"])
      └─ 尝试"b"（回文）
         └─ backtrack(3, ["aa","b"])
            → 收集结果 ✓

最终结果：[["a","a","b"], ["aa","b"]]
```

---

## 常见错误

**错误1：分割位置计算错误**
```typescript
// 错误：递归时位置计算
backtrack(i + 1, path);  // ❌ i应该是end

// 正确
backtrack(end + 1, path);  // ✅
```

**错误2：子串提取范围错误**
```typescript
// 错误
const substr = s.slice(start, end);  // ❌ 不包含end

// 正确
const substr = s.slice(start, end + 1);  // ✅
```

**错误3：忘记深拷贝结果**
```typescript
// 错误
result.push(path);  // ❌ 引用

// 正确
result.push([...path]);  // ✅
```

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [132. 分割回文串 II](https://leetcode.com/problems/palindrome-partitioning-ii/) | 困难 | 最少分割次数（DP） |
| [93. 复原IP地址](https://leetcode.com/problems/restore-ip-addresses/) | 中等 | 类似的分割问题 |
| [5. 最长回文子串](https://leetcode.com/problems/longest-palindromic-substring/) | 中等 | 回文DP基础 |

---

## 分割问题模板

```typescript
function partitionTemplate(s: string) {
  const result: string[][] = [];
  
  function backtrack(start: number, path: string[]) {
    if (start === s.length) {
      result.push([...path]);
      return;
    }
    
    for (let end = start; end < s.length; end++) {
      const substr = s.slice(start, end + 1);
      
      if (!isValid(substr)) continue;  // 根据问题定义
      
      path.push(substr);
      backtrack(end + 1, path);
      path.pop();
    }
  }
  
  backtrack(0, []);
  return result;
}
```

---

## 总结

分割回文串的核心要点：

1. **分割模型**：每次选择一个子串，从下一个位置继续
2. **回文判断**：可预处理O(1)查询，或即时计算
3. **终止条件**：分割位置到达字符串末尾
4. **优化方向**：
   - DP预处理回文表
   - 记忆化缓存判断结果

本题是"分割问题"的模板题，掌握后可用于IP地址复原、单词拆分等变体。
```
