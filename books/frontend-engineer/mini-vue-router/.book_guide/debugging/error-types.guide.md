# 章节写作指导：错误类型与错误边界

## 1. 章节信息
- **章节标题**: 错误类型与错误边界
- **文件名**: debugging/error-types.md
- **所属部分**: 第九部分：调试与错误处理
- **预计阅读时间**: 12分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解 Vue Router 中的错误类型
- 掌握错误的分类与处理

### 技能目标
- 能够正确识别和处理不同类型的错误
- 能够实现错误边界

## 3. 内容要点
### 错误类型
- NavigationFailure
- NavigationAborted
- NavigationCancelled
- NavigationDuplicated
- NavigationGuardRedirect

### 关键知识点
1. 错误类型的定义
2. ErrorTypes 枚举
3. isNavigationFailure 类型守卫
4. 错误信息的获取

## 4. 写作要求
### 开篇方式
"并非所有的导航都会成功。Vue Router 定义了多种错误类型来区分不同的失败原因。"

### 结构组织
```
1. 错误类型概述
2. NavigationFailure 结构
3. 各类型详解
4. 类型守卫函数
5. 错误处理最佳实践
6. 本章小结
```

## 5. 技术细节
### 源码参考
- `packages/router/src/errors.ts`

### 实现要点
```typescript
export enum ErrorTypes {
  MATCHER_NOT_FOUND,
  NAVIGATION_GUARD_REDIRECT,
  NAVIGATION_ABORTED,
  NAVIGATION_CANCELLED,
  NAVIGATION_DUPLICATED,
}

export interface NavigationFailure extends Error {
  type: ErrorTypes
  from: RouteLocationNormalized
  to: RouteLocationNormalized
}

export function isNavigationFailure(
  error: any,
  type?: ErrorTypes
): error is NavigationFailure {
  return error instanceof Error && 'type' in error && (type == null || error.type === type)
}
```

## 7. 章节检查清单
- [ ] 错误类型完整
- [ ] 类型守卫实现
- [ ] 处理示例清晰
