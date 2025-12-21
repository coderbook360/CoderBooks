# 滑动窗口模板

本章提供滑动窗口的通用模板，帮助你快速套用解题。

---

## 模板一：固定窗口

```typescript
function fixedSlidingWindow<T>(arr: T[], k: number): any {
  const n = arr.length;
  if (n < k) return null;
  
  // 初始化窗口状态
  let windowState = initWindow(arr.slice(0, k));
  let result = calculateResult(windowState);
  
  // 滑动窗口
  for (let i = k; i < n; i++) {
    const entering = arr[i];       // 进入窗口的元素
    const leaving = arr[i - k];    // 离开窗口的元素
    
    addToWindow(windowState, entering);
    removeFromWindow(windowState, leaving);
    
    result = updateResult(result, windowState);
  }
  
  return result;
}
```

---

## 模板二：可变窗口（求最长）

当窗口不满足条件时收缩。

```typescript
function longestSlidingWindow(arr: any[]): number {
  let left = 0;
  let maxLen = 0;
  // 窗口状态，根据题目需要选择合适的数据结构
  const window = new Map<any, number>();
  
  for (let right = 0; right < arr.length; right++) {
    // 1. 扩展：将 arr[right] 加入窗口
    const c = arr[right];
    window.set(c, (window.get(c) || 0) + 1);
    
    // 2. 收缩：当窗口不满足条件时
    while (!isValid(window)) {
      const d = arr[left];
      window.set(d, window.get(d)! - 1);
      if (window.get(d) === 0) window.delete(d);
      left++;
    }
    
    // 3. 更新结果：此时窗口满足条件
    maxLen = Math.max(maxLen, right - left + 1);
  }
  
  return maxLen;
}
```

---

## 模板三：可变窗口（求最短）

当窗口满足条件时收缩。

```typescript
function shortestSlidingWindow(arr: any[]): number {
  let left = 0;
  let minLen = Infinity;
  const window = new Map<any, number>();
  
  for (let right = 0; right < arr.length; right++) {
    // 1. 扩展
    const c = arr[right];
    window.set(c, (window.get(c) || 0) + 1);
    
    // 2. 当满足条件时，收缩并记录
    while (isValid(window)) {
      minLen = Math.min(minLen, right - left + 1);
      const d = arr[left];
      window.set(d, window.get(d)! - 1);
      if (window.get(d) === 0) window.delete(d);
      left++;
    }
  }
  
  return minLen === Infinity ? 0 : minLen;
}
```

---

## 模板四：字符串子串匹配

用于判断子串是否包含目标串的所有字符。

```typescript
function substringMatch(s: string, t: string): string {
  const need = new Map<string, number>();
  const window = new Map<string, number>();
  
  // 统计目标串的字符需求
  for (const c of t) {
    need.set(c, (need.get(c) || 0) + 1);
  }
  
  let left = 0;
  let valid = 0;  // 已满足的字符种类数
  let start = 0, minLen = Infinity;
  
  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    
    // 扩展
    if (need.has(c)) {
      window.set(c, (window.get(c) || 0) + 1);
      if (window.get(c) === need.get(c)) {
        valid++;
      }
    }
    
    // 收缩
    while (valid === need.size) {
      // 更新最小覆盖子串
      if (right - left + 1 < minLen) {
        start = left;
        minLen = right - left + 1;
      }
      
      const d = s[left];
      if (need.has(d)) {
        if (window.get(d) === need.get(d)) {
          valid--;
        }
        window.set(d, window.get(d)! - 1);
      }
      left++;
    }
  }
  
  return minLen === Infinity ? "" : s.substring(start, start + minLen);
}
```

---

## 使用模板的关键

1. **确定窗口状态**：用什么数据结构维护窗口信息？
2. **定义合法条件**：什么时候窗口是"满足条件"的？
3. **确定收缩时机**：是条件不满足时收缩，还是满足时收缩？
4. **更新结果**：在扩展后更新，还是收缩前更新？

---

## 常见状态维护

```typescript
// 字符频率
const freq = new Map<string, number>();

// 窗口内不同元素个数
window.size

// 窗口和
let sum = 0;

// 窗口最大/最小值（需要单调队列）
const deque: number[] = [];
```
