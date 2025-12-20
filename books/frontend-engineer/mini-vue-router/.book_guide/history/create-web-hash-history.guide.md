# 章节写作指导：createWebHashHistory 实现

## 1. 章节信息
- **章节标题**: createWebHashHistory 实现
- **文件名**: history/create-web-hash-history.md
- **所属部分**: 第二部分：History 模式实现
- **预计阅读时间**: 15分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 Hash 模式的工作原理
- 理解 Hash 模式与 History 模式的实现差异

### 技能目标
- 能够实现 createWebHashHistory
- 理解如何复用 History 模式的代码

## 3. 内容要点

### 核心差异
- 使用 `window.location.hash` 而非 `history.pushState`
- 监听 `hashchange` 事件而非 `popstate`
- URL 格式：`/#/path` vs `/path`

### 关键知识点
1. Hash 模式的 URL 结构
2. hashchange 事件的特点
3. 与 createWebHistory 的代码复用
4. Hash 模式的优缺点

## 4. 写作要求

### 开篇方式
"Hash 模式曾是 SPA 路由的主流方案。虽然现在 History 模式更常用，但 Hash 模式在某些场景下仍有优势。"

### 结构组织
```
1. Hash 模式回顾
2. 与 History 模式的差异对比
3. createWebHashHistory 实现
   - URL 解析
   - push/replace 实现
   - hashchange 监听
4. 代码复用策略
5. 何时选择 Hash 模式
6. 本章小结
```

### 代码示例
- createWebHashHistory 完整实现
- 与 createWebHistory 的对比代码

## 5. 技术细节

### 源码参考
- `packages/router/src/history/hash.ts`

### 实现要点
- Hash 模式实际上基于 History 模式实现
- 只是 URL 格式不同，底层仍用 pushState
- 需要处理 `#` 符号的添加和移除

### 常见问题
- 为什么 Vue Router 4 的 Hash 模式也用 pushState？
- Hash 模式如何处理 base 路径？

## 6. 风格指导

### 语气语调
对比分析风格，突出与 History 模式的异同

## 7. 章节检查清单
- [ ] 差异明确：与 History 模式对比清晰
- [ ] 实现完整：功能与 History 模式对齐
- [ ] 场景说明：何时使用 Hash 模式
