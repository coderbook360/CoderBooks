# 章节写作指导：Router 插件机制与 install

## 1. 章节信息
- **章节标题**: Router 插件机制与 install
- **文件名**: integration/router-plugin.md
- **所属部分**: 第六部分：Vue 集成与组件
- **预计阅读时间**: 15分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解 Vue 插件机制
- 掌握 Router 如何集成到 Vue 应用

### 技能目标
- 能够实现 router.install 方法
- 理解 provide/inject 在路由中的应用

## 3. 内容要点
### 核心功能
- 注册全局组件（RouterLink、RouterView）
- 注入路由相关数据（router、route）
- 设置全局属性（$router、$route）

### 关键知识点
1. Vue 插件的 install 方法
2. app.component 注册组件
3. app.provide 注入数据
4. app.config.globalProperties
5. 初始导航触发

## 4. 写作要求
### 开篇方式
"app.use(router) 这一行代码背后，发生了什么？"

### 结构组织
```
1. Vue 插件机制回顾
2. install 方法实现
3. 组件注册
4. 数据注入
5. 全局属性设置
6. 初始导航
7. 本章小结
```

## 5. 技术细节
### 源码参考
- `packages/router/src/router.ts`

### 实现要点
```typescript
install(app: App) {
  const router = this
  
  // 注册组件
  app.component('RouterLink', RouterLink)
  app.component('RouterView', RouterView)
  
  // 注入数据
  app.provide(routerKey, router)
  app.provide(routeLocationKey, toRefs(reactive({ value: router.currentRoute })).value)
  
  // 全局属性（Options API 支持）
  app.config.globalProperties.$router = router
  Object.defineProperty(app.config.globalProperties, '$route', {
    get: () => router.currentRoute.value,
  })
  
  // 初始导航
  router.push(router.currentRoute.value.fullPath)
}
```

## 7. 章节检查清单
- [ ] 插件机制清晰
- [ ] 注入完整
- [ ] 初始导航正确
