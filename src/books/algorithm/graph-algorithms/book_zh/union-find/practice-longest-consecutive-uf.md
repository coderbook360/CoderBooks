# 最长连续序列（并查集）

LeetCode 128. Longest Consecutive Sequence (Union-Find Solution)

## 题目描述

给定一个未排序的整数数组 `nums`，找出数字连续的最长序列（不要求序列元素在原数组中连续）的长度。

请你设计并实现时间复杂度为 O(n) 的算法解决此问题。

## 示例

```
输入：nums = [100, 4, 200, 1, 3, 2]
输出：4
解释：最长连续序列是 [1, 2, 3, 4]，长度为 4
```

## 思路分析

**连续序列 = 数字的连通性**

如果 num 和 num+1 都存在，它们属于同一个连续序列。用并查集合并，最后找最大集合。

## 代码实现

```typescript
function longestConsecutive(nums: number[]): number {
  if (nums.length === 0) return 0;
  
  const numSet = new Set(nums);
  const parent = new Map<number, number>();
  const size = new Map<number, number>();
  
  // 初始化
  for (const num of numSet) {
    parent.set(num, num);
    size.set(num, 1);
  }
  
  function find(x: number): number {
    if (parent.get(x) !== x) {
      parent.set(x, find(parent.get(x)!));
    }
    return parent.get(x)!;
  }
  
  function union(x: number, y: number): void {
    const rootX = find(x);
    const rootY = find(y);
    if (rootX !== rootY) {
      // 按大小合并
      if (size.get(rootX)! < size.get(rootY)!) {
        parent.set(rootX, rootY);
        size.set(rootY, size.get(rootX)! + size.get(rootY)!);
      } else {
        parent.set(rootY, rootX);
        size.set(rootX, size.get(rootX)! + size.get(rootY)!);
      }
    }
  }
  
  // 合并连续数字
  for (const num of numSet) {
    if (numSet.has(num + 1)) {
      union(num, num + 1);
    }
  }
  
  // 找最大集合
  let maxLen = 1;
  for (const num of numSet) {
    if (find(num) === num) {  // 是根节点
      maxLen = Math.max(maxLen, size.get(num)!);
    }
  }
  
  return maxLen;
}
```

## 执行过程

```
nums = [100, 4, 200, 1, 3, 2]
numSet = {100, 4, 200, 1, 3, 2}

初始化：
parent: {100:100, 4:4, 200:200, 1:1, 3:3, 2:2}
size:   {100:1, 4:1, 200:1, 1:1, 3:1, 2:1}

合并过程：
100: 100+1=101 不存在，跳过
4: 4+1=5 不存在，跳过
200: 200+1=201 不存在，跳过
1: 1+1=2 存在，union(1,2)
   size: {1:2, 2:1, ...}
3: 3+1=4 存在，union(3,4)
   size: {3:2, 4:1, ...}
2: 2+1=3 存在，union(2,3)
   find(2)=1, find(3)=3
   union(1,3) → size: {1:4, ...}

最终最大 size = 4
```

## 与哈希表方法对比

```typescript
// 哈希表解法（更常用）
function longestConsecutiveHash(nums: number[]): number {
  const numSet = new Set(nums);
  let maxLen = 0;
  
  for (const num of numSet) {
    // 只从序列起点开始计数
    if (!numSet.has(num - 1)) {
      let currentNum = num;
      let currentLen = 1;
      
      while (numSet.has(currentNum + 1)) {
        currentNum++;
        currentLen++;
      }
      
      maxLen = Math.max(maxLen, currentLen);
    }
  }
  
  return maxLen;
}
```

## 两种方法对比

| 方法 | 时间复杂度 | 空间复杂度 | 特点 |
|------|------------|------------|------|
| 并查集 | O(n · α(n)) | O(n) | 支持动态添加 |
| 哈希表 | O(n) | O(n) | 代码更简洁 |

**选择建议**：
- 静态数组 → 哈希表方法更简洁
- 动态添加数字 → 并查集

## 动态场景

```typescript
class ConsecutiveCounter {
  private parent = new Map<number, number>();
  private size = new Map<number, number>();
  public maxLen = 0;
  
  private find(x: number): number {
    if (this.parent.get(x) !== x) {
      this.parent.set(x, this.find(this.parent.get(x)!));
    }
    return this.parent.get(x)!;
  }
  
  private union(x: number, y: number): void {
    const rootX = this.find(x);
    const rootY = this.find(y);
    if (rootX !== rootY) {
      const newSize = this.size.get(rootX)! + this.size.get(rootY)!;
      this.parent.set(rootX, rootY);
      this.size.set(rootY, newSize);
      this.maxLen = Math.max(this.maxLen, newSize);
    }
  }
  
  addNumber(num: number): number {
    if (this.parent.has(num)) return this.maxLen;
    
    this.parent.set(num, num);
    this.size.set(num, 1);
    this.maxLen = Math.max(this.maxLen, 1);
    
    if (this.parent.has(num - 1)) {
      this.union(num, num - 1);
    }
    if (this.parent.has(num + 1)) {
      this.union(num, num + 1);
    }
    
    return this.maxLen;
  }
}
```

## 复杂度分析

- **时间复杂度**：O(n · α(n)) ≈ O(n)
- **空间复杂度**：O(n)

## 相关题目

| 题号 | 题目 | 难度 |
|------|------|------|
| 128 | 最长连续序列 | 中等 |
| 547 | 省份数量 | 中等 |
| 721 | 账户合并 | 中等 |
