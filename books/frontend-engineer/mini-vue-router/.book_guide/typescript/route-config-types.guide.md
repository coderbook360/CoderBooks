# 章节写作指导：路由配置类型

## 1. 章节信息
- **章节标题**: 路由配置类型
- **文件名**: typescript/route-config-types.md
- **所属部分**: 第八部分：TypeScript 类型系统
- **预计阅读时间**: 12分钟
- **难度等级**: 高级

## 2. 学习目标
### 知识目标
- 理解 RouteRecordRaw 的类型定义
- 掌握路由配置的类型约束

### 技能目标
- 能够编写类型安全的路由配置
- 能够扩展路由配置类型

## 3. 内容要点
### 核心类型
- RouteRecordRaw
- RouteRecordSingleView
- RouteRecordMultipleViews
- RouteRecordRedirect

### 关键知识点
1. 联合类型的使用
2. 可选属性 vs 必选属性
3. 组件类型的定义
4. 递归类型（children）

## 4. 写作要求
### 开篇方式
"路由配置的类型定义，决定了开发体验。让我们看看 Vue Router 是如何设计的。"

### 结构组织
```
1. RouteRecordRaw 概述
2. 单视图 vs 多视图
3. 重定向路由
4. 嵌套路由的递归类型
5. 完整类型定义
6. 本章小结
```

## 5. 技术细节
### 实现要点
```typescript
export type RouteRecordRaw =
  | RouteRecordSingleView
  | RouteRecordMultipleViews
  | RouteRecordRedirect

export interface RouteRecordSingleView {
  path: string
  name?: RouteRecordNameGeneric
  component: RawRouteComponent
  components?: never
  children?: RouteRecordRaw[]
  redirect?: never
  props?: boolean | Record<string, any> | ((to: RouteLocationNormalized) => Record<string, any>)
  meta?: RouteMeta
  beforeEnter?: NavigationGuardWithThis<undefined> | NavigationGuardWithThis<undefined>[]
}
```

## 7. 章节检查清单
- [ ] 类型层次完整
- [ ] 联合类型说明
- [ ] 递归类型解释
