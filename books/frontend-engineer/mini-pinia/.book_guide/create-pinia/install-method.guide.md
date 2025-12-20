# 章节写作指导：Vue 插件安装：install 方法实现

## 1. 章节信息
- **章节标题**: Vue 插件安装：install 方法实现
- **文件名**: create-pinia/install-method.md
- **所属部分**: 第二部分：createPinia 核心实现
- **预计阅读时间**: 12分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解 install 方法的完整实现
- 掌握 Pinia 与 Vue App 的绑定过程
- 了解 provide 注入机制的应用

### 技能目标
- 能够实现 install 方法
- 能够解释安装过程的每个步骤

## 3. 内容要点
### 核心概念
- **setActivePinia**：设置当前活动的 Pinia 实例
- **app.provide**：向组件树注入 Pinia
- **globalProperties**：Vue 全局属性挂载

### 关键知识点
- 为什么需要 setActivePinia
- provide 的作用范围
- $pinia 全局属性的用途

## 4. 写作要求
### 开篇方式
"当我们调用 `app.use(pinia)` 时，Vue 会调用 Pinia 的 install 方法。这个方法做了四件关键的事情，让我们逐一解析。"

### 结构组织
```
1. install 方法签名
2. setActivePinia 设置
3. 保存 App 引用
4. provide 注入
5. 全局属性挂载
6. 延迟插件处理
7. 完整实现
```

### 代码示例
```typescript
install(app: App) {
  // 1. 设置当前活动的 Pinia
  setActivePinia(pinia)
  
  // 2. 保存 App 引用
  pinia._a = app
  
  // 3. 向组件树注入 Pinia
  app.provide(piniaSymbol, pinia)
  
  // 4. 挂载全局属性（用于 Options API）
  app.config.globalProperties.$pinia = pinia
  
  // 5. 处理 install 前注册的插件
  toBeInstalled.forEach((plugin) => _p.push(plugin))
  toBeInstalled = []
}
```

## 5. 技术细节
### setActivePinia 的作用
```typescript
// rootStore.ts
export let activePinia: Pinia | undefined

export const setActivePinia = (pinia: Pinia | undefined) =>
  (activePinia = pinia)
```

- **SSR 场景**：每个请求需要独立的 Pinia 实例
- **测试场景**：允许切换不同的 Pinia 实例
- **组件外使用**：在没有 inject 上下文时的降级方案

### provide 机制
```typescript
// 使用 Symbol 作为 key 保证唯一性
export const piniaSymbol = Symbol('pinia') as InjectionKey<Pinia>

// 在任何后代组件中都可以 inject
const pinia = inject(piniaSymbol)
```

### toBeInstalled 处理
```typescript
// 场景：在 app.use(pinia) 之前调用 pinia.use(plugin)
const pinia = createPinia()
pinia.use(myPlugin)  // 此时 _a 还是 null
app.use(pinia)       // install 时处理 toBeInstalled
```

## 6. 风格指导
- **语气**：步骤化讲解，重点突出
- **图示**：可以用流程图展示安装顺序

## 7. 章节检查清单
- [ ] install 四个步骤清晰
- [ ] setActivePinia 解释到位
- [ ] provide 机制讲解完整
- [ ] toBeInstalled 场景说明
- [ ] 与 Store 使用的关联
