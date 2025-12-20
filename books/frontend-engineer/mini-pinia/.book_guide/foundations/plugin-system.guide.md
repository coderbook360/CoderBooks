# 章节写作指导：Vue 3 插件机制与 provide/inject

## 1. 章节信息
- **章节标题**: Vue 3 插件机制与 provide/inject
- **文件名**: foundations/plugin-system.md
- **所属部分**: 第一部分：基础准备
- **预计阅读时间**: 15分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解 Vue 3 插件的标准结构
- 掌握 app.use() 的工作原理
- 深入理解 provide/inject 依赖注入
- 了解 InjectionKey 的类型安全用法

### 技能目标
- 能够解释 Pinia 作为 Vue 插件的安装过程
- 能够理解 Store 如何通过 inject 获取 Pinia 实例

## 3. 内容要点
### 核心概念
- **Vue 插件**：带有 install 方法的对象
- **app.use()**：调用插件的 install 方法
- **provide**：在组件树中提供数据
- **inject**：在组件树中获取数据
- **InjectionKey**：TypeScript 类型安全的注入键

### 关键知识点
- 插件的 install 方法签名
- provide/inject 的响应式特性
- hasInjectionContext 判断是否在组件上下文中
- Symbol 作为 injection key 的最佳实践

## 4. 写作要求
### 开篇方式
"Pinia 通过 `app.use(pinia)` 安装到 Vue 应用中，之后在任何组件内都可以使用 Store。这背后是 Vue 3 的插件机制和 provide/inject 依赖注入系统在协同工作。"

### 结构组织
```
1. Vue 3 插件基础
2. app.use() 工作原理
3. provide 提供数据
4. inject 获取数据
5. InjectionKey 类型安全
6. hasInjectionContext 检测
7. Pinia 的安装过程预览
```

### 代码示例
```typescript
// 标准 Vue 插件结构
const myPlugin = {
  install(app: App, options?: MyOptions) {
    // 提供全局数据
    app.provide('myKey', someValue)
    
    // 添加全局属性
    app.config.globalProperties.$myPlugin = ...
  }
}

// 使用插件
app.use(myPlugin, { /* options */ })

// 在组件中注入
const value = inject('myKey')
```

## 5. 技术细节
### Pinia 中的应用
1. **piniaSymbol**：Pinia 的注入键
   ```typescript
   // rootStore.ts
   export const piniaSymbol = Symbol('pinia') as InjectionKey<Pinia>
   ```

2. **install 方法**：安装 Pinia
   ```typescript
   // createPinia.ts
   install(app: App) {
     pinia._a = app
     app.provide(piniaSymbol, pinia)
     app.config.globalProperties.$pinia = pinia
   }
   ```

3. **getActivePinia**：获取 Pinia 实例
   ```typescript
   // rootStore.ts
   export const getActivePinia = () =>
     (hasInjectionContext() && inject(piniaSymbol)) || activePinia
   ```

### 关键细节
- `hasInjectionContext()`：Vue 3.3+ 新增 API
- 全局属性 `$pinia`：用于 Options API 访问

## 6. 风格指导
- **语气**：逐步引导，从基础到 Pinia 应用
- **类比方向**：provide/inject 可类比为"家族遗产传递"

## 7. 章节检查清单
- [ ] 插件结构讲解清晰
- [ ] provide/inject 机制完整
- [ ] InjectionKey 类型安全示例
- [ ] Pinia 安装过程预览到位
- [ ] hasInjectionContext 解释清楚
