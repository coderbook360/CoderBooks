# 实战：四数之和

四数之和是三数之和的扩展，思路完全相同：排序 + 固定两个数 + 双指针。关键在于去重和剪枝。

## 问题描述

给你一个由`n`个整数组成的数组`nums`，和一个目标值`target`。找出所有满足`nums[a] + nums[b] + nums[c] + nums[d] = target`的四元组，且四元组不重复。

**示例**：
```
输入：nums = [1,0,-1,0,-2,2], target = 0
输出：[[-2,-1,1,2],[-2,0,0,2],[-1,0,0,1]]

输入：nums = [2,2,2,2,2], target = 8
输出：[[2,2,2,2]]
```

## 思路分析

### 从三数之和到四数之和

三数之和的结构：
- 固定1个数：O(n)
- 双指针找2个数：O(n)
- 总复杂度：O(n²)

四数之和的结构：
- 固定2个数：O(n²)
- 双指针找2个数：O(n)
- 总复杂度：O(n³)

### 核心步骤

1. 排序
2. 第一层循环固定`nums[i]`
3. 第二层循环固定`nums[j]`
4. 双指针找`nums[left]`和`nums[right]`
5. 各层都要去重

## 完整实现

```javascript
/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[][]}
 */
function fourSum(nums, target) {
    const result = [];
    nums.sort((a, b) => a - b);
    const n = nums.length;
    
    for (let i = 0; i < n - 3; i++) {
        // 第一层去重
        if (i > 0 && nums[i] === nums[i - 1]) continue;
        
        // 第一层剪枝
        if (nums[i] + nums[i + 1] + nums[i + 2] + nums[i + 3] > target) break;
        if (nums[i] + nums[n - 3] + nums[n - 2] + nums[n - 1] < target) continue;
        
        for (let j = i + 1; j < n - 2; j++) {
            // 第二层去重
            if (j > i + 1 && nums[j] === nums[j - 1]) continue;
            
            // 第二层剪枝
            if (nums[i] + nums[j] + nums[j + 1] + nums[j + 2] > target) break;
            if (nums[i] + nums[j] + nums[n - 2] + nums[n - 1] < target) continue;
            
            // 双指针
            let left = j + 1;
            let right = n - 1;
            
            while (left < right) {
                const sum = nums[i] + nums[j] + nums[left] + nums[right];
                
                if (sum === target) {
                    result.push([nums[i], nums[j], nums[left], nums[right]]);
                    
                    // 双指针去重
                    while (left < right && nums[left] === nums[left + 1]) left++;
                    while (left < right && nums[right] === nums[right - 1]) right--;
                    
                    left++;
                    right--;
                } else if (sum < target) {
                    left++;
                } else {
                    right--;
                }
            }
        }
    }
    
    return result;
}
```

## 剪枝优化详解

### 最小值剪枝

```javascript
if (nums[i] + nums[i + 1] + nums[i + 2] + nums[i + 3] > target) break;
```

当前能取到的最小和都大于target，后面更大的`i`更不可能，直接结束。

### 最大值剪枝

```javascript
if (nums[i] + nums[n - 3] + nums[n - 2] + nums[n - 1] < target) continue;
```

当前能取到的最大和都小于target，这个`i`不行，试下一个`i`。

## 去重详解

### 第一层去重

```javascript
if (i > 0 && nums[i] === nums[i - 1]) continue;
```

### 第二层去重

```javascript
if (j > i + 1 && nums[j] === nums[j - 1]) continue;
```

注意是`j > i + 1`，不是`j > 0`。因为`j`是从`i + 1`开始的。

### 双指针去重

```javascript
while (left < right && nums[left] === nums[left + 1]) left++;
while (left < right && nums[right] === nums[right - 1]) right--;
```

## 执行过程

```
nums = [1, 0, -1, 0, -2, 2], target = 0
排序后：[-2, -1, 0, 0, 1, 2]

i=0, nums[i]=-2
  j=1, nums[j]=-1, target'=3
    left=2, right=5: 0+2=2 < 3, left++
    left=3, right=5: 0+2=2 < 3, left++
    left=4, right=5: 1+2=3 = 3 ✓
    记录 [-2, -1, 1, 2]
    
  j=2, nums[j]=0, target'=2
    left=3, right=5: 0+2=2 = 2 ✓
    记录 [-2, 0, 0, 2]
    
  j=3, 与j=2相同，跳过

i=1, nums[i]=-1
  j=2, nums[j]=0, target'=1
    left=3, right=5: 0+2=2 > 1, right--
    left=3, right=4: 0+1=1 = 1 ✓
    记录 [-1, 0, 0, 1]

结果：[[-2,-1,1,2], [-2,0,0,2], [-1,0,0,1]]
```

## 通用K数之和

四数之和可以泛化为K数之和：

```javascript
function kSum(nums, target, k) {
    nums.sort((a, b) => a - b);
    return kSumHelper(nums, target, k, 0);
}

function kSumHelper(nums, target, k, start) {
    const result = [];
    
    // 边界情况
    if (start >= nums.length || k < 2) return result;
    
    // 剪枝
    if (nums[start] * k > target || nums[nums.length - 1] * k < target) {
        return result;
    }
    
    // k = 2 时用双指针
    if (k === 2) {
        return twoSum(nums, target, start);
    }
    
    // k > 2 时递归
    for (let i = start; i < nums.length - k + 1; i++) {
        // 去重
        if (i > start && nums[i] === nums[i - 1]) continue;
        
        const subResult = kSumHelper(nums, target - nums[i], k - 1, i + 1);
        for (const arr of subResult) {
            result.push([nums[i], ...arr]);
        }
    }
    
    return result;
}

function twoSum(nums, target, start) {
    const result = [];
    let left = start, right = nums.length - 1;
    
    while (left < right) {
        const sum = nums[left] + nums[right];
        if (sum === target) {
            result.push([nums[left], nums[right]]);
            while (left < right && nums[left] === nums[left + 1]) left++;
            while (left < right && nums[right] === nums[right - 1]) right--;
            left++;
            right--;
        } else if (sum < target) {
            left++;
        } else {
            right--;
        }
    }
    
    return result;
}
```

## 复杂度分析

**时间复杂度**：O(n³)
- 排序：O(n log n)
- 三重循环：O(n³)

**空间复杂度**：O(1)
- 不计算输出数组

## 小结

四数之和的套路：

1. **排序**：为双指针做准备
2. **固定两个数**：两层循环
3. **双指针找另外两个**：降维到两数之和
4. **每层都去重**：确保结果不重复
5. **每层都剪枝**：提前结束无效搜索

K数之和的通用解法就是递归降维，直到变成两数之和。
