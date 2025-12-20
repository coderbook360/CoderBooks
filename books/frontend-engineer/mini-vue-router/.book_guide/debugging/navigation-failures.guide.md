# 章节写作指导：导航失败处理

## 1. 章节信息
- **章节标题**: 导航失败处理
- **文件名**: debugging/navigation-failures.md
- **所属部分**: 第九部分：调试与错误处理
- **预计阅读时间**: 12分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解导航失败的各种场景
- 掌握失败处理的最佳实践

### 技能目标
- 能够正确处理导航失败
- 能够区分"失败"与"取消"

## 3. 内容要点
### 失败场景
- 路由不存在
- 守卫中断
- 守卫重定向
- 重复导航
- 异步组件加载失败

### 关键知识点
1. push/replace 的返回值
2. onError 钩子
3. afterEach 中的 failure 参数
4. 错误恢复策略

## 4. 写作要求
### 开篇方式
"`router.push()` 返回的 Promise 可能 resolve 为一个失败对象，而不是 reject。这是有意为之。"

### 结构组织
```
1. 导航失败的定义
2. 失败 vs 错误
3. 检测失败
4. afterEach 中的处理
5. onError 钩子
6. 错误恢复
7. 本章小结
```

## 5. 技术细节
### 实现要点
```typescript
// push 返回 NavigationFailure 而非 reject
const failure = await router.push('/some-path')
if (failure) {
  if (isNavigationFailure(failure, NavigationFailureType.duplicated)) {
    // 重复导航，忽略
  } else if (isNavigationFailure(failure, NavigationFailureType.aborted)) {
    // 被守卫中断
    console.log('Navigation aborted:', failure.from, '->', failure.to)
  }
}

// afterEach 中处理
router.afterEach((to, from, failure) => {
  if (failure) {
    trackNavigationFailure(failure)
  }
})

// onError 处理异常
router.onError((error, to, from) => {
  // 组件加载失败等
  reportError(error)
})
```

## 7. 章节检查清单
- [ ] 失败场景完整
- [ ] 处理方式正确
- [ ] 最佳实践清晰
