# 字符串哈希基础

KMP 通过分析模式串的结构来优化匹配。本章介绍另一种思路：**把字符串映射为数字**，用数字比较代替字符串比较。

这就是**字符串哈希**。

## 为什么需要字符串哈希

比较两个长度为 n 的字符串是否相等，需要 O(n) 时间。如果要频繁比较多个子串呢？

```javascript
// 朴素方法：每次比较 O(n)
s1 === s2  // O(n)
s1 === s3  // O(n)
s1 === s4  // O(n)
```

如果能把字符串映射为一个数字（哈希值），那么比较就变成了 O(1)：

```javascript
hash(s1) === hash(s2)  // O(1)
```

更妙的是，通过预处理，我们可以 **O(1) 计算任意子串的哈希值**。这在很多场景中非常有用。

## 多项式哈希

最常用的字符串哈希方法是**多项式哈希**：把字符串看作一个 B 进制数。

```
字符串 "abc" 的哈希值计算：

hash = a × B² + b × B¹ + c × B⁰

其中：
- a, b, c 是字符的数值（如 ASCII 码：a=97, b=98, c=99）
- B 是基数（通常取质数，如 31, 131, 13331）
```

### 基本实现

```javascript
/**
 * 计算字符串的哈希值
 * @param {string} s - 字符串
 * @param {number} B - 基数
 * @param {number} MOD - 模数（防止溢出）
 * @returns {number}
 */
function stringHash(s, B = 31, MOD = 1e9 + 7) {
    let hash = 0;
    for (const char of s) {
        hash = (hash * B + char.charCodeAt(0)) % MOD;
    }
    return hash;
}
```

**为什么要取模？**
- 防止数值溢出（JavaScript 中大数会丢失精度）
- MOD 通常取大质数，如 10⁹+7

### 计算示例

```
s = "abc", B = 31, MOD = 10^9+7

hash = ((0 × 31 + 97) × 31 + 98) × 31 + 99
     = (97 × 31 + 98) × 31 + 99
     = (3007 + 98) × 31 + 99
     = 3105 × 31 + 99
     = 96255 + 99
     = 96354
```

## 前缀哈希与子串哈希

哈希的真正威力在于：预处理后，可以 **O(1) 计算任意子串的哈希值**。

### 前缀哈希数组

定义 prefixHash[i] = hash(s[0..i-1])，即前 i 个字符的哈希值。

递推公式：
```
prefixHash[0] = 0
prefixHash[i] = prefixHash[i-1] × B + s[i-1]
```

### 子串哈希的推导

我们要计算 hash(s[l..r])（从 l 到 r 的子串）。

```
prefixHash[r+1] = s[0]×B^r + s[1]×B^(r-1) + ... + s[l]×B^(r-l) + ... + s[r]×B^0

prefixHash[l] = s[0]×B^(l-1) + s[1]×B^(l-2) + ... + s[l-1]×B^0

prefixHash[l] × B^(r-l+1) = s[0]×B^r + ... + s[l-1]×B^(r-l+1)
```

因此：
```
hash(s[l..r]) = prefixHash[r+1] - prefixHash[l] × B^(r-l+1)
```

### 完整实现

```javascript
class StringHash {
    /**
     * @param {string} s - 字符串
     * @param {number} B - 基数
     * @param {number} MOD - 模数
     */
    constructor(s, B = 31, MOD = 1e9 + 7) {
        this.B = B;
        this.MOD = MOD;
        this.n = s.length;
        
        // 前缀哈希
        this.prefix = new Array(this.n + 1).fill(0);
        // B 的幂次
        this.power = new Array(this.n + 1).fill(1);
        
        for (let i = 0; i < this.n; i++) {
            this.prefix[i + 1] = (this.prefix[i] * B + s.charCodeAt(i)) % MOD;
            this.power[i + 1] = (this.power[i] * B) % MOD;
        }
    }
    
    /**
     * 获取 s[l..r] 的哈希值（0-indexed，闭区间）
     */
    getHash(l, r) {
        const len = r - l + 1;
        let hash = this.prefix[r + 1] - this.prefix[l] * this.power[len] % this.MOD;
        // 处理负数（JavaScript 取模可能为负）
        return (hash % this.MOD + this.MOD) % this.MOD;
    }
    
    /**
     * 判断两个子串是否相等
     */
    equal(l1, r1, l2, r2) {
        return this.getHash(l1, r1) === this.getHash(l2, r2);
    }
}
```

### 使用示例

```javascript
const s = "abcabc";
const hash = new StringHash(s);

// 比较 s[0..2] "abc" 和 s[3..5] "abc"
console.log(hash.equal(0, 2, 3, 5));  // true

// 比较 s[0..2] "abc" 和 s[1..3] "bca"
console.log(hash.equal(0, 2, 1, 3));  // false
```

## 哈希冲突

一个重要问题：**不同的字符串可能产生相同的哈希值**。

这叫**哈希冲突**。因为字符串的数量远远大于哈希值的范围（MOD 个），冲突是不可避免的。

### 处理方法

**方法 1：双哈希**

使用两组不同的 (B, MOD)，两个哈希值都相等才认为字符串相等。

```javascript
class DoubleHash {
    constructor(s) {
        this.hash1 = new StringHash(s, 31, 1e9 + 7);
        this.hash2 = new StringHash(s, 37, 1e9 + 9);
    }
    
    getHash(l, r) {
        return [this.hash1.getHash(l, r), this.hash2.getHash(l, r)];
    }
    
    equal(l1, r1, l2, r2) {
        const h1 = this.getHash(l1, r1);
        const h2 = this.getHash(l2, r2);
        return h1[0] === h2[0] && h1[1] === h2[1];
    }
}
```

**方法 2：哈希相等后逐字符验证**

在实际匹配中，哈希相等后再逐字符比较确认。

**方法 3：选择好的参数**

B 和 MOD 都取大质数可以降低冲突概率。常用组合：
- B = 31, MOD = 10⁹+7
- B = 131, MOD = 10⁹+9
- B = 13331, MOD = 998244353

## 应用场景

字符串哈希的典型应用：

1. **判断子串相等**：预处理后 O(1) 比较
2. **查找重复子串**：配合二分查找
3. **Rabin-Karp 算法**：字符串匹配
4. **最长回文子串**：配合二分

## 常见错误

1. **溢出问题**：每一步都要取模
2. **负数处理**：减法后可能为负，需要 `(hash % MOD + MOD) % MOD`
3. **参数选择**：B 和 MOD 都应取质数，且 MOD 要足够大

## 本章小结

字符串哈希的核心思想：

1. 把字符串映射为数字（多项式哈希）
2. 预处理前缀哈希和幂次数组
3. O(1) 计算任意子串的哈希值
4. 注意哈希冲突，可用双哈希或验证解决

下一章，我们将学习基于哈希的字符串匹配算法——Rabin-Karp。
