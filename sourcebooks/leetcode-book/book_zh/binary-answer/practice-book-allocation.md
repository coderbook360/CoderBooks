# 实战：书籍分配

这道题展示了二分答案在资源分配中的应用。

## 问题描述

有`n`本书，每本书有若干页`pages[i]`。现在要把这些书分配给`m`个学生。

规则：
- 每本书只能分配给一个学生
- 每个学生至少分配一本书
- 书必须按顺序分配（不能跳跃）

目标是**最小化**所有学生中**最大阅读量**。

## 思路分析

### 问题特征

这道题和"分割数组的最大值"几乎一模一样：
- 把数组分成若干段
- 每段之和有上限
- 最小化最大值

### 二分答案

二分"最大阅读量"，判断能否在该限制下分配给m个学生。

### 答案空间

- **下界**：max(pages)，至少能读最厚的那本
- **上界**：sum(pages)，一人读完

### 判断函数

给定上限`maxPages`，贪心分配：每个学生尽可能多读，直到超过上限就换人。

```javascript
function canAllocate(pages, m, maxPages) {
    let students = 1;
    let currentPages = 0;
    
    for (const page of pages) {
        if (currentPages + page > maxPages) {
            students++;
            currentPages = page;
        } else {
            currentPages += page;
        }
    }
    
    return students <= m;
}
```

## 完整实现

```javascript
function allocateBooks(pages, m) {
    const n = pages.length;
    
    // 边界：书比人少，无法分配
    if (n < m) {
        return -1;
    }
    
    let left = Math.max(...pages);
    let right = pages.reduce((a, b) => a + b, 0);
    
    while (left < right) {
        const mid = left + Math.floor((right - left) / 2);
        
        if (canAllocate(pages, m, mid)) {
            right = mid;
        } else {
            left = mid + 1;
        }
    }
    
    return left;
}

function canAllocate(pages, m, maxPages) {
    let students = 1;
    let currentPages = 0;
    
    for (const page of pages) {
        if (currentPages + page > maxPages) {
            students++;
            currentPages = page;
        } else {
            currentPages += page;
        }
    }
    
    return students <= m;
}
```

## 与其他问题的对比

| 问题 | 分配对象 | 分给 | 约束 |
|-----|---------|------|------|
| 送包裹 | 包裹 | 天数 | 运载能力 |
| 分割数组 | 数组元素 | 段数 | 子数组和 |
| 书籍分配 | 书籍 | 学生 | 阅读量 |

它们的结构完全相同，判断函数也几乎一样。

## 边界情况

### 书比人少

如果`n < m`，不可能每人至少一本，返回-1。

### 人数等于书数

每人一本，答案是max(pages)。

## 示例

```
输入: pages = [12, 34, 67, 90], m = 2
输出: 113

解释:
- 学生1: [12, 34, 67] = 113页
- 学生2: [90] = 90页
- 最大阅读量 = 113
```

## 复杂度分析

**时间复杂度**：O(n * log(sum - max))

**空间复杂度**：O(1)

## 小结

书籍分配是"最小化最大值"类问题的典型代表。核心模式：
1. 二分答案（最大值的上界）
2. 贪心判断（每人尽可能多分）
3. 找最小可行的上界

掌握这个模式，可以解决一大类资源分配问题。
