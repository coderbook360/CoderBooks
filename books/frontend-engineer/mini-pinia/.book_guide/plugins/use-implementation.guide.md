# 章节写作指导：pinia.use() 实现

## 1. 章节信息
- **章节标题**: pinia.use() 实现
- **文件名**: plugins/use-implementation.md
- **所属部分**: 第八部分：插件系统
- **预计阅读时间**: 10分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解 use() 方法的实现
- 掌握插件注册的时机
- 了解插件应用的顺序

### 技能目标
- 能够从零实现插件注册
- 能够解释插件执行时机

## 3. 内容要点
### 核心概念
- **pinia.use()**：注册插件的方法
- **_p 数组**：存储所有注册的插件
- **链式调用**：use() 返回 pinia 本身

### 关键知识点
- 插件存储结构
- 返回值设计
- 与 Store 创建的关系

## 4. 写作要求
### 开篇方式
"pinia.use() 是插件系统的入口。它的实现非常简单：将插件函数存储起来，等到 Store 创建时再调用。"

### 结构组织
```
1. use() 的 API 设计
2. 实现原理
3. 链式调用支持
4. 插件存储与应用
5. 完整实现代码
```

### 代码示例
```typescript
// createPinia 中的 use 实现
function createPinia(): Pinia {
  // 存储插件的数组
  const _p: PiniaPlugin[] = []
  
  const pinia: Pinia = {
    // ... 其他属性
    
    _p,  // 暴露给 Store 使用
    
    use(plugin: PiniaPlugin) {
      // 添加到数组
      _p.push(plugin)
      // 返回 pinia 支持链式调用
      return this
    },
  }
  
  return pinia
}

// 使用方式
const pinia = createPinia()

// 单个注册
pinia.use(plugin1)
pinia.use(plugin2)

// 链式注册
pinia
  .use(plugin1)
  .use(plugin2)
  .use(plugin3)
```

## 5. 技术细节
### 为什么用数组而不是 Set
```typescript
// 使用数组的原因：
// 1. 保持注册顺序（插件按注册顺序执行）
// 2. 允许同一插件注册多次（虽然不常见）
// 3. 更简单直接

const _p: PiniaPlugin[] = []
```

### 插件应用的时机
```typescript
// 插件在 Store 创建时应用
// 在 createSetupStore 中：
function createSetupStore(...) {
  // ... 创建 Store 逻辑
  
  // 应用所有注册的插件
  pinia._p.forEach((extender) => {
    if (__USE_DEVTOOLS__) {
      // DevTools 相关处理
    } else {
      // 直接执行插件
      assign(
        store,
        scope.run(() =>
          extender({
            store: store as Store,
            app: pinia._a,
            pinia,
            options: optionsForPlugin,
          })
        )!
      )
    }
  })
}
```

### 插件执行的顺序
```typescript
pinia.use(plugin1)  // 第一个执行
pinia.use(plugin2)  // 第二个执行
pinia.use(plugin3)  // 第三个执行

// 对于每个新创建的 Store，按此顺序应用插件
// 先注册的插件先执行
```

### 链式调用的实现
```typescript
use(plugin: PiniaPlugin) {
  _p.push(plugin)
  return this  // 返回 pinia 实例，支持链式调用
}
```

## 6. 风格指导
- **语气**：实现细节讲解
- **重点**：时机与顺序

## 7. 章节检查清单
- [ ] use 实现清晰
- [ ] 存储结构说明
- [ ] 执行时机明确
- [ ] 顺序保证说明
