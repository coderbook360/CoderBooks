# 章节写作指导：路由懒加载与代码分割

## 1. 章节信息
- **章节标题**: 路由懒加载与代码分割
- **文件名**: advanced/lazy-loading.md
- **所属部分**: 第七部分：高级特性
- **预计阅读时间**: 15分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解路由级代码分割的原理
- 掌握异步组件的加载机制

### 技能目标
- 能够实现路由懒加载
- 能够处理加载状态和错误

## 3. 内容要点
### 核心功能
- 动态 import() 语法
- 异步组件解析
- 加载状态处理
- 错误处理

### 关键知识点
1. 动态 import 与 Webpack/Vite 代码分割
2. defineAsyncComponent 的关系
3. 在 beforeResolve 中等待组件加载
4. 加载失败的处理

## 4. 写作要求
### 开篇方式
"首屏加载 5MB 的 JavaScript？这是性能灾难。路由懒加载是解决方案。"

### 结构组织
```
1. 代码分割的必要性
2. 动态 import 语法
3. Vue Router 中的懒加载
4. 组件解析时机
5. 加载状态处理
6. 错误处理
7. 预加载策略
8. 本章小结
```

## 5. 技术细节
### 实现要点
```typescript
const routes = [
  {
    path: '/admin',
    component: () => import('./views/Admin.vue'),
  },
  {
    path: '/dashboard',
    component: () => import(/* webpackChunkName: "dashboard" */ './views/Dashboard.vue'),
  },
]
```

## 7. 章节检查清单
- [ ] 语法说明清晰
- [ ] 构建工具配合
- [ ] 错误处理完善
