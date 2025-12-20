# 章节写作指导：Options Store 配置结构

## 1. 章节信息
- **章节标题**: Options Store 配置结构
- **文件名**: options-store/configuration.md
- **所属部分**: 第四部分：Options Store 实现
- **预计阅读时间**: 12分钟
- **难度等级**: 初级

## 2. 学习目标
### 知识目标
- 理解 DefineStoreOptions 类型结构
- 掌握 state、getters、actions 的配置方式
- 了解可选配置项的作用

### 技能目标
- 能够正确定义 Options Store
- 能够解释配置项的类型定义

## 3. 内容要点
### 核心概念
- **DefineStoreOptions**：Options Store 的配置类型
- **state**：返回初始状态的函数
- **getters**：计算属性对象
- **actions**：方法对象

### 关键知识点
- state 为什么是函数
- getters 的函数签名
- actions 中 this 的类型

## 4. 写作要求
### 开篇方式
"Options Store 采用类似 Vue Options API 的配置风格，通过 state、getters、actions 三个选项来定义 Store。让我们看看这个配置结构的设计。"

### 结构组织
```
1. DefineStoreOptions 概览
2. id 选项
3. state 函数
4. getters 对象
5. actions 对象
6. 可选配置项
7. 完整示例
```

### 代码示例
```typescript
// DefineStoreOptions 类型定义
interface DefineStoreOptions<Id, S, G, A> {
  id: Id
  state?: () => S
  getters?: G & ThisType<S & G & A>
  actions?: A & ThisType<S & G & A>
  hydrate?: (storeState: S, initialState: S) => void
}

// 使用示例
const useCounterStore = defineStore('counter', {
  // state 必须是函数
  state: () => ({
    count: 0,
    name: 'Counter'
  }),
  
  // getters 接收 state 作为第一个参数
  getters: {
    doubleCount: (state) => state.count * 2,
    // 也可以使用 this 访问其他 getter
    quadrupleCount(): number {
      return this.doubleCount * 2
    }
  },
  
  // actions 中可以使用 this 访问 state 和其他方法
  actions: {
    increment() {
      this.count++
    },
    async fetchData() {
      const data = await api.getData()
      this.name = data.name
    }
  }
})
```

## 5. 技术细节
### state 为什么是函数
```typescript
// ❌ 如果 state 是对象
state: { count: 0 }
// SSR 时所有请求共享同一个对象，造成状态污染

// ✅ state 是函数
state: () => ({ count: 0 })
// 每次调用返回新对象，隔离不同请求的状态
```

### ThisType 的作用
```typescript
// getters 和 actions 中 this 的类型
getters?: G & ThisType<S & G & A>

// 这样在 getter 中可以：
getters: {
  doubleCount(): number {
    return this.count * 2  // this.count 有正确类型
  }
}
```

## 6. 风格指导
- **语气**：配置讲解，清晰直接
- **示例**：实用的配置示例

## 7. 章节检查清单
- [ ] 配置结构完整
- [ ] state 函数原因
- [ ] ThisType 解释
- [ ] 完整示例可运行
