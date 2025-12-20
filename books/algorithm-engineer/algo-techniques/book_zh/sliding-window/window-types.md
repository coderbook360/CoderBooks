# 固定窗口与可变窗口

滑动窗口根据窗口大小是否固定，分为两种类型。理解它们的区别，是选择正确解题策略的关键。

---

## 固定窗口

窗口大小始终为 k，适用于"大小为 k 的子数组"类问题。

### 核心思路

1. 先构建初始窗口（前 k 个元素）
2. 窗口整体右移：右边进一个，左边出一个
3. 每次移动后更新结果

### 代码模板

```typescript
function fixedWindow(arr: number[], k: number): number {
  // 1. 构建初始窗口
  let windowSum = 0;
  for (let i = 0; i < k; i++) {
    windowSum += arr[i];
  }
  let result = windowSum;
  
  // 2. 滑动窗口
  for (let right = k; right < arr.length; right++) {
    const left = right - k;
    windowSum += arr[right];    // 右边进
    windowSum -= arr[left];     // 左边出
    result = Math.max(result, windowSum);
  }
  
  return result;
}
```

### 示例：大小为 k 的子数组最大和

```
数组: [1, 4, 2, 10, 2, 3, 1, 0, 20], k = 4

初始窗口 [1,4,2,10]，和 = 17
滑动后 [4,2,10,2]，和 = 18
滑动后 [2,10,2,3]，和 = 17
...
最大和 = 24 (子数组 [3,1,0,20])
```

---

## 可变窗口

窗口大小根据条件动态调整，是滑动窗口的核心精髓。

### 两种变体

**1. 求满足条件的最长子数组**

```typescript
function longestWindow(arr: any[]): number {
  let left = 0;
  let maxLen = 0;
  
  for (let right = 0; right < arr.length; right++) {
    // 扩展窗口
    
    // 当窗口不满足条件时，收缩左边界
    while (!isValid()) {
      // 移除 arr[left]
      left++;
    }
    
    // 此时窗口满足条件，更新最大长度
    maxLen = Math.max(maxLen, right - left + 1);
  }
  
  return maxLen;
}
```

**2. 求满足条件的最短子数组**

```typescript
function shortestWindow(arr: any[]): number {
  let left = 0;
  let minLen = Infinity;
  
  for (let right = 0; right < arr.length; right++) {
    // 扩展窗口
    
    // 当窗口满足条件时，尝试收缩
    while (isValid()) {
      minLen = Math.min(minLen, right - left + 1);
      // 移除 arr[left]
      left++;
    }
  }
  
  return minLen === Infinity ? 0 : minLen;
}
```

### 关键区别

| 类型 | 收缩时机 | 更新结果时机 |
|-----|---------|------------|
| 最长 | 不满足条件时 | 收缩后（窗口满足条件） |
| 最短 | 满足条件时 | 收缩前（窗口刚好满足） |

---

## 示例对比

### 最长无重复子串（最长型）

```typescript
function lengthOfLongestSubstring(s: string): number {
  const set = new Set<string>();
  let left = 0;
  let maxLen = 0;
  
  for (let right = 0; right < s.length; right++) {
    // 窗口有重复时，收缩
    while (set.has(s[right])) {
      set.delete(s[left]);
      left++;
    }
    
    set.add(s[right]);
    maxLen = Math.max(maxLen, right - left + 1);
  }
  
  return maxLen;
}
```

### 长度最小的子数组（最短型）

```typescript
function minSubArrayLen(target: number, nums: number[]): number {
  let left = 0;
  let sum = 0;
  let minLen = Infinity;
  
  for (let right = 0; right < nums.length; right++) {
    sum += nums[right];
    
    // 满足条件时，收缩并更新
    while (sum >= target) {
      minLen = Math.min(minLen, right - left + 1);
      sum -= nums[left];
      left++;
    }
  }
  
  return minLen === Infinity ? 0 : minLen;
}
```

---

## 选择策略

- **固定大小问题** → 固定窗口
- **最长/最短问题** → 可变窗口
- **恰好等于 k** → 转化为"最多 k 个" - "最多 k-1 个"
