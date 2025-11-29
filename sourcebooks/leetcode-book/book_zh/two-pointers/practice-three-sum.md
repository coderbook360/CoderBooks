# 实战：三数之和

这是双指针的经典应用题，也是面试高频题。它将"两数之和"扩展到三个数，需要用排序 + 固定一个数 + 双指针的技巧。

## 问题描述

给你一个整数数组`nums`，判断是否存在三个元素`a, b, c`，使得`a + b + c = 0`。返回所有满足条件且**不重复**的三元组。

**示例**：
```
输入：nums = [-1,0,1,2,-1,-4]
输出：[[-1,-1,2],[-1,0,1]]

输入：nums = [0,1,1]
输出：[]
```

## 思路分析

### 暴力思路

三层循环检查所有组合，时间O(n³)，太慢。

### 优化思路

1. **排序**：O(n log n)，为双指针做准备
2. **固定一个数**：遍历数组，固定`nums[i]`
3. **双指针找另外两个**：在`i`后面的区间用对撞指针找`-nums[i]`

这样时间复杂度降到O(n²)。

### 关键问题：去重

题目要求**不重复**的三元组。需要跳过重复的数：
- 固定数`nums[i]`时跳过重复
- 双指针移动时跳过重复

## 完整实现

```javascript
/**
 * @param {number[]} nums
 * @return {number[][]}
 */
function threeSum(nums) {
    const result = [];
    nums.sort((a, b) => a - b);  // 排序
    
    for (let i = 0; i < nums.length - 2; i++) {
        // 剪枝：最小的数都大于0，不可能和为0
        if (nums[i] > 0) break;
        
        // 跳过重复的固定数
        if (i > 0 && nums[i] === nums[i - 1]) continue;
        
        // 双指针
        let left = i + 1;
        let right = nums.length - 1;
        const target = -nums[i];
        
        while (left < right) {
            const sum = nums[left] + nums[right];
            
            if (sum === target) {
                result.push([nums[i], nums[left], nums[right]]);
                
                // 跳过重复的left和right
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
    
    return result;
}
```

## 执行过程

```
nums = [-1, 0, 1, 2, -1, -4]
排序后：[-4, -1, -1, 0, 1, 2]

i=0, nums[i]=-4, target=4
  left=1, right=5: -1+2=1 < 4, left++
  left=2, right=5: -1+2=1 < 4, left++
  left=3, right=5: 0+2=2 < 4, left++
  left=4, right=5: 1+2=3 < 4, left++
  left=5 >= right, 结束

i=1, nums[i]=-1, target=1
  left=2, right=5: -1+2=1 = 1 ✓
  记录 [-1, -1, 2]
  跳过重复，left=3, right=4
  left=3, right=4: 0+1=1 = 1 ✓
  记录 [-1, 0, 1]
  left=4 >= right, 结束

i=2, nums[i]=-1, 与nums[1]相同，跳过

i=3, nums[i]=0, target=0
  left=4, right=5: 1+2=3 > 0, right--
  left=4 >= right, 结束

结果：[[-1,-1,2], [-1,0,1]]
```

## 去重的关键

### 固定数去重

```javascript
if (i > 0 && nums[i] === nums[i - 1]) continue;
```

如果当前固定数和前一个相同，跳过。因为前一个已经处理过所有以它开头的三元组。

### 双指针去重

```javascript
while (left < right && nums[left] === nums[left + 1]) left++;
while (left < right && nums[right] === nums[right - 1]) right--;
```

找到一组解后，跳过相同的值，避免重复记录。

## 剪枝优化

```javascript
// 最小的数都大于0，不可能和为0
if (nums[i] > 0) break;
```

因为数组已排序，如果`nums[i] > 0`，后面的数更大，三数之和不可能为0。

## 复杂度分析

**时间复杂度**：O(n²)
- 排序：O(n log n)
- 双重循环：O(n²)

**空间复杂度**：O(1)
- 不计算输出数组的话

## 变体：三数之和最接近

找三个数的和最接近target：

```javascript
function threeSumClosest(nums, target) {
    nums.sort((a, b) => a - b);
    let closest = Infinity;
    
    for (let i = 0; i < nums.length - 2; i++) {
        let left = i + 1;
        let right = nums.length - 1;
        
        while (left < right) {
            const sum = nums[i] + nums[left] + nums[right];
            
            if (Math.abs(sum - target) < Math.abs(closest - target)) {
                closest = sum;
            }
            
            if (sum < target) {
                left++;
            } else if (sum > target) {
                right--;
            } else {
                return target;  // 完全匹配
            }
        }
    }
    
    return closest;
}
```

## 小结

三数之和的解题套路：

1. **排序**：为双指针做准备
2. **固定一个数**：将三数之和转化为两数之和
3. **双指针**：在有序区间找目标和
4. **去重**：固定数去重 + 双指针去重

这个模式可以扩展到四数之和、五数之和...只需增加固定数的层数。
