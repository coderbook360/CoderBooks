# 实战：单词搜索

在二维网格中搜索单词。

## 问题描述

给定一个m×n二维字符网格`board`和一个字符串单词`word`，如果`word`存在于网格中返回`true`。

单词必须按照字母顺序，通过**相邻单元格**（上下左右）内的字母构成。同一个单元格内的字母不能重复使用。

示例：
```
board = [
  ['A','B','C','E'],
  ['S','F','C','S'],
  ['A','D','E','E']
]
word = "ABCCED"  → true
word = "SEE"     → true
word = "ABCB"    → false
```

## 思路

从每个格子开始，DFS搜索是否能匹配整个单词。

## 解法

```javascript
function exist(board, word) {
    const m = board.length;
    const n = board[0].length;
    
    function dfs(i, j, k) {
        // 越界或字符不匹配
        if (i < 0 || i >= m || j < 0 || j >= n) return false;
        if (board[i][j] !== word[k]) return false;
        
        // 匹配完成
        if (k === word.length - 1) return true;
        
        // 标记已访问
        const temp = board[i][j];
        board[i][j] = '#';
        
        // 搜索四个方向
        const found = dfs(i + 1, j, k + 1) ||
                      dfs(i - 1, j, k + 1) ||
                      dfs(i, j + 1, k + 1) ||
                      dfs(i, j - 1, k + 1);
        
        // 恢复
        board[i][j] = temp;
        
        return found;
    }
    
    // 从每个格子开始尝试
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
            if (dfs(i, j, 0)) return true;
        }
    }
    
    return false;
}
```

## 标记已访问的技巧

用一个特殊字符（如`#`）临时替换已访问的格子：

```javascript
const temp = board[i][j];
board[i][j] = '#';   // 标记
// ... 递归 ...
board[i][j] = temp;  // 恢复
```

这样不需要额外的visited数组。

## 优化：提前剪枝

如果字符频率不够，直接返回false：

```javascript
function exist(board, word) {
    const m = board.length;
    const n = board[0].length;
    
    // 统计字符频率
    const boardCount = {};
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
            boardCount[board[i][j]] = (boardCount[board[i][j]] || 0) + 1;
        }
    }
    
    const wordCount = {};
    for (const ch of word) {
        wordCount[ch] = (wordCount[ch] || 0) + 1;
    }
    
    // 检查字符是否足够
    for (const ch in wordCount) {
        if ((boardCount[ch] || 0) < wordCount[ch]) {
            return false;
        }
    }
    
    // 优化：从频率低的字符开始搜索
    if ((boardCount[word[0]] || 0) > (boardCount[word[word.length - 1]] || 0)) {
        word = word.split('').reverse().join('');
    }
    
    // ... DFS搜索 ...
}
```

## 复杂度分析

- **时间复杂度**：O(m × n × 3^L)
  - m×n个起点
  - 每步最多3个方向（排除来的方向）
  - L是单词长度
  
- **空间复杂度**：O(L)，递归深度

## 常见错误

1. **忘记恢复状态**：递归返回后必须恢复board
2. **边界检查顺序**：先检查边界，再访问board[i][j]
3. **短路求值**：用`||`连接四个方向，找到就返回

## 小结

单词搜索是回溯在二维网格上的应用：
- 四个方向DFS
- 原地标记避免重复访问
- 字符频率预检查优化

这种网格搜索模式在很多问题中都会用到。
