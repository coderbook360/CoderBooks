# 单调栈基础理论

在第四部分，我们已经在实战中体验过单调栈的威力——柱状图中最大的矩形、每日温度、去除重复字母。现在让我们系统地学习单调栈，深入理解它的本质。

## 什么是单调栈？

**单调栈**是一个特殊的栈，它的元素始终保持单调递增或单调递减。

- **单调递增栈**：从栈底到栈顶，元素递增
- **单调递减栈**：从栈底到栈顶，元素递减

维护单调性的关键：新元素入栈前，**弹出所有破坏单调性的元素**。

## 单调递增栈

```javascript
function buildMonotonicIncreasingStack(arr) {
    const stack = [];  // 存储索引
    
    for (let i = 0; i < arr.length; i++) {
        // 弹出所有比当前元素大的（维护递增）
        while (stack.length && arr[i] <= arr[stack[stack.length - 1]]) {
            stack.pop();
        }
        stack.push(i);
    }
    
    return stack;
}

// 示例: [3, 1, 4, 1, 5, 9, 2, 6]
// 最终栈: [1, 3, 6] 对应值 [1, 1, 2]
```

## 单调递减栈

```javascript
function buildMonotonicDecreasingStack(arr) {
    const stack = [];  // 存储索引
    
    for (let i = 0; i < arr.length; i++) {
        // 弹出所有比当前元素小的（维护递减）
        while (stack.length && arr[i] >= arr[stack[stack.length - 1]]) {
            stack.pop();
        }
        stack.push(i);
    }
    
    return stack;
}

// 示例: [3, 1, 4, 1, 5, 9, 2, 6]
// 最终栈: [5] 对应值 [9]
```

## 核心能力：找"下一个"

单调栈最强大的能力是在O(n)时间内找到每个元素的：
- 下一个更大元素（Next Greater Element）
- 下一个更小元素（Next Smaller Element）
- 上一个更大元素（Previous Greater Element）
- 上一个更小元素（Previous Smaller Element）

### 找下一个更大元素

```javascript
function nextGreater(arr) {
    const n = arr.length;
    const result = new Array(n).fill(-1);
    const stack = [];  // 单调递减栈
    
    for (let i = 0; i < n; i++) {
        // 当前元素比栈顶大，栈顶找到了答案
        while (stack.length && arr[i] > arr[stack[stack.length - 1]]) {
            const idx = stack.pop();
            result[idx] = arr[i];
        }
        stack.push(i);
    }
    
    return result;
}

// [3, 1, 4, 1, 5] -> [4, 4, 5, 5, -1]
```

**关键洞察**：用单调递减栈，当遇到更大的元素时，被弹出的元素就找到了它的"下一个更大"。

### 找下一个更小元素

```javascript
function nextSmaller(arr) {
    const n = arr.length;
    const result = new Array(n).fill(-1);
    const stack = [];  // 单调递增栈
    
    for (let i = 0; i < n; i++) {
        // 当前元素比栈顶小，栈顶找到了答案
        while (stack.length && arr[i] < arr[stack[stack.length - 1]]) {
            const idx = stack.pop();
            result[idx] = arr[i];
        }
        stack.push(i);
    }
    
    return result;
}

// [3, 1, 4, 1, 5] -> [1, -1, 1, -1, -1]
```

### 找上一个更大元素

```javascript
function previousGreater(arr) {
    const n = arr.length;
    const result = new Array(n).fill(-1);
    const stack = [];  // 单调递减栈
    
    for (let i = 0; i < n; i++) {
        while (stack.length && arr[stack[stack.length - 1]] <= arr[i]) {
            stack.pop();
        }
        if (stack.length) {
            result[i] = arr[stack[stack.length - 1]];  // 栈顶就是答案
        }
        stack.push(i);
    }
    
    return result;
}

// [3, 1, 4, 1, 5] -> [-1, 3, -1, 4, -1]
```

### 找上一个更小元素

```javascript
function previousSmaller(arr) {
    const n = arr.length;
    const result = new Array(n).fill(-1);
    const stack = [];  // 单调递增栈
    
    for (let i = 0; i < n; i++) {
        while (stack.length && arr[stack[stack.length - 1]] >= arr[i]) {
            stack.pop();
        }
        if (stack.length) {
            result[i] = arr[stack[stack.length - 1]];  // 栈顶就是答案
        }
        stack.push(i);
    }
    
    return result;
}

// [3, 1, 4, 1, 5] -> [-1, -1, 1, -1, 1]
```

## 选择哪种栈？

记住这个口诀：

| 目标 | 栈类型 | 答案来源 |
|------|--------|----------|
| 下一个更大 | 递减栈 | 弹出时，当前元素是答案 |
| 下一个更小 | 递增栈 | 弹出时，当前元素是答案 |
| 上一个更大 | 递减栈 | 入栈时，栈顶是答案 |
| 上一个更小 | 递增栈 | 入栈时，栈顶是答案 |

简化版本：
- 找**更大**元素 → 用**递减**栈（大的留在下面，等着被超越）
- 找**更小**元素 → 用**递增**栈（小的留在下面，等着被超越）

## 为什么是O(n)？

虽然有嵌套循环，但每个元素最多入栈一次、出栈一次。

```
总操作数 = 入栈次数 + 出栈次数 ≤ 2n = O(n)
```

这是典型的**摊还分析**（Amortized Analysis）。

## 存储索引还是值？

通常存储**索引**更灵活：
- 可以通过索引获取值：`arr[stack[i]]`
- 可以计算距离：`i - stack[top]`
- 可以标记已处理的位置

存储值只有在不需要位置信息时才使用。

## 典型应用场景

1. **下一个更大/更小元素**：直接应用
2. **柱状图中最大矩形**：找左右第一个更小的位置
3. **接雨水**：找左右边界
4. **股票价格跨度**：找上一个更大的位置
5. **去除重复字母**：维护字典序最小的单调序列

## 代码模板总结

```javascript
// 通用单调栈模板
function monotonicStack(arr, findGreater, findNext) {
    const n = arr.length;
    const result = new Array(n).fill(-1);
    const stack = [];
    
    for (let i = 0; i < n; i++) {
        // 根据目标选择比较条件
        const compare = findGreater 
            ? arr[i] > arr[stack[stack.length - 1]]   // 找更大，维护递减
            : arr[i] < arr[stack[stack.length - 1]];  // 找更小，维护递增
        
        while (stack.length && compare) {
            if (findNext) {
                // 找"下一个"：弹出时确定答案
                result[stack.pop()] = arr[i];
            } else {
                stack.pop();
            }
        }
        
        if (!findNext && stack.length) {
            // 找"上一个"：入栈时确定答案
            result[i] = arr[stack[stack.length - 1]];
        }
        
        stack.push(i);
    }
    
    return result;
}
```

## 小结

单调栈的核心思想：

1. **维护单调性**：新元素入栈前，弹出破坏单调性的元素
2. **弹出时确定答案**：被弹出的元素找到了它的"下一个"
3. **入栈时确定答案**：当前元素找到了它的"上一个"
4. **O(n)复杂度**：每个元素最多入栈出栈各一次

掌握了单调栈，许多看似复杂的问题都会变得清晰简单。下一节我们将学习它的孪生兄弟——单调队列。
