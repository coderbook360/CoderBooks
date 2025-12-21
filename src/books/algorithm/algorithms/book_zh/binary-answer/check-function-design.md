# 判定函数的设计

二分答案的核心在于设计一个高效的 `check` 函数。好的 check 函数决定了算法的正确性和效率。

---

## check 函数的作用

给定一个候选答案 x，判断它是否满足题目条件。

```typescript
function check(x: number): boolean {
  // 返回 true：x 满足条件
  // 返回 false：x 不满足条件
}
```

---

## 设计原则

### 1. 明确判定目标

先搞清楚要判定什么：
- 能否在约束下完成任务？
- 某个值是否足够大/足够小？

### 2. 贪心验证

check 函数通常使用**贪心策略**来验证：
- 不需要找最优方案
- 只需要判断是否存在可行方案

### 3. 时间复杂度

check 函数应该是 O(n) 或 O(n log n)，保证整体 O(n log M)。

---

## 常见 check 函数模式

### 模式一：能否分成 k 段

```typescript
// 每段和不超过 maxSum，能否分成不超过 k 段？
function canSplit(nums: number[], maxSum: number, k: number): boolean {
  let count = 1;  // 段数
  let currentSum = 0;
  
  for (const num of nums) {
    if (num > maxSum) return false;  // 单个元素就超了
    
    if (currentSum + num > maxSum) {
      count++;
      currentSum = num;
    } else {
      currentSum += num;
    }
  }
  
  return count <= k;
}
```

### 模式二：能否在时间内完成

```typescript
// 速度为 speed，能否在 hours 小时内完成所有任务？
function canFinish(tasks: number[], speed: number, hours: number): boolean {
  let totalTime = 0;
  
  for (const task of tasks) {
    totalTime += Math.ceil(task / speed);
  }
  
  return totalTime <= hours;
}
```

### 模式三：能否放置 k 个元素

```typescript
// 相邻距离至少为 minDist，能否放置 k 个元素？
function canPlace(positions: number[], minDist: number, k: number): boolean {
  let count = 1;
  let lastPos = positions[0];
  
  for (let i = 1; i < positions.length; i++) {
    if (positions[i] - lastPos >= minDist) {
      count++;
      lastPos = positions[i];
      if (count === k) return true;
    }
  }
  
  return count >= k;
}
```

---

## check 函数与二分方向

| 目标 | check 返回 true 的含义 | 二分方向 |
|-----|---------------------|---------|
| 最小化答案 | mid 可行 | right = mid |
| 最大化答案 | mid 可行 | left = mid + 1 |

---

## 常见错误

### 1. 边界条件遗漏

```typescript
// 错误：没有处理单个元素超过限制的情况
if (currentSum + num > maxSum) { ... }

// 正确：先检查单个元素
if (num > maxSum) return false;
```

### 2. 整数溢出

```typescript
// 如果 task 很大，直接除可能溢出
totalTime += task / speed;

// 使用 Math.ceil 时注意类型
totalTime += Math.ceil(task / speed);
```

---

## 调试技巧

1. 先手动计算边界情况
2. 验证 check(left) 和 check(right) 的返回值
3. 确保单调性：如果 check(x) = true，那么所有 x' > x 也应该为 true
