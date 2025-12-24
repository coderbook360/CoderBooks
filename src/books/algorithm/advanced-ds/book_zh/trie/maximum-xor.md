# 数组中两个数的最大异或值

## 核心问题

给定一个整数数组 `nums`，返回 `nums[i] XOR nums[j]` 的最大值，其中 `0 <= i <= j < n`。

这是字典树在位运算领域的经典应用——**如何利用二进制字典树（01-Trie）高效查找异或最大值？** 暴力枚举所有数对需要 O(n²)，但 01-Trie 可以将复杂度降到 O(n × 31)。

## LeetCode 421. 数组中两个数的最大异或值

**问题描述**：
```
输入：nums = [3,10,5,25,2,8]
输出：28

解释：最大值由 5 XOR 25 = 28 得到
     5:  00101
    25:  11001
    XOR: 11100 = 28
```

**约束条件**：
- `1 <= nums.length <= 2 × 10^5`
- `0 <= nums[i] <= 2^31 - 1`

## 思考过程

首先要问一个问题：**异或运算有什么特性？**

异或的核心特性：
- `a XOR b`：相同为 0，不同为 1
- 要让结果最大，应该让高位尽可能为 1

例如：
```
     5:  00000...00101
    25:  00000...11001
    XOR: 00000...11100 = 28
```

高位的 1 贡献的值远大于低位，所以策略是：**从高位到低位，贪心地让每一位都是 1**。

现在我要问第二个问题：**如何快速找到能让某一位为 1 的配对？**

暴力做法：枚举所有数对，O(n²)。

更好的做法：用字典树存储所有数字的二进制表示，查询时贪心地选择相反的位。

## 核心思想：01-Trie（二进制字典树）

### 什么是 01-Trie？

普通字典树的每个节点有 26 个子节点（对应 26 个字母），01-Trie 的每个节点只有 2 个子节点（对应 0 和 1）。

```
         root
        /    \
       0      1      ← 最高位
      / \    / \
     0   1  0   1    ← 次高位
    ...
```

### 如何利用 01-Trie 查找最大异或值？

对于每个数字 `num`，在字典树中查找另一个数字，使得异或结果最大：
- 从最高位开始
- 如果 `num` 的当前位是 0，优先走 1 分支（0 XOR 1 = 1）
- 如果 `num` 的当前位是 1，优先走 0 分支（1 XOR 0 = 1）
- 如果优先分支不存在，走另一个分支

## 方案一：01-Trie 标准解法

### 核心思路

1. **构建 01-Trie**：将所有数字的二进制表示插入字典树
2. **贪心查询**：对每个数字，在树中贪心查找能让异或结果最大的配对
3. **从高位到低位**：优先保证高位为 1

### 代码实现

```javascript
class TrieNode {
  constructor() {
    this.children = [null, null]; // 0 和 1 两个子节点
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  // 插入数字的二进制表示（从高位到低位）
  insert(num) {
    let node = this.root;
    for (let i = 31; i >= 0; i--) {
      const bit = (num >> i) & 1; // 提取第 i 位
      if (!node.children[bit]) {
        node.children[bit] = new TrieNode();
      }
      node = node.children[bit];
    }
  }

  // 查找能与 num 产生最大异或值的数字
  findMaxXor(num) {
    let node = this.root;
    let maxXor = 0;

    for (let i = 31; i >= 0; i--) {
      const bit = (num >> i) & 1;
      const toggleBit = 1 - bit; // 相反的位

      // 优先走相反的位（让异或结果为 1）
      if (node.children[toggleBit]) {
        maxXor |= (1 << i); // 第 i 位为 1
        node = node.children[toggleBit];
      } else {
        // 只能走相同的位（异或结果为 0）
        node = node.children[bit];
      }
    }

    return maxXor;
  }
}

function findMaximumXOR(nums) {
  const trie = new Trie();
  let maxXor = 0;

  // 1. 插入第一个数字
  trie.insert(nums[0]);

  // 2. 对每个数字，先查询最大异或，再插入
  for (let i = 1; i < nums.length; i++) {
    maxXor = Math.max(maxXor, trie.findMaxXor(nums[i]));
    trie.insert(nums[i]);
  }

  return maxXor;
}
```

### 为什么从高位到低位？

**贪心正确性**：高位的权重是指数级增长的。

例如：
- 第 31 位为 1：贡献 2^31
- 第 0~30 位全为 1：贡献 2^31 - 1

所以优先保证高位为 1 是最优策略。

### 复杂度分析

- **时间复杂度**：O(n × 32) = O(n)
  - 插入 n 个数字，每个 32 位：O(n × 32)
  - 查询 n 次，每次 32 位：O(n × 32)
  
- **空间复杂度**：O(n × 32) = O(n)
  - 最坏情况：所有数字的二进制表示没有公共前缀

## 方案二：哈希集合 + 贪心

现在思考另一个角度：**能否不用字典树，只用哈希集合？**

### 核心思路

从高位到低位逐位确定结果：
1. 假设当前位可以为 1
2. 检查是否存在两个数字，使得它们的异或在当前位为 1
3. 如果存在，确认当前位为 1，否则为 0

### 代码实现

```javascript
function findMaximumXOR(nums) {
  let maxXor = 0;
  let mask = 0;

  // 从高位到低位
  for (let i = 31; i >= 0; i--) {
    mask |= (1 << i); // 更新掩码，保留当前及更高位

    const prefixSet = new Set();
    for (const num of nums) {
      prefixSet.add(num & mask); // 保留高位前缀
    }

    // 尝试让当前位为 1
    const candidate = maxXor | (1 << i);

    // 检查是否存在 a, b 使得 a XOR b = candidate
    for (const prefix of prefixSet) {
      // 如果 a XOR b = candidate，则 a XOR candidate = b
      if (prefixSet.has(prefix ^ candidate)) {
        maxXor = candidate;
        break;
      }
    }
  }

  return maxXor;
}
```

### 为什么这样可行？

**关键性质**：如果 `a XOR b = c`，则 `a XOR c = b`。

对于每一位，我们尝试让结果在该位为 1：
- 假设 `maxXor | (1 << i)` 是可能的结果
- 遍历所有前缀，检查是否存在配对

### 复杂度分析

- **时间复杂度**：O(n × 32) = O(n)
  - 外层循环 32 次
  - 内层遍历 n 个数字
  
- **空间复杂度**：O(n)
  - 哈希集合存储 n 个前缀

## 方案对比

| 方案 | 时间复杂度 | 空间复杂度 | 优点 | 缺点 |
|-----|----------|----------|------|------|
| 01-Trie | O(n) | O(n) | 直观，易于理解 | 代码稍长 |
| 哈希集合 | O(n) | O(n) | 代码简洁 | 逻辑较抽象 |

**推荐**：01-Trie 方案，思路清晰，代码易维护。

## 测试用例

```javascript
// 测试用例 1：基本示例
console.log(findMaximumXOR([3,10,5,25,2,8])); // 28
// 5 XOR 25 = 28

// 测试用例 2：两个数
console.log(findMaximumXOR([14,70,53,83,49,91,36,80,92,51,66,70])); 
// 127

// 测试用例 3：全部相同
console.log(findMaximumXOR([5,5,5,5])); // 0

// 测试用例 4：单个数
console.log(findMaximumXOR([10])); // 0

// 测试用例 5：大数据
const largeNums = Array.from({length: 100000}, () => Math.floor(Math.random() * (2**31)));
console.time('01-Trie');
console.log(findMaximumXOR(largeNums));
console.timeEnd('01-Trie'); // 性能测试
```

## 关键要点

1. **01-Trie 定义**：二进制字典树，每个节点只有 0 和 1 两个子节点
2. **贪心策略**：从高位到低位，优先让每一位为 1
3. **异或性质**：`a XOR b = c` 等价于 `a XOR c = b`
4. **位运算技巧**：
   - 提取第 i 位：`(num >> i) & 1`
   - 设置第 i 位：`num | (1 << i)`
   - 翻转位：`1 - bit` 或 `bit ^ 1`
5. **空间优化**：01-Trie 的空间复杂度是 O(n × 32) = O(n)

## 扩展思考

**变体 1**：如果要求返回具体的两个数字呢？

在 `findMaxXor` 中记录路径，最后返回对应的数字。

```javascript
findMaxXorPair(num) {
  let node = this.root;
  let maxXor = 0;
  let pairNum = 0;
  
  for (let i = 31; i >= 0; i--) {
    const bit = (num >> i) & 1;
    const toggleBit = 1 - bit;
    
    if (node.children[toggleBit]) {
      maxXor |= (1 << i);
      pairNum |= (toggleBit << i); // 记录配对数字的位
      node = node.children[toggleBit];
    } else {
      pairNum |= (bit << i);
      node = node.children[bit];
    }
  }
  
  return { maxXor, pairNum };
}
```

**变体 2**：如果要求异或第 K 大的值呢？

需要在字典树中记录每条路径经过的数字，查询时进行第 K 大查询。

**变体 3**：如果数组动态变化（支持插入/删除）呢？

字典树天然支持动态插入，但删除需要引用计数。

**变体 4**：如果要求区间 [L, R] 内的最大异或值呢？

可持久化 01-Trie（主席树的变体），在第八部分会讲到。

**变体 5**：如果要求异或和小于 K 的数对数量呢？

需要在字典树中记录经过每个节点的数字数量，查询时统计。

这道题是 01-Trie 的经典应用，展示了：**通过将数字的二进制表示存入字典树，可以高效解决位运算相关的查询问题**。这种思想在算法竞赛和实际工程中都非常实用，比如网络路由的最长前缀匹配、IP 地址查找等场景。

## 字典树部分总结

至此，我们完成了字典树的全部 10 个章节：

1. **基础实现**：字典树的核心结构和基本操作
2. **标准题目**：LeetCode 208 实现 Trie
3. **通配符搜索**：DFS 处理 `.` 通配符
4. **二维搜索**：字典树 + 回溯的经典组合
5. **前缀验证**：逐步构建单词
6. **双端匹配**：组合键编码技巧
7. **聚合查询**：节点存储额外信息
8. **单词拆分**：字典树 + DP 的结合
9. **回文配对**：反向字典树的高级应用
10. **位运算**：01-Trie 的经典应用

这 10 个章节涵盖了字典树的核心思想和主要应用场景，从简单到复杂，从单一技术到组合技术，展示了字典树作为高级数据结构的强大能力。
