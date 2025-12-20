# 章节写作指导：全局守卫实现

## 1. 章节信息
- **章节标题**: 全局守卫实现
- **文件名**: guards/global-guards.md
- **所属部分**: 第四部分：导航守卫系统
- **预计阅读时间**: 18分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解全局守卫的注册与存储机制
- 掌握 beforeEach、beforeResolve、afterEach 的差异

### 技能目标
- 能够实现全局守卫的注册与调用
- 能够处理守卫的返回值

## 3. 内容要点

### 核心实现
- 守卫注册（返回取消函数）
- 守卫存储（数组）
- 守卫调用（按顺序执行）

### 关键知识点
1. beforeEach 的调用时机
2. beforeResolve 的调用时机
3. afterEach 的特殊性（无法中断）
4. 守卫返回值的处理

## 4. 写作要求

### 开篇方式
"全局守卫是最常用的守卫类型。让我们实现 beforeEach、beforeResolve、afterEach。"

### 结构组织
```
1. 全局守卫 API 设计
2. 守卫注册机制
3. beforeEach 实现
4. beforeResolve 实现
5. afterEach 实现
6. 守卫调用流程
7. 本章小结
```

## 5. 技术细节

### 源码参考
- `packages/router/src/router.ts`

### 实现要点
```typescript
const beforeGuards: NavigationGuard[] = []
const beforeResolveGuards: NavigationGuard[] = []
const afterGuards: NavigationHookAfter[] = []

function beforeEach(guard: NavigationGuard) {
  beforeGuards.push(guard)
  return () => {
    const i = beforeGuards.indexOf(guard)
    if (i > -1) beforeGuards.splice(i, 1)
  }
}
```

## 6. 风格指导

### 语气语调
实现导向，代码详尽

## 7. 章节检查清单
- [ ] 三种守卫都覆盖
- [ ] 注册与取消完整
- [ ] 返回值处理正确
