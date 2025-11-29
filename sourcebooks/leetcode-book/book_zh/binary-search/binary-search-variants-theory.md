# 二分查找变体

基本的二分查找只能找到**任意一个**等于目标的位置。实际应用中，我们经常需要找边界：第一个、最后一个、大于等于、小于等于等。

## 变体一：查找第一个等于target的位置

当数组有重复元素时，找**最左边**的那个：

```javascript
function findFirst(nums, target) {
    let left = 0;
    let right = nums.length - 1;
    
    while (left <= right) {
        const mid = left + Math.floor((right - left) / 2);
        
        if (nums[mid] >= target) {
            right = mid - 1;  // 向左收缩
        } else {
            left = mid + 1;
        }
    }
    
    // left是第一个 >= target 的位置
    if (left < nums.length && nums[left] === target) {
        return left;
    }
    return -1;
}
```

**关键点**：即使找到target也继续向左搜索。

## 变体二：查找最后一个等于target的位置

找**最右边**的那个：

```javascript
function findLast(nums, target) {
    let left = 0;
    let right = nums.length - 1;
    
    while (left <= right) {
        const mid = left + Math.floor((right - left) / 2);
        
        if (nums[mid] <= target) {
            left = mid + 1;  // 向右收缩
        } else {
            right = mid - 1;
        }
    }
    
    // right是最后一个 <= target 的位置
    if (right >= 0 && nums[right] === target) {
        return right;
    }
    return -1;
}
```

## 变体三：查找第一个大于等于target的位置（lower_bound）

```javascript
function lowerBound(nums, target) {
    let left = 0;
    let right = nums.length;  // 注意：right = nums.length
    
    while (left < right) {  // 注意：left < right
        const mid = left + Math.floor((right - left) / 2);
        
        if (nums[mid] >= target) {
            right = mid;  // 注意：right = mid
        } else {
            left = mid + 1;
        }
    }
    
    return left;  // 第一个 >= target 的位置
}
```

## 变体四：查找第一个大于target的位置（upper_bound）

```javascript
function upperBound(nums, target) {
    let left = 0;
    let right = nums.length;
    
    while (left < right) {
        const mid = left + Math.floor((right - left) / 2);
        
        if (nums[mid] > target) {
            right = mid;
        } else {
            left = mid + 1;
        }
    }
    
    return left;  // 第一个 > target 的位置
}
```

## 两种模板对比

### 模板一：[left, right]闭区间

```javascript
let left = 0, right = nums.length - 1;
while (left <= right) {
    // ...
    left = mid + 1;
    right = mid - 1;
}
```

### 模板二：[left, right)左闭右开

```javascript
let left = 0, right = nums.length;
while (left < right) {
    // ...
    left = mid + 1;
    right = mid;  // 不是 mid - 1
}
```

模板二更适合找边界，因为最终`left === right`，就是答案位置。

## 变体关系图

```
nums = [1, 2, 2, 2, 3, 4]
        ↑        ↑  ↑
        |        |  upperBound(2) = 4
        |        lastEqual(2) = 3
        firstEqual(2) = 1
        lowerBound(2) = 1
```

**公式**：
- `firstEqual(target)` = `lowerBound(target)`（如果存在）
- `lastEqual(target)` = `upperBound(target) - 1`（如果存在）
- `count(target)` = `upperBound(target) - lowerBound(target)`

## 统一模板

可以用一个函数处理所有情况：

```javascript
// 找第一个使得 check(mid) 为 true 的位置
function binarySearchFirst(nums, check) {
    let left = 0;
    let right = nums.length;
    
    while (left < right) {
        const mid = left + Math.floor((right - left) / 2);
        
        if (check(nums[mid])) {
            right = mid;
        } else {
            left = mid + 1;
        }
    }
    
    return left;
}

// 使用示例
const lowerBound = (nums, target) => 
    binarySearchFirst(nums, x => x >= target);

const upperBound = (nums, target) => 
    binarySearchFirst(nums, x => x > target);

const findFirst = (nums, target) => {
    const pos = binarySearchFirst(nums, x => x >= target);
    return pos < nums.length && nums[pos] === target ? pos : -1;
};
```

## 记忆技巧

1. **找左边界**：`right = mid`，收缩右边
2. **找右边界**：`left = mid + 1`，收缩左边
3. **包含target**：`>= target`（找左）或 `> target`（找右+1）

## 常见错误

1. **死循环**：`left < right`时不能用`right = mid - 1`
2. **越界**：检查返回值是否在有效范围内
3. **混淆模板**：闭区间和左闭右开不能混用

## 小结

二分查找变体的核心：

1. **明确搜索目标**：第一个、最后一个、大于、大于等于
2. **选择合适模板**：闭区间或左闭右开
3. **处理边界情况**：检查返回值的有效性
4. **理解公式关系**：各变体之间可以相互转换

掌握这些变体，绝大多数二分查找问题都能解决。
