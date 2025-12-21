# 实战：最接近的三数之和

> LeetCode 16. 最接近的三数之和 | 难度：中等

与三数之和类似，但不是找等于 target，而是找**最接近** target 的和。

---

## 题目描述

给你一个长度为 n 的整数数组 `nums` 和一个目标值 `target`。从 `nums` 中选择三个整数，使它们的和与 `target` 最接近。

返回这三个数的和。假设每组输入只存在一个答案。

**示例**：
```
输入：nums = [-1, 2, 1, -4], target = 1
输出：2
解释：最接近 1 的三数之和是 2（-1 + 2 + 1 = 2）

输入：nums = [0, 0, 0], target = 1
输出：0
```

---

## 思路分析

核心逻辑与三数之和一致：
1. **排序**：为双指针创造条件
2. **固定一个数**：枚举第一个数
3. **对撞指针**：在剩余区间找另外两个

### 与三数之和的区别

| 三数之和 | 最接近三数之和 |
|---------|---------------|
| 找 sum === target | 找 \|sum - target\| 最小 |
| 可能有多个解 | 只有一个解 |
| 需要去重 | 不严格需要去重 |

---

## 代码实现

```typescript
function threeSumClosest(nums: number[], target: number): number {
  nums.sort((a, b) => a - b);
  
  // 初始化为前三个数之和
  let closest = nums[0] + nums[1] + nums[2];
  
  for (let i = 0; i < nums.length - 2; i++) {
    // 可选优化：跳过重复元素
    if (i > 0 && nums[i] === nums[i - 1]) continue;
    
    let left = i + 1;
    let right = nums.length - 1;
    
    while (left < right) {
      const sum = nums[i] + nums[left] + nums[right];
      
      // 完美匹配，直接返回
      if (sum === target) {
        return target;
      }
      
      // 更新最接近的和
      if (Math.abs(sum - target) < Math.abs(closest - target)) {
        closest = sum;
      }
      
      // 根据大小调整指针
      if (sum < target) {
        left++;  // 和太小，需要更大
      } else {
        right--;  // 和太大，需要更小
      }
    }
  }
  
  return closest;
}
```

---

## 执行过程可视化

```
nums = [-1, 2, 1, -4], target = 1
排序后：[-4, -1, 1, 2]

i=0, nums[i]=-4:
  left=1(-1), right=3(2): sum = -4+(-1)+2 = -3
  |-3-1| = 4, closest = -3
  sum < target, left++
  
  left=2(1), right=3(2): sum = -4+1+2 = -1
  |-1-1| = 2 < 4, closest = -1
  sum < target, left++
  
  left=right=3, 结束

i=1, nums[i]=-1:
  left=2(1), right=3(2): sum = -1+1+2 = 2
  |2-1| = 1 < 2, closest = 2
  sum > target, right--
  
  left=right=2, 结束

i=2, 循环结束（i < n-2）

返回 closest = 2 ✓
```

---

## 优化技巧

### 1. 提前终止

```typescript
// 如果当前最小可能和已经大于target
const minSum = nums[i] + nums[i + 1] + nums[i + 2];
if (minSum > target) {
  if (Math.abs(minSum - target) < Math.abs(closest - target)) {
    closest = minSum;
  }
  break;  // 后续i更大，最小和只会更大
}

// 如果当前最大可能和已经小于target
const maxSum = nums[i] + nums[n - 2] + nums[n - 1];
if (maxSum < target) {
  if (Math.abs(maxSum - target) < Math.abs(closest - target)) {
    closest = maxSum;
  }
  continue;  // 这个i没有更好的选择
}
```

### 2. 完整优化版

```typescript
function threeSumClosest(nums: number[], target: number): number {
  nums.sort((a, b) => a - b);
  const n = nums.length;
  let closest = nums[0] + nums[1] + nums[2];
  
  for (let i = 0; i < n - 2; i++) {
    if (i > 0 && nums[i] === nums[i - 1]) continue;
    
    // 优化1：当前最小和
    const minSum = nums[i] + nums[i + 1] + nums[i + 2];
    if (minSum > target) {
      if (minSum - target < Math.abs(closest - target)) {
        closest = minSum;
      }
      break;
    }
    
    // 优化2：当前最大和
    const maxSum = nums[i] + nums[n - 2] + nums[n - 1];
    if (maxSum < target) {
      if (target - maxSum < Math.abs(closest - target)) {
        closest = maxSum;
      }
      continue;
    }
    
    let left = i + 1;
    let right = n - 1;
    
    while (left < right) {
      const sum = nums[i] + nums[left] + nums[right];
      
      if (sum === target) return target;
      
      if (Math.abs(sum - target) < Math.abs(closest - target)) {
        closest = sum;
      }
      
      if (sum < target) {
        left++;
      } else {
        right--;
      }
    }
  }
  
  return closest;
}
```

---

## 复杂度分析

**时间复杂度**：O(n²)
- 排序：O(n log n)
- 双重循环：O(n²)

**空间复杂度**：O(1)（不计排序空间）

---

## 常见错误

**错误1：初始值设置不当**
```typescript
// 错误：可能溢出或不合理
let closest = Infinity;  // ❌

// 正确：用实际存在的三数之和
let closest = nums[0] + nums[1] + nums[2];  // ✅
```

**错误2：比较逻辑错误**
```typescript
// 错误：没有用绝对值
if (sum - target < closest - target)  // ❌

// 正确
if (Math.abs(sum - target) < Math.abs(closest - target))  // ✅
```

**错误3：忘记处理完美匹配**
```typescript
// 应该提前返回
if (sum === target) {
  return target;  // 不可能比这更接近了
}
```

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [15. 三数之和](https://leetcode.com/problems/3sum/) | 中等 | 等于0 |
| [18. 四数之和](https://leetcode.com/problems/4sum/) | 中等 | 四个数 |
| [1. 两数之和](https://leetcode.com/problems/two-sum/) | 简单 | 基础 |

---

## 三数问题系列对比

| 题目 | 目标 | 返回值 |
|-----|------|-------|
| 两数之和 | 等于target | 索引/值 |
| 三数之和 | 等于0 | 所有三元组 |
| 最接近三数 | 最接近target | 和值 |
| 四数之和 | 等于target | 所有四元组 |

---

## 总结

最接近三数之和的核心要点：

1. **排序+双指针**：与三数之和框架相同
2. **追踪最接近**：维护 |sum - target| 最小的结果
3. **提前终止**：sum === target 时直接返回
4. **优化空间**：利用有序性进行剪枝
5. **绝对值比较**：正确计算距离

## 要点

- 思路与三数之和完全一致
- 用 `Math.abs(sum - target)` 判断接近程度
- 如果 `sum === target`，可以提前返回
