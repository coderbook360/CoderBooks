# 二叉树遍历方法

遍历是二叉树最基础也是最重要的操作。所谓遍历，就是按照某种顺序访问树中的每一个节点，且每个节点只访问一次。掌握了遍历，你就掌握了解决大多数二叉树问题的钥匙。

## 遍历的两大思想

二叉树的遍历方法看似很多，但本质上只有两种思想：

**深度优先搜索（DFS）**：沿着一条路径走到底，再回溯探索其他路径。前序、中序、后序遍历都属于 DFS。

**广度优先搜索（BFS）**：一层一层地访问节点。层序遍历属于 BFS。

## 深度优先遍历：前序、中序、后序

DFS 的三种遍历方式的区别在于**访问根节点的时机**：

- **前序遍历**：根 → 左 → 右
- **中序遍历**：左 → 根 → 右
- **后序遍历**：左 → 右 → 根

"前"、"中"、"后"指的是根节点在遍历序列中的位置。

用一个例子来理解：

```
        1
       / \
      2   3
     / \
    4   5
```

- **前序遍历**：[1, 2, 4, 5, 3]（先访问根 1，再前序左子树，最后前序右子树）
- **中序遍历**：[4, 2, 5, 1, 3]（先中序左子树，再访问根 1，最后中序右子树）
- **后序遍历**：[4, 5, 2, 3, 1]（先后序左子树，再后序右子树，最后访问根 1）

### 递归实现

递归实现是最直观的。三种遍历的代码结构几乎相同，只是访问根节点的位置不同：

```javascript
// 前序遍历：根 -> 左 -> 右
function preorderTraversal(root) {
    const result = [];
    
    function traverse(node) {
        if (!node) return;
        result.push(node.val);     // 访问根
        traverse(node.left);        // 遍历左子树
        traverse(node.right);       // 遍历右子树
    }
    
    traverse(root);
    return result;
}

// 中序遍历：左 -> 根 -> 右
function inorderTraversal(root) {
    const result = [];
    
    function traverse(node) {
        if (!node) return;
        traverse(node.left);        // 遍历左子树
        result.push(node.val);     // 访问根
        traverse(node.right);       // 遍历右子树
    }
    
    traverse(root);
    return result;
}

// 后序遍历：左 -> 右 -> 根
function postorderTraversal(root) {
    const result = [];
    
    function traverse(node) {
        if (!node) return;
        traverse(node.left);        // 遍历左子树
        traverse(node.right);       // 遍历右子树
        result.push(node.val);     // 访问根
    }
    
    traverse(root);
    return result;
}
```

递归代码简洁优雅，但有个潜在问题：当树非常深时，可能会导致栈溢出。面试中，考官可能会要求你写出迭代版本。

### 迭代实现

迭代实现需要显式使用栈来模拟递归调用栈。

**前序遍历的迭代实现**最为直观：

```javascript
function preorderTraversal(root) {
    if (!root) return [];
    
    const result = [];
    const stack = [root];
    
    while (stack.length) {
        const node = stack.pop();
        result.push(node.val);
        
        // 注意：先压右子节点，再压左子节点
        // 这样弹出时就是先左后右
        if (node.right) stack.push(node.right);
        if (node.left) stack.push(node.left);
    }
    
    return result;
}
```

**中序遍历的迭代实现**稍微复杂一些。核心思想是：先把所有左子节点压入栈，然后弹出、访问、转向右子树：

```javascript
function inorderTraversal(root) {
    const result = [];
    const stack = [];
    let curr = root;
    
    while (curr || stack.length) {
        // 先把所有左子节点压入栈
        while (curr) {
            stack.push(curr);
            curr = curr.left;
        }
        
        // 弹出栈顶节点，访问它
        curr = stack.pop();
        result.push(curr.val);
        
        // 转向右子树
        curr = curr.right;
    }
    
    return result;
}
```

**后序遍历的迭代实现**有个巧妙的技巧：后序遍历是"左-右-根"，我们可以先按"根-右-左"的顺序遍历（类似前序，但先压左再压右），然后把结果反转：

```javascript
function postorderTraversal(root) {
    if (!root) return [];
    
    const result = [];
    const stack = [root];
    
    while (stack.length) {
        const node = stack.pop();
        result.push(node.val);
        
        // 先压左，再压右（与前序相反）
        if (node.left) stack.push(node.left);
        if (node.right) stack.push(node.right);
    }
    
    // 反转得到后序遍历
    return result.reverse();
}
```

## 广度优先遍历：层序遍历

层序遍历按照从上到下、从左到右的顺序访问节点。这需要使用队列来实现：

```javascript
function levelOrder(root) {
    if (!root) return [];
    
    const result = [];
    const queue = [root];
    
    while (queue.length) {
        const levelSize = queue.length;
        const level = [];
        
        // 遍历当前层的所有节点
        for (let i = 0; i < levelSize; i++) {
            const node = queue.shift();
            level.push(node.val);
            
            // 把下一层的节点加入队列
            if (node.left) queue.push(node.left);
            if (node.right) queue.push(node.right);
        }
        
        result.push(level);
    }
    
    return result;
}
```

**关键点**：我们用 `levelSize` 记录每层的节点数，这样可以区分不同层的节点。

对于上面的例子，层序遍历的结果是：`[[1], [2, 3], [4, 5]]`。

## 遍历的应用场景

不同的遍历方式适用于不同的场景：

**前序遍历**：
- 复制一棵二叉树
- 序列化二叉树
- 打印目录结构

**中序遍历**：
- 二叉搜索树的有序输出
- 表达式树的中缀表示

**后序遍历**：
- 计算目录大小（先计算子目录）
- 释放二叉树内存
- 表达式树的后缀表示

**层序遍历**：
- 计算树的宽度
- 找到最左/最右的节点
- 判断完全二叉树

## 复杂度分析

无论哪种遍历方式：

**时间复杂度**：O(n)，每个节点访问一次。

**空间复杂度**：
- 递归实现：O(h)，h 是树的高度，最坏 O(n)
- 迭代实现（DFS）：O(h)，同样取决于树的高度
- 层序遍历（BFS）：O(w)，w 是树的最大宽度，最坏 O(n)

## 小结

本章我们学习了二叉树的四种遍历方式：
- **前序遍历**：根-左-右
- **中序遍历**：左-根-右
- **后序遍历**：左-右-根
- **层序遍历**：逐层访问

每种遍历都可以用递归和迭代两种方式实现。递归代码简洁，迭代代码能避免栈溢出。

遍历是二叉树问题的基础。很多问题本质上就是在遍历的过程中收集信息或做出判断。掌握了遍历，你就为后面的实战练习打下了坚实的基础。
