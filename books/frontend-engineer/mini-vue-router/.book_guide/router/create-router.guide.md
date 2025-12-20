# 章节写作指导：createRouter 函数实现

## 1. 章节信息
- **章节标题**: createRouter 函数实现
- **文件名**: router/create-router.md
- **所属部分**: 第五部分：核心 Router 实例
- **预计阅读时间**: 25分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 理解 createRouter 的完整职责
- 掌握 Router 实例的核心属性和方法

### 技能目标
- 能够实现 createRouter 的核心逻辑
- 能够理解各模块的协调方式

## 3. 内容要点

### Router 实例职责
- 管理路由状态（currentRoute）
- 协调 History 和 Matcher
- 执行导航和守卫
- 提供 Vue 集成接口

### 关键知识点
1. RouterOptions 接口设计
2. 内部状态管理
3. 与 History 的交互
4. 与 Matcher 的交互
5. install 方法（Vue 插件）

## 4. 写作要求

### 开篇方式
"createRouter 是整个库的入口。让我们看看它如何将各个模块组装成一个完整的路由器。"

### 结构组织
```
1. createRouter API 设计
2. RouterOptions 解析
3. 内部状态初始化
4. 核心属性实现
   - currentRoute
   - options
5. 模块初始化
   - 创建 Matcher
   - 创建 History
6. 事件监听设置
7. 返回 Router 对象
8. 本章小结
```

## 5. 技术细节

### 源码参考
- `packages/router/src/router.ts`

### 实现要点
```typescript
function createRouter(options: RouterOptions): Router {
  const matcher = createRouterMatcher(options.routes, options)
  const routerHistory = options.history
  
  const currentRoute = shallowRef<RouteLocationNormalized>(START_LOCATION)
  
  // ... 方法实现
  
  const router: Router = {
    currentRoute,
    options,
    
    push,
    replace,
    go,
    back,
    forward,
    
    beforeEach,
    beforeResolve,
    afterEach,
    onError,
    
    addRoute,
    removeRoute,
    getRoutes,
    resolve,
    
    install,
  }
  
  return router
}
```

## 6. 风格指导

### 语气语调
核心模块实现风格，全面但有重点

## 7. 章节检查清单
- [ ] 完整的 Router 接口
- [ ] 模块协调清晰
- [ ] 状态管理正确
- [ ] 与 Vue 集成
