# 章节写作指导：核心概念与术语定义

## 1. 章节信息
- **章节标题**: 核心概念与术语定义
- **文件名**: foundations/core-concepts.md
- **所属部分**: 第一部分：路由基础与架构概览
- **预计阅读时间**: 10分钟
- **难度等级**: 初级

## 2. 学习目标

### 知识目标
- 掌握 Vue Router 中的核心术语
- 理解 Route 对象的结构
- 区分 RouteRecord、RouteLocation、RouteLocationNormalized 等类型

### 技能目标
- 能够准确使用路由相关术语
- 能够读懂路由相关的 TypeScript 类型定义

## 3. 内容要点

### 核心术语
- **Route Record**：路由配置对象（用户定义的路由规则）
- **Route Location**：表示一个位置的对象（path、params、query 等）
- **RouteLocationNormalized**：标准化后的位置对象
- **Router**：路由器实例，管理路由状态和导航
- **Route**：当前激活的路由对象
- **Navigation**：一次导航行为
- **Navigation Guard**：导航守卫
- **Matcher**：路由匹配器

### 关键知识点
1. 用户配置 vs 内部表示
2. 路由对象的生命周期
3. 位置对象的三种形态

## 4. 写作要求

### 开篇方式
"在深入源码之前，先统一语言。这一章我们定义清楚每个术语的含义。"

### 结构组织
```
1. 为什么需要统一术语
2. 路由配置相关术语
   - RouteRecordRaw
   - RouteRecord
   - RouteRecordNormalized
3. 位置相关术语
   - RouteLocation
   - RouteLocationNormalized
   - RouteLocationResolved
4. 路由器相关术语
   - Router
   - Route (currentRoute)
5. 导航相关术语
6. 术语对照表
7. 本章小结
```

### 代码示例
- 展示各类型的 TypeScript 定义
- 展示实际的对象结构示例

## 5. 技术细节

### 源码参考
- `packages/router/src/types/index.ts`

### 实现要点
- Raw 后缀表示用户输入的原始配置
- Normalized 后缀表示经过处理的标准化对象
- Resolved 后缀表示完全解析后的对象

## 6. 风格指导

### 语气语调
像词典一样精确，像教科书一样清晰

### 类比方向
- RouteRecordRaw → 用户填写的表单
- RouteRecordNormalized → 系统处理后的规范数据

## 7. 章节检查清单
- [ ] 术语准确：与官方文档一致
- [ ] 对照表：提供速查表
- [ ] 示例清晰：每个术语有代码示例
