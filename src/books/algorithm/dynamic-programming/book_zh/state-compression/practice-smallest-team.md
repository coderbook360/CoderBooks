# 实战：最小的必要团队

## 题目描述

作为项目经理，你规划了一份需求的技能清单 `req_skills`。

给你一个由技能人员组成的列表 `people`。`people[i]` 包含第 `i` 个人具备的技能。

返回所有技能都有人覆盖的**最小团队**。

📎 [LeetCode 1125. 最小的必要团队](https://leetcode.cn/problems/smallest-sufficient-team/)

**示例**：

```
输入：req_skills = ["java","nodejs","reactjs"],
     people = [["java"],["nodejs"],["nodejs","reactjs"]]
输出：[0,2]

输入：req_skills = ["algorithms","math","java","reactjs","csharp","aws"],
     people = [["algorithms","math","java"],
               ["algorithms","math","reactjs"],
               ["java","csharp","aws"],
               ["reactjs","csharp"],
               ["csharp","math"],
               ["aws","java"]]
输出：[1,2]
```

## 问题分析

典型的集合覆盖问题，NP-Hard，但数据范围小（技能数 ≤ 16）可以用状态压缩。

**状态设计**：
- 用二进制表示"已覆盖的技能集合"
- 目标是用最少的人覆盖所有技能

## 方法一：状态压缩 DP

### 状态定义

```
dp[mask] = 覆盖 mask 中所有技能所需的最少人数
```

### 状态转移

```
对于每个人 i（技能集合为 skill[i]）：
  dp[mask | skill[i]] = min(dp[mask | skill[i]], dp[mask] + 1)
```

### 代码实现

```typescript
/**
 * 状态压缩 DP
 * 时间复杂度：O(m × 2^n)
 * 空间复杂度：O(2^n)
 */
function smallestSufficientTeam(
  req_skills: string[],
  people: string[][]
): number[] {
  const n = req_skills.length;
  const m = people.length;
  const FULL = (1 << n) - 1;
  
  // 技能映射到编号
  const skillIndex: Map<string, number> = new Map();
  for (let i = 0; i < n; i++) {
    skillIndex.set(req_skills[i], i);
  }
  
  // 每个人的技能集合
  const personSkills: number[] = people.map(skills => {
    let mask = 0;
    for (const skill of skills) {
      if (skillIndex.has(skill)) {
        mask |= (1 << skillIndex.get(skill)!);
      }
    }
    return mask;
  });
  
  // dp[mask] = 覆盖 mask 的最小团队（存储团队成员）
  const dp: number[][] = new Array(1 << n).fill(null);
  dp[0] = [];
  
  for (let mask = 0; mask <= FULL; mask++) {
    if (dp[mask] === null) continue;
    
    // 尝试添加每个人
    for (let i = 0; i < m; i++) {
      const newMask = mask | personSkills[i];
      
      // 如果能更新
      if (dp[newMask] === null || dp[newMask].length > dp[mask].length + 1) {
        dp[newMask] = [...dp[mask], i];
      }
    }
  }
  
  return dp[FULL];
}
```

### 空间优化

只存储最小人数和父状态：

```typescript
function smallestSufficientTeam(
  req_skills: string[],
  people: string[][]
): number[] {
  const n = req_skills.length;
  const m = people.length;
  const FULL = (1 << n) - 1;
  
  const skillIndex: Map<string, number> = new Map();
  for (let i = 0; i < n; i++) {
    skillIndex.set(req_skills[i], i);
  }
  
  const personSkills: number[] = people.map(skills => {
    let mask = 0;
    for (const skill of skills) {
      if (skillIndex.has(skill)) {
        mask |= (1 << skillIndex.get(skill)!);
      }
    }
    return mask;
  });
  
  // dp[mask] = [最少人数, 最后添加的人, 前一个状态]
  const dp: [number, number, number][] = new Array(1 << n).fill(null);
  dp[0] = [0, -1, -1];
  
  for (let mask = 0; mask <= FULL; mask++) {
    if (dp[mask] === null) continue;
    
    for (let i = 0; i < m; i++) {
      const newMask = mask | personSkills[i];
      
      if (dp[newMask] === null || dp[newMask][0] > dp[mask][0] + 1) {
        dp[newMask] = [dp[mask][0] + 1, i, mask];
      }
    }
  }
  
  // 回溯找团队成员
  const result: number[] = [];
  let state = FULL;
  
  while (state !== 0) {
    const [_, person, prev] = dp[state];
    result.push(person);
    state = prev;
  }
  
  return result;
}
```

## 方法二：记忆化搜索

```typescript
function smallestSufficientTeam(
  req_skills: string[],
  people: string[][]
): number[] {
  const n = req_skills.length;
  const m = people.length;
  const FULL = (1 << n) - 1;
  
  const skillIndex: Map<string, number> = new Map();
  for (let i = 0; i < n; i++) {
    skillIndex.set(req_skills[i], i);
  }
  
  const personSkills: number[] = people.map(skills => {
    let mask = 0;
    for (const skill of skills) {
      if (skillIndex.has(skill)) {
        mask |= (1 << skillIndex.get(skill)!);
      }
    }
    return mask;
  });
  
  const memo: Map<number, number[]> = new Map();
  
  function dfs(mask: number): number[] {
    if (mask === FULL) return [];
    
    if (memo.has(mask)) return memo.get(mask)!;
    
    let best: number[] | null = null;
    
    for (let i = 0; i < m; i++) {
      // 剪枝：只考虑能带来新技能的人
      if ((personSkills[i] & ~mask) === 0) continue;
      
      const newMask = mask | personSkills[i];
      const subResult = dfs(newMask);
      
      if (best === null || subResult.length + 1 < best.length) {
        best = [i, ...subResult];
      }
    }
    
    memo.set(mask, best || []);
    return best || [];
  }
  
  return dfs(0);
}
```

## 优化技巧

### 1. 预处理去重

如果一个人的技能完全被另一个人覆盖，可以排除：

```typescript
// 过滤被完全覆盖的人
const validPeople: number[] = [];
for (let i = 0; i < m; i++) {
  let dominated = false;
  for (let j = 0; j < m; j++) {
    if (i !== j && 
        (personSkills[i] & personSkills[j]) === personSkills[i] &&
        personSkills[j] !== personSkills[i]) {
      dominated = true;
      break;
    }
  }
  if (!dominated) {
    validPeople.push(i);
  }
}
```

### 2. 按技能数排序

优先选择技能多的人：

```typescript
const indices = [...Array(m).keys()];
indices.sort((a, b) => 
  popcount(personSkills[b]) - popcount(personSkills[a])
);
```

## 示例演算

以示例 1 为例：

```
技能：java(0), nodejs(1), reactjs(2)
FULL = 111 = 7

人员：
  0: java → 001
  1: nodejs → 010
  2: nodejs, reactjs → 110

DP 过程：
  dp[000] = []
  
  考虑人 0 (001):
    dp[001] = [0]
  考虑人 1 (010):
    dp[010] = [1]
  考虑人 2 (110):
    dp[110] = [2]
  
  从 dp[001] 扩展：
    dp[001 | 010] = dp[011] = [0, 1]
    dp[001 | 110] = dp[111] = [0, 2]
  
  从 dp[010] 扩展：
    dp[011] 已存在（长度相同）
    dp[110] 已存在（长度相同）
  
  从 dp[110] 扩展：
    dp[111] 已存在，长度 2 > 2，不更新

答案：[0, 2]
```

## 复杂度分析

- **时间复杂度**：O(m × 2^n)
- **空间复杂度**：O(2^n)

其中 n 是技能数（≤16），m 是人数（≤60）。

## 本章小结

1. **集合覆盖问题**：用状态压缩表示已覆盖的集合
2. **状态转移**：枚举添加每个人
3. **路径回溯**：记录父状态和决策
4. **剪枝优化**：跳过无贡献的人

## 相关题目

- [847. 最短路径访问所有节点](./practice-shortest-path-all-nodes.md)
- [691. 贴纸拼词](./practice-stickers-to-spell.md)
