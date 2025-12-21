# 数组问题的贪心策略

数组问题中的贪心往往需要发现隐藏的局部最优性质。

---

## 常见策略

### 1. 逐位贪心

每个位置独立做最优选择。

```typescript
// 移除 K 位数字使结果最小
function removeKdigits(num: string, k: number): string {
  const stack: string[] = [];
  
  for (const digit of num) {
    while (k > 0 && stack.length > 0 && stack[stack.length - 1] > digit) {
      stack.pop();
      k--;
    }
    stack.push(digit);
  }
  
  // 移除末尾多余的数字
  while (k > 0) {
    stack.pop();
    k--;
  }
  
  // 移除前导零
  const result = stack.join('').replace(/^0+/, '');
  return result || '0';
}
```

### 2. 全局视角贪心

考虑整体最优。

```typescript
// 买卖股票最佳时机 II（可多次交易）
function maxProfit(prices: number[]): number {
  let profit = 0;
  
  for (let i = 1; i < prices.length; i++) {
    // 只要有涨幅就收集
    if (prices[i] > prices[i - 1]) {
      profit += prices[i] - prices[i - 1];
    }
  }
  
  return profit;
}
```

### 3. 两端贪心

从两端同时考虑。

```typescript
// 分发糖果
function candy(ratings: number[]): number {
  const n = ratings.length;
  const candies = new Array(n).fill(1);
  
  // 从左到右
  for (let i = 1; i < n; i++) {
    if (ratings[i] > ratings[i - 1]) {
      candies[i] = candies[i - 1] + 1;
    }
  }
  
  // 从右到左
  for (let i = n - 2; i >= 0; i--) {
    if (ratings[i] > ratings[i + 1]) {
      candies[i] = Math.max(candies[i], candies[i + 1] + 1);
    }
  }
  
  return candies.reduce((a, b) => a + b, 0);
}
```

---

## 跳跃游戏系列

### 跳跃游戏 I：能否到达终点

```typescript
function canJump(nums: number[]): boolean {
  let maxReach = 0;
  
  for (let i = 0; i < nums.length; i++) {
    if (i > maxReach) return false;
    maxReach = Math.max(maxReach, i + nums[i]);
  }
  
  return true;
}
```

### 跳跃游戏 II：最少跳跃次数

```typescript
function jump(nums: number[]): number {
  let jumps = 0;
  let currentEnd = 0;
  let farthest = 0;
  
  for (let i = 0; i < nums.length - 1; i++) {
    farthest = Math.max(farthest, i + nums[i]);
    
    if (i === currentEnd) {
      jumps++;
      currentEnd = farthest;
    }
  }
  
  return jumps;
}
```

**贪心思想**：在当前跳跃范围内，找能跳到最远的位置。

---

## 加油站问题

能否绕环形公路一圈？

```typescript
function canCompleteCircuit(gas: number[], cost: number[]): number {
  let totalGas = 0;
  let currentGas = 0;
  let start = 0;
  
  for (let i = 0; i < gas.length; i++) {
    totalGas += gas[i] - cost[i];
    currentGas += gas[i] - cost[i];
    
    if (currentGas < 0) {
      // 从 i+1 重新开始
      start = i + 1;
      currentGas = 0;
    }
  }
  
  return totalGas >= 0 ? start : -1;
}
```

**贪心思想**：
- 如果从 A 到不了 B，那么 A 和 B 之间任何点都到不了 B
- 如果总油量 >= 总消耗，一定有解

---

## 贪心策略识别技巧

1. **局部决策不影响后续选择空间**
2. **存在明确的"最优"定义**（最大、最小、最早、最晚）
3. **可以通过简单规则做出选择**

当不确定贪心是否正确时，尝试构造反例。
