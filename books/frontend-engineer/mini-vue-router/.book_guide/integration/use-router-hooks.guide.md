# 章节写作指导：useRouter 与 useRoute 实现

## 1. 章节信息
- **章节标题**: useRouter 与 useRoute 实现
- **文件名**: integration/use-router-hooks.md
- **所属部分**: 第六部分：Vue 集成与组件
- **预计阅读时间**: 12分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 Composition API 中路由的使用方式
- 掌握 useRouter 和 useRoute 的实现原理

### 技能目标
- 能够实现 useRouter 和 useRoute
- 理解响应式路由对象的设计

## 3. 内容要点

### 核心 API
- `useRouter()`：获取 Router 实例
- `useRoute()`：获取当前路由（响应式）

### 关键知识点
1. inject 获取注入的值
2. 为什么 useRoute 是响应式的
3. 与 Options API 的 this.$router 对比
4. TypeScript 类型支持

## 4. 写作要求

### 开篇方式
"在 Composition API 中，我们用 useRouter 和 useRoute 替代 this.$router 和 this.$route。"

### 结构组织
```
1. Composition API 中的路由访问
2. useRouter 实现
3. useRoute 实现
4. 响应式设计分析
5. 与 Options API 对比
6. 类型定义
7. 本章小结
```

## 5. 技术细节

### 源码参考
- `packages/router/src/useApi.ts`

### 实现要点
```typescript
export function useRouter(): Router {
  return inject(routerKey)!
}

export function useRoute(): RouteLocationNormalizedLoaded {
  return inject(routeLocationKey)!
}

// 还有其他 hooks
export function useLink(props: UseLinkOptions) {
  // RouterLink 的逻辑复用
}

export function onBeforeRouteLeave(leaveGuard: NavigationGuard) {
  // 组件内守卫的 Composition API 版本
}

export function onBeforeRouteUpdate(updateGuard: NavigationGuard) {
  // 组件内守卫的 Composition API 版本
}
```

## 6. 风格指导

### 语气语调
简洁实用风格

## 7. 章节检查清单
- [ ] 核心 hooks 实现
- [ ] 响应式解释清楚
- [ ] 类型定义完整
