# 章节写作指导：路由元信息与权限控制

## 1. 章节信息
- **章节标题**: 路由元信息与权限控制
- **文件名**: advanced/route-meta.md
- **所属部分**: 第七部分：高级特性
- **预计阅读时间**: 12分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解 meta 字段的设计与用途
- 掌握基于 meta 的权限控制模式

### 技能目标
- 能够设计合理的 meta 结构
- 能够实现权限守卫

## 3. 内容要点
### meta 的常见用途
- 权限标记（roles、permissions）
- 页面标题（title）
- 是否需要登录（requiresAuth）
- 布局配置（layout）
- 缓存控制（keepAlive）

### 关键知识点
1. meta 字段的类型定义
2. 在守卫中访问 meta
3. 嵌套路由的 meta 合并
4. TypeScript 类型扩展

## 4. 写作要求
### 开篇方式
"路由不只是 path 和 component。meta 让你可以在路由上附加任意元数据。"

### 结构组织
```
1. meta 字段概述
2. 常见用例
3. 权限控制实现
4. 嵌套路由的 meta
5. TypeScript 类型扩展
6. 最佳实践
7. 本章小结
```

## 5. 技术细节
### 实现要点
```typescript
// 类型扩展
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    roles?: string[]
    title?: string
  }
}

// 权限守卫
router.beforeEach((to, from) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  
  if (to.meta.roles && !hasRole(to.meta.roles)) {
    return { name: 'forbidden' }
  }
})
```

## 7. 章节检查清单
- [ ] meta 用途完整
- [ ] 权限示例清晰
- [ ] 类型扩展说明
