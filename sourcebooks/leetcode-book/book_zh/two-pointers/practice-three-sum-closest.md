# 实战：最接近的三数之和

与三数之和类似，但不是找精确匹配，而是找最接近目标值的组合。同样用排序 + 双指针解决。

## 问题描述

给你一个长度为`n`的整数数组`nums`和一个目标值`target`。从`nums`中选出三个整数，使它们的和与`target`最接近。返回这三个数的和。

假定每组输入只存在唯一答案。

**示例**：
```
输入：nums = [-1,2,1,-4], target = 1
输出：2
解释：最接近 1 的和是 2（= -1 + 2 + 1）

输入：nums = [0,0,0], target = 1
输出：0
```

## 思路分析

### 核心思路

1. **排序**：方便双指针移动
2. **固定一个数**：遍历数组
3. **双指针找另外两个**：在有序区间内逼近目标
4. **维护最接近的和**：比较差值绝对值

### 与三数之和的区别

- 三数之和：找**等于0**的组合
- 最接近三数之和：找**最接近target**的组合

不需要去重，因为只返回一个和，而不是所有组合。

## 完整实现

```javascript
/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number}
 */
function threeSumClosest(nums, target) {
    nums.sort((a, b) => a - b);
    let closest = nums[0] + nums[1] + nums[2];  // 初始化
    
    for (let i = 0; i < nums.length - 2; i++) {
        let left = i + 1;
        let right = nums.length - 1;
        
        while (left < right) {
            const sum = nums[i] + nums[left] + nums[right];
            
            // 更新最接近的和
            if (Math.abs(sum - target) < Math.abs(closest - target)) {
                closest = sum;
            }
            
            // 移动指针
            if (sum < target) {
                left++;
            } else if (sum > target) {
                right--;
            } else {
                // 完全匹配，直接返回
                return target;
            }
        }
    }
    
    return closest;
}
```

## 执行过程

```
nums = [-1, 2, 1, -4], target = 1
排序后：[-4, -1, 1, 2]

初始 closest = -4 + (-1) + 1 = -4

i=0, nums[i]=-4
  left=1, right=3: -4+(-1)+2=-3
  |-3-1|=4 < |-4-1|=5, closest=-3
  -3 < 1, left++
  
  left=2, right=3: -4+1+2=-1
  |-1-1|=2 < |-3-1|=4, closest=-1
  -1 < 1, left++
  
  left=3 >= right, 结束

i=1, nums[i]=-1
  left=2, right=3: -1+1+2=2
  |2-1|=1 < |-1-1|=2, closest=2
  2 > 1, right--
  
  left=2 >= right, 结束

i=2, 不够三个数，结束

结果：2
```

## 优化：提前结束

如果找到完全匹配，可以直接返回：

```javascript
if (sum === target) {
    return target;
}
```

## 复杂度分析

**时间复杂度**：O(n²)
- 排序：O(n log n)
- 双重循环：O(n²)

**空间复杂度**：O(1)
- 只用了几个变量

## 小结

最接近三数之和的要点：

1. **排序 + 双指针**：和三数之和一样的框架
2. **维护最小差值**：每次计算和，比较与target的差值
3. **指针移动方向**：sum小了就left++，sum大了就right--
4. **提前结束**：完全匹配直接返回

这道题比三数之和简单，因为不需要去重，只需要找最接近的一个和。
