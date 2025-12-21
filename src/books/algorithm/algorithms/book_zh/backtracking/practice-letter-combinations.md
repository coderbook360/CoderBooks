# 实战：电话号码的字母组合

> LeetCode 17. 电话号码的字母组合 | 难度：中等

多层选择的组合问题：每一层的选择来自不同的集合。

---

## 问题描述

给定一个仅包含数字2-9的字符串，返回所有它能表示的字母组合。数字到字母的映射（如同电话按键）如下：

```
2 -> abc    3 -> def    4 -> ghi
5 -> jkl    6 -> mno    7 -> pqrs
8 -> tuv    9 -> wxyz
```

**示例**：
```
输入：digits = "23"
输出：["ad","ae","af","bd","be","bf","cd","ce","cf"]

输入：digits = ""
输出：[]

输入：digits = "2"
输出：["a","b","c"]
```

---

## 思路分析

### 问题建模

- **状态**：当前处理的数字索引
- **选择**：当前数字对应的所有字母
- **约束**：无特殊约束
- **目标**：处理完所有数字

### 决策树模型

以`digits = "23"`为例：

```
index=0 (数字'2' → "abc")
├─ 选'a'
│  └─ index=1 (数字'3' → "def")
│     ├─ 选'd' → "ad" ✓
│     ├─ 选'e' → "ae" ✓
│     └─ 选'f' → "af" ✓
├─ 选'b'
│  └─ index=1 (数字'3' → "def")
│     ├─ 选'd' → "bd" ✓
│     ├─ 选'e' → "be" ✓
│     └─ 选'f' → "bf" ✓
└─ 选'c'
   └─ index=1 (数字'3' → "def")
      ├─ 选'd' → "cd" ✓
      ├─ 选'e' → "ce" ✓
      └─ 选'f' → "cf" ✓
```

### 与标准组合的区别

| 对比项 | 标准组合 | 电话号码组合 |
|-------|---------|-------------|
| 选择来源 | 同一个集合 | 每层不同集合 |
| 元素数量 | 固定 | 每层3-4个 |
| 结果长度 | 可变 | 固定（等于digits长度）|

---

## 解法一：基础回溯

```typescript
function letterCombinations(digits: string): string[] {
  if (!digits) return [];
  
  const phoneMap: Record<string, string> = {
    '2': 'abc', '3': 'def', '4': 'ghi', '5': 'jkl',
    '6': 'mno', '7': 'pqrs', '8': 'tuv', '9': 'wxyz'
  };
  
  const result: string[] = [];
  
  function backtrack(index: number, path: string) {
    // 终止条件：处理完所有数字
    if (index === digits.length) {
      result.push(path);
      return;
    }
    
    // 获取当前数字对应的字母
    const letters = phoneMap[digits[index]];
    
    // 尝试每个字母
    for (const letter of letters) {
      backtrack(index + 1, path + letter);
    }
  }
  
  backtrack(0, '');
  return result;
}
```

### 代码简洁的原因

1. **字符串不可变**：`path + letter`创建新字符串，无需手动撤销
2. **无需显式path数组**：字符串拼接即可

---

## 解法二：数组路径（显式回溯）

```typescript
function letterCombinations(digits: string): string[] {
  if (!digits) return [];
  
  const phoneMap: Record<string, string> = {
    '2': 'abc', '3': 'def', '4': 'ghi', '5': 'jkl',
    '6': 'mno', '7': 'pqrs', '8': 'tuv', '9': 'wxyz'
  };
  
  const result: string[] = [];
  const path: string[] = [];
  
  function backtrack(index: number) {
    if (index === digits.length) {
      result.push(path.join(''));
      return;
    }
    
    const letters = phoneMap[digits[index]];
    
    for (const letter of letters) {
      path.push(letter);      // 做选择
      backtrack(index + 1);
      path.pop();             // 撤销选择
    }
  }
  
  backtrack(0);
  return result;
}
```

---

## 解法三：BFS迭代

用队列实现广度优先搜索：

```typescript
function letterCombinations(digits: string): string[] {
  if (!digits) return [];
  
  const phoneMap: Record<string, string> = {
    '2': 'abc', '3': 'def', '4': 'ghi', '5': 'jkl',
    '6': 'mno', '7': 'pqrs', '8': 'tuv', '9': 'wxyz'
  };
  
  let result: string[] = [''];  // 初始空字符串
  
  for (const digit of digits) {
    const letters = phoneMap[digit];
    const nextResult: string[] = [];
    
    for (const combination of result) {
      for (const letter of letters) {
        nextResult.push(combination + letter);
      }
    }
    
    result = nextResult;
  }
  
  return result;
}
```

### BFS过程示例

```
digits = "23"

初始：result = [""]

处理'2'（abc）：
  "" + 'a' = "a"
  "" + 'b' = "b"
  "" + 'c' = "c"
  result = ["a", "b", "c"]

处理'3'（def）：
  "a" + 'd' = "ad", "a" + 'e' = "ae", "a" + 'f' = "af"
  "b" + 'd' = "bd", "b" + 'e' = "be", "b" + 'f' = "bf"
  "c" + 'd' = "cd", "c" + 'e' = "ce", "c" + 'f' = "cf"
  result = ["ad","ae","af","bd","be","bf","cd","ce","cf"]
```

---

## 解法四：笛卡尔积

本质上是多个集合的笛卡尔积：

```typescript
function letterCombinations(digits: string): string[] {
  if (!digits) return [];
  
  const phoneMap: Record<string, string> = {
    '2': 'abc', '3': 'def', '4': 'ghi', '5': 'jkl',
    '6': 'mno', '7': 'pqrs', '8': 'tuv', '9': 'wxyz'
  };
  
  // 转换为字母数组的数组
  const letterGroups = [...digits].map(d => [...phoneMap[d]]);
  
  // 计算笛卡尔积
  return letterGroups.reduce<string[]>(
    (acc, group) => {
      if (acc.length === 0) return group;
      return acc.flatMap(prefix => group.map(letter => prefix + letter));
    },
    []
  );
}
```

---

## 复杂度分析

**时间复杂度**：O(3^m × 4^n)
- m是对应3个字母的数字个数（2,3,4,5,6,8）
- n是对应4个字母的数字个数（7,9）
- 总组合数 = 3^m × 4^n

**空间复杂度**：
- 递归：O(digits.length)栈深度
- 迭代：O(3^m × 4^n)存储中间结果

---

## 执行过程可视化

以`digits = "23"`为例：

```
backtrack(0, "")
├─ letter='a'
│  └─ backtrack(1, "a")
│     ├─ letter='d' → backtrack(2, "ad") → 收集"ad"
│     ├─ letter='e' → backtrack(2, "ae") → 收集"ae"
│     └─ letter='f' → backtrack(2, "af") → 收集"af"
├─ letter='b'
│  └─ backtrack(1, "b")
│     ├─ letter='d' → backtrack(2, "bd") → 收集"bd"
│     ├─ letter='e' → backtrack(2, "be") → 收集"be"
│     └─ letter='f' → backtrack(2, "bf") → 收集"bf"
└─ letter='c'
   └─ backtrack(1, "c")
      ├─ letter='d' → backtrack(2, "cd") → 收集"cd"
      ├─ letter='e' → backtrack(2, "ce") → 收集"ce"
      └─ letter='f' → backtrack(2, "cf") → 收集"cf"

结果：["ad","ae","af","bd","be","bf","cd","ce","cf"]
```

---

## 常见错误

**错误1：忘记处理空输入**
```typescript
// 错误
function letterCombinations(digits: string): string[] {
  // 直接开始处理...  ❌ 空字符串会返回[""]

// 正确
if (!digits) return [];  // ✅
```

**错误2：映射表不完整**
```typescript
// 错误：漏掉了某些数字
const phoneMap = {
  '2': 'abc', '3': 'def'  // ❌ 不完整
};

// 正确：完整映射
const phoneMap = {
  '2': 'abc', '3': 'def', '4': 'ghi', '5': 'jkl',
  '6': 'mno', '7': 'pqrs', '8': 'tuv', '9': 'wxyz'
};  // ✅
```

**错误3：7和9的字母数量**
```typescript
// 注意：7和9有4个字母
'7': 'pqrs',  // 4个
'9': 'wxyz'   // 4个
```

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [22. 括号生成](https://leetcode.com/problems/generate-parentheses/) | 中等 | 类似的生成所有组合 |
| [39. 组合总和](https://leetcode.com/problems/combination-sum/) | 中等 | 不同的选择空间 |
| [784. 字母大小写全排列](https://leetcode.com/problems/letter-case-permutation/) | 中等 | 每个位置两种选择 |

---

## 解法对比

| 方法 | 优点 | 缺点 |
|-----|------|------|
| **DFS递归** | 直观易懂 | 递归开销 |
| **BFS迭代** | 无递归 | 需要更多中间存储 |
| **笛卡尔积** | 函数式风格简洁 | 不够直观 |

---

## 总结

电话号码字母组合的核心要点：

1. **多集合选择**：每层的选择来自不同集合（不同数字对应不同字母）
2. **固定长度结果**：结果长度等于数字串长度
3. **无重复问题**：每个位置独立选择，天然无重复
4. **多种实现**：
   - DFS回溯：标准模板
   - BFS迭代：逐层扩展
   - 笛卡尔积：函数式编程

本题是"多集合组合"的模板题，理解后可用于类似的多选项组合场景。
```
