# 位运算与子集枚举

位运算是状态压缩 DP 的基础，本节详细介绍各种位运算技巧。

## 基本位运算

### 与、或、异或、取反

```typescript
// 与 AND：两个都是 1 才是 1
5 & 3 = 101 & 011 = 001 = 1

// 或 OR：有一个是 1 就是 1
5 | 3 = 101 | 011 = 111 = 7

// 异或 XOR：不同为 1，相同为 0
5 ^ 3 = 101 ^ 011 = 110 = 6

// 取反 NOT：0 变 1，1 变 0
~5 = ~101 = ...11111010 (在 32 位中)
```

### 左移、右移

```typescript
// 左移：相当于乘 2^k
5 << 1 = 101 << 1 = 1010 = 10
5 << 2 = 101 << 2 = 10100 = 20

// 右移：相当于除 2^k
5 >> 1 = 101 >> 1 = 10 = 2
5 >> 2 = 101 >> 2 = 1 = 1
```

## 状态操作

### 检查第 i 位

```typescript
function getBit(mask: number, i: number): number {
  return (mask >> i) & 1;
}

// 或者
function hasBit(mask: number, i: number): boolean {
  return (mask & (1 << i)) !== 0;
}
```

### 设置第 i 位为 1

```typescript
function setBit(mask: number, i: number): number {
  return mask | (1 << i);
}
```

### 设置第 i 位为 0

```typescript
function clearBit(mask: number, i: number): number {
  return mask & ~(1 << i);
}
```

### 翻转第 i 位

```typescript
function toggleBit(mask: number, i: number): number {
  return mask ^ (1 << i);
}
```

## 常用技巧

### 计算 1 的个数

```typescript
function popcount(x: number): number {
  let count = 0;
  while (x > 0) {
    x &= (x - 1);  // 去掉最低位的 1
    count++;
  }
  return count;
}

// 或使用内置方法（现代 JavaScript）
// x.toString(2).replace(/0/g, '').length
```

### 获取最低位的 1

```typescript
function lowbit(x: number): number {
  return x & (-x);
}

// lowbit(12) = lowbit(1100) = 100 = 4
// lowbit(10) = lowbit(1010) = 10 = 2
```

### 去掉最低位的 1

```typescript
function removeLowestBit(x: number): number {
  return x & (x - 1);
}

// 12 & 11 = 1100 & 1011 = 1000 = 8
```

### 判断是否只有一个 1

```typescript
function isPowerOfTwo(x: number): boolean {
  return x > 0 && (x & (x - 1)) === 0;
}
```

### 获取最低位 1 的位置

```typescript
function getLowestBitPosition(x: number): number {
  if (x === 0) return -1;
  return Math.log2(x & -x);
}

// 更快的方法（使用 de Bruijn 序列）
```

## 子集枚举

### 枚举所有状态

```typescript
const n = 4;
for (let mask = 0; mask < (1 << n); mask++) {
  // mask 遍历 0 到 15
  console.log(mask.toString(2).padStart(n, '0'));
}
// 0000, 0001, 0010, 0011, 0100, ..., 1111
```

### 枚举某个状态的所有子集

```typescript
function enumerateSubsets(mask: number): number[] {
  const subsets: number[] = [];
  
  // 包括空集
  for (let sub = mask; ; sub = (sub - 1) & mask) {
    subsets.push(sub);
    if (sub === 0) break;
  }
  
  return subsets;
}

// enumerateSubsets(5) = enumerateSubsets(101)
// 返回 [5, 4, 1, 0] 即 [101, 100, 001, 000]
```

**复杂度分析**：

如果 mask 有 k 个 1，则子集数为 2^k。

枚举所有状态的所有子集：

```typescript
for (let mask = 0; mask < (1 << n); mask++) {
  for (let sub = mask; sub > 0; sub = (sub - 1) & mask) {
    // 处理子集 sub
  }
}
```

总复杂度：O(3^n)

证明：每个元素有三种状态——不在 mask 中 / 在 mask 但不在 sub 中 / 同时在 mask 和 sub 中。

### 枚举某个状态的所有超集

```typescript
function enumerateSupersets(mask: number, n: number): number[] {
  const supersets: number[] = [];
  const full = (1 << n) - 1;
  
  // sup 是 mask 的超集 = (full - mask) 的子集 | mask
  const complement = full ^ mask;
  for (let sub = complement; ; sub = (sub - 1) & complement) {
    supersets.push(mask | sub);
    if (sub === 0) break;
  }
  
  return supersets;
}
```

### 枚举大小为 k 的子集

```typescript
function enumerateKSubsets(n: number, k: number): number[] {
  const result: number[] = [];
  
  function dfs(start: number, mask: number, count: number): void {
    if (count === k) {
      result.push(mask);
      return;
    }
    
    for (let i = start; i < n; i++) {
      dfs(i + 1, mask | (1 << i), count + 1);
    }
  }
  
  dfs(0, 0, 0);
  return result;
}

// 更高效的 Gosper's Hack
function enumerateKSubsetsFast(n: number, k: number): number[] {
  const result: number[] = [];
  
  // 从最小的 k 位 1 开始
  let mask = (1 << k) - 1;
  const limit = 1 << n;
  
  while (mask < limit) {
    result.push(mask);
    
    // Gosper's Hack: 生成下一个相同 popcount 的数
    const lowbit = mask & -mask;
    const r = mask + lowbit;
    mask = (((r ^ mask) >> 2) / lowbit) | r;
  }
  
  return result;
}
```

## 实用封装

```typescript
class BitSet {
  private mask: number;
  
  constructor(mask: number = 0) {
    this.mask = mask;
  }
  
  // 检查是否包含元素 i
  has(i: number): boolean {
    return (this.mask & (1 << i)) !== 0;
  }
  
  // 添加元素 i
  add(i: number): BitSet {
    return new BitSet(this.mask | (1 << i));
  }
  
  // 移除元素 i
  remove(i: number): BitSet {
    return new BitSet(this.mask & ~(1 << i));
  }
  
  // 元素个数
  size(): number {
    return popcount(this.mask);
  }
  
  // 获取原始值
  value(): number {
    return this.mask;
  }
  
  // 枚举所有元素
  *elements(): Generator<number> {
    let x = this.mask;
    while (x > 0) {
      const i = Math.log2(x & -x);
      yield i;
      x &= (x - 1);
    }
  }
  
  // 枚举所有子集
  *subsets(): Generator<number> {
    for (let sub = this.mask; ; sub = (sub - 1) & this.mask) {
      yield sub;
      if (sub === 0) break;
    }
  }
}
```

## 本章小结

1. **基本操作**：与、或、异或、移位
2. **状态操作**：检查、设置、清除、翻转
3. **常用技巧**：popcount、lowbit、去最低位
4. **子集枚举**：`(sub - 1) & mask` 技巧

**关键公式**：

| 操作 | 代码 |
|-----|------|
| 第 i 位 | `(x >> i) & 1` |
| 设置第 i 位 | `x \| (1 << i)` |
| 清除第 i 位 | `x & ~(1 << i)` |
| 最低位 1 | `x & -x` |
| 去最低位 1 | `x & (x - 1)` |
| 枚举子集 | `sub = (sub - 1) & mask` |
