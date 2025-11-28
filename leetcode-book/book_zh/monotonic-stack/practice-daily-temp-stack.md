# 实战：每日温度（单调栈）

这道题在第四部分已经用单调栈解决过，这里我们深入分析它的单调栈本质，并探索不同的实现方式。

## 问题回顾

给定每天的温度列表`temperatures`，请计算每天需要等多少天才能等到更暖和的天气。如果之后不会更暖和，填0。

**示例**：
```
输入: temperatures = [73,74,75,71,69,72,76,73]
输出: [1,1,4,2,1,1,0,0]

解释:
- 73: 等1天到74度
- 74: 等1天到75度
- 75: 等4天到76度
- 71: 等2天到72度
- ...
```

## 本质分析

这是"下一个更大元素"的**索引差值**版本：
- 不是找"下一个更大的值是多少"
- 而是找"下一个更大的值在第几天"

所以结果是`索引差`，而非`值`。

## 单调递减栈解法

```javascript
/**
 * @param {number[]} temperatures
 * @return {number[]}
 */
function dailyTemperatures(temperatures) {
    const n = temperatures.length;
    const result = new Array(n).fill(0);
    const stack = [];  // 单调递减栈，存储索引
    
    for (let i = 0; i < n; i++) {
        // 当前温度比栈顶高
        while (stack.length && temperatures[i] > temperatures[stack[stack.length - 1]]) {
            const j = stack.pop();
            result[j] = i - j;  // 等待天数 = 索引差
        }
        stack.push(i);
    }
    
    return result;
}
```

## 从后往前遍历

另一种思路：从右往左遍历，每个位置向右查找：

```javascript
function dailyTemperatures(temperatures) {
    const n = temperatures.length;
    const result = new Array(n).fill(0);
    const stack = [];  // 单调递增栈（从栈顶到栈底递增）
    
    for (let i = n - 1; i >= 0; i--) {
        // 弹出所有比当前温度低的
        while (stack.length && temperatures[stack[stack.length - 1]] <= temperatures[i]) {
            stack.pop();
        }
        
        // 栈顶就是下一个更高温度的位置
        if (stack.length) {
            result[i] = stack[stack.length - 1] - i;
        }
        
        stack.push(i);
    }
    
    return result;
}
```

## 两种方法对比

| 特点 | 从前往后 | 从后往前 |
|------|----------|----------|
| 栈类型 | 递减栈 | 递增栈（栈顶到栈底） |
| 答案确定 | 弹出时 | 查询时（不弹出） |
| 存储内容 | 待确定答案的索引 | 已遍历的"候选答案"索引 |
| 更直观 | ✓ | - |

两种方法复杂度相同，但"从前往后"更符合直觉——就像你站在某一天，等待更暖和的天气到来。

## 空间优化：O(1)额外空间

利用result数组跳跃查找：

```javascript
function dailyTemperatures(temperatures) {
    const n = temperatures.length;
    const result = new Array(n).fill(0);
    
    for (let i = n - 2; i >= 0; i--) {
        let j = i + 1;
        
        while (j < n) {
            if (temperatures[j] > temperatures[i]) {
                result[i] = j - i;
                break;
            } else if (result[j] === 0) {
                // j之后没有更高的，当前也不会有
                result[i] = 0;
                break;
            } else {
                // 跳到j的下一个更高温度位置
                j += result[j];
            }
        }
    }
    
    return result;
}
```

**跳跃逻辑**：
- 如果`temperatures[j] > temperatures[i]`：找到答案
- 如果`result[j] === 0`：j之后没有更高的，那i也不会有
- 否则：跳到j的下一个更高温度位置继续查找

这种方法虽然有嵌套循环，但每个位置最多被访问O(n)次的摊还分析下，仍是O(n)。

## 执行过程图解

以`[73,74,75,71,69,72,76,73]`为例，单调栈从前往后：

```
i=0, T=73:
  栈空，入栈
  stack: [0]

i=1, T=74:
  74 > 73，弹出0，result[0]=1-0=1
  入栈1
  stack: [1], result: [1,0,0,0,0,0,0,0]

i=2, T=75:
  75 > 74，弹出1，result[1]=2-1=1
  入栈2
  stack: [2], result: [1,1,0,0,0,0,0,0]

i=3, T=71:
  71 < 75，入栈
  stack: [2,3], result: [1,1,0,0,0,0,0,0]

i=4, T=69:
  69 < 71，入栈
  stack: [2,3,4], result: [1,1,0,0,0,0,0,0]

i=5, T=72:
  72 > 69，弹出4，result[4]=5-4=1
  72 > 71，弹出3，result[3]=5-3=2
  72 < 75，入栈
  stack: [2,5], result: [1,1,0,2,1,0,0,0]

i=6, T=76:
  76 > 72，弹出5，result[5]=6-5=1
  76 > 75，弹出2，result[2]=6-2=4
  入栈6
  stack: [6], result: [1,1,4,2,1,1,0,0]

i=7, T=73:
  73 < 76，入栈
  stack: [6,7], result: [1,1,4,2,1,1,0,0]

栈中剩余[6,7]没有更高温度，保持0
最终: [1,1,4,2,1,1,0,0]
```

## 复杂度分析

**单调栈方法**：
- 时间复杂度：O(n)，每个元素最多入栈出栈各一次
- 空间复杂度：O(n)，栈空间

**跳跃优化方法**：
- 时间复杂度：O(n)，摊还分析
- 空间复杂度：O(1)，只用result数组

## 小结

每日温度问题的单调栈本质：

1. **问题转化**：找"下一个更大元素"的索引
2. **递减栈**：大的温度压在下面，等待被超越
3. **弹出即答案**：被弹出时，当前元素就是答案，计算索引差

这道题完美展示了"下一个更大元素"模式的实际应用——当你需要的是"距离"而非"值"时，只需把`result[j] = nums[i]`改为`result[j] = i - j`。
