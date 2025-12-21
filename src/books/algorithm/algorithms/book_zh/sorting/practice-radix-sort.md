# 实战：基数排序实现

基数排序是一种非比较排序算法，按位进行排序，从最低位到最高位逐步处理。

---

## 核心思想

基数排序的工作原理：

1. **从最低位开始**：先按个位排序
2. **逐位向高位**：依次按十位、百位...排序
3. **稳定排序**：每轮使用稳定的计数排序

### 可视化过程

```
原始数组：[170, 45, 75, 90, 802, 24, 2, 66]

按个位排序：
0: 170, 90
2: 802, 2
4: 24
5: 45, 75
6: 66
结果：[170, 90, 802, 2, 24, 45, 75, 66]

按十位排序：
0: 802, 2
2: 24
4: 45
6: 66
7: 170, 75
9: 90
结果：[802, 2, 24, 45, 66, 170, 75, 90]

按百位排序：
0: 2, 24, 45, 66, 75, 90
1: 170
8: 802
结果：[2, 24, 45, 66, 75, 90, 170, 802]

排序完成！
```

---

## 代码实现

### 基础版本（LSD：最低位优先）

```typescript
function radixSort(arr: number[]): void {
  if (arr.length === 0) return;
  
  const max = Math.max(...arr);
  
  // 从个位开始，逐位排序
  for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
    countingSortByDigit(arr, exp);
  }
}

function countingSortByDigit(arr: number[], exp: number): void {
  const n = arr.length;
  const output = new Array(n);
  const count = new Array(10).fill(0);  // 每位数字0-9
  
  // 1. 统计每个数字出现次数
  for (let i = 0; i < n; i++) {
    const digit = Math.floor(arr[i] / exp) % 10;
    count[digit]++;
  }
  
  // 2. 累加确定位置
  for (let i = 1; i < 10; i++) {
    count[i] += count[i - 1];
  }
  
  // 3. 从后向前放置（保持稳定性）
  for (let i = n - 1; i >= 0; i--) {
    const digit = Math.floor(arr[i] / exp) % 10;
    output[count[digit] - 1] = arr[i];
    count[digit]--;
  }
  
  // 4. 复制回原数组
  for (let i = 0; i < n; i++) {
    arr[i] = output[i];
  }
}
```

### 支持负数的版本

```typescript
function radixSortWithNegative(arr: number[]): void {
  if (arr.length === 0) return;
  
  // 分离正数和负数
  const negative: number[] = [];
  const positive: number[] = [];
  
  for (const num of arr) {
    if (num < 0) {
      negative.push(-num);  // 取绝对值
    } else {
      positive.push(num);
    }
  }
  
  // 分别排序
  if (positive.length > 0) radixSort(positive);
  if (negative.length > 0) radixSort(negative);
  
  // 合并结果：负数逆序后在前
  let idx = 0;
  for (let i = negative.length - 1; i >= 0; i--) {
    arr[idx++] = -negative[i];
  }
  for (const num of positive) {
    arr[idx++] = num;
  }
}
```

---

## 为什么从最低位开始？

**稳定性是关键**：

```
假设从高位开始（MSD）对 [12, 21]：
按十位排序：[12, 21]（1 < 2）
按个位排序：[21, 12]（1 < 2）❌ 错误！

从低位开始（LSD）对 [12, 21]：
按个位排序：[21, 12]（1 < 2）
按十位排序：[12, 21]（1 < 2）✓ 正确！

因为稳定排序保证：高位相同时，保持低位的顺序
```

---

## 复杂度分析

**时间复杂度**：O(d × (n + k))
- d = 最大数字的位数
- n = 数组长度
- k = 每位的取值范围（十进制为10）

**空间复杂度**：O(n + k)

**稳定性**：**稳定**（前提是每轮使用稳定排序）

---

## 位数计算

```typescript
// 计算最大数的位数
function getMaxDigits(arr: number[]): number {
  const max = Math.max(...arr);
  if (max === 0) return 1;
  return Math.floor(Math.log10(max)) + 1;
}
```

---

## 基数排序 vs 其他排序

| 对比项 | 基数排序 | 快速排序 | 计数排序 |
|-------|---------|---------|---------|
| 时间复杂度 | O(d×n) | O(n log n) | O(n+k) |
| 适用类型 | 整数/字符串 | 通用 | 小范围整数 |
| 稳定性 | 稳定 | 不稳定 | 稳定 |
| 空间 | O(n) | O(log n) | O(k) |

**何时基数排序更优？**

当 d × n < n × log n，即 d < log n 时。

例如：排序10^6个三位数（d=3 < log₂10^6 ≈ 20）

---

## LSD vs MSD

| 特性 | LSD（低位优先） | MSD（高位优先） |
|-----|----------------|----------------|
| 顺序 | 低位→高位 | 高位→低位 |
| 实现 | 简单，一次遍历 | 复杂，需递归 |
| 稳定性 | 天然稳定 | 需额外处理 |
| 提前终止 | 不可以 | 可以 |
| 适用场景 | 定长数据 | 变长字符串 |

---

## 实际应用

### 1. 字符串排序

```typescript
function radixSortStrings(arr: string[]): void {
  if (arr.length === 0) return;
  
  const maxLen = Math.max(...arr.map(s => s.length));
  
  // 补齐长度（用空字符）
  const padded = arr.map(s => s.padEnd(maxLen, '\0'));
  
  // 从最低位（最后一个字符）开始
  for (let pos = maxLen - 1; pos >= 0; pos--) {
    countingSortByChar(padded, pos);
  }
  
  // 还原
  for (let i = 0; i < arr.length; i++) {
    arr[i] = padded[i].replace(/\0/g, '');
  }
}
```

### 2. IP地址排序

```typescript
function sortIPs(ips: string[]): string[] {
  // 转换为数值
  const nums = ips.map(ip => {
    const parts = ip.split('.').map(Number);
    return parts[0] * 2**24 + parts[1] * 2**16 + 
           parts[2] * 2**8 + parts[3];
  });
  
  radixSort(nums);
  
  // 转换回IP字符串
  return nums.map(n => 
    `${(n >> 24) & 255}.${(n >> 16) & 255}.${(n >> 8) & 255}.${n & 255}`
  );
}
```

---

## 常见错误

**错误1：位数提取错误**
```typescript
// 错误：直接取模
const digit = arr[i] % 10;  // ❌ 只能取个位

// 正确：除以exp后取模
const digit = Math.floor(arr[i] / exp) % 10;  // ✅
```

**错误2：忘记稳定性要求**
```typescript
// 错误：从前向后放置
for (let i = 0; i < n; i++) { ... }  // ❌ 不稳定

// 正确：从后向前放置
for (let i = n - 1; i >= 0; i--) { ... }  // ✅
```

**错误3：循环条件错误**
```typescript
// 错误：固定循环次数
for (let i = 0; i < 10; i++) { ... }  // ❌

// 正确：根据最大值确定轮数
for (let exp = 1; max / exp > 0; exp *= 10) { ... }  // ✅
```

---

## 总结

基数排序的核心要点：

1. **按位排序**：从低位到高位逐位处理
2. **稳定性关键**：每轮必须使用稳定排序
3. **时间优势**：当d < log n时优于比较排序
4. **适用场景**：整数、定长字符串、IP地址等
5. **非比较排序**：不受O(n log n)下界限制

基数排序展示了如何利用数据的"位"结构突破比较排序的时间下界。

1. **按位排序**：从低位到高位
2. **必须稳定**：每轮排序必须稳定
3. **时间优势**：O(d × n)，d通常很小
4. **应用**：整数、字符串、IP地址排序
