# 位运算的应用场景

位运算不只是技巧，在实际开发中也有广泛应用。

---

## 1. 状态压缩

用二进制位表示多个布尔状态：

```javascript
// 权限管理
const READ = 1;    // 001
const WRITE = 2;   // 010
const EXECUTE = 4; // 100

let permission = READ | WRITE;  // 011

// 检查权限
if (permission & READ) {
  console.log('有读权限');
}

// 添加权限
permission |= EXECUTE;  // 111

// 移除权限
permission &= ~WRITE;   // 101
```

---

## 2. 集合操作

用位向量表示集合：

```javascript
// 集合 A = {0, 2, 3}，表示为 1101 = 13
// 集合 B = {1, 2}，表示为 0110 = 6

const A = 0b1101;
const B = 0b0110;

A | B   // 并集：{0,1,2,3} = 1111
A & B   // 交集：{2} = 0100
A ^ B   // 对称差：{0,1,3} = 1011
A & ~B  // 差集 A-B：{0,3} = 1001
```

---

## 3. 快速计算

```javascript
// 取模（对 2^n 取模）
x % 8 === x & 7  // 8 = 2^3

// 判断两数符号是否相同
(a ^ b) >= 0  // 同号为正或零

// 求绝对值
(n ^ (n >> 31)) - (n >> 31)
```

---

## 4. 位图（Bitmap）

用于海量数据去重或存在性判断：

```javascript
class BitMap {
  constructor(size) {
    this.bits = new Uint32Array(Math.ceil(size / 32));
  }
  
  set(n) {
    const index = Math.floor(n / 32);
    const bit = n % 32;
    this.bits[index] |= (1 << bit);
  }
  
  get(n) {
    const index = Math.floor(n / 32);
    const bit = n % 32;
    return (this.bits[index] & (1 << bit)) !== 0;
  }
}

// 40 亿个整数只需 500MB 内存
```

---

## 5. 枚举子集

```javascript
// 枚举集合 mask 的所有子集
for (let sub = mask; sub > 0; sub = (sub - 1) & mask) {
  console.log(sub);
}
```

---

## 常见应用场景总结

| 场景 | 应用 |
|------|------|
| 权限系统 | 状态压缩 |
| 数据库索引 | 位图索引 |
| 动态规划 | 状态压缩 DP |
| 密码学 | 加密算法 |
| 图形学 | 颜色处理 |
