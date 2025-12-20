# 章节写作指导：createPinia 函数解析

## 1. 章节信息
- **章节标题**: createPinia 函数解析
- **文件名**: create-pinia/create-pinia.md
- **所属部分**: 第二部分：createPinia 核心实现
- **预计阅读时间**: 15分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解 createPinia 函数的完整实现
- 掌握 Pinia 实例的创建过程
- 了解 effectScope 在 Pinia 中的应用

### 技能目标
- 能够从零实现 createPinia 函数
- 能够解释每一行代码的作用

## 3. 内容要点
### 核心概念
- **createPinia**：Pinia 的工厂函数
- **effectScope(true)**：创建 detached 作用域
- **state**：全局状态树
- **_p**：插件数组
- **_s**：Store Map

### 关键知识点
- 为什么使用 effectScope(true)
- state 为什么用 ref 而不是 reactive
- install 方法的职责

## 4. 写作要求
### 开篇方式
"Pinia 的一切都始于 `createPinia()`。这个不到 80 行的函数，构建了整个状态管理系统的根基。让我们逐行解析它的实现。"

### 结构组织
```
1. createPinia 函数签名
2. 创建 effectScope
3. 初始化 state
4. 构建 pinia 对象
5. install 方法
6. use 方法
7. 完整代码整合
```

### 代码示例
```typescript
// 完整的 createPinia 实现
import { ref, effectScope, markRaw, App, Ref } from 'vue'
import { Pinia, piniaSymbol, setActivePinia } from './rootStore'
import { StateTree } from './types'

export function createPinia(): Pinia {
  const scope = effectScope(true)
  
  const state = scope.run<Ref<Record<string, StateTree>>>(() =>
    ref<Record<string, StateTree>>({})
  )!

  let _p: Pinia['_p'] = []
  let toBeInstalled: PiniaPlugin[] = []

  const pinia: Pinia = markRaw({
    install(app: App) {
      setActivePinia(pinia)
      pinia._a = app
      app.provide(piniaSymbol, pinia)
      app.config.globalProperties.$pinia = pinia
      toBeInstalled.forEach((plugin) => _p.push(plugin))
      toBeInstalled = []
    },

    use(plugin) {
      if (!this._a) {
        toBeInstalled.push(plugin)
      } else {
        _p.push(plugin)
      }
      return this
    },

    _p,
    _a: null,
    _e: scope,
    _s: new Map(),
    state,
  })

  return pinia
}
```

## 5. 技术细节
### 源码参考
- `packages/pinia/src/createPinia.ts`：约 80 行

### 关键实现细节
1. **effectScope(true)**：detached 模式，不受父作用域影响
2. **markRaw**：避免 pinia 对象被响应式化
3. **toBeInstalled**：处理 use 在 install 之前调用的情况
4. **_a**：存储 App 实例引用

### 代码解读
```typescript
// 为什么用 ref 包装 state？
// 答：因为需要支持 $state = newState 整体替换

// 为什么用 markRaw？
// 答：pinia 对象本身不需要响应式，避免不必要的代理开销
```

## 6. 风格指导
- **语气**：源码解读风格，逐步深入
- **重点**：每个设计决策背后的原因

## 7. 章节检查清单
- [ ] createPinia 完整实现
- [ ] effectScope 使用解释
- [ ] state 设计原因
- [ ] install/use 流程清晰
- [ ] 与后续章节的关联
