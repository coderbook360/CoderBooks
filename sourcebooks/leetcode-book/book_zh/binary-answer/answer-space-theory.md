# 答案空间与单调性

二分答案的核心在于理解"答案空间"和"单调性"。这两个概念决定了问题能否用二分解决。

## 什么是答案空间？

答案空间是所有**可能答案的集合**。

对于求最优值的问题：
- **最小化问题**：答案空间是[下界, 上界]，找最小可行解
- **最大化问题**：答案空间是[下界, 上界]，找最大可行解

## 确定答案空间的边界

### 下界：最小可能答案

思考：答案再小就完全不可能了

例如：
- 吃香蕉速度：至少1根/小时
- 运载能力：至少能装下最重的包裹
- 分割数组：至少等于最大元素

### 上界：最大可能答案

思考：答案达到这个值时一定可行

例如：
- 吃香蕉速度：最大堆的大小（一小时吃完一堆）
- 运载能力：所有包裹总重量（一天运完）
- 分割数组：数组总和（不分割）

## 什么是单调性？

单调性是指：**答案变大（或变小）时，可行性只会变好，不会变差**。

### 例子：吃香蕉

速度K越大：
- 吃完每堆需要的时间越少
- 总时间越少
- 越容易在H小时内吃完

所以：如果速度K可行，速度K+1也一定可行。

### 例子：分割数组

每组和的上限M越大：
- 每组能放的元素越多
- 需要的组数越少
- 越容易分成≤k组

所以：如果上限M可行，上限M+1也一定可行。

## 单调性的两种情况

### 情况一：可行区间在右边（找最小）

```
答案：  1  2  3  4  5  6  7  8  9
可行性：✗  ✗  ✗  ✓  ✓  ✓  ✓  ✓  ✓
               ↑
           找这个（最小可行）
```

**代码模式**：
```javascript
if (check(mid)) {
    right = mid;  // 可行，往左找更小的
} else {
    left = mid + 1;  // 不可行，往右找
}
```

### 情况二：可行区间在左边（找最大）

```
答案：  1  2  3  4  5  6  7  8  9
可行性：✓  ✓  ✓  ✓  ✓  ✗  ✗  ✗  ✗
                  ↑
              找这个（最大可行）
```

**代码模式**：
```javascript
if (check(mid)) {
    left = mid;  // 可行，往右找更大的
} else {
    right = mid - 1;  // 不可行，往左找
}
```

**注意**：找最大时需要特殊处理，避免死循环：
```javascript
const mid = left + Math.floor((right - left + 1) / 2);  // 向上取整
```

## 判断函数的设计

判断函数是二分答案的关键。给定答案X，判断是否可行。

### 设计原则

1. **参数**：接受一个答案值
2. **返回**：boolean，表示是否可行
3. **复杂度**：尽量O(n)或O(n log n)

### 常见判断逻辑

**贪心模拟**：
```javascript
function canFinish(piles, h, speed) {
    let time = 0;
    for (const pile of piles) {
        time += Math.ceil(pile / speed);
    }
    return time <= h;
}
```

**计数分组**：
```javascript
function canSplit(nums, k, maxSum) {
    let groups = 1, sum = 0;
    for (const num of nums) {
        if (sum + num > maxSum) {
            groups++;
            sum = num;
        } else {
            sum += num;
        }
    }
    return groups <= k;
}
```

## 识别二分答案问题

问题特征：
1. 求**最小**的某个值，使得条件成立
2. 求**最大**的某个值，使得条件成立
3. 关键词："最小化最大值"、"最大化最小值"

常见题目类型：
- 分配问题：分配时间、资源、任务
- 切割问题：切割材料、分割数组
- 调度问题：调度任务、运输货物

## 完整模板

```javascript
function binaryAnswerMinimize(nums, constraint) {
    let left = computeMin(nums);
    let right = computeMax(nums);
    
    while (left < right) {
        const mid = left + Math.floor((right - left) / 2);
        
        if (isFeasible(nums, constraint, mid)) {
            right = mid;
        } else {
            left = mid + 1;
        }
    }
    
    return left;
}

function binaryAnswerMaximize(nums, constraint) {
    let left = computeMin(nums);
    let right = computeMax(nums);
    
    while (left < right) {
        const mid = left + Math.floor((right - left + 1) / 2);  // 向上取整
        
        if (isFeasible(nums, constraint, mid)) {
            left = mid;
        } else {
            right = mid - 1;
        }
    }
    
    return left;
}
```

## 小结

答案空间与单调性的要点：

1. **答案空间**：确定答案的最小和最大可能值
2. **单调性**：答案增大时，可行性单调变化
3. **判断函数**：给定答案，高效判断是否可行
4. **两种方向**：最小化（right=mid）或最大化（left=mid）

理解这两个概念，就掌握了二分答案的核心。
