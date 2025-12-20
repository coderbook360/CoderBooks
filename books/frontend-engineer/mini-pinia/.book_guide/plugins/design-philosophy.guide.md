# 章节写作指导：插件系统设计理念

## 1. 章节信息
- **章节标题**: 插件系统设计理念
- **文件名**: plugins/design-philosophy.md
- **所属部分**: 第八部分：插件系统
- **预计阅读时间**: 10分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解 Pinia 插件系统的设计目标
- 掌握插件的能力边界
- 了解与 Vuex 插件系统的区别

### 技能目标
- 能够解释插件系统的设计理念
- 能够判断何时需要使用插件

## 3. 内容要点
### 核心概念
- **插件**：扩展 Store 功能的函数
- **PiniaPlugin**：插件函数类型
- **PiniaPluginContext**：插件接收的上下文

### 关键知识点
- 插件的执行时机
- 插件能做什么
- 插件不应该做什么

## 4. 写作要求
### 开篇方式
"Pinia 的插件系统设计得非常简洁。每个插件就是一个函数，接收 Store 上下文，可以扩展 Store 的功能。这种设计让插件的开发和使用都变得非常直观。"

### 结构组织
```
1. 插件系统的目标
2. 设计原则
3. 插件能做什么
4. 插件不应该做什么
5. 与 Vuex 插件的对比
6. 典型使用场景
```

### 代码示例
```typescript
// 最简单的插件
function myPlugin(context: PiniaPluginContext) {
  // context 包含丰富的信息
  const { store, pinia, app, options } = context
  
  // 可以访问 Store 实例
  console.log('Store created:', store.$id)
  
  // 可以扩展 Store
  store.hello = 'world'
  
  // 可以添加响应式属性
  store.customRef = ref('custom')
  
  // 可以订阅变化
  store.$subscribe(() => {
    console.log('State changed')
  })
  
  // 可以包装 actions
  store.$onAction(({ name, after }) => {
    after(() => console.log(`Action ${name} finished`))
  })
}

// 注册插件
pinia.use(myPlugin)
```

## 5. 技术细节
### 插件能做什么

| 能力 | 说明 | 示例 |
|-----|------|------|
| 添加属性 | 为 Store 添加新属性 | `store.router = router` |
| 添加响应式 | 添加 ref/reactive | `store.loading = ref(false)` |
| 订阅变化 | 使用 $subscribe/$onAction | 日志、持久化 |
| 包装方法 | 修改或增强 actions | 错误上报、性能监控 |
| 访问配置 | 读取 options | 根据配置决定行为 |

### 设计原则
```typescript
// 1. 简单：插件就是函数
type PiniaPlugin = (context: PiniaPluginContext) => void | Partial<...>

// 2. 透明：可以访问所有内部状态
const { store, pinia, app, options } = context

// 3. 可组合：多个插件可以叠加
pinia.use(loggerPlugin)
pinia.use(persistPlugin)
pinia.use(routerPlugin)

// 4. 类型安全：支持扩展类型声明
declare module 'pinia' {
  export interface PiniaCustomProperties {
    router: Router
  }
}
```

### 与 Vuex 插件的对比
```typescript
// Vuex 插件：只能订阅 mutations
const vuexPlugin = store => {
  store.subscribe((mutation, state) => {})
}

// Pinia 插件：能力更强
const piniaPlugin = ({ store }) => {
  // 可以订阅
  store.$subscribe(() => {})
  store.$onAction(() => {})
  
  // 还可以扩展
  store.custom = 'property'
  
  // 还可以访问 options
  // 还可以返回要合并的对象
}
```

## 6. 风格指导
- **语气**：设计理念讲解
- **对比**：与 Vuex 的对比

## 7. 章节检查清单
- [ ] 设计理念清晰
- [ ] 能力边界明确
- [ ] 使用场景覆盖
- [ ] 与 Vuex 对比
