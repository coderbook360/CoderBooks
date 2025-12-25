# State 状态树设计

在 Redux 中，整个应用的状态被组织成一棵树形结构。理解如何设计这棵"状态树"，是使用 Redux 的第一步。

## 什么是状态树？

状态树就是一个普通的 JavaScript 对象，它包含了应用的所有数据：

```javascript
const state = {
  user: {
    id: 1,
    name: 'Alice',
    email: 'alice@example.com',
    preferences: {
      theme: 'dark',
      language: 'zh-CN'
    }
  },
  todos: [
    { id: 1, text: '学习 Redux', completed: false },
    { id: 2, text: '写文档', completed: true }
  ],
  ui: {
    sidebarOpen: true,
    modal: null
  }
}
```

这个对象就像一棵树：顶层是根节点，每个属性是一个分支，可以一直嵌套下去。

## 为什么用树形结构？

**问题一：如果不用树形结构会怎样？**

让我们看看扁平化的状态：

```javascript
// ❌ 扁平化状态
const state = {
  userId: 1,
  userName: 'Alice',
  userEmail: 'alice@example.com',
  userTheme: 'dark',
  userLanguage: 'zh-CN',
  todo1Id: 1,
  todo1Text: '学习 Redux',
  todo1Completed: false,
  todo2Id: 2,
  todo2Text: '写文档',
  todo2Completed: true,
  uiSidebarOpen: true,
  uiModal: null
}
```

问题很明显：

- 命名混乱，需要用前缀区分
- 数组难以表达（todo1、todo2...）
- 修改一个领域的数据需要知道所有相关的键
- 无法利用 combineReducers 拆分 Reducer

**树形结构的优势：**

```javascript
// ✅ 树形结构
const state = {
  user: { /* 用户相关 */ },
  todos: [ /* 待办事项 */ ],
  ui: { /* UI 状态 */ }
}
```

- 按领域（domain）组织，结构清晰
- 天然支持 Reducer 拆分
- 每个分支可以独立管理
- 便于理解和维护

## 状态树设计原则

### 原则一：按领域划分顶层分支

顶层的键应该代表不同的业务领域：

```javascript
const state = {
  // 业务数据
  users: {},
  products: {},
  orders: {},
  
  // 领域状态
  cart: {},
  checkout: {},
  
  // UI 状态
  ui: {}
}
```

每个顶层键对应一个独立的 Reducer，这样 combineReducers 可以自然地工作。

### 原则二：区分数据和 UI 状态

数据状态（来自服务器）和 UI 状态（本地交互）应该分开：

```javascript
const state = {
  // 数据状态：来自 API
  entities: {
    users: {},
    posts: {}
  },
  
  // UI 状态：本地交互
  ui: {
    isLoading: false,
    selectedTab: 'posts',
    modalOpen: false
  }
}
```

**为什么要分开？**

- 数据状态可能需要持久化
- UI 状态通常是临时的
- 它们的更新逻辑不同
- 便于实现 SSR（服务端渲染）

### 原则三：规范化关系数据

如果你的数据有关系（比如用户和帖子），避免嵌套，而是使用规范化结构：

```javascript
// ❌ 嵌套结构
const state = {
  posts: [
    {
      id: 1,
      title: 'Redux 教程',
      author: { id: 1, name: 'Alice' }  // 重复的用户数据
    },
    {
      id: 2,
      title: 'React 教程',
      author: { id: 1, name: 'Alice' }  // 又是一份
    }
  ]
}

// ✅ 规范化结构
const state = {
  entities: {
    users: {
      1: { id: 1, name: 'Alice' }
    },
    posts: {
      1: { id: 1, title: 'Redux 教程', authorId: 1 },
      2: { id: 2, title: 'React 教程', authorId: 1 }
    }
  },
  postIds: [1, 2]  // 保持顺序
}
```

规范化的好处：

- 避免数据重复
- 更新一处，处处生效
- 便于按 ID 快速查找
- 减少嵌套层级

### 原则四：保持状态扁平化

尽管我们用树形结构，但不要嵌套太深：

```javascript
// ❌ 过度嵌套
const state = {
  app: {
    modules: {
      user: {
        profile: {
          settings: {
            preferences: {
              theme: 'dark'
            }
          }
        }
      }
    }
  }
}

// ✅ 适度扁平
const state = {
  user: {
    id: 1,
    name: 'Alice'
  },
  userSettings: {
    theme: 'dark',
    language: 'zh-CN'
  }
}
```

**为什么要扁平？**

- 更新深层嵌套需要大量扩展运算符
- 性能更好（浅比较更快）
- Reducer 逻辑更简单

### 原则五：存储派生数据需谨慎

有些数据可以从其他数据计算出来，这叫**派生数据**：

```javascript
// ❌ 存储派生数据
const state = {
  todos: [
    { id: 1, completed: false },
    { id: 2, completed: true }
  ],
  completedCount: 1,  // 可以计算出来
  remainingCount: 1   // 可以计算出来
}

// ✅ 用 Selector 计算
const state = {
  todos: [
    { id: 1, completed: false },
    { id: 2, completed: true }
  ]
}

// 派生数据用 Selector 计算
const getCompletedCount = state => 
  state.todos.filter(t => t.completed).length
```

**为什么不存储派生数据？**

- 需要保持同步（修改 todos 要同时更新 count）
- 增加了 Reducer 的复杂度
- 可能导致不一致

## 真实项目示例

让我们看一个电商应用的状态树设计：

```javascript
const state = {
  // 认证状态
  auth: {
    isAuthenticated: false,
    user: null,
    token: null
  },
  
  // 规范化的实体数据
  entities: {
    products: {
      '101': { id: '101', name: 'MacBook Pro', price: 1999, categoryId: '1' },
      '102': { id: '102', name: 'iPhone 15', price: 999, categoryId: '2' }
    },
    categories: {
      '1': { id: '1', name: '电脑' },
      '2': { id: '2', name: '手机' }
    }
  },
  
  // 列表页状态
  productList: {
    ids: ['101', '102'],
    isLoading: false,
    error: null,
    pagination: {
      page: 1,
      pageSize: 20,
      total: 100
    },
    filters: {
      categoryId: null,
      priceRange: [0, 10000]
    }
  },
  
  // 购物车
  cart: {
    items: [
      { productId: '101', quantity: 1 }
    ],
    isLoading: false
  },
  
  // UI 状态
  ui: {
    theme: 'light',
    sidebarOpen: false,
    notifications: []
  }
}
```

这个设计遵循了我们讨论的所有原则：

- **领域划分**：auth、entities、cart、ui 各司其职
- **数据与 UI 分离**：entities 是数据，ui 是界面状态
- **规范化**：products 和 categories 按 ID 存储
- **适度扁平**：没有过深的嵌套
- **无派生数据**：购物车总价用 Selector 计算

## 状态设计检查清单

在设计状态树时，问自己这些问题：

1. **这个数据需要在多个组件间共享吗？** 如果是，放入 Redux；如果只有一个组件用，可能用组件内状态就够了。

2. **这是服务器数据还是 UI 状态？** 分开存放，便于管理。

3. **这个数据可以从其他数据计算出来吗？** 如果可以，不要存储，用 Selector。

4. **数据之间有关系吗？** 如果有，考虑规范化。

5. **嵌套层级超过 3 层了吗？** 如果是，考虑扁平化。

## 本章小结

状态树设计的核心原则：

- **按领域划分**：顶层键代表不同业务领域
- **数据与 UI 分离**：便于管理和持久化
- **规范化关系数据**：避免重复，保持一致
- **保持扁平**：减少嵌套，简化更新
- **避免派生数据**：用 Selector 计算

好的状态树设计能让你的 Redux 代码事半功倍。

> 下一章，我们将学习 Action 的设计与规范。
