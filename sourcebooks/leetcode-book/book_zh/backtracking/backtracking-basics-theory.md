# 回溯算法基础理论

回溯是一种系统性地搜索解空间的方法。

## 什么是回溯

回溯的核心思想是**试错**：
1. 做出一个选择
2. 递归探索
3. 如果行不通，撤销选择，尝试其他

就像走迷宫，走到死胡同就退回来换条路。

## 回溯模板

几乎所有回溯问题都遵循这个模板：

```javascript
function backtrack(path, choices) {
    // 终止条件：找到一个解
    if (满足结束条件) {
        result.push([...path]);
        return;
    }
    
    // 遍历所有选择
    for (const choice of choices) {
        // 做选择
        path.push(choice);
        
        // 递归
        backtrack(path, 新的选择列表);
        
        // 撤销选择（回溯）
        path.pop();
    }
}
```

## 理解回溯的关键

回溯本质是**深度优先遍历决策树**。

以全排列[1,2,3]为例，决策树是这样的：

```
                   []
         /         |         \
       [1]        [2]        [3]
      /   \      /   \      /   \
   [1,2] [1,3] [2,1] [2,3] [3,1] [3,2]
     |     |     |     |     |     |
[1,2,3][1,3,2][2,1,3][2,3,1][3,1,2][3,2,1]
```

回溯就是遍历这棵树，到达叶子节点时收集结果。

## 三个关键概念

### 1. 路径（path）
已经做出的选择。

### 2. 选择列表（choices）
当前可以做的选择。

### 3. 结束条件
到达决策树的叶子节点。

## 回溯 vs 递归

递归是一种编程技术，回溯是一种算法思想。

回溯 = 递归 + 撤销选择

```javascript
// 普通递归
function recurse(n) {
    if (n === 0) return;
    console.log(n);
    recurse(n - 1);
}

// 回溯
function backtrack(path) {
    if (path.length === n) {
        result.push([...path]);
        return;
    }
    for (const choice of choices) {
        path.push(choice);      // 做选择
        backtrack(path);
        path.pop();             // 撤销选择
    }
}
```

## 回溯的时间复杂度

回溯的复杂度通常很高，因为要遍历整个解空间。

- 全排列：O(n!)
- 子集：O(2^n)
- 组合：O(C(n,k))

这是回溯的本质特点，不是缺点。

## 回溯能解决的问题类型

### 1. 排列问题
元素的不同排列，顺序重要。

### 2. 组合问题
元素的不同组合，顺序不重要。

### 3. 子集问题
集合的所有子集。

### 4. 切割问题
字符串的不同切割方式。

### 5. 棋盘问题
N皇后、解数独等。

## 实例：生成所有子集

```javascript
function subsets(nums) {
    const result = [];
    
    function backtrack(start, path) {
        // 每个节点都是一个子集
        result.push([...path]);
        
        for (let i = start; i < nums.length; i++) {
            path.push(nums[i]);
            backtrack(i + 1, path);
            path.pop();
        }
    }
    
    backtrack(0, []);
    return result;
}
```

注意`start`参数，它确保了每个元素只被选一次，且保持顺序。

## 回溯的本质

回溯是暴力搜索的优雅实现。

它不是高效算法，但它是：
- **系统性的**：不会遗漏任何解
- **通用的**：能解决各种组合问题
- **可优化的**：可以通过剪枝提升效率

## 小结

回溯算法的核心：
1. 构建决策树
2. 深度优先遍历
3. 做选择、递归、撤销选择

掌握回溯模板，你就能解决大部分排列、组合、子集问题。

下一节，我们学习如何通过剪枝优化回溯算法。
