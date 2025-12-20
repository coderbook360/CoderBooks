# 章节写作指导：异步守卫与错误处理

## 1. 章节信息
- **章节标题**: 异步守卫与错误处理
- **文件名**: guards/async-guards.md
- **所属部分**: 第四部分：导航守卫系统
- **预计阅读时间**: 15分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 理解异步守卫的处理机制
- 掌握守卫中的错误处理策略

### 技能目标
- 能够处理返回 Promise 的守卫
- 能够实现完善的错误捕获机制

## 3. 内容要点

### 异步场景
- API 调用验证权限
- 异步加载数据
- 延迟确认弹窗

### 关键知识点
1. 守卫返回 Promise 的处理
2. async/await 在守卫中的使用
3. 超时处理
4. 错误类型与错误传播
5. onError 钩子

## 4. 写作要求

### 开篇方式
"守卫经常需要做异步操作：调用 API、弹出确认框。Vue Router 是如何处理这些异步逻辑的？"

### 结构组织
```
1. 异步守卫的常见场景
2. Promise 返回值处理
3. async/await 最佳实践
4. 超时与取消
5. 错误类型定义
6. onError 钩子实现
7. 错误恢复策略
8. 本章小结
```

## 5. 技术细节

### 源码参考
- `packages/router/src/errors.ts`
- `packages/router/src/router.ts`

### 实现要点
```typescript
// 异步守卫示例
router.beforeEach(async (to, from) => {
  try {
    const hasPermission = await checkPermission(to.meta.permission)
    if (!hasPermission) {
      return '/403'
    }
  } catch (error) {
    return '/error'
  }
})

// 错误处理
router.onError((error, to, from) => {
  console.error('Navigation error:', error)
})
```

## 6. 风格指导

### 语气语调
实战导向，多举真实场景

## 7. 章节检查清单
- [ ] 异步处理完整
- [ ] 错误类型覆盖
- [ ] onError 钩子实现
- [ ] 最佳实践建议
