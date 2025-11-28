# 栈与队列的应用场景

掌握了栈和队列的基本操作后，关键问题是：**什么时候用栈？什么时候用队列？** 这一章我们通过典型应用场景，建立问题到数据结构的映射思维。

## 栈的应用场景

栈的核心特性是**后进先出**，适用于需要"最近相关性"的场景。

### 1. 括号匹配

这是栈最经典的应用。判断括号是否有效，规则是：每个右括号必须匹配最近的左括号。

```javascript
function isValid(s) {
    const stack = [];
    const map = { ')': '(', ']': '[', '}': '{' };
    
    for (const char of s) {
        if (char in map) {
            // 右括号：必须匹配栈顶的左括号
            if (stack.pop() !== map[char]) {
                return false;
            }
        } else {
            // 左括号：入栈
            stack.push(char);
        }
    }
    
    return stack.length === 0;
}
```

**为什么用栈？**

考虑`([{}])`：
- 遇到`(`，入栈
- 遇到`[`，入栈
- 遇到`{`，入栈
- 遇到`}`，必须匹配**最近**的左括号`{`
- 遇到`]`，必须匹配**次近**的左括号`[`
- 遇到`)`，必须匹配**最早**的左括号`(`

最近入栈的最先出栈——这正是LIFO的语义。

### 2. 表达式求值

计算器应用需要处理运算符优先级。逆波兰表达式（后缀表达式）用栈可以轻松求值：

```javascript
// 逆波兰表达式求值
// 输入: ["2","1","+","3","*"] 表示 (2+1)*3 = 9
function evalRPN(tokens) {
    const stack = [];
    const operators = {
        '+': (a, b) => a + b,
        '-': (a, b) => a - b,
        '*': (a, b) => a * b,
        '/': (a, b) => Math.trunc(a / b)
    };
    
    for (const token of tokens) {
        if (token in operators) {
            const b = stack.pop();
            const a = stack.pop();
            stack.push(operators[token](a, b));
        } else {
            stack.push(Number(token));
        }
    }
    
    return stack[0];
}
```

**执行过程**：
```
输入: ["2","1","+","3","*"]

"2" → stack: [2]
"1" → stack: [2, 1]
"+" → pop 1, 2; push 2+1=3 → stack: [3]
"3" → stack: [3, 3]
"*" → pop 3, 3; push 3*3=9 → stack: [9]

结果: 9
```

### 3. 函数调用栈

每次函数调用都会在调用栈上压入一个栈帧，函数返回时弹出。递归的本质就是利用调用栈。

```javascript
// 递归计算阶乘
function factorial(n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

// 用栈模拟递归
function factorialIterative(n) {
    const stack = [];
    
    // 模拟递归调用
    while (n > 1) {
        stack.push(n);
        n--;
    }
    
    // 模拟返回过程
    let result = 1;
    while (stack.length) {
        result *= stack.pop();
    }
    
    return result;
}
```

### 4. DFS（深度优先搜索）

DFS的"深度优先"意味着先探索最近发现的节点，这正是栈的LIFO特性。

```javascript
// 显式栈实现DFS
function dfs(root) {
    if (!root) return [];
    
    const result = [];
    const stack = [root];
    
    while (stack.length) {
        const node = stack.pop();
        result.push(node.val);
        
        // 先压右子节点，这样左子节点先出栈
        if (node.right) stack.push(node.right);
        if (node.left) stack.push(node.left);
    }
    
    return result;
}
```

**递归DFS隐式使用系统调用栈**：
```javascript
function dfsRecursive(root) {
    if (!root) return [];
    return [root.val, ...dfsRecursive(root.left), ...dfsRecursive(root.right)];
}
```

### 5. 撤销操作（Undo）

编辑器的撤销功能用栈实现：每次编辑入栈，撤销时出栈恢复。

```javascript
class Editor {
    constructor() {
        this.content = '';
        this.history = [];  // 操作历史栈
    }
    
    type(text) {
        this.history.push({
            type: 'insert',
            text,
            position: this.content.length
        });
        this.content += text;
    }
    
    undo() {
        const action = this.history.pop();
        if (!action) return;
        
        if (action.type === 'insert') {
            this.content = this.content.slice(0, action.position);
        }
    }
}
```

## 队列的应用场景

队列的核心特性是**先进先出**，适用于需要"公平调度"或"按顺序处理"的场景。

### 1. BFS（广度优先搜索）

BFS按层级遍历，先访问的节点的邻居先被访问——典型的FIFO。

```javascript
function bfs(root) {
    if (!root) return [];
    
    const result = [];
    const queue = [root];
    
    while (queue.length) {
        const node = queue.shift();  // 出队
        result.push(node.val);
        
        if (node.left) queue.push(node.left);   // 入队
        if (node.right) queue.push(node.right);
    }
    
    return result;
}
```

**BFS vs DFS**：
```
       1
      / \
     2   3
    / \
   4   5

DFS (栈): 1 → 2 → 4 → 5 → 3 (深入再回溯)
BFS (队列): 1 → 2 → 3 → 4 → 5 (逐层访问)
```

### 2. 层序遍历

层序遍历需要区分每一层的节点，队列配合层级计数实现：

```javascript
function levelOrder(root) {
    if (!root) return [];
    
    const result = [];
    const queue = [root];
    
    while (queue.length) {
        const levelSize = queue.length;  // 当前层的节点数
        const level = [];
        
        for (let i = 0; i < levelSize; i++) {
            const node = queue.shift();
            level.push(node.val);
            
            if (node.left) queue.push(node.left);
            if (node.right) queue.push(node.right);
        }
        
        result.push(level);
    }
    
    return result;
}
```

**执行过程**：
```
       1
      / \
     2   3

初始: queue = [1]

第1层: levelSize = 1
  处理1，子节点2,3入队
  queue = [2, 3]
  level = [1]

第2层: levelSize = 2
  处理2，无子节点
  处理3，无子节点
  queue = []
  level = [2, 3]

结果: [[1], [2, 3]]
```

### 3. 任务调度

操作系统的任务调度、打印任务队列都是FIFO：

```javascript
class TaskQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
    }
    
    addTask(task) {
        this.queue.push(task);
        this.process();
    }
    
    async process() {
        if (this.processing) return;
        this.processing = true;
        
        while (this.queue.length) {
            const task = this.queue.shift();  // 先到先处理
            await task();
        }
        
        this.processing = false;
    }
}
```

### 4. 消息队列

系统间的消息传递通常使用队列，保证消息按顺序处理：

```javascript
class MessageQueue {
    constructor() {
        this.messages = [];
        this.handlers = [];
    }
    
    publish(message) {
        this.messages.push(message);
        this.notify();
    }
    
    subscribe(handler) {
        this.handlers.push(handler);
    }
    
    notify() {
        while (this.messages.length) {
            const message = this.messages.shift();
            this.handlers.forEach(handler => handler(message));
        }
    }
}
```

### 5. 滑动窗口

滑动窗口问题经常需要双端队列，同时在两端进行操作：

```javascript
// 滑动窗口最大值
function maxSlidingWindow(nums, k) {
    const result = [];
    const deque = [];  // 存储索引，单调递减
    
    for (let i = 0; i < nums.length; i++) {
        // 移除超出窗口的元素（从队头移除）
        while (deque.length && deque[0] <= i - k) {
            deque.shift();
        }
        
        // 维护单调性（从队尾移除）
        while (deque.length && nums[deque[deque.length - 1]] < nums[i]) {
            deque.pop();
        }
        
        deque.push(i);
        
        // 记录结果
        if (i >= k - 1) {
            result.push(nums[deque[0]]);
        }
    }
    
    return result;
}
```

## 如何选择栈还是队列

| 问题特征 | 推荐数据结构 | 思考方式 |
|---------|-------------|---------|
| 最近的元素最先处理 | 栈 | 后来者优先 |
| 配对问题（括号、标签） | 栈 | 最近的左匹配最近的右 |
| 递归转迭代 | 栈 | 模拟调用栈 |
| 深度优先遍历 | 栈 | 深入探索，回溯处理 |
| 撤销/回退操作 | 栈 | 撤销最近的操作 |
| 按顺序处理 | 队列 | 先到先得 |
| 层级遍历 | 队列 | 逐层处理 |
| 广度优先搜索 | 队列 | 由近及远 |
| 任务调度 | 队列 | 公平调度 |
| 两端都要操作 | 双端队列 | 灵活的队列 |

**快速判断口诀**：
- 看到"最近"、"嵌套"、"匹配"→ 考虑**栈**
- 看到"层级"、"最短"、"公平"→ 考虑**队列**

## 实战对比：迷宫最短路径

同样是找路径，DFS（栈）和BFS（队列）有不同效果：

```javascript
// BFS找最短路径（推荐）
function shortestPath(maze, start, end) {
    const queue = [[start, 0]];  // [位置, 距离]
    const visited = new Set([start.toString()]);
    
    while (queue.length) {
        const [[x, y], dist] = queue.shift();
        
        if (x === end[0] && y === end[1]) {
            return dist;  // 第一次到达就是最短
        }
        
        for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
            const nx = x + dx, ny = y + dy;
            const key = `${nx},${ny}`;
            
            if (isValid(maze, nx, ny) && !visited.has(key)) {
                visited.add(key);
                queue.push([[nx, ny], dist + 1]);
            }
        }
    }
    
    return -1;  // 无法到达
}
```

**为什么BFS能找最短路径？**

因为BFS按距离递增的顺序访问节点。第一次到达终点时，一定是经过最少步数。

DFS可能先找到一条长路径，需要遍历所有路径才能确定最短。

## 小结

**栈的应用**（LIFO特性）：
1. 括号匹配——最近的左配最近的右
2. 表达式求值——后缀表达式
3. 函数调用——递归的本质
4. DFS——深入探索
5. 撤销操作——最近的操作先撤销

**队列的应用**（FIFO特性）：
1. BFS——按层级遍历
2. 层序遍历——逐层处理
3. 任务调度——先到先处理
4. 消息队列——按序传递
5. 滑动窗口——双端队列

**选择原则**：
- 最近相关性 → 栈
- 顺序/层级相关性 → 队列

理解了应用场景，在做题时就能快速判断该用哪种数据结构。下一章我们开始实战，用两个栈实现一个队列。
