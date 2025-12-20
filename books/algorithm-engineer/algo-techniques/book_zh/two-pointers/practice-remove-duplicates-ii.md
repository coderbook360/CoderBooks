# 实战：删除有序数组中的重复项 II

> LeetCode 80. 删除有序数组中的重复项 II | 难度：中等

快慢指针在数组原地修改中的经典应用。与简单版本不同，这道题**允许每个元素最多出现两次**。

---

## 题目描述

给你一个有序数组 `nums`，请你**原地**删除重复出现的元素，使得每个元素**最多出现两次**，返回删除后数组的新长度。

不要使用额外的数组空间，必须在**原地**修改输入数组。

**示例**：
```
输入：nums = [1, 1, 1, 2, 2, 3]
输出：5, nums = [1, 1, 2, 2, 3, _]

输入：nums = [0, 0, 1, 1, 1, 1, 2, 3, 3]
输出：7, nums = [0, 0, 1, 1, 2, 3, 3, _, _]
```

---

## 思路分析

### 快慢指针策略

- `slow`：指向下一个要填入的位置
- `fast`：遍历整个数组

### 关键洞察

由于数组有序，相同元素一定相邻。

要判断当前元素是否应该保留，我们只需要比较 `nums[fast]` 与 `nums[slow - 2]`：
- 如果**相等**：说明 `nums[slow-2]`、`nums[slow-1]`、`nums[fast]` 三个相同，已经有两个了，跳过
- 如果**不等**：保留当前元素

```
已保留:    [1, 1, _, _, _, _]
                ↑  ↑
             slow-2 slow

快指针:    [1, 1, 1, 2, 2, 3]
                   ↑
                  fast

nums[fast] = 1 === nums[slow-2] = 1
说明已经有两个 1 了，跳过
```

---

## 代码实现

```typescript
function removeDuplicates(nums: number[]): number {
  if (nums.length <= 2) return nums.length;
  
  let slow = 2;  // 前两个元素一定保留
  
  for (let fast = 2; fast < nums.length; fast++) {
    // 与 slow - 2 位置比较
    if (nums[fast] !== nums[slow - 2]) {
      nums[slow] = nums[fast];
      slow++;
    }
  }
  
  return slow;
}
```

---

## 执行过程可视化

```
nums = [1, 1, 1, 2, 2, 3]
        0  1  2  3  4  5

初始：slow = 2, fast = 2

fast=2: nums[2]=1 === nums[0]=1, 跳过
        nums = [1, 1, 1, 2, 2, 3]
                      ↑
                     slow=2

fast=3: nums[3]=2 !== nums[0]=1, 保留
        nums[2] = 2
        nums = [1, 1, 2, 2, 2, 3]
                         ↑
                        slow=3

fast=4: nums[4]=2 !== nums[1]=1, 保留
        nums[3] = 2
        nums = [1, 1, 2, 2, 2, 3]
                            ↑
                           slow=4

fast=5: nums[5]=3 !== nums[2]=2, 保留
        nums[4] = 3
        nums = [1, 1, 2, 2, 3, 3]
                               ↑
                              slow=5

返回 5
有效部分：[1, 1, 2, 2, 3]
```

---

## 为什么比较 slow - 2 而不是 slow - 1

比较 `slow - 1` 只能知道当前元素是否与上一个元素相同，但无法判断已经有几个相同元素。

```
错误做法：与 slow - 1 比较
nums = [1, 1, 1, 2]
        0  1  2  3

fast=2: nums[2]=1 === nums[1]=1, 跳过
        但如何知道 nums[0] 也是 1？

正确做法：与 slow - 2 比较
fast=2: nums[2]=1 === nums[0]=1
        直接知道 [slow-2, slow-1, fast] 都是 1
        已经有两个了，应该跳过
```

---

## 推广到最多保留 k 个

将比较距离从 2 改为 k：

```typescript
function removeDuplicatesK(nums: number[], k: number): number {
  if (nums.length <= k) return nums.length;
  
  let slow = k;  // 前 k 个元素一定保留
  
  for (let fast = k; fast < nums.length; fast++) {
    if (nums[fast] !== nums[slow - k]) {
      nums[slow] = nums[fast];
      slow++;
    }
  }
  
  return slow;
}

// 使用示例
removeDuplicatesK([1,1,1,2,2,3], 2);  // 最多保留 2 个
removeDuplicatesK([1,1,1,2,2,3], 1);  // 最多保留 1 个（原题26）
removeDuplicatesK([1,1,1,2,2,3], 3);  // 最多保留 3 个
```

---

## 复杂度分析

**时间复杂度**：O(n)
- 每个元素只访问一次

**空间复杂度**：O(1)
- 只使用了两个指针

---

## 常见错误

**错误1：slow 初始值设错**
```typescript
let slow = 0;  // ❌ 应该从 2 开始
let slow = 1;  // ❌
let slow = 2;  // ✅
```

**错误2：先移动 slow 再赋值**
```typescript
// 错误顺序
slow++;
nums[slow] = nums[fast];  // ❌

// 正确顺序
nums[slow] = nums[fast];
slow++;  // ✅
```

**错误3：忘记处理小数组**
```typescript
// 需要特判
if (nums.length <= 2) return nums.length;  // ✅
```

---

## 与版本 I 的对比

| 版本 | 保留规则 | 比较距离 | slow 初始值 |
|-----|---------|---------|-----------|
| I (26) | 最多 1 个 | slow - 1 | 1 |
| II (80) | 最多 2 个 | slow - 2 | 2 |

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [26. 删除有序数组中的重复项](https://leetcode.com/problems/remove-duplicates-from-sorted-array/) | 简单 | 最多保留 1 个 |
| [27. 移除元素](https://leetcode.com/problems/remove-element/) | 简单 | 移除特定值 |
| [283. 移动零](https://leetcode.com/problems/move-zeroes/) | 简单 | 零移到末尾 |

---

## 总结

删除有序数组中的重复项 II 核心要点：

1. **快慢指针**：slow 指向写入位置，fast 遍历数组
2. **比较 slow - 2**：判断当前元素是否应该保留
3. **数组有序**：相同元素必然相邻
4. **通用模式**：可推广到最多保留 k 个
5. **边界处理**：前 k 个元素一定保留
