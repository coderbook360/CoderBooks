# 章节写作指导：路由独享守卫实现

## 1. 章节信息
- **章节标题**: 路由独享守卫实现
- **文件名**: guards/route-guards.md
- **所属部分**: 第四部分：导航守卫系统
- **预计阅读时间**: 12分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 beforeEnter 守卫的定义位置与执行时机
- 掌握路由配置中守卫的提取逻辑

### 技能目标
- 能够实现路由独享守卫的调用
- 理解与全局守卫的执行顺序关系

## 3. 内容要点

### 核心特点
- 定义在路由配置中
- 只在进入该路由时触发
- 在全局 beforeEach 之后执行

### 关键知识点
1. beforeEnter 的配置方式
2. 数组形式的 beforeEnter
3. 从 matched 中提取守卫
4. 与嵌套路由的关系

## 4. 写作要求

### 开篇方式
"有些守卫只需要在特定路由上执行。beforeEnter 就是为此设计的。"

### 结构组织
```
1. 路由独享守卫的使用场景
2. beforeEnter 配置方式
3. 从路由配置中提取守卫
4. 执行时机分析
5. 与嵌套路由的配合
6. 本章小结
```

## 5. 技术细节

### 源码参考
- `packages/router/src/navigationGuards.ts`

### 实现要点
```typescript
// 路由配置
{
  path: '/admin',
  component: Admin,
  beforeEnter: (to, from) => {
    // 权限检查
    if (!isAdmin()) return '/login'
  }
}

// 或数组形式
{
  path: '/admin',
  beforeEnter: [checkAuth, checkAdmin]
}
```

## 6. 风格指导

### 语气语调
实用主义风格，强调应用场景

## 7. 章节检查清单
- [ ] 配置方式完整
- [ ] 执行时机正确
- [ ] 与全局守卫关系清晰
