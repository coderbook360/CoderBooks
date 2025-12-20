# 章节写作指导：守卫执行队列与流程控制

## 1. 章节信息
- **章节标题**: 守卫执行队列与流程控制
- **文件名**: guards/guard-queue.md
- **所属部分**: 第四部分：导航守卫系统
- **预计阅读时间**: 20分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 理解守卫队列的构建过程
- 掌握串行执行的实现机制
- 理解中断导航的几种方式

### 技能目标
- 能够实现守卫队列的串行执行
- 能够处理各种返回值导致的导航中断

## 3. 内容要点

### 核心问题
多个守卫如何按顺序执行，并正确处理每个守卫的返回值？

### 关键知识点
1. 守卫队列的构建顺序
2. 串行执行 vs 并行执行
3. 返回值的含义
   - `true` / `undefined`：继续
   - `false`：中断
   - 路由位置：重定向
   - `Error`：错误
4. next 函数的兼容处理

## 4. 写作要求

### 开篇方式
"10 个守卫，如何保证按顺序执行，并且任何一个都能中断整个导航？"

### 结构组织
```
1. 队列执行的挑战
2. 守卫队列构建
3. runGuardQueue 实现
4. 返回值处理逻辑
5. next 函数的实现（向后兼容）
6. 中断与错误处理
7. 本章小结
```

## 5. 技术细节

### 源码参考
- `packages/router/src/navigationGuards.ts`

### 实现要点
```typescript
async function runGuardQueue(guards: NavigationGuard[]): Promise<void> {
  for (const guard of guards) {
    const result = await guard(to, from)
    
    if (result === false) {
      throw new NavigationCancelled()
    }
    
    if (isRouteLocation(result)) {
      throw new NavigationRedirect(result)
    }
    
    if (result instanceof Error) {
      throw result
    }
  }
}
```

## 6. 风格指导

### 语气语调
流程控制分析风格

## 7. 章节检查清单
- [ ] 队列构建完整
- [ ] 串行执行正确
- [ ] 返回值处理全面
- [ ] 错误传播正确
