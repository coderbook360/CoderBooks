# 实战：替换后的最长重复字符

> LeetCode 424. 替换后的最长重复字符 | 难度：中等

滑动窗口的进阶应用，关键在于理解窗口的有效性条件和巧妙的优化技巧。

---

## 题目描述

给你一个字符串 `s` 和一个整数 `k`，你可以将字符串中的任意字符替换成其他任意大写英文字母。在执行上述操作后，返回包含相同字母的**最长子串**的长度。

最多可以替换 k 次。

**示例**：
```
输入：s = "AABABBA", k = 1
输出：4
解释：将中间的 'B' 替换为 'A'，得到 "AAAAABB"，最长重复子串 "AAAA" 长度为 4

输入：s = "ABAB", k = 2
输出：4
解释：将两个 'A' 或两个 'B' 替换，整个字符串变成相同字符
```

---

## 思路分析

**关键洞察**：

对于窗口 `[left, right]`，如果我们想把它变成全是同一个字符，需要替换多少个字符？

```
需要替换的数量 = 窗口长度 - 出现次数最多的字符数
               = (right - left + 1) - maxCount
```

如果这个值 `<= k`，说明我们可以通过最多 k 次替换使整个窗口变成相同字符。

---

## 代码实现

### 基础版本

```typescript
function characterReplacement(s: string, k: number): number {
  const count = new Array(26).fill(0);  // 26个大写字母
  let left = 0;
  let maxCount = 0;  // 窗口内出现次数最多的字符的数量
  let maxLen = 0;
  
  for (let right = 0; right < s.length; right++) {
    // 右边界字符进入窗口
    const idx = s.charCodeAt(right) - 65;  // 'A' = 65
    count[idx]++;
    maxCount = Math.max(maxCount, count[idx]);
    
    // 需要替换的数量超过 k，收缩左边界
    while (right - left + 1 - maxCount > k) {
      count[s.charCodeAt(left) - 65]--;
      left++;
    }
    
    // 更新答案
    maxLen = Math.max(maxLen, right - left + 1);
  }
  
  return maxLen;
}
```

### 优化版本（不用 while）

```typescript
function characterReplacement(s: string, k: number): number {
  const count = new Array(26).fill(0);
  let left = 0;
  let maxCount = 0;
  
  for (let right = 0; right < s.length; right++) {
    const idx = s.charCodeAt(right) - 65;
    count[idx]++;
    maxCount = Math.max(maxCount, count[idx]);
    
    // 窗口无效时，左边界移动一位
    if (right - left + 1 - maxCount > k) {
      count[s.charCodeAt(left) - 65]--;
      left++;
    }
  }
  
  // 最后窗口大小就是答案
  return s.length - left;
}
```

---

## 为什么 maxCount 不需要精确维护？

你可能注意到，当左边界收缩时，我们**没有更新 maxCount**。这不会导致错误吗？

**关键洞察**：我们要找的是**最大**长度。

假设之前的最大窗口长度为 L，其中 maxCount = M。

当 maxCount 不更新时：
1. 如果新窗口的真实 maxCount < M，窗口条件更严格
2. 窗口要么保持大小，要么因为条件不满足而收缩
3. **只有当新的 maxCount >= M 时，窗口才可能变得更大**

所以，maxCount 只增不减不影响最终答案的正确性！

```
maxCount 单调不减 → 窗口大小单调不减（或不变）
这正是我们需要的：找最大窗口
```

---

## 执行过程可视化

```
s = "AABABBA", k = 1

right=0, char='A':
  count[A]=1, maxCount=1
  窗口="A", len=1, 需替换=1-1=0 <= 1 ✓
  maxLen=1

right=1, char='A':
  count[A]=2, maxCount=2
  窗口="AA", len=2, 需替换=2-2=0 <= 1 ✓
  maxLen=2

right=2, char='B':
  count[B]=1, maxCount=2
  窗口="AAB", len=3, 需替换=3-2=1 <= 1 ✓
  maxLen=3

right=3, char='A':
  count[A]=3, maxCount=3
  窗口="AABA", len=4, 需替换=4-3=1 <= 1 ✓
  maxLen=4

right=4, char='B':
  count[B]=2, maxCount=3
  窗口="AABAB", len=5, 需替换=5-3=2 > 1 ✗
  收缩：left=1, count[A]=2
  窗口="ABAB", len=4, 需替换=4-2=2 > 1 ✗
  收缩：left=2, count[A]=1
  窗口="BAB", len=3, 需替换=3-2=1 <= 1 ✓
  maxLen=4（没有更新，仍然是4）

right=5, char='B':
  count[B]=3, maxCount=3
  窗口="BABB", len=4, 需替换=4-3=1 <= 1 ✓
  maxLen=4

right=6, char='A':
  count[A]=2, maxCount=3
  窗口="BABBA", len=5, 需替换=5-3=2 > 1 ✗
  收缩：left=3
  窗口="ABBA", len=4, 需替换=4-2=2 > 1 ✗
  收缩：left=4
  窗口="BBA", len=3
  maxLen=4

返回 4 ✓
```

---

## 复杂度分析

**时间复杂度**：O(n)
- 每个字符最多进入窗口一次、离开窗口一次

**空间复杂度**：O(1)
- 固定 26 个字母的计数数组

---

## 常见错误

**错误1：maxCount 精确更新导致超时**
```typescript
// 错误：每次收缩都重新计算 maxCount
while (right - left + 1 - maxCount > k) {
  count[s.charCodeAt(left) - 65]--;
  left++;
  maxCount = Math.max(...count);  // ❌ O(26) 每次
}
```

**错误2：忘记 -65 转换字符**
```typescript
// 错误：直接用字符做索引
count[s[right]]++;  // ❌

// 正确
count[s.charCodeAt(right) - 65]++;  // ✅
```

**错误3：条件判断写反**
```typescript
// 错误：需替换数 < k 才收缩
while (right - left + 1 - maxCount < k) {  // ❌

// 正确：需替换数 > k 才收缩
while (right - left + 1 - maxCount > k) {  // ✅
```

---

## if vs while 的区别

```typescript
// while 版本：窗口大小可能减小
while (right - left + 1 - maxCount > k) {
  // 可能连续收缩多次
}

// if 版本：窗口大小只增不减
if (right - left + 1 - maxCount > k) {
  // 只收缩一次
}
```

if 版本利用了"窗口大小单调不减"的性质，代码更简洁。

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [1004. 最大连续1的个数 III](https://leetcode.com/problems/max-consecutive-ones-iii/) | 中等 | 只有0和1 |
| [1493. 删掉一个元素以后全为1的最长子数组](https://leetcode.com/problems/longest-subarray-of-1s-after-deleting-one-element/) | 中等 | k=1 |
| [340. 至多包含 K 个不同字符的最长子串](https://leetcode.com/problems/longest-substring-with-at-most-k-distinct-characters/) | 中等 | 不同字符数 |

---

## 滑动窗口"最大化"模式总结

本题展示了一个重要的滑动窗口模式：

```typescript
// 求满足条件的最大窗口
for (let right = 0; right < n; right++) {
  // 更新窗口状态
  
  // 方法1：while 收缩直到满足条件
  while (不满足条件) {
    left++;
  }
  maxLen = Math.max(maxLen, right - left + 1);
  
  // 方法2：if 保持窗口大小单调（更优）
  if (不满足条件) {
    left++;
  }
  // 最后 s.length - left 就是答案
}
```

---

## 总结

替换后的最长重复字符核心要点：

1. **窗口有效性**：需替换数 = 窗口长度 - maxCount <= k
2. **maxCount 优化**：不需要精确维护，只增不减
3. **两种写法**：while（标准）vs if（优化）
4. **最终答案**：if 版本用 `s.length - left`
- 最大连续 1 的个数 III（可以翻转 k 个 0）
- 本质相同：窗口内"需要修改"的数量不超过 k
