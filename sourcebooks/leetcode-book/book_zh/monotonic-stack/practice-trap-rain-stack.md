# 实战：接雨水（单调栈）

接雨水是经典的面试题，有多种解法。这里我们用单调栈来解决它，体会单调栈在"横向累加"计算中的优势。

## 问题描述

给定n个非负整数表示每个宽度为1的柱子的高度图，计算按此排列的柱子下雨后能接多少雨水。

**示例**：
```
输入: height = [0,1,0,2,1,0,1,3,2,1,2,1]
输出: 6

图示:
       █
   █   ██ █
 █ ██ █████ █
─────────────
0 1 0 2 1 0 1 3 2 1 2 1

蓝色部分为雨水，共6个单位
```

## 多种解法回顾

1. **暴力法**：每个位置找左右最高，O(n²)
2. **DP预处理**：预处理左右最高数组，O(n)空间
3. **双指针**：两端向中间逼近，O(1)空间
4. **单调栈**：横向累加水量，O(n)

## 单调栈思路

其他方法是**竖向**计算——每个位置能存多少水。

单调栈是**横向**计算——每形成一个"凹槽"，就计算这层的水量。

```
   █          
 █ ██        形成凹槽，计算一层水
─────        底: 位置2 (高度0)
1 0 2        左壁: 位置0 (高度1)
             右壁: 位置3 (高度2)
             水量 = min(1,2)-0 × (3-0-1) = 1×2 = 2
```

## 完整实现

```javascript
/**
 * @param {number[]} height
 * @return {number}
 */
function trap(height) {
    const stack = [];  // 单调递减栈，存储索引
    let water = 0;
    
    for (let i = 0; i < height.length; i++) {
        // 当前柱子比栈顶高，形成凹槽
        while (stack.length && height[i] > height[stack[stack.length - 1]]) {
            const bottom = stack.pop();  // 凹槽底部
            
            // 左边没有墙，接不住水
            if (!stack.length) break;
            
            const left = stack[stack.length - 1];  // 左边墙
            const h = Math.min(height[left], height[i]) - height[bottom];  // 水的高度
            const w = i - left - 1;  // 水的宽度
            water += h * w;
        }
        stack.push(i);
    }
    
    return water;
}
```

## 核心逻辑详解

```javascript
while (stack.length && height[i] > height[stack[stack.length - 1]]) {
    const bottom = stack.pop();  // 凹槽底部
    
    if (!stack.length) break;    // 没有左墙，接不住水
    
    const left = stack[stack.length - 1];  // 左墙位置
    const h = Math.min(height[left], height[i]) - height[bottom];
    const w = i - left - 1;
    water += h * w;
}
```

三个关键位置：
- `i`：右墙（当前位置）
- `bottom`：凹槽底部（刚弹出的）
- `left`：左墙（新栈顶）

水的高度 = min(左墙, 右墙) - 底部高度

## 执行过程图解

以`height = [0,1,0,2,1,0,1,3,2,1,2,1]`为例：

```
i=0, h=0: 入栈 → stack=[0]
i=1, h=1: 1>0, 弹出0
          左边没墙(栈空), break
          入栈 → stack=[1]
i=2, h=0: 0<1, 入栈 → stack=[1,2]
i=3, h=2: 2>0, 弹出2
          bottom=0, left=1, h=min(1,2)-0=1, w=3-1-1=1
          water += 1
          2>1, 弹出1
          左边没墙, break
          入栈 → stack=[3]
          water=1

i=4, h=1: 1<2, 入栈 → stack=[3,4]
i=5, h=0: 0<1, 入栈 → stack=[3,4,5]
i=6, h=1: 1>0, 弹出5
          bottom=0, left=4, h=min(1,1)-0=1, w=6-4-1=1
          water += 1
          1=1, 不弹出
          入栈 → stack=[3,4,6]
          water=2

i=7, h=3: 3>1, 弹出6
          bottom=1, left=4, h=min(1,3)-1=0, w=7-4-1=2
          water += 0
          3>1, 弹出4
          bottom=1, left=3, h=min(2,3)-1=1, w=7-3-1=3
          water += 3
          3>2, 弹出3
          左边没墙, break
          入栈 → stack=[7]
          water=5

后续类似...最终 water=6
```

## 为什么用单调递减栈？

我们需要找"凹槽"——两边高中间低的结构。

单调递减栈的特性：
- 栈中元素从下到上递减
- 遇到更高的元素时，栈顶就是"凹槽底部"
- 新栈顶是"左墙"，当前元素是"右墙"

## 与柱状图最大矩形的对比

两道题都用单调栈，但方向不同：

| 特点 | 接雨水 | 柱状图最大矩形 |
|------|--------|----------------|
| 栈类型 | 递减栈 | 递增栈 |
| 找的是 | 左右更高的 | 左右更小的 |
| 计算 | 横向累加水量 | 以弹出高度为矩形高度 |
| 触发条件 | 遇到更高柱子 | 遇到更矮柱子 |

## 复杂度分析

**时间复杂度：O(n)**
- 每个元素最多入栈出栈各一次

**空间复杂度：O(n)**
- 栈最多存储n个元素

## 双指针解法对比

```javascript
function trap(height) {
    let left = 0, right = height.length - 1;
    let leftMax = 0, rightMax = 0;
    let water = 0;
    
    while (left < right) {
        if (height[left] < height[right]) {
            if (height[left] >= leftMax) {
                leftMax = height[left];
            } else {
                water += leftMax - height[left];
            }
            left++;
        } else {
            if (height[right] >= rightMax) {
                rightMax = height[right];
            } else {
                water += rightMax - height[right];
            }
            right--;
        }
    }
    
    return water;
}
```

双指针是O(1)空间，更优。但单调栈的思路更通用，可以扩展到更复杂的场景。

## 小结

接雨水的单调栈解法核心：

1. **单调递减栈**：遇到更高柱子时处理
2. **横向计算**：每次弹出计算一层水量
3. **三个位置**：右墙(当前)、底部(弹出)、左墙(栈顶)
4. **公式**：`water += (min(左, 右) - 底) × 宽度`

单调栈的"横向思维"是一种独特的视角，虽然这道题双指针更优，但单调栈的思路在某些变体问题中无可替代。
