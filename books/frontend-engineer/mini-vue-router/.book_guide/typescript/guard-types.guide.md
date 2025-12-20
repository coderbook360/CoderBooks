# 章节写作指导：导航守卫类型

## 1. 章节信息
- **章节标题**: 导航守卫类型
- **文件名**: typescript/guard-types.md
- **所属部分**: 第八部分：TypeScript 类型系统
- **预计阅读时间**: 10分钟
- **难度等级**: 高级

## 2. 学习目标
### 知识目标
- 理解导航守卫的类型定义
- 掌握守卫返回值的类型

### 技能目标
- 能够编写类型安全的守卫
- 能够正确处理守卫参数

## 3. 内容要点
### 核心类型
- NavigationGuard
- NavigationGuardNext
- NavigationHookAfter
- NavigationGuardReturn

### 关键知识点
1. 守卫函数签名
2. 返回值类型的联合
3. next 函数的类型（兼容性）
4. this 的类型处理

## 4. 写作要求
### 开篇方式
"守卫的类型定义需要兼顾新旧 API。让我们看看它是如何设计的。"

### 结构组织
```
1. NavigationGuard 类型
2. 参数类型
3. 返回值类型
4. next 函数的兼容处理
5. afterEach 的类型差异
6. 本章小结
```

## 5. 技术细节
### 实现要点
```typescript
export interface NavigationGuard {
  (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next?: NavigationGuardNext
  ): NavigationGuardReturn | Promise<NavigationGuardReturn>
}

export type NavigationGuardReturn =
  | void
  | Error
  | boolean
  | RouteLocationRaw

export interface NavigationHookAfter {
  (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    failure?: NavigationFailure
  ): void
}
```

## 7. 章节检查清单
- [ ] 类型完整
- [ ] 返回值覆盖
- [ ] 兼容性说明
