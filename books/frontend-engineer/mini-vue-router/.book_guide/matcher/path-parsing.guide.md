# 章节写作指导：路径解析与参数提取

## 1. 章节信息
- **章节标题**: 路径解析与参数提取
- **文件名**: matcher/path-parsing.md
- **所属部分**: 第三部分：路由匹配器
- **预计阅读时间**: 20分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 理解路径字符串的解析过程
- 掌握动态参数的提取机制
- 理解 path-to-regexp 的基本原理

### 技能目标
- 能够实现路径模式的解析器
- 能够从匹配的路径中提取参数

## 3. 内容要点

### 核心任务
将 `/user/:id/posts/:postId` 这样的路径模式解析为可用于匹配的数据结构。

### 关键知识点
1. 路径段（Segment）的概念
2. 静态段 vs 动态段
3. 参数修饰符：`?`（可选）、`+`（一个或多个）、`*`（零个或多个）
4. 自定义正则：`:id(\\d+)`
5. Token 化与编译

## 4. 写作要求

### 开篇方式
"路径模式 `/user/:id` 只是一个字符串，如何让它变成可以匹配 `/user/123` 的数据结构？"

### 结构组织
```
1. 路径解析的目标
2. Token 化过程
   - 识别静态段
   - 识别动态参数
   - 识别修饰符
3. 构建正则表达式
4. 参数提取实现
5. 与 path-to-regexp 的对比
6. Vue Router 4 的实现细节
7. 本章小结
```

### 代码示例
```typescript
// 输入
const path = '/user/:id/posts/:postId?'

// 解析结果
const tokens = [
  { type: 'static', value: '/user/' },
  { type: 'param', name: 'id', modifier: '' },
  { type: 'static', value: '/posts/' },
  { type: 'param', name: 'postId', modifier: '?' },
]
```

## 5. 技术细节

### 源码参考
- `packages/router/src/matcher/pathParserRanker.ts`
- `packages/router/src/matcher/pathTokenizer.ts`

### 实现要点
- 使用有限状态机进行 Token 化
- 动态生成正则表达式
- 处理编码问题（`encodeURIComponent`）

### 常见问题
- 如何处理路径中的特殊字符？
- 嵌套参数如何处理？

## 6. 风格指导

### 语气语调
编译原理风格，严谨但不枯燥

### 类比方向
- Token 化 → 词法分析
- 构建正则 → 语法分析

## 7. 章节检查清单
- [ ] 解析过程清晰
- [ ] Token 结构明确
- [ ] 参数提取可用
- [ ] 边界情况覆盖
