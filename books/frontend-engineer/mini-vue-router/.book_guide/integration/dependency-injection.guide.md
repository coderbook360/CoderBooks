# 章节写作指导：依赖注入与 provide/inject

## 1. 章节信息
- **章节标题**: 依赖注入与 provide/inject
- **文件名**: integration/dependency-injection.md
- **所属部分**: 第六部分：Vue 集成与组件
- **预计阅读时间**: 12分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解 Vue 的 provide/inject 机制
- 掌握 Router 中的注入 key 设计

### 技能目标
- 能够正确使用路由注入
- 理解 Symbol key 的作用

## 3. 内容要点
### 注入的数据
- `routerKey`：Router 实例
- `routeLocationKey`：当前路由（响应式）
- `viewDepthKey`：RouterView 深度
- `matchedRouteKey`：当前匹配的路由

### 关键知识点
1. Symbol 作为注入 key
2. 响应式值的注入
3. 组件获取注入数据
4. 类型安全

## 4. 写作要求
### 开篇方式
"Vue Router 使用 provide/inject 实现跨组件通信。这是它与 Vue 深度集成的关键。"

### 结构组织
```
1. provide/inject 基础
2. 注入 key 设计
3. 注入的数据结构
4. 组件中的使用
5. 类型定义
6. 本章小结
```

## 5. 技术细节
### 源码参考
- `packages/router/src/injectionSymbols.ts`

### 实现要点
```typescript
export const routerKey = Symbol('router') as InjectionKey<Router>
export const routeLocationKey = Symbol('route location') as InjectionKey<Ref<RouteLocationNormalizedLoaded>>
export const routerViewLocationKey = Symbol('router view location')
export const viewDepthKey = Symbol('router view depth') as InjectionKey<Ref<number>>
export const matchedRouteKey = Symbol('matched route') as InjectionKey<ComputedRef<RouteRecordNormalized | undefined>>
```

## 7. 章节检查清单
- [ ] Key 定义完整
- [ ] 类型安全
- [ ] 使用示例清晰
