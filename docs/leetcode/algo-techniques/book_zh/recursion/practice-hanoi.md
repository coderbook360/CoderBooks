# 实战：汉诺塔问题

汉诺塔是递归思维的经典问题。它简洁优雅，完美展示了"分治"和"递归"的力量。通过这道题，你将深刻理解递归的本质：**把大问题分解成相同结构的小问题**。

📎 [LeetCode 面试题 08.06. 汉诺塔问题](https://leetcode.cn/problems/hanota-lcci/)

---

## 题目描述

在经典汉诺塔问题中，有 3 根柱子及 N 个不同大小的圆盘，圆盘按大小从下到上堆叠在第一根柱子上。游戏的目标是将所有圆盘从第一根柱子移动到第三根柱子。

**规则**：
1. 每次只能移动一个圆盘
2. 圆盘只能从柱子顶端拿取
3. 不能将大圆盘放在小圆盘上面

给定三个柱子 `A`、`B`、`C`，要求将 `A` 上的所有圆盘移动到 `C`，`B` 作为辅助柱子。

**示例**：

```
输入：A = [2, 1, 0], B = [], C = []
输出：C = [2, 1, 0]

解释：
A: [2, 1, 0]  B: []  C: []
A: [2, 1]     B: []  C: [0]       // 移动 0 到 C
A: [2]        B: [1] C: [0]       // 移动 1 到 B
A: [2]        B: [1, 0] C: []     // 移动 0 到 B
A: []         B: [1, 0] C: [2]    // 移动 2 到 C
A: [0]        B: [1] C: [2]       // 移动 0 到 A
A: [0, 1]     B: [] C: [2]        // 移动 1 到 A
A: [0, 1, 2]  B: [] C: []         // 移动 0、1、2 到 C
```

---

## 思路分析

### 这道题在考什么？

1. **递归思维**：如何将大问题分解成小问题
2. **分治策略**：将 N 个圆盘的问题拆解为 N-1 个圆盘的问题
3. **递归三要素**的应用

### 核心洞察

**问题**：如何把 N 个圆盘从 A 移到 C？

**直觉尝试**：
- N=1：直接从 A 移到 C
- N=2：A→B, A→C, B→C
- N=3：？？？

当 N 变大时，直接思考很困难。但如果用**递归思维**：

**关键发现**：假设我已经知道如何移动 N-1 个圆盘，那么移动 N 个圆盘只需要 3 步：

1. **将上面的 N-1 个圆盘从 A 移到 B**（借助 C）
2. **将最大的圆盘从 A 移到 C**
3. **将 N-1 个圆盘从 B 移到 C**（借助 A）

```
初始状态（N=3）：
A: [3, 2, 1]  B: []  C: []

步骤 1：将上面 2 个圆盘从 A 移到 B（借助 C）
A: [3]  B: [2, 1]  C: []

步骤 2：将圆盘 3 从 A 移到 C
A: []  B: [2, 1]  C: [3]

步骤 3：将 2 个圆盘从 B 移到 C（借助 A）
A: []  B: []  C: [3, 2, 1]
```

### 递归三要素

#### 1. 函数定义

```typescript
/**
 * 将 n 个圆盘从 source 移动到 target，使用 helper 作为辅助
 * @param n - 圆盘数量
 * @param source - 起始柱子
 * @param target - 目标柱子
 * @param helper - 辅助柱子
 */
function move(n: number, source: number[], target: number[], helper: number[]): void
```

#### 2. 终止条件

只有 1 个圆盘时，直接移动。

```typescript
if (n === 1) {
  target.push(source.pop()!);
  return;
}
```

#### 3. 递归关系

移动 N 个圆盘 = 移动 N-1 + 移动 1 + 移动 N-1

```typescript
// 1. 将上面 n-1 个从 source 移到 helper（借助 target）
move(n - 1, source, helper, target);

// 2. 将最大的圆盘从 source 移到 target
target.push(source.pop()!);

// 3. 将 n-1 个从 helper 移到 target（借助 source）
move(n - 1, helper, target, source);
```

---

## 代码实现

```typescript
/**
 * 汉诺塔问题
 * 时间复杂度：O(2^n) - 每个圆盘至少移动一次
 * 空间复杂度：O(n) - 递归栈深度
 */
function hanota(A: number[], B: number[], C: number[]): void {
  const n = A.length;
  move(n, A, C, B);
}

function move(
  n: number,
  source: number[],
  target: number[],
  helper: number[]
): void {
  // 1. 终止条件：只有 1 个圆盘
  if (n === 1) {
    target.push(source.pop()!);
    return;
  }
  
  // 2. 将上面 n-1 个圆盘从 source 移到 helper（借助 target）
  move(n - 1, source, helper, target);
  
  // 3. 将最大的圆盘从 source 移到 target
  target.push(source.pop()!);
  
  // 4. 将 n-1 个圆盘从 helper 移到 target（借助 source）
  move(n - 1, helper, target, source);
}
```

---

## 递归调用树（N=3）

```
move(3, A, C, B)
├─ move(2, A, B, C)        // 将 2 个圆盘从 A 移到 B
│  ├─ move(1, A, C, B)     // 将 1 个圆盘从 A 移到 C
│  ├─ A → B                 // 移动圆盘 2
│  └─ move(1, C, B, A)     // 将 1 个圆盘从 C 移到 B
├─ A → C                    // 移动圆盘 3
└─ move(2, B, C, A)        // 将 2 个圆盘从 B 移到 C
   ├─ move(1, B, A, C)     // 将 1 个圆盘从 B 移到 A
   ├─ B → C                 // 移动圆盘 2
   └─ move(1, A, C, B)     // 将 1 个圆盘从 A 移到 C
```

**移动序列**（N=3，圆盘从小到大编号为 1、2、3）：

```
1. A → C   (圆盘 1)
2. A → B   (圆盘 2)
3. C → B   (圆盘 1)
4. A → C   (圆盘 3)
5. B → A   (圆盘 1)
6. B → C   (圆盘 2)
7. A → C   (圆盘 1)
```

总共 7 步 = 2³ - 1

---

## 数学分析

### 移动次数

设 T(n) 为移动 n 个圆盘的步数：

```
T(1) = 1
T(n) = T(n-1) + 1 + T(n-1) = 2·T(n-1) + 1

展开：
T(n) = 2·T(n-1) + 1
     = 2·(2·T(n-2) + 1) + 1
     = 2²·T(n-2) + 2 + 1
     = 2³·T(n-3) + 2² + 2 + 1
     = ...
     = 2^(n-1)·T(1) + 2^(n-2) + ... + 2 + 1
     = 2^(n-1) + (2^(n-1) - 1)
     = 2^n - 1
```

**结论**：移动 n 个圆盘需要 `2^n - 1` 步，这是理论最小值。

### 时间复杂度

每次移动都要执行一次 `push` 和 `pop`，因此时间复杂度 O(2^n)。

### 空间复杂度

递归深度为 n，空间复杂度 O(n)。

---

## 变体：打印移动步骤

### 问题

不仅移动圆盘，还要打印每一步的移动过程。

### 代码实现

```typescript
function hanotaWithPrint(A: number[], B: number[], C: number[]): void {
  const n = A.length;
  const steps: string[] = [];
  
  function move(
    n: number,
    source: number[],
    target: number[],
    helper: number[],
    sourceName: string,
    targetName: string,
    helperName: string
  ): void {
    if (n === 1) {
      const disk = source.pop()!;
      target.push(disk);
      steps.push(`Move disk ${disk} from ${sourceName} to ${targetName}`);
      return;
    }
    
    move(n - 1, source, helper, target, sourceName, helperName, targetName);
    const disk = source.pop()!;
    target.push(disk);
    steps.push(`Move disk ${disk} from ${sourceName} to ${targetName}`);
    move(n - 1, helper, target, source, helperName, targetName, sourceName);
  }
  
  move(n, A, C, B, 'A', 'C', 'B');
  
  console.log(`Total ${steps.length} moves:`);
  steps.forEach((step, i) => console.log(`${i + 1}. ${step}`));
}

// 测试
hanotaWithPrint([2, 1, 0], [], []);
```

**输出**：

```
Total 7 moves:
1. Move disk 0 from A to C
2. Move disk 1 from A to B
3. Move disk 0 from C to B
4. Move disk 2 from A to C
5. Move disk 0 from B to A
6. Move disk 1 from B to C
7. Move disk 0 from A to C
```

---

## 变体：四柱汉诺塔

### 问题

如果有 4 根柱子，最少需要多少步？

### 分析

**策略**：使用 Frame-Stewart 算法

1. 先将 k 个圆盘从 A 移到辅助柱 D（使用 B、C）
2. 将剩余 n-k 个圆盘从 A 移到 C（3 柱经典问题）
3. 将 k 个圆盘从 D 移到 C（使用 A、B）

**递推公式**：

```
T(n, 4) = min{2·T(k, 4) + T(n-k, 3)} for k in [1, n-1]
```

最优解大约是 O(2^(√n))，远快于 3 柱的 O(2^n)。

---

## 易错点

### 1. 参数顺序混乱

```typescript
// ❌ 错误：source 和 helper 的位置搞反
move(n - 1, source, target, helper);  // 应该移到 helper
target.push(source.pop()!);
move(n - 1, target, helper, source);  // 应该从 helper 移出

// ✅ 正确
move(n - 1, source, helper, target);  // 移到 helper
target.push(source.pop()!);
move(n - 1, helper, target, source);  // 从 helper 移出
```

### 2. 忘记终止条件

```typescript
// ❌ 错误：没有终止条件会无限递归
function move(n: number, source: number[], target: number[], helper: number[]): void {
  move(n - 1, source, helper, target);
  target.push(source.pop()!);
  move(n - 1, helper, target, source);
}

// ✅ 正确：添加终止条件
function move(n: number, source: number[], target: number[], helper: number[]): void {
  if (n === 1) {
    target.push(source.pop()!);
    return;
  }
  // ...
}
```

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [面试题 08.06. 汉诺塔问题](https://leetcode.cn/problems/hanota-lcci/) | 简单 | 本题 |
| [剑指 Offer II 097. 子序列的数目](https://leetcode.cn/problems/21dk04/) | 困难 | 递归思维应用 |

---

## 举一反三

汉诺塔问题教会我们：

1. **递归的威力**：
   - 复杂问题的简洁解法
   - 3 步递归代码解决指数级操作

2. **分治思想**：
   - 将 N 个圆盘问题分解为 N-1 个圆盘问题
   - 分治是递归的常见应用

3. **数学归纳法**：
   - 假设 N-1 的情况成立
   - 证明 N 的情况也成立

4. **递归可视化**：
   - 通过调用树理解递归过程
   - 打印步骤帮助调试

---

## 本章小结

汉诺塔是递归的经典问题：
- **问题简单**：规则清晰，易于理解
- **解法优雅**：3 行递归代码解决
- **深刻洞察**：展示了递归的"分而治之"思想

掌握汉诺塔后，你就能更好地理解递归的本质：**相信子问题已经解决，专注于如何用子问题构造当前答案**。

---

## 练习

1. 实现一个函数，计算移动 n 个圆盘的最少步数（不实际移动）
2. 修改代码，使其能够验证每一步移动的合法性
3. 实现四柱汉诺塔的递归解法
