# 情侣牵手

LeetCode 765. Couples Holding Hands

## 题目描述

n 对情侣坐在连续排列的 2n 个座位上，想要牵到对方的手。

人和座位用 0 到 2n-1 的整数表示。情侣们按顺序编号，第一对是 (0, 1)，第二对是 (2, 3)，以此类推，最后一对是 (2n-2, 2n-1)。

给你一个长度为 2n 的数组 `row`，其中 `row[i]` 表示坐在第 i 个座位上的人的编号。

返回最少交换座位的次数，以便每对情侣都能并肩坐在一起。每次交换可选择任意两人，让他们互换座位。

## 示例

```
输入：row = [0, 2, 1, 3]
输出：1
解释：只需要交换 row[1] 和 row[2] 的位置

输入：row = [3, 2, 0, 1]
输出：0
解释：
座位 0,1：3 和 2 是情侣 ✓
座位 2,3：0 和 1 是情侣 ✓
```

## 思路分析

**关键洞察**：
- 每对相邻座位 (0,1), (2,3), ... 应该坐一对情侣
- 如果座位 i 上的人和座位 i+1 上的人不是情侣，需要交换

**并查集视角**：
- 把每对座位看作一个"沙发"
- 如果沙发 A 上有人的情侣在沙发 B 上，则 A 和 B 需要"交换"
- 这形成了一个连通关系

**结论**：如果 k 个沙发形成一个连通块，需要 k-1 次交换。

## 代码实现

```typescript
function minSwapsCouples(row: number[]): number {
  const n = row.length / 2;  // 情侣对数 = 沙发数
  const parent = Array.from({ length: n }, (_, i) => i);
  
  function find(x: number): number {
    if (parent[x] !== x) {
      parent[x] = find(parent[x]);
    }
    return parent[x];
  }
  
  function union(x: number, y: number): void {
    parent[find(x)] = find(y);
  }
  
  // 遍历每对座位
  for (let i = 0; i < row.length; i += 2) {
    const person1 = row[i];
    const person2 = row[i + 1];
    
    // 情侣编号：person / 2
    const couple1 = Math.floor(person1 / 2);
    const couple2 = Math.floor(person2 / 2);
    
    // 如果不是同一对情侣，合并他们所属的"沙发组"
    if (couple1 !== couple2) {
      union(couple1, couple2);
    }
  }
  
  // 统计连通块数量
  let components = 0;
  for (let i = 0; i < n; i++) {
    if (find(i) === i) {
      components++;
    }
  }
  
  // 总交换次数 = 沙发数 - 连通块数
  return n - components;
}
```

## 执行过程

```
row = [0, 2, 1, 3]
n = 2 个沙发

沙发 0：人 0 和人 2
  情侣组 0 (人0的) 和 情侣组 1 (人2的)
  union(0, 1)

沙发 1：人 1 和人 3
  情侣组 0 (人1的) 和 情侣组 1 (人3的)
  union(0, 1)  // 已经连通

连通块数量：1
交换次数 = 2 - 1 = 1
```

## 为什么 n - components？

假设有 k 个沙发形成一个环状连通块：
```
沙发 A 有 (a, b')，b' 的情侣在沙发 B
沙发 B 有 (b, c')，c' 的情侣在沙发 C
...
沙发 K 有 (k, a')，a' 的情侣在沙发 A
```

这 k 个沙发需要 k-1 次交换来解开。

所有连通块的交换次数之和 = Σ(k_i - 1) = n - components

## 贪心解法（对比）

```typescript
function minSwapsCouplesGreedy(row: number[]): number {
  const n = row.length;
  // pos[i] = 人 i 所在的座位
  const pos = new Array(n);
  for (let i = 0; i < n; i++) {
    pos[row[i]] = i;
  }
  
  let swaps = 0;
  for (let i = 0; i < n; i += 2) {
    const person = row[i];
    const partner = person ^ 1;  // 情侣：0^1=1, 1^1=0, 2^1=3, 3^1=2
    
    if (row[i + 1] !== partner) {
      // 找到情侣并交换到相邻位置
      const partnerPos = pos[partner];
      
      // 交换 row[i+1] 和 row[partnerPos]
      pos[row[i + 1]] = partnerPos;
      pos[partner] = i + 1;
      
      [row[i + 1], row[partnerPos]] = [row[partnerPos], row[i + 1]];
      
      swaps++;
    }
  }
  
  return swaps;
}
```

## 两种方法对比

| 方法 | 时间复杂度 | 空间复杂度 | 特点 |
|------|------------|------------|------|
| 并查集 | O(n · α(n)) | O(n) | 数学证明优雅 |
| 贪心 | O(n) | O(n) | 直观，实际交换 |

## 复杂度分析

- **时间复杂度**：O(n · α(n)) ≈ O(n)
- **空间复杂度**：O(n)

## 相关题目

| 题号 | 题目 | 难度 |
|------|------|------|
| 765 | 情侣牵手 | 困难 |
| 547 | 省份数量 | 中等 |
| 684 | 冗余连接 | 中等 |
| 41 | 缺失的第一个正数 | 困难 |
