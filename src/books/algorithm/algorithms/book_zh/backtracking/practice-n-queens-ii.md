# 实战：N 皇后 II

> LeetCode 52. N 皇后 II | 难度：困难

只需返回方案数量，无需构建棋盘，可以用位运算极致优化。

---

## 问题描述

给你一个整数`n`，返回`n`皇后问题不同的解决方案的数量。

**示例**：
```
输入：n = 4
输出：2

输入：n = 1
输出：1
```

---

## 思路分析

### N皇后 vs N皇后II

| 对比项 | N皇后 | N皇后II |
|-------|-------|---------|
| 返回值 | 所有解的棋盘 | 解的数量 |
| 存储需求 | 需要存储棋盘 | 只需计数器 |
| 优化空间 | 有限 | 可用位运算极致优化 |

既然不需要构建棋盘，我们可以：
1. 省去棋盘数组
2. 用位运算替代Set查询

---

## 解法一：基础回溯（只计数）

```typescript
function totalNQueens(n: number): number {
  let count = 0;
  const cols = new Set<number>();
  const diag1 = new Set<number>();  // 主对角线 row - col
  const diag2 = new Set<number>();  // 副对角线 row + col
  
  function backtrack(row: number) {
    // 终止条件：成功放置n个皇后
    if (row === n) {
      count++;
      return;
    }
    
    for (let col = 0; col < n; col++) {
      const d1 = row - col;
      const d2 = row + col;
      
      // 检查冲突
      if (cols.has(col) || diag1.has(d1) || diag2.has(d2)) {
        continue;
      }
      
      // 放置皇后
      cols.add(col);
      diag1.add(d1);
      diag2.add(d2);
      
      backtrack(row + 1);
      
      // 撤销皇后
      cols.delete(col);
      diag1.delete(d1);
      diag2.delete(d2);
    }
  }
  
  backtrack(0);
  return count;
}
```

---

## 解法二：位运算优化

用三个整数的二进制位表示占用状态，是本题的最优解法：

```typescript
function totalNQueens(n: number): number {
  let count = 0;
  
  /**
   * @param row 当前行
   * @param cols 列占用状态（二进制位）
   * @param diag1 主对角线占用（向左移动）
   * @param diag2 副对角线占用（向右移动）
   */
  function backtrack(row: number, cols: number, diag1: number, diag2: number) {
    if (row === n) {
      count++;
      return;
    }
    
    // 可用位置 = 全1 & ~(已占用)
    // 例：n=4时，全1 = 1111(二进制)
    let availablePositions = ((1 << n) - 1) & ~(cols | diag1 | diag2);
    
    while (availablePositions !== 0) {
      // 取最低位的1
      const position = availablePositions & -availablePositions;
      // 移除这个位置
      availablePositions &= availablePositions - 1;
      
      backtrack(
        row + 1,
        cols | position,           // 该列被占用
        (diag1 | position) << 1,   // 主对角线左移
        (diag2 | position) >> 1    // 副对角线右移
      );
    }
  }
  
  backtrack(0, 0, 0, 0);
  return count;
}
```

### 位运算原理图解

以`n = 4`，假设第0行选择了第1列（位置2）：

```
第0行后的状态：
cols:  0010  (第1列被占用)
diag1: 0010  (主对角线)
diag2: 0010  (副对角线)

第1行时的状态：
cols:  0010  (不变)
diag1: 0100  (左移一位)
diag2: 0001  (右移一位)

冲突位置 = cols | diag1 | diag2 = 0111
可用位置 = 1111 & ~0111 = 1000 (只有第3列可用)
```

### 关键位运算技巧

1. **取最低位的1**：`n & -n`
   ```
   例：availablePositions = 1010
   -availablePositions = ...0110（补码）
   1010 & 0110 = 0010（最低位的1）
   ```

2. **移除最低位的1**：`n & (n-1)`
   ```
   例：n = 1010
   n - 1 = 1001
   1010 & 1001 = 1000
   ```

3. **对角线传播**：
   - 主对角线：下一行时左移，因为从上一行看，冲突位置向右下移动
   - 副对角线：下一行时右移，因为从上一行看，冲突位置向左下移动

---

## 复杂度分析

**时间复杂度**：O(n!)
- 虽然回溯树很大，但剪枝后实际访问的节点远少于n!
- 位运算版本的常数因子更小

**空间复杂度**：
- Set版本：O(n)
- 位运算版本：O(n)递归栈

---

## N皇后解的数量表

| n | 解数量 | 计算时间（参考） |
|---|--------|-----------------|
| 1 | 1 | <1ms |
| 4 | 2 | <1ms |
| 8 | 92 | <1ms |
| 10 | 724 | ~1ms |
| 12 | 14,200 | ~10ms |
| 14 | 365,596 | ~200ms |

---

## 解法对比

| 方法 | 优点 | 缺点 |
|-----|------|------|
| **Set版本** | 代码直观易懂 | 常数因子较大 |
| **位运算版本** | 极致性能 | 需要理解位运算 |

对于面试，建议：
1. 先用Set版本清晰表达思路
2. 再提出位运算优化方案

---

## 常见错误

**错误1：忘记掩码**
```typescript
// 错误：可能取到n之外的位
let available = ~(cols | diag1 | diag2);  // ❌ 会包含无效的高位

// 正确：用掩码限制范围
let available = ((1 << n) - 1) & ~(cols | diag1 | diag2);  // ✅
```

**错误2：对角线移动方向搞反**
```typescript
// 正确的移动方向
(diag1 | position) << 1,  // 主对角线左移
(diag2 | position) >> 1   // 副对角线右移
```

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [51. N皇后](https://leetcode.com/problems/n-queens/) | 困难 | 需要返回具体棋盘 |
| [1222. 可以攻击国王的皇后](https://leetcode.com/problems/queens-that-can-attack-the-king/) | 中等 | 变体 |

---

## 总结

N皇后II相比N皇后：
1. **简化**：只需计数，无需构建棋盘
2. **优化**：可用位运算极致优化
3. **核心技巧**：
   - `n & -n`取最低位1
   - `n & (n-1)`移除最低位1
   - 对角线传播用左移/右移

位运算版本是本题的最优解，也是面试中展示"进阶优化能力"的好机会。
