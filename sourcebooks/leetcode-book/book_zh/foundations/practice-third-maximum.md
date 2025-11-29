# 第三大的数

> LeetCode 414. Third Maximum Number

给你一个非空数组，返回这个数组中第三大的数。如果不存在第三大的数，则返回最大的数。

这道题考察的是如何同时维护多个最值，以及对边界情况的处理。

## 问题描述

```javascript
输入：nums = [3, 2, 1]
输出：1
解释：第三大的数是 1

输入：nums = [1, 2]
输出：2
解释：不存在第三大的数，返回最大值

输入：nums = [2, 2, 3, 1]
输出：1
解释：注意重复数字只算一次，不同的数有 1, 2, 3，第三大是 1
```

## 思路分析

### 维护三个变量

我们需要追踪三个值：最大、第二大、第三大。

遇到一个新数字时：
1. 如果比最大的还大，三个值依次"降级"
2. 如果在最大和第二大之间，后两个值"降级"
3. 如果在第二大和第三大之间，只更新第三大

### 处理重复值

题目要求的是**不同的**第三大。`[2, 2, 3, 1]` 中虽然有 4 个数，但不同的只有 3 个。

所以遇到重复值要跳过。

### 处理不足三个的情况

如果数组中不同的数少于 3 个，返回最大值。

## 解法详解

```javascript
function thirdMax(nums) {
    // 初始化为负无穷，表示"还没有值"
    let first = -Infinity;
    let second = -Infinity;
    let third = -Infinity;
    
    for (const num of nums) {
        // 跳过重复值
        if (num === first || num === second || num === third) {
            continue;
        }
        
        if (num > first) {
            // num 是新的最大值，原来的值依次后移
            third = second;
            second = first;
            first = num;
        } else if (num > second) {
            // num 在第一和第二之间
            third = second;
            second = num;
        } else if (num > third) {
            // num 在第二和第三之间
            third = num;
        }
    }
    
    // 如果 third 还是初始值，说明不足三个不同的数
    return third === -Infinity ? first : third;
}
```

**为什么用 `-Infinity`**？

- `Number.MIN_VALUE` 是最小的**正数**，不是负无穷
- 如果数组包含负数，用 `Number.MIN_VALUE` 会出错
- `-Infinity` 比任何数都小，是正确的初始值

### 执行过程

以 `[3, 2, 1]` 为例：

```
初始: first=-∞, second=-∞, third=-∞

num=3:
  3 > first(-∞)
  → third = -∞, second = -∞, first = 3
  状态: first=3, second=-∞, third=-∞

num=2:
  2 不等于任何已有值，不是重复
  2 < first(3)
  2 > second(-∞)
  → third = -∞, second = 2
  状态: first=3, second=2, third=-∞

num=1:
  1 不等于任何已有值，不是重复
  1 < first(3)
  1 < second(2)
  1 > third(-∞)
  → third = 1
  状态: first=3, second=2, third=1

third=1 ≠ -∞，返回 1
```

以 `[2, 2, 3, 1]` 为例：

```
初始: first=-∞, second=-∞, third=-∞

num=2:
  → first=2, second=-∞, third=-∞

num=2:
  2 === first，跳过

num=3:
  3 > first(2)
  → third=-∞, second=2, first=3
  状态: first=3, second=2, third=-∞

num=1:
  1 < second(2)
  1 > third(-∞)
  → third=1
  状态: first=3, second=2, third=1

third=1 ≠ -∞，返回 1
```

## 复杂度分析

**时间复杂度：O(n)**
- 只需要遍历一次数组

**空间复杂度：O(1)**
- 只用了三个变量

## 边界情况

```javascript
// 只有两个不同的数
thirdMax([1, 2])       // 2（返回最大值）

// 只有一个不同的数
thirdMax([1, 1, 1])    // 1（返回最大值）

// 包含负数
thirdMax([1, -2, -3])  // -3

// 包含很大/很小的数
thirdMax([1, 2, Number.MIN_SAFE_INTEGER])  // Number.MIN_SAFE_INTEGER
```

## 常见误区

**误区一：用排序**

```javascript
// ❌ 时间复杂度 O(n log n)，而且需要处理重复
nums.sort((a, b) => b - a);
const unique = [...new Set(nums)];
return unique.length >= 3 ? unique[2] : unique[0];
```

虽然代码简单，但时间复杂度更高。

**误区二：用 `Number.MIN_VALUE`**

```javascript
// ❌ MIN_VALUE 是最小正数，约 5e-324
let third = Number.MIN_VALUE;

// 如果数组是 [1, 2, -1]
// -1 > MIN_VALUE 是 false，不会更新 third
```

**误区三：忘记跳过重复值**

```javascript
// ❌ 没有检查重复
if (num > first) {
    third = second;
    second = first;
    first = num;
}
// [2, 2, 3, 1] 会得到错误结果
```

## 扩展：如果要求第 K 大呢？

如果要找第 K 大的数（K 可能很大），维护 K 个变量就不实际了。可以用：

- **小顶堆**：维护大小为 K 的堆，时间 O(n log K)
- **快速选择**：平均时间 O(n)

这些在后续章节会详细讲解。

## 小结

这道题的关键点：

1. **维护多个最值**：更新时注意"降级"顺序
2. **跳过重复**：重复值不参与计数
3. **正确的初始值**：用 `-Infinity` 而不是 `Number.MIN_VALUE`
4. **处理不足情况**：不足 K 个时返回最大值

这种"维护前 K 大"的思想在很多场景都有应用，是一个基础且重要的技巧。
