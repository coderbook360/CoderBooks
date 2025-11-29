# 实战：分割回文串

将字符串分割成若干回文子串。

## 问题描述

给定一个字符串`s`，将`s`分割成一些子串，使每个子串都是**回文串**。返回所有可能的分割方案。

示例：
- 输入：`s = "aab"`
- 输出：`[["a","a","b"],["aa","b"]]`

## 思路

分割问题也可以用回溯：
- 从位置0开始，尝试不同长度的子串
- 如果是回文，递归处理剩余部分
- 如果不是，跳过

## 解法

```javascript
function partition(s) {
    const result = [];
    
    function backtrack(start, path) {
        // 分割完成
        if (start === s.length) {
            result.push([...path]);
            return;
        }
        
        // 尝试不同的分割点
        for (let end = start; end < s.length; end++) {
            // 检查s[start...end]是否回文
            if (isPalindrome(s, start, end)) {
                path.push(s.slice(start, end + 1));
                backtrack(end + 1, path);
                path.pop();
            }
        }
    }
    
    function isPalindrome(s, left, right) {
        while (left < right) {
            if (s[left] !== s[right]) return false;
            left++;
            right--;
        }
        return true;
    }
    
    backtrack(0, []);
    return result;
}
```

## 决策树的理解

对于`"aab"`：

```
start=0: 
  选"a"(回文) → start=1
    选"a"(回文) → start=2
      选"b"(回文) → start=3 ✓ ["a","a","b"]
    选"ab"(非回文) → 跳过
  选"aa"(回文) → start=2
    选"b"(回文) → start=3 ✓ ["aa","b"]
  选"aab"(非回文) → 跳过
```

## 优化：预处理回文

每次判断回文需要O(n)，可以预处理：

```javascript
function partition(s) {
    const n = s.length;
    const result = [];
    
    // dp[i][j]表示s[i...j]是否回文
    const dp = Array.from({length: n}, () => Array(n).fill(false));
    
    // 预处理
    for (let i = n - 1; i >= 0; i--) {
        for (let j = i; j < n; j++) {
            if (s[i] === s[j] && (j - i <= 2 || dp[i + 1][j - 1])) {
                dp[i][j] = true;
            }
        }
    }
    
    function backtrack(start, path) {
        if (start === n) {
            result.push([...path]);
            return;
        }
        
        for (let end = start; end < n; end++) {
            if (dp[start][end]) {
                path.push(s.slice(start, end + 1));
                backtrack(end + 1, path);
                path.pop();
            }
        }
    }
    
    backtrack(0, []);
    return result;
}
```

预处理后，每次判断回文只需O(1)。

## 回文判断的优化

DP填表的顺序是关键：
- `dp[i][j]`依赖`dp[i+1][j-1]`
- 所以i要从大到小遍历

## 复杂度分析

- **时间复杂度**：O(n × 2^n)
  - 预处理O(n²)
  - 最坏情况2^(n-1)种分割
  - 每种分割复制需要O(n)
  
- **空间复杂度**：O(n²)
  - DP数组

## 分割问题 vs 组合问题

分割问题可以看作在n-1个位置选择是否切割：

```
a | a | b
 ^   ^
这两个位置可以选择切或不切
```

n-1个位置，每个位置2种选择，共2^(n-1)种可能。

## 小结

分割回文串展示了：
- 分割问题用回溯解决
- 预处理优化重复计算
- 回文判断的DP技巧

这种"分割成满足条件的子串"的问题，都可以用类似方法。
