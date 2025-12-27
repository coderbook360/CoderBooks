# 滑动窗口模板

本章提供滑动窗口的通用模板，帮助你快速套用解题。

---

## 模板一：固定窗口

```typescript
function fixedSlidingWindow<T>(arr: T[], k: number): any {
  const n = arr.length;
  // 边界检查：数组长度不足以形成大小为 k 的窗口
  if (n < k) return null;
  
  // 第一步：初始化第一个窗口 [0, k-1] 的状态
  // windowState 可以是和、最大值、频率表等，根据题目需求定义
  let windowState = initWindow(arr.slice(0, k));
  let result = calculateResult(windowState);
  
  // 第二步：滑动窗口，每次右移一格
  // 窗口从 [0, k-1] → [1, k] → [2, k+1] → ... → [n-k, n-1]
  for (let i = k; i < n; i++) {
    const entering = arr[i];       // 新进入窗口的元素（右边）
    const leaving = arr[i - k];    // 离开窗口的元素（左边）
    
    // 增量更新窗口状态（关键优化：不重新计算整个窗口）
    addToWindow(windowState, entering);      // O(1) 添加新元素
    removeFromWindow(windowState, leaving);  // O(1) 移除旧元素
    
    // 根据新的窗口状态更新结果
    result = updateResult(result, windowState);
  }
  
  return result;
}
```

**固定窗口的核心思想**：
- 窗口大小恒定为 k
- 每次滑动：一个元素进，一个元素出
- 增量更新状态，避免重复计算

---

## 模板二：可变窗口（求最长）

当窗口不满足条件时收缩。适用于"找最长满足条件的子数组/子串"问题。

```typescript
function longestSlidingWindow(arr: any[]): number {
  let left = 0;           // 窗口左边界
  let maxLen = 0;         // 记录满足条件的最大窗口长度
  
  // 窗口状态：用 Map 记录窗口内每个元素的出现次数
  // 根据题目需要，也可以用 Set、变量等其他数据结构
  const window = new Map<any, number>();
  
  // 右边界不断向右扩展
  for (let right = 0; right < arr.length; right++) {
    // ===== 第一步：扩展 =====
    // 将 arr[right] 加入窗口，更新窗口状态
    const c = arr[right];
    window.set(c, (window.get(c) || 0) + 1);
    
    // ===== 第二步：收缩 =====
    // 当窗口不满足条件时，收缩左边界直到满足条件
    // 为什么用 while？因为可能需要多次收缩
    while (!isValid(window)) {
      // 将 arr[left] 移出窗口，更新窗口状态
      const d = arr[left];
      window.set(d, window.get(d)! - 1);
      if (window.get(d) === 0) window.delete(d);  // 清理计数为 0 的键
      left++;  // 左边界右移
    }
    
    // ===== 第三步：更新结果 =====
    // 此时窗口 [left, right] 满足条件，更新最大长度
    maxLen = Math.max(maxLen, right - left + 1);
  }
  
  return maxLen;
}
```

**为什么在收缩后更新结果？**
- 收缩后的窗口一定满足条件
- 此时记录窗口长度，确保结果的正确性

---

## 模板三：可变窗口（求最短）

当窗口满足条件时收缩。适用于"找最短满足条件的子数组/子串"问题。

```typescript
function shortestSlidingWindow(arr: any[]): number {
  let left = 0;               // 窗口左边界
  let minLen = Infinity;      // 记录满足条件的最小窗口长度，初始为无穷大
  
  // 窗口状态：根据题目需要选择合适的数据结构
  const window = new Map<any, number>();
  
  // 右边界不断向右扩展
  for (let right = 0; right < arr.length; right++) {
    // ===== 第一步：扩展 =====
    // 将 arr[right] 加入窗口
    const c = arr[right];
    window.set(c, (window.get(c) || 0) + 1);
    
    // ===== 第二步：当满足条件时，收缩并记录 =====
    // 注意：与求最长不同，这里在满足条件时收缩
    // 为什么？因为我们要找最短，需要尽可能收缩
    while (isValid(window)) {
      // 先记录当前满足条件的窗口长度（可能是更短的）
      minLen = Math.min(minLen, right - left + 1);
      
      // 然后收缩左边界，尝试找更短的满足条件的窗口
      const d = arr[left];
      window.set(d, window.get(d)! - 1);
      if (window.get(d) === 0) window.delete(d);
      left++;
    }
    // 注意：while 结束后窗口不满足条件，继续扩展右边界
  }
  
  // 如果 minLen 仍是 Infinity，说明没有满足条件的窗口
  return minLen === Infinity ? 0 : minLen;
}
```

**求最长 vs 求最短的关键区别**：
| 目标 | 收缩时机 | 更新结果时机 |
|-----|---------|------------|
| 最长 | 不满足条件时 | 收缩后（窗口满足条件时） |
| 最短 | 满足条件时 | 收缩前（记录当前满足条件的窗口） |

---

## 模板四：字符串子串匹配

用于判断子串是否包含目标串的所有字符。经典应用：最小覆盖子串。

```typescript
function substringMatch(s: string, t: string): string {
  // need: 记录目标串 t 中每个字符需要的数量
  const need = new Map<string, number>();
  // window: 记录当前窗口中每个字符的数量
  const window = new Map<string, number>();
  
  // 统计目标串的字符需求
  for (const c of t) {
    need.set(c, (need.get(c) || 0) + 1);
  }
  
  let left = 0;
  let valid = 0;  // 已满足需求的字符种类数（不是字符个数）
  let start = 0, minLen = Infinity;  // 记录最小覆盖子串的起始位置和长度
  
  // 右边界扩展
  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    
    // ===== 扩展：将 s[right] 加入窗口 =====
    if (need.has(c)) {
      // 只关心目标串中存在的字符
      window.set(c, (window.get(c) || 0) + 1);
      // 当窗口中该字符的数量刚好满足需求时，valid 加 1
      if (window.get(c) === need.get(c)) {
        valid++;
      }
    }
    
    // ===== 收缩：当所有字符都满足需求时 =====
    // valid === need.size 表示所有字符种类都已满足
    while (valid === need.size) {
      // 更新最小覆盖子串
      if (right - left + 1 < minLen) {
        start = left;
        minLen = right - left + 1;
      }
      
      // 收缩左边界
      const d = s[left];
      if (need.has(d)) {
        // 如果移出的字符会导致不再满足需求，valid 减 1
        if (window.get(d) === need.get(d)) {
          valid--;
        }
        window.set(d, window.get(d)! - 1);
      }
      left++;
    }
  }
  
  // 返回最小覆盖子串，如果不存在则返回空串
  return minLen === Infinity ? "" : s.substring(start, start + minLen);
}
```

**valid 变量的精妙之处**：
- `valid` 记录的是"满足需求的字符种类数"
- 当 `valid === need.size` 时，所有字符种类都已满足
- 这样可以 O(1) 判断窗口是否包含 t 的所有字符

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
