# 实战：电话号码的字母组合

经典的组合搜索问题。

## 问题描述

给定一个仅包含数字2-9的字符串，返回所有它能表示的字母组合。

数字到字母的映射如手机键盘：
- 2: abc
- 3: def
- 4: ghi
- 5: jkl
- 6: mno
- 7: pqrs
- 8: tuv
- 9: wxyz

示例：
- 输入：`digits = "23"`
- 输出：`["ad","ae","af","bd","be","bf","cd","ce","cf"]`

## 思路

每个数字对应几个字母，需要遍历所有组合。

典型的回溯问题。

## 解法

```javascript
function letterCombinations(digits) {
    if (!digits.length) return [];
    
    const mapping = {
        '2': 'abc', '3': 'def', '4': 'ghi',
        '5': 'jkl', '6': 'mno', '7': 'pqrs',
        '8': 'tuv', '9': 'wxyz'
    };
    
    const result = [];
    
    function backtrack(index, path) {
        // 组合完成
        if (index === digits.length) {
            result.push(path.join(''));
            return;
        }
        
        // 当前数字对应的字母
        const letters = mapping[digits[index]];
        
        // 尝试每个字母
        for (const letter of letters) {
            path.push(letter);
            backtrack(index + 1, path);
            path.pop();
        }
    }
    
    backtrack(0, []);
    return result;
}
```

## 决策树

对于`"23"`：

```
        ""
      / | \
     a  b  c     (对应2)
    /|\ |\ |\
   ad ae af ...  (对应3)
```

每层对应一个数字，分支数是该数字对应的字母数。

## 迭代解法

也可以用迭代方式：

```javascript
function letterCombinations(digits) {
    if (!digits.length) return [];
    
    const mapping = {
        '2': 'abc', '3': 'def', '4': 'ghi',
        '5': 'jkl', '6': 'mno', '7': 'pqrs',
        '8': 'tuv', '9': 'wxyz'
    };
    
    let result = [''];
    
    for (const digit of digits) {
        const letters = mapping[digit];
        const newResult = [];
        
        for (const combo of result) {
            for (const letter of letters) {
                newResult.push(combo + letter);
            }
        }
        
        result = newResult;
    }
    
    return result;
}
```

这种方式更直观，逐步扩展每个组合。

## 用字符串代替数组

由于组合长度固定，可以用字符串简化：

```javascript
function letterCombinations(digits) {
    if (!digits.length) return [];
    
    const mapping = ['', '', 'abc', 'def', 'ghi', 'jkl', 'mno', 'pqrs', 'tuv', 'wxyz'];
    const result = [];
    
    function backtrack(index, path) {
        if (index === digits.length) {
            result.push(path);
            return;
        }
        
        const letters = mapping[digits[index]];
        for (const letter of letters) {
            backtrack(index + 1, path + letter);
        }
    }
    
    backtrack(0, '');
    return result;
}
```

字符串拼接创建新字符串，不需要显式撤销。

## 复杂度分析

- **时间复杂度**：O(4^n × n)
  - 最坏每个数字4个字母
  - 4^n个组合
  - 每个组合长度n
  
- **空间复杂度**：O(n)
  - 递归深度n

## 与全排列的对比

| 特性 | 全排列 | 电话号码 |
|-----|-------|---------|
| 选择来源 | 同一个数组 | 不同数组 |
| 需要去重 | 是 | 否 |
| 每层选择 | 未使用的元素 | 当前数字对应的字母 |

## 小结

电话号码的字母组合展示了：
- 多个集合的组合搜索
- 每层选择来自不同集合
- 字符串可以简化回溯代码

这是回溯应用的经典场景之一。
