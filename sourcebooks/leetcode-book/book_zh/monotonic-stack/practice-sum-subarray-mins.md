# 实战：子数组的最小值之和

这道题将单调栈与数学贡献计算相结合，是单调栈的一个重要应用模式。

## 问题描述

给定一个整数数组`arr`，找到`min(b)`的总和，其中`b`的范围为`arr`的每个（连续）子数组。

由于答案可能很大，返回答案对`10^9 + 7`取余的结果。

**示例**：
```
输入: arr = [3,1,2,4]
输出: 17

解释: 
子数组        最小值
[3]          3
[1]          1
[2]          2
[4]          4
[3,1]        1
[1,2]        1
[2,4]        2
[3,1,2]      1
[1,2,4]      1
[3,1,2,4]    1
总和 = 3+1+2+4+1+1+2+1+1+1 = 17
```

## 思路分析

### 暴力方法：O(n²)

枚举所有子数组，找最小值并累加。

```javascript
function sumSubarrayMins(arr) {
    let sum = 0;
    for (let i = 0; i < arr.length; i++) {
        let min = arr[i];
        for (let j = i; j < arr.length; j++) {
            min = Math.min(min, arr[j]);
            sum += min;
        }
    }
    return sum;
}
```

### 换个角度：贡献法

不枚举子数组，而是计算**每个元素作为最小值的贡献**。

对于`arr[i]`，它在多少个子数组中是最小值？

如果`arr[i]`在`[left, right]`范围内是最小值：
- 左端点可以选`left, left+1, ..., i`，共`i - left`种
- 右端点可以选`i, i+1, ..., right`，共`right - i`种
- 子数组数量 = `(i - left) × (right - i)`
- 贡献 = `arr[i] × (i - left) × (right - i)`

### 找左右边界

问题转化为：找每个元素左边和右边第一个**更小**的位置。

这就是单调栈的强项！

## 完整实现

```javascript
/**
 * @param {number[]} arr
 * @return {number}
 */
function sumSubarrayMins(arr) {
    const n = arr.length;
    const MOD = 1e9 + 7;
    const left = new Array(n);   // 左边第一个更小的位置
    const right = new Array(n);  // 右边第一个更小的位置
    const stack = [];
    
    // 找左边界（严格小于）
    for (let i = 0; i < n; i++) {
        while (stack.length && arr[stack[stack.length - 1]] >= arr[i]) {
            stack.pop();
        }
        left[i] = stack.length === 0 ? -1 : stack[stack.length - 1];
        stack.push(i);
    }
    
    // 清空栈，找右边界（严格小于）
    stack.length = 0;
    for (let i = n - 1; i >= 0; i--) {
        while (stack.length && arr[stack[stack.length - 1]] > arr[i]) {
            stack.pop();
        }
        right[i] = stack.length === 0 ? n : stack[stack.length - 1];
        stack.push(i);
    }
    
    // 计算贡献
    let result = 0;
    for (let i = 0; i < n; i++) {
        const leftCount = i - left[i];      // 左边可选位置数
        const rightCount = right[i] - i;    // 右边可选位置数
        result = (result + arr[i] * leftCount * rightCount) % MOD;
    }
    
    return result;
}
```

## 处理重复元素

如果数组中有重复元素，比如`[1, 2, 1]`：
- 左边的1和右边的1在某些子数组中都是最小值
- 需要避免重复计算

**技巧**：左边用`>=`，右边用`>`（或反过来）。

这样，相同元素时：
- 左边的1"管"包含它但不包含右边1的子数组
- 右边的1"管"包含它的子数组
- 不会重复

```javascript
// 左边：弹出 >= 当前的
while (stack.length && arr[stack[stack.length - 1]] >= arr[i])

// 右边：弹出 > 当前的（不包括等于）
while (stack.length && arr[stack[stack.length - 1]] > arr[i])
```

## 执行过程图解

以`arr = [3,1,2,4]`为例：

```
找左边界 (left):
i=0: 栈空, left[0]=-1, stack=[0]
i=1: 3>=1, 弹出0, 栈空, left[1]=-1, stack=[1]
i=2: 1<2, left[2]=1, stack=[1,2]
i=3: 2<4, left[3]=2, stack=[1,2,3]
left = [-1, -1, 1, 2]

找右边界 (right):
i=3: 栈空, right[3]=4, stack=[3]
i=2: 4>2, 弹出3, 栈空, right[2]=4, stack=[2]
i=1: 2>1, 弹出2, 栈空, right[1]=4, stack=[1]
i=0: 1<=3, right[0]=1, stack=[1,0]
right = [1, 4, 4, 4]

计算贡献:
i=0: arr[0]=3, left=(0-(-1))=1, right=(1-0)=1, 贡献=3×1×1=3
i=1: arr[1]=1, left=(1-(-1))=2, right=(4-1)=3, 贡献=1×2×3=6
i=2: arr[2]=2, left=(2-1)=1, right=(4-2)=2, 贡献=2×1×2=4
i=3: arr[3]=4, left=(3-2)=1, right=(4-3)=1, 贡献=4×1×1=4

总和 = 3+6+4+4 = 17
```

## 一次遍历的版本

可以在一次遍历中同时处理：

```javascript
function sumSubarrayMins(arr) {
    const n = arr.length;
    const MOD = 1e9 + 7;
    const stack = [];  // 存储 [index, 累积贡献]
    let result = 0;
    let sum = 0;  // 当前累积和
    
    for (let i = 0; i < n; i++) {
        let count = 1;  // 当前元素管辖的范围
        
        while (stack.length && arr[stack[stack.length - 1][0]] >= arr[i]) {
            const [idx, prevCount] = stack.pop();
            count += prevCount;
            sum -= arr[idx] * prevCount;
        }
        
        stack.push([i, count]);
        sum += arr[i] * count;
        result = (result + sum) % MOD;
    }
    
    return result;
}
```

这种方法更巧妙但不太直观，面试中推荐两次遍历的版本。

## 复杂度分析

**时间复杂度：O(n)**
- 两次单调栈遍历，每次O(n)
- 最后一次遍历计算贡献，O(n)

**空间复杂度：O(n)**
- left、right数组
- 栈空间

## 类似问题

| 问题 | 贡献计算 |
|------|----------|
| 子数组最小值之和 | 作为最小值的次数 × 值 |
| 子数组最大值之和 | 作为最大值的次数 × 值 |
| 子数组范围和 | (最大值次数 - 最小值次数) × 值 |

## 小结

子数组最小值之和的核心：

1. **贡献法思维**：计算每个元素的贡献，而非枚举子数组
2. **边界查找**：用单调栈找左右第一个更小的位置
3. **组合计数**：`贡献 = 值 × 左边可选数 × 右边可选数`
4. **处理重复**：左边用`>=`，右边用`>`

这道题展示了单调栈与组合数学的完美结合——当需要计算"每个元素在多少个区间中满足某条件"时，单调栈找边界 + 贡献法计算是一个强大的组合。
