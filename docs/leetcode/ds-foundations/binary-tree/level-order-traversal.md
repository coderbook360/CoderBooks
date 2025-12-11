# 二叉树遍历：层序遍历

层序遍历按层从上到下、从左到右访问节点，用队列实现。

---

## 层序遍历

```
       1
      / \
     2   3
    / \   \
   4   5   6

层序：[1], [2, 3], [4, 5, 6]
```

---

## BFS 实现

```javascript
function levelOrder(root) {
  if (!root) return [];
  
  const result = [];
  const queue = [root];
  
  while (queue.length > 0) {
    const levelSize = queue.length;
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

---

## 执行过程

```
      1
     / \
    2   3

初始：queue = [1]

第1层：
  取出 1，level = [1]
  加入 2, 3
  queue = [2, 3]

第2层：
  取出 2，level = [2]
  取出 3，level = [2, 3]
  queue = []

结果：[[1], [2, 3]]
```

---

## 层序遍历的变体

1. **自底向上**：结果数组反转
2. **锯齿形**：奇数层反转
3. **右视图**：每层最后一个节点
4. **左视图**：每层第一个节点

---

## 层序 vs DFS

| 特点 | 层序 (BFS) | 深度优先 (DFS) |
|------|------------|----------------|
| 实现 | 队列 | 递归/栈 |
| 空间 | O(宽度) | O(高度) |
| 适用 | 按层处理 | 路径问题 |
