# 章节写作指导：路由状态管理

## 1. 章节信息
- **章节标题**: 路由状态管理
- **文件名**: router/router-state.md
- **所属部分**: 第五部分：核心 Router 实例
- **预计阅读时间**: 15分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解 currentRoute 的响应式设计
- 掌握路由状态的更新时机

### 技能目标
- 能够实现响应式的路由状态
- 理解状态与 Vue 响应式系统的集成

## 3. 内容要点
### 核心状态
- `currentRoute`：当前激活的路由
- `pendingLocation`：正在导航的目标
- `isReady`：路由是否就绪

### 关键知识点
1. 使用 shallowRef 的原因
2. 状态更新的原子性
3. 并发导航的处理
4. ready Promise 的实现

## 4. 写作要求
### 开篇方式
"路由状态是整个应用的核心数据之一。它需要是响应式的，以便 Vue 组件能够自动更新。"

### 结构组织
```
1. 路由状态概述
2. currentRoute 的响应式设计
3. 状态更新时机
4. 并发导航处理
5. isReady 与 ready Promise
6. 本章小结
```

## 5. 技术细节
### 源码参考
- `packages/router/src/router.ts`

### 实现要点
```typescript
const currentRoute = shallowRef<RouteLocationNormalized>(START_LOCATION)

let pendingLocation: RouteLocation = START_LOCATION

let readyHandlers = useCallbacks()
let errorListeners = useCallbacks()
```

## 7. 章节检查清单
- [ ] 响应式设计清晰
- [ ] 更新时机正确
- [ ] 并发处理说明
