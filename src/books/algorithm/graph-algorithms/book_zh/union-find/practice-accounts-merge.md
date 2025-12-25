# 账户合并

LeetCode 721. Accounts Merge

## 题目描述

给定一个列表 `accounts`，每个元素 `accounts[i]` 是一个字符串列表，其中第一个元素 `accounts[i][0]` 是名称（name），其余元素是该账户的邮箱。

现在，我们想合并这些账户。如果两个账户有相同的邮箱，则这两个账户属于同一个人。注意，即使两个账户具有相同的名称，它们也可能属于不同的人。

合并账户后，按以下格式返回账户：每个账户的第一个元素是名称，其余元素是**按字典序排列**的邮箱。

## 示例

```
输入：accounts = [
  ["John", "johnsmith@mail.com", "john00@mail.com"],
  ["John", "johnnybravo@mail.com"],
  ["John", "johnsmith@mail.com", "john_newyork@mail.com"],
  ["Mary", "mary@mail.com"]
]

输出：[
  ["John", "john00@mail.com", "john_newyork@mail.com", "johnsmith@mail.com"],
  ["John", "johnnybravo@mail.com"],
  ["Mary", "mary@mail.com"]
]

解释：
第一个和第三个 John 有共同邮箱 johnsmith@mail.com，合并
第二个 John 没有共同邮箱，独立
Mary 独立
```

## 思路分析

**核心问题**：邮箱的**传递性合并**。

**并查集策略**：
1. 为每个邮箱分配一个 ID
2. 同一账户内的邮箱属于同一人，合并
3. 最后按根节点分组，输出结果

## 代码实现

```typescript
function accountsMerge(accounts: string[][]): string[][] {
  // 邮箱 → ID 映射
  const emailToId = new Map<string, number>();
  // 邮箱 → 账户名
  const emailToName = new Map<string, string>();
  
  let id = 0;
  for (const account of accounts) {
    const name = account[0];
    for (let i = 1; i < account.length; i++) {
      const email = account[i];
      if (!emailToId.has(email)) {
        emailToId.set(email, id++);
        emailToName.set(email, name);
      }
    }
  }
  
  // 并查集
  const parent = Array.from({ length: id }, (_, i) => i);
  
  function find(x: number): number {
    if (parent[x] !== x) {
      parent[x] = find(parent[x]);
    }
    return parent[x];
  }
  
  function union(x: number, y: number): void {
    parent[find(x)] = find(y);
  }
  
  // 合并同一账户内的邮箱
  for (const account of accounts) {
    const firstEmailId = emailToId.get(account[1])!;
    for (let i = 2; i < account.length; i++) {
      union(firstEmailId, emailToId.get(account[i])!);
    }
  }
  
  // 按根节点分组
  const rootToEmails = new Map<number, string[]>();
  for (const [email, emailId] of emailToId) {
    const root = find(emailId);
    if (!rootToEmails.has(root)) {
      rootToEmails.set(root, []);
    }
    rootToEmails.get(root)!.push(email);
  }
  
  // 构建结果
  const result: string[][] = [];
  for (const [root, emails] of rootToEmails) {
    emails.sort();  // 字典序排序
    const name = emailToName.get(emails[0])!;
    result.push([name, ...emails]);
  }
  
  return result;
}
```

## 执行过程

```
accounts = [
  ["John", "a@", "b@"],
  ["John", "c@"],
  ["John", "a@", "d@"]
]

步骤 1：分配 ID
emailToId = { "a@": 0, "b@": 1, "c@": 2, "d@": 3 }

步骤 2：合并
账户 0：union(0, 1)  → a@ 和 b@ 连通
账户 1：只有 c@，不需要合并
账户 2：union(0, 3)  → a@ 和 d@ 连通

parent 状态：
初始：[0, 1, 2, 3]
union(0,1): [1, 1, 2, 3]
union(0,3): [1, 1, 2, 1]  (find(0)=1, parent[1]=3? 不对，应该是 [1,3,2,3])

实际执行：
union(0,1): parent[find(0)] = find(1) → parent[0] = 1
union(0,3): parent[find(0)] = find(3) → parent[1] = 3

最终：find(0)=3, find(1)=3, find(2)=2, find(3)=3

步骤 3：分组
root 3: ["a@", "b@", "d@"]
root 2: ["c@"]

步骤 4：输出
[["John", "a@", "b@", "d@"], ["John", "c@"]]
```

## 简化版本（使用邮箱字符串作为并查集 key）

```typescript
function accountsMerge(accounts: string[][]): string[][] {
  const parent = new Map<string, string>();
  const emailToName = new Map<string, string>();
  
  function find(x: string): string {
    if (!parent.has(x)) {
      parent.set(x, x);
    }
    if (parent.get(x) !== x) {
      parent.set(x, find(parent.get(x)!));
    }
    return parent.get(x)!;
  }
  
  function union(x: string, y: string): void {
    parent.set(find(x), find(y));
  }
  
  // 记录邮箱对应的用户名，并合并同账户邮箱
  for (const account of accounts) {
    const name = account[0];
    for (let i = 1; i < account.length; i++) {
      emailToName.set(account[i], name);
      if (i > 1) {
        union(account[1], account[i]);
      }
    }
  }
  
  // 按根分组
  const groups = new Map<string, string[]>();
  for (const email of emailToName.keys()) {
    const root = find(email);
    if (!groups.has(root)) {
      groups.set(root, []);
    }
    groups.get(root)!.push(email);
  }
  
  // 构建结果
  return Array.from(groups.values()).map(emails => {
    emails.sort();
    return [emailToName.get(emails[0])!, ...emails];
  });
}
```

## 复杂度分析

设 n 为账户数，k 为每个账户平均邮箱数，m 为总邮箱数

- **时间复杂度**：O(m · α(m) + m log m)
  - 并查集操作：O(m · α(m))
  - 排序：O(m log m)
- **空间复杂度**：O(m)

## 相关题目

| 题号 | 题目 | 难度 |
|------|------|------|
| 721 | 账户合并 | 中等 |
| 547 | 省份数量 | 中等 |
| 684 | 冗余连接 | 中等 |
| 990 | 等式方程的可满足性 | 中等 |
