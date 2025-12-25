# 实战：贴纸拼词

## 题目描述

我们有 `n` 种不同类型的贴纸。每个贴纸上都有一个小写英文单词。

你需要拼出给定的字符串 `target`。你可以使用每种贴纸任意次数。

返回拼出 `target` 需要的最少贴纸数量。如果无法完成，返回 `-1`。

📎 [LeetCode 691. 贴纸拼词](https://leetcode.cn/problems/stickers-to-spell-word/)

**示例**：

```
输入：stickers = ["with","example","science"], target = "thehat"
输出：3
解释：使用 2 张 "with" 和 1 张 "example" 可以拼成 "thehat"

输入：stickers = ["notice","possible"], target = "basicbasic"
输出：-1
```

## 问题分析

如果 target 很短（≤15），可以用状态压缩表示"哪些字符已拼出"。

但本题 target 可达 15 个字符，且可能有重复字符，需要特殊处理。

## 方法一：状态压缩 DP

### 思路

用状态压缩表示 target 中已拼出的字符位置。

### 代码实现

```typescript
/**
 * 状态压缩 DP
 * 时间复杂度：O(m × 2^n × n)
 * 空间复杂度：O(2^n)
 */
function minStickers(stickers: string[], target: string): number {
  const n = target.length;
  const m = stickers.length;
  const FULL = (1 << n) - 1;
  
  // 预处理贴纸的字符频率
  const stickerCounts: number[][] = stickers.map(s => {
    const count = new Array(26).fill(0);
    for (const c of s) {
      count[c.charCodeAt(0) - 97]++;
    }
    return count;
  });
  
  // dp[mask] = 拼出 mask 对应位置的最少贴纸数
  const dp = new Array(1 << n).fill(Infinity);
  dp[0] = 0;
  
  for (let mask = 0; mask < (1 << n); mask++) {
    if (dp[mask] === Infinity) continue;
    
    // 尝试每张贴纸
    for (let i = 0; i < m; i++) {
      const count = [...stickerCounts[i]];
      let newMask = mask;
      
      // 用这张贴纸尽量覆盖未拼出的字符
      for (let j = 0; j < n; j++) {
        if (newMask & (1 << j)) continue;  // 已拼出
        
        const charIdx = target.charCodeAt(j) - 97;
        if (count[charIdx] > 0) {
          count[charIdx]--;
          newMask |= (1 << j);
        }
      }
      
      // 更新
      if (newMask !== mask) {
        dp[newMask] = Math.min(dp[newMask], dp[mask] + 1);
      }
    }
  }
  
  return dp[FULL] === Infinity ? -1 : dp[FULL];
}
```

## 方法二：记忆化搜索

用字符串表示剩余需要拼的字符。

```typescript
function minStickers(stickers: string[], target: string): number {
  const m = stickers.length;
  
  // 预处理贴纸
  const stickerCounts: number[][] = stickers.map(s => {
    const count = new Array(26).fill(0);
    for (const c of s) {
      count[c.charCodeAt(0) - 97]++;
    }
    return count;
  });
  
  // 检查是否可能拼出 target
  const targetCount = new Array(26).fill(0);
  for (const c of target) {
    targetCount[c.charCodeAt(0) - 97]++;
  }
  
  const allChars = new Array(26).fill(0);
  for (const count of stickerCounts) {
    for (let i = 0; i < 26; i++) {
      if (count[i] > 0) allChars[i] = 1;
    }
  }
  
  for (let i = 0; i < 26; i++) {
    if (targetCount[i] > 0 && allChars[i] === 0) {
      return -1;
    }
  }
  
  const memo: Map<string, number> = new Map();
  
  function dfs(remaining: string): number {
    if (remaining === '') return 0;
    
    if (memo.has(remaining)) return memo.get(remaining)!;
    
    // 当前剩余字符的频率
    const remCount = new Array(26).fill(0);
    for (const c of remaining) {
      remCount[c.charCodeAt(0) - 97]++;
    }
    
    let result = Infinity;
    
    // 尝试每张贴纸
    for (let i = 0; i < m; i++) {
      // 剪枝：只考虑包含第一个字符的贴纸
      const firstChar = remaining.charCodeAt(0) - 97;
      if (stickerCounts[i][firstChar] === 0) continue;
      
      // 使用这张贴纸后的剩余
      const newCount = [...remCount];
      for (let j = 0; j < 26; j++) {
        newCount[j] = Math.max(0, newCount[j] - stickerCounts[i][j]);
      }
      
      // 转回字符串
      let newRemaining = '';
      for (let j = 0; j < 26; j++) {
        newRemaining += String.fromCharCode(97 + j).repeat(newCount[j]);
      }
      
      result = Math.min(result, 1 + dfs(newRemaining));
    }
    
    memo.set(remaining, result);
    return result;
  }
  
  // 排序 target 以便记忆化
  const sortedTarget = target.split('').sort().join('');
  const ans = dfs(sortedTarget);
  
  return ans === Infinity ? -1 : ans;
}
```

## 方法三：BFS

```typescript
function minStickers(stickers: string[], target: string): number {
  const m = stickers.length;
  const n = target.length;
  const FULL = (1 << n) - 1;
  
  const stickerCounts: number[][] = stickers.map(s => {
    const count = new Array(26).fill(0);
    for (const c of s) {
      count[c.charCodeAt(0) - 97]++;
    }
    return count;
  });
  
  // BFS
  const visited = new Set<number>();
  const queue: [number, number][] = [[0, 0]];  // [mask, steps]
  visited.add(0);
  
  while (queue.length > 0) {
    const [mask, steps] = queue.shift()!;
    
    if (mask === FULL) return steps;
    
    for (let i = 0; i < m; i++) {
      const count = [...stickerCounts[i]];
      let newMask = mask;
      
      for (let j = 0; j < n; j++) {
        if (newMask & (1 << j)) continue;
        
        const charIdx = target.charCodeAt(j) - 97;
        if (count[charIdx] > 0) {
          count[charIdx]--;
          newMask |= (1 << j);
        }
      }
      
      if (!visited.has(newMask)) {
        visited.add(newMask);
        queue.push([newMask, steps + 1]);
      }
    }
  }
  
  return -1;
}
```

## 优化技巧

### 1. 贴纸剪枝

过滤掉被完全包含的贴纸：

```typescript
// 如果贴纸 A 的每个字符都 <= 贴纸 B 的对应字符，则 A 可以被 B 替代
```

### 2. 优先选择覆盖多的贴纸

使用优先队列按覆盖数排序：

```typescript
// 用覆盖字符数多的贴纸优先扩展
```

### 3. 只考虑有效贴纸

只保留包含 target 中字符的贴纸。

## 示例演算

以 `stickers = ["with","example","science"], target = "thehat"` 为例：

```
target = "thehat"
位置：t(0), h(1), e(2), h(3), a(4), t(5)
FULL = 111111 = 63

贴纸：
  with: w, i, t, h → 可覆盖 t, h
  example: e, x, a, m, p, l, e → 可覆盖 e, a
  science: s, c, i, e, n, c, e → 可覆盖 e

初始 mask = 0

使用 "with":
  覆盖 t(0), h(1) → mask = 000011 = 3

再使用 "with":
  覆盖 h(3), t(5) → mask = 101011 = 43

使用 "example":
  覆盖 e(2), a(4) → mask = 111111 = 63

总共 3 张贴纸
```

## 复杂度分析

| 方法 | 时间 | 空间 |
|-----|------|------|
| 状态压缩 DP | O(m × 2^n × n) | O(2^n) |
| 记忆化搜索 | 取决于状态数 | O(状态数) |
| BFS | O(m × 2^n × n) | O(2^n) |

## 本章小结

1. **状态压缩表示覆盖**：用二进制位表示已拼出的位置
2. **贴纸贪心使用**：每次尽量覆盖更多字符
3. **剪枝技巧**：只考虑包含必要字符的贴纸

## 相关题目

- [1125. 最小的必要团队](./practice-smallest-team.md)
- [943. 最短超级串](https://leetcode.cn/problems/find-the-shortest-superstring/)
