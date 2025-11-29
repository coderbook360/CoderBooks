# 实战：复原IP地址

将数字串分割成有效的IP地址。

## 问题描述

给定一个只包含数字的字符串`s`，复原所有可能的有效IP地址。

有效IP地址正好由四个整数组成（0到255），整数之间用`.`分隔。每个整数不能有前导零。

示例：
- 输入：`s = "25525511135"`
- 输出：`["255.255.11.135","255.255.111.35"]`

## 思路

分割问题：将字符串分成4段，每段是有效的IP数字。

## 解法

```javascript
function restoreIpAddresses(s) {
    const result = [];
    
    function backtrack(start, path) {
        // 已经有4段了
        if (path.length === 4) {
            if (start === s.length) {
                result.push(path.join('.'));
            }
            return;
        }
        
        // 剪枝：剩余字符太多或太少
        const remaining = s.length - start;
        const needSegments = 4 - path.length;
        if (remaining < needSegments || remaining > needSegments * 3) {
            return;
        }
        
        // 尝试1到3位数字
        for (let len = 1; len <= 3 && start + len <= s.length; len++) {
            const segment = s.slice(start, start + len);
            
            // 验证：不能有前导零（除了"0"本身）
            if (len > 1 && segment[0] === '0') break;
            
            // 验证：不能超过255
            if (parseInt(segment) > 255) break;
            
            path.push(segment);
            backtrack(start + len, path);
            path.pop();
        }
    }
    
    backtrack(0, []);
    return result;
}
```

## 关键剪枝

### 1. 长度剪枝

剩余字符必须能分成剩余段数：
- 最少：每段1个字符
- 最多：每段3个字符

```javascript
if (remaining < needSegments || remaining > needSegments * 3) {
    return;
}
```

### 2. 前导零剪枝

`01`、`001`这样的不合法，直接break：

```javascript
if (len > 1 && segment[0] === '0') break;
```

### 3. 范围剪枝

超过255不合法：

```javascript
if (parseInt(segment) > 255) break;
```

## 为什么用break而不是continue

因为后面的情况只会更大或仍然有前导零：
- `01`不合法 → `011`也不合法
- `256`不合法 → `2561`更大

## 搜索过程示例

`s = "25525511135"`：

```
[255] → [255,255] → [255,255,1] → 剩余太多,剪枝
                  → [255,255,11] → 剩余太多,剪枝
                  → [255,255,111] → [255,255,111,35] ✓
      → [255,255,11] → [255,255,11,135] ✓
```

## 另一种写法：四重循环

IP固定4段，也可以用四重循环枚举每段的结束位置：

```javascript
function restoreIpAddresses(s) {
    const result = [];
    const n = s.length;
    
    for (let a = 1; a <= 3 && a < n; a++) {
        for (let b = 1; b <= 3 && a + b < n; b++) {
            for (let c = 1; c <= 3 && a + b + c < n; c++) {
                const d = n - a - b - c;
                if (d > 3) continue;
                
                const s1 = s.slice(0, a);
                const s2 = s.slice(a, a + b);
                const s3 = s.slice(a + b, a + b + c);
                const s4 = s.slice(a + b + c);
                
                if (isValid(s1) && isValid(s2) && isValid(s3) && isValid(s4)) {
                    result.push(`${s1}.${s2}.${s3}.${s4}`);
                }
            }
        }
    }
    
    return result;
    
    function isValid(segment) {
        if (segment.length > 1 && segment[0] === '0') return false;
        return parseInt(segment) <= 255;
    }
}
```

## 复杂度分析

- **时间复杂度**：O(3^4) = O(1)
  - 每段最多3种长度选择
  - 4段固定
  
- **空间复杂度**：O(1)
  - 递归深度固定为4

## 小结

复原IP地址展示了：
- 固定段数的分割问题
- 多种剪枝条件的组合
- 对于小规模问题，暴力枚举也是可行的

这类"固定分段"的问题，回溯和多重循环都可以解决。
