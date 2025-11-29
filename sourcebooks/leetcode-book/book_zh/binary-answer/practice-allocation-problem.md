# 实战：分配问题

分配问题是二分答案的另一类经典应用。

## 问题描述

有`n`个工作和`m`个工人。每个工作有一定的难度`jobs[i]`，每个工人每天最多工作`k`小时。

你需要分配所有工作，使得**完成所有工作所需的最大工作时间最小化**。

返回完成所有工作的最少天数。

## 问题变形

上面是一个泛化的描述。让我们看一个具体版本：

给定一个整数数组`jobs`，其中`jobs[i]`是完成第`i`项工作所需的时间，再给定整数`k`表示工人数量。

将这些工作分配给`k`个工人，使得**最大工作时间最小化**。

每个工人可以完成多项工作，但每项工作只能分配给一个工人。

## 思路分析

### 二分答案

二分"最大工作时间"，判断能否在该限制下完成所有工作。

### 答案空间

- **下界**：max(jobs)，至少要能完成最长的工作
- **上界**：sum(jobs)，一个工人干所有活

### 判断函数

给定时间上限`limit`，能否用`k`个工人完成所有工作？

这是一个NP问题，但对于小规模可以用回溯解决。

```javascript
function canFinish(jobs, k, limit) {
    const workers = new Array(k).fill(0);
    jobs.sort((a, b) => b - a); // 大的先分配，剪枝
    
    return backtrack(jobs, workers, 0, limit);
}

function backtrack(jobs, workers, index, limit) {
    if (index === jobs.length) {
        return true;
    }
    
    const job = jobs[index];
    const tried = new Set();
    
    for (let i = 0; i < workers.length; i++) {
        if (workers[i] + job > limit) continue;
        if (tried.has(workers[i])) continue;
        
        tried.add(workers[i]);
        workers[i] += job;
        
        if (backtrack(jobs, workers, index + 1, limit)) {
            return true;
        }
        
        workers[i] -= job;
    }
    
    return false;
}
```

## 完整实现

```javascript
function minimumTimeRequired(jobs, k) {
    jobs.sort((a, b) => b - a);
    
    let left = Math.max(...jobs);
    let right = jobs.reduce((a, b) => a + b, 0);
    
    while (left < right) {
        const mid = left + Math.floor((right - left) / 2);
        
        if (canFinish(jobs, k, mid)) {
            right = mid;
        } else {
            left = mid + 1;
        }
    }
    
    return left;
}

function canFinish(jobs, k, limit) {
    const workers = new Array(k).fill(0);
    return backtrack(jobs, workers, 0, limit);
}

function backtrack(jobs, workers, index, limit) {
    if (index === jobs.length) {
        return true;
    }
    
    const job = jobs[index];
    const tried = new Set();
    
    for (let i = 0; i < workers.length; i++) {
        if (workers[i] + job > limit) continue;
        if (tried.has(workers[i])) continue;
        
        tried.add(workers[i]);
        workers[i] += job;
        
        if (backtrack(jobs, workers, index + 1, limit)) {
            return true;
        }
        
        workers[i] -= job;
    }
    
    return false;
}
```

## 优化剪枝

### 1. 降序排列

大的工作先分配，可以更早发现不可行的情况。

### 2. 相同负载剪枝

如果两个工人当前负载相同，只需尝试给其中一个。

### 3. 空闲工人剪枝

如果当前工人是空闲的，给第一个空闲的就够了。

```javascript
function backtrack(jobs, workers, index, limit) {
    if (index === jobs.length) {
        return true;
    }
    
    const job = jobs[index];
    
    for (let i = 0; i < workers.length; i++) {
        if (workers[i] + job > limit) continue;
        
        // 相同负载剪枝
        if (i > 0 && workers[i] === workers[i - 1]) continue;
        
        workers[i] += job;
        
        if (backtrack(jobs, workers, index + 1, limit)) {
            return true;
        }
        
        workers[i] -= job;
        
        // 空闲工人剪枝
        if (workers[i] === 0) break;
    }
    
    return false;
}
```

## 复杂度分析

**时间复杂度**：O(log(sum) * k^n)，最坏情况
- 二分O(log(sum))次
- 每次判断是NP的，但剪枝后实际很快

**空间复杂度**：O(k + n)，工人数组和递归栈

## 与简单分配的区别

简单的分配（如送包裹）可以贪心，因为有顺序约束。

这道题没有顺序约束，工作可以任意分配，所以需要回溯搜索。

## 小结

分配问题展示了二分答案与回溯的结合：
1. 二分缩小答案范围
2. 判断函数用回溯解决组合优化
3. 剪枝是关键，否则会超时
