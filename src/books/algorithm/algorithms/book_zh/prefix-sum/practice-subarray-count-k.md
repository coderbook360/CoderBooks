# 实战：和为 K 的子数组个数

> LeetCode 560. 和为 K 的子数组（同上一题）

本节深入分析这道题的变体和细节。

---

## 题目回顾

统计和为 k 的子数组个数。

---

## 核心公式

```
sum(i, j) = k
prefix[j+1] - prefix[i] = k
prefix[i] = prefix[j+1] - k
```

---

## 代码模板

```typescript
function subarraySum(nums: number[], k: number): number {
  const map = new Map<number, number>();
  map.set(0, 1);
  
  let prefix = 0;
  let count = 0;
  
  for (const num of nums) {
    prefix += num;
    count += map.get(prefix - k) || 0;
    map.set(prefix, (map.get(prefix) || 0) + 1);
  }
  
  return count;
}
```

---

## 变体 1：判断是否存在

只需要判断是否存在和为 k 的子数组：

```typescript
function hasSubarraySumK(nums: number[], k: number): boolean {
  const set = new Set<number>();
  set.add(0);
  
  let prefix = 0;
  
  for (const num of nums) {
    prefix += num;
    if (set.has(prefix - k)) return true;
    set.add(prefix);
  }
  
  return false;
}
```

---

## 变体 2：找出具体子数组

返回一个和为 k 的子数组的索引：

```typescript
function findSubarraySumK(nums: number[], k: number): [number, number] | null {
  const map = new Map<number, number>();
  map.set(0, -1);  // 前缀和 0 对应索引 -1
  
  let prefix = 0;
  
  for (let i = 0; i < nums.length; i++) {
    prefix += nums[i];
    
    if (map.has(prefix - k)) {
      return [map.get(prefix - k)! + 1, i];
    }
    
    if (!map.has(prefix)) {
      map.set(prefix, i);
    }
  }
  
  return null;
}
```

---

## 变体 3：最长和为 k 的子数组

```typescript
function maxSubArrayLenK(nums: number[], k: number): number {
  const map = new Map<number, number>();
  map.set(0, -1);
  
  let prefix = 0;
  let maxLen = 0;
  
  for (let i = 0; i < nums.length; i++) {
    prefix += nums[i];
    
    if (map.has(prefix - k)) {
      maxLen = Math.max(maxLen, i - map.get(prefix - k)!);
    }
    
    // 只记录第一次出现的位置（为了最长）
    if (!map.has(prefix)) {
      map.set(prefix, i);
    }
  }
  
  return maxLen;
}
```

---

## 变体 4：最短和为 k 的子数组

注意：只有当数组元素都是正数时，滑动窗口更合适。

对于有负数的情况，需要使用单调队列优化。

---

## 技巧总结

前缀和 + 哈希表适用于：
- 子数组和等于 k
- 子数组和能被 k 整除
- 子数组和大于等于 k（需配合其他技巧）
