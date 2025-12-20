# 章节写作指导：push 与 replace 导航

## 1. 章节信息
- **章节标题**: push 与 replace 导航
- **文件名**: router/navigation-methods.md
- **所属部分**: 第五部分：核心 Router 实例
- **预计阅读时间**: 20分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 理解 push 和 replace 的完整导航流程
- 掌握导航参数的各种形式

### 技能目标
- 能够实现完整的 push/replace 方法
- 能够处理导航的各种边界情况

## 3. 内容要点

### 导航参数形式
- 字符串：`'/user/123'`
- 对象（路径）：`{ path: '/user/123' }`
- 对象（命名）：`{ name: 'user', params: { id: 123 } }`
- 对象（带 query）：`{ path: '/search', query: { q: 'vue' } }`

### 关键知识点
1. 参数标准化
2. 解析目标位置
3. 执行守卫队列
4. 更新状态
5. 触发 History 变化
6. 返回 Promise

## 4. 写作要求

### 开篇方式
"`router.push('/home')` 看似简单，背后却经历了位置解析、守卫执行、状态更新等复杂流程。"

### 结构组织
```
1. push vs replace 的区别
2. 导航参数标准化
3. 完整导航流程
4. push 实现
5. replace 实现
6. 导航返回的 Promise
7. 取消和错误处理
8. 本章小结
```

## 5. 技术细节

### 源码参考
- `packages/router/src/router.ts`

### 实现要点
```typescript
function push(to: RouteLocationRaw): Promise<NavigationFailure | void> {
  return pushWithRedirect(to)
}

async function pushWithRedirect(
  to: RouteLocationRaw | RouteLocation,
  redirectedFrom?: RouteLocation
): Promise<NavigationFailure | void> {
  const targetLocation = resolve(to)
  const from = currentRoute.value
  
  // 执行守卫
  await navigate(targetLocation, from)
  
  // 更新 History
  routerHistory.push(targetLocation.fullPath)
  
  // 更新当前路由
  currentRoute.value = targetLocation
}
```

## 6. 风格指导

### 语气语调
流程分析风格，步骤清晰

## 7. 章节检查清单
- [ ] 参数形式完整
- [ ] 导航流程正确
- [ ] 错误处理完善
- [ ] Promise 语义正确
