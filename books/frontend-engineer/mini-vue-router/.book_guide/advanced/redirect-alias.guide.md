# 章节写作指导：重定向与别名

## 1. 章节信息
- **章节标题**: 重定向与别名
- **文件名**: advanced/redirect-alias.md
- **所属部分**: 第七部分：高级特性
- **预计阅读时间**: 10分钟
- **难度等级**: 初级

## 2. 学习目标
### 知识目标
- 理解重定向的几种形式
- 理解别名与重定向的区别

### 技能目标
- 能够配置各种重定向
- 能够正确使用别名

## 3. 内容要点
### 重定向形式
- 字符串路径
- 命名路由
- 函数（动态重定向）

### 关键知识点
1. redirect 的三种形式
2. 重定向时守卫的触发
3. alias 的作用
4. 重定向 vs 别名的区别

## 4. 写作要求
### 开篇方式
"用户访问 `/home`，自动跳转到 `/dashboard`。这就是重定向。"

### 结构组织
```
1. 重定向的需求
2. redirect 配置
3. 动态重定向
4. alias 别名
5. 重定向 vs 别名
6. 实现原理
7. 本章小结
```

## 5. 技术细节
### 实现要点
```typescript
const routes = [
  // 字符串
  { path: '/home', redirect: '/dashboard' },
  
  // 命名路由
  { path: '/home', redirect: { name: 'dashboard' } },
  
  // 函数
  { path: '/search/:term', redirect: to => `/results?q=${to.params.term}` },
  
  // 别名
  { path: '/dashboard', alias: ['/home', '/index'] },
]
```

## 7. 章节检查清单
- [ ] 三种形式完整
- [ ] 别名说明清晰
- [ ] 区别对比明确
