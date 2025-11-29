# 哈希表基础理论

哈希表是算法面试中最常用的数据结构之一。它的核心能力很简单：**O(1)时间查找**。很多看似需要O(n)遍历的问题，用哈希表一下子就变成了O(1)。

## 什么是哈希表？

哈希表（Hash Table）是一种通过**哈希函数**将键（key）映射到值（value）的数据结构。

```
key → hash(key) → index → value

示例:
"apple" → hash("apple") → 5 → 存入bucket[5]
"banana" → hash("banana") → 2 → 存入bucket[2]
```

它就像一个智能储物柜：
- 输入物品名称（key）
- 系统告诉你柜子编号（index）
- 直接去那个柜子存取

## 哈希函数

哈希函数将任意类型的键转换为数组下标。

一个简单的字符串哈希函数：

```javascript
function simpleHash(key, size) {
    let hash = 0;
    for (const char of key) {
        hash = (hash * 31 + char.charCodeAt(0)) % size;
    }
    return hash;
}

// simpleHash("apple", 10) → 某个0-9之间的数
```

好的哈希函数应该：
- **均匀分布**：不同的key尽量映射到不同的位置
- **计算快速**：O(key长度)
- **确定性**：相同的key永远得到相同的结果

## JavaScript中的哈希表

### Object

最原始的哈希表，键只能是字符串或Symbol：

```javascript
const obj = {};
obj['name'] = 'Alice';
obj[123] = 'number';  // 实际上键是"123"

console.log(obj['name']);  // 'Alice'
console.log('name' in obj);  // true
delete obj['name'];
```

### Map

ES6引入的Map，键可以是任意类型：

```javascript
const map = new Map();

// 基本操作
map.set('key', 'value');
map.get('key');        // 'value'
map.has('key');        // true
map.delete('key');
map.size;              // 元素数量
map.clear();           // 清空

// 键可以是任意类型
map.set(123, 'number');
map.set([1,2], 'array');
map.set({a:1}, 'object');

// 遍历
for (const [key, value] of map) {
    console.log(key, value);
}
```

### Set

只存储键，用于去重和快速查找：

```javascript
const set = new Set();

// 基本操作
set.add(1);
set.add(2);
set.add(1);  // 重复的不会加入
set.has(1);  // true
set.delete(1);
set.size;    // 1

// 从数组创建
const arr = [1, 2, 2, 3, 3, 3];
const unique = [...new Set(arr)];  // [1, 2, 3]
```

## 时间复杂度

| 操作 | 平均 | 最坏 |
|------|------|------|
| 查找 | O(1) | O(n) |
| 插入 | O(1) | O(n) |
| 删除 | O(1) | O(n) |

**最坏情况**发生在所有键都哈希到同一个位置（哈希碰撞），这时退化成链表。但在正常情况下，哈希表的操作都是O(1)的。

## Map vs Object

| 特点 | Object | Map |
|------|--------|-----|
| 键类型 | 字符串/Symbol | 任意类型 |
| 键顺序 | 无保证 | 插入顺序 |
| 大小 | 需手动计算 | `.size`属性 |
| 迭代 | 需转换 | 直接迭代 |
| 性能 | 频繁增删较慢 | 频繁增删优化 |

**建议**：算法题中优先使用Map和Set。

## 典型应用场景

### 1. 计数统计

```javascript
function countChars(s) {
    const count = new Map();
    for (const char of s) {
        count.set(char, (count.get(char) || 0) + 1);
    }
    return count;
}

// countChars("aabbbc") → Map { 'a' => 2, 'b' => 3, 'c' => 1 }
```

### 2. 快速查找

```javascript
function hasDuplicate(nums) {
    const seen = new Set();
    for (const num of nums) {
        if (seen.has(num)) return true;
        seen.add(num);
    }
    return false;
}
```

### 3. 建立映射

```javascript
function twoSum(nums, target) {
    const map = new Map();  // 值 → 索引
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (map.has(complement)) {
            return [map.get(complement), i];
        }
        map.set(nums[i], i);
    }
    return [];
}
```

### 4. 缓存/记忆化

```javascript
function memoize(fn) {
    const cache = new Map();
    return function(...args) {
        const key = JSON.stringify(args);
        if (cache.has(key)) {
            return cache.get(key);
        }
        const result = fn(...args);
        cache.set(key, result);
        return result;
    };
}
```

## 常用技巧

### 计数器模式

```javascript
// 统计频率
const freq = new Map();
for (const item of arr) {
    freq.set(item, (freq.get(item) || 0) + 1);
}

// 判断两数组是否为字母异位词
function isAnagram(s, t) {
    if (s.length !== t.length) return false;
    const count = new Map();
    for (const c of s) count.set(c, (count.get(c) || 0) + 1);
    for (const c of t) {
        if (!count.has(c) || count.get(c) === 0) return false;
        count.set(c, count.get(c) - 1);
    }
    return true;
}
```

### 索引映射

```javascript
// 存储元素的索引
const indexMap = new Map();
for (let i = 0; i < arr.length; i++) {
    indexMap.set(arr[i], i);
}
```

### 分组

```javascript
// 按某个属性分组
const groups = new Map();
for (const item of arr) {
    const key = getKey(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
}
```

## 小结

哈希表的核心价值：

1. **O(1)查找**：将线性查找优化为常数时间
2. **键值映射**：建立灵活的对应关系
3. **去重计数**：高效处理重复元素

在算法题中，当你需要"快速判断某个元素是否存在"或"建立元素间的对应关系"时，首先想到哈希表。

下一节我们将深入探讨哈希碰撞问题及其解决方案。
