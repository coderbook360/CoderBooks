# 实战：验证回文串 (Valid Palindrome)

这道题是回文问题的"完全体"。相比于简单的反转字符串，它增加了**数据清洗**的步骤，更贴近实际工程中的文本处理场景。

---

## 题目描述

**LeetCode 125. Valid Palindrome**

如果在将所有大写字符转换为小写字符、并移除所有非字母数字字符之后，短语正着读和反着读都一样，则可以认为该短语是一个回文串。

**示例 1**：
```
输入：s = "A man, a plan, a canal: Panama"
输出：true
解释：清洗后为 "amanaplanacanalpanama"
```

**示例 2**：
```
输入：s = "race a car"
输出：false
解释：清洗后为 "raceacar"
```

---

## 核心挑战：脏数据处理

这道题有两个子任务：
1.  **清洗数据**：去除标点、空格，统一大小写。
2.  **算法判断**：验证回文。

我们面临两个选择：是**先清洗再判断**，还是**边清洗边判断**？这对应了两种不同的时空复杂度权衡。

---

## 解法一：筛选 + 反转 (工程思维)

在实际业务开发中，如果字符串不长，我们通常优先选择代码可读性最高的写法。

```javascript
function isPalindrome(s) {
    // 1. 正则清洗：只保留字母数字，并转小写
    const cleaned = s.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // 2. 构造反转字符串
    const reversed = cleaned.split('').reverse().join('');
    
    // 3. 比较
    return cleaned === reversed;
}
```

**深度分析**：
-   **优点**：代码极简，逻辑清晰，不易出错。
-   **缺点**：
    -   **空间复杂度 O(N)**：`cleaned`、`split` 数组、`reversed` 都需要分配内存。如果输入字符串是 100MB，这行代码可能会瞬间占用 300MB+ 内存。
    -   **多次遍历**：正则一次，split 一次，reverse 一次，join 一次，比较一次。

---

## 解法二：双指针 (算法思维)

为了追求极致的性能（O(1) 空间），我们需要使用**双指针**，在遍历的过程中跳过无效字符。

```javascript
function isPalindrome(s) {
    let left = 0;
    let right = s.length - 1;
    
    while (left < right) {
        // 1. 左指针跳过非字母数字
        while (left < right && !isValid(s[left])) {
            left++;
        }
        // 2. 右指针跳过非字母数字
        while (left < right && !isValid(s[right])) {
            right--;
        }
        
        // 3. 比较字符（忽略大小写）
        if (s[left].toLowerCase() !== s[right].toLowerCase()) {
            return false;
        }
        
        // 4. 收缩窗口
        left++;
        right--;
    }
    
    return true;
}

// 辅助函数：判断字符是否有效
// 相比正则，使用 charCodeAt 性能更好且无需编译正则状态机
function isValid(char) {
    const code = char.charCodeAt(0);
    return (code >= 48 && code <= 57) || // 0-9
           (code >= 65 && code <= 90) || // A-Z
           (code >= 97 && code <= 122);  // a-z
}
```

**细节深挖**：
1.  **`while` 循环中的 `left < right`**：必须在内部循环中也检查边界，否则如果字符串全是符号（如 `",,,"`），指针会越界。
2.  **`toLowerCase()` 的开销**：虽然我们省去了大字符串的内存，但 `s[left].toLowerCase()` 依然会创建临时的单字符字符串。在极度严苛的嵌入式 JS 环境中，可以通过 ASCII 码计算来比较大小写（`'A'` 和 `'a'` 相差 32），从而实现真正的零分配。但在 LeetCode 环境下，当前写法已足够优秀。

---

## 复杂度对比

| 维度 | 解法一 (正则+反转) | 解法二 (双指针) |
| :--- | :--- | :--- |
| **时间复杂度** | O(N) (常数项较大) | O(N) (只需遍历一次) |
| **空间复杂度** | O(N) | O(1) |
| **代码量** | 少 | 多 |
| **适用场景** | 快速开发、短文本 | 高性能要求、长文本 |

---

## 常见坑点

1.  **空字符串处理**：题目定义空串是回文。双指针代码中 `left` 初始为 0，`right` 为 -1，循环不执行，直接返回 `true`，逻辑自洽。
2.  **全符号字符串**：如 `":::"`。内部 `while` 会一直跑，直到 `left === right`，外部循环终止，返回 `true`，逻辑正确。

## 本章小结

-   **双指针的灵活性**：双指针不仅能用于"交换"，还能配合"跳过"逻辑处理脏数据。
-   **ASCII 码的力量**：在处理字符范围判断时，`charCodeAt` 往往比正则快得多。
-   **工程 vs 算法**：面试时，先写出双指针解法展示能力；工作中，如果性能不是瓶颈，解法一也许更易维护。
