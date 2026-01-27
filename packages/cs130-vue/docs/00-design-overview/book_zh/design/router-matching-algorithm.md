# 路由匹配算法设计

URL 与路由配置的匹配是路由库的核心功能。Vue Router 4 重新设计了路由匹配算法，在灵活性和性能之间取得了平衡。

## 路径解析

路由匹配的第一步是解析路径。Vue Router 将路径分解为多个段（segments），每个段可以是静态文本或动态参数。

```javascript
// 路径解析示例
'/user/:id/posts/:postId'
// 解析为：
// [
//   { type: 'static', value: 'user' },
//   { type: 'param', value: 'id' },
//   { type: 'static', value: 'posts' },
//   { type: 'param', value: 'postId' }
// ]
```

解析发生在路由创建时，不是每次匹配时。这意味着复杂的正则表达式编译只执行一次，后续的匹配使用预处理的结果。

## 匹配优先级

当多个路由都能匹配同一个 URL 时，需要确定优先级。Vue Router 使用评分系统来决定最佳匹配。

```javascript
const routes = [
  { path: '/user/:id' },       // 动态参数
  { path: '/user/profile' },    // 静态路径
  { path: '/user/:id/posts' }   // 混合路径
]

// 访问 /user/profile
// 匹配 /user/profile（静态路径优先）
```

评分规则的核心原则是：更具体的路径得分更高。

静态段的得分高于动态参数。完全匹配的得分高于通配符。这符合直觉：`/user/profile` 比 `/user/:id` 更具体，当 URL 是 `/user/profile` 时，应该匹配前者。

```javascript
// 评分示例（简化）
'/user/profile'  // 静态段 + 静态段 = 高分
'/user/:id'      // 静态段 + 动态段 = 较低分
'/user/*'        // 静态段 + 通配符 = 最低分
```

## 正则表达式支持

Vue Router 支持在动态参数中使用正则表达式约束。这让匹配逻辑更精确。

```javascript
const routes = [
  // 只匹配数字 ID
  { path: '/user/:id(\\d+)' },
  
  // 匹配任意非空字符串
  { path: '/user/:username([a-z]+)' }
]
```

正则表达式在路由创建时编译为 JavaScript RegExp 对象。匹配时执行正则测试，验证参数是否符合约束。

这种设计让同一个路径位置可以根据参数格式匹配不同的路由：

```javascript
// /user/123 -> 匹配 :id(\d+)
// /user/john -> 匹配 :username([a-z]+)
```

## 可选参数与重复参数

Vue Router 支持可选参数和重复参数的语法。

```javascript
const routes = [
  // 可选参数：? 后缀
  { path: '/user/:id?' },
  
  // 可重复参数：+ 后缀（至少一个）
  { path: '/files/:path+' },
  
  // 可选重复：* 后缀（零个或多个）
  { path: '/docs/:chapters*' }
]
```

可选参数让同一个路由可以匹配有参数和无参数的 URL：

```javascript
// /user 和 /user/123 都匹配 /user/:id?
```

重复参数捕获多层路径：

```javascript
// /files/a/b/c 匹配 /files/:path+
// route.params.path = ['a', 'b', 'c']
```

这些语法借鉴了 path-to-regexp 库的设计，是业界的通用实践。

## 命名路由

除了路径匹配，Vue Router 还支持通过路由名称进行导航。命名路由提供了一层抽象，让代码不直接依赖路径字符串。

```javascript
const routes = [
  { 
    path: '/user/:id', 
    name: 'user-detail',
    component: UserDetail 
  }
]

// 通过名称导航
router.push({ name: 'user-detail', params: { id: 123 } })
```

命名路由的优势是重构安全。如果需要修改 URL 结构，只需修改路由配置，使用名称导航的代码不需要改动。

内部实现上，Vue Router 维护一个名称到路由的映射表。命名导航先查找路由，再生成对应的路径。

## 嵌套路由匹配

嵌套路由的匹配是递归进行的。先匹配父路由，再在子路由中寻找匹配。

```javascript
const routes = [
  {
    path: '/user/:id',
    component: User,
    children: [
      { path: 'profile', component: UserProfile },
      { path: 'posts', component: UserPosts }
    ]
  }
]

// 匹配 /user/123/profile
// 结果：[User, UserProfile]
```

匹配结果是一个数组，包含所有匹配的路由记录。渲染时，每一层 `<router-view>` 渲染对应层级的组件。

这种设计让嵌套布局变得自然。父组件定义外层布局，子组件填充内容区域。

## 严格模式与尾部斜杠

URL 的尾部斜杠处理是一个容易被忽略的细节。`/user` 和 `/user/` 是否应该视为同一个 URL？

Vue Router 提供了 `strict` 选项来控制这个行为：

```javascript
const router = createRouter({
  strict: true,  // 严格区分尾部斜杠
  routes
})
```

默认情况下（非严格模式），两者被视为等价。这更宽容，减少了用户输入错误导致的 404。

严格模式下，`/user` 和 `/user/` 是不同的路径。这在某些 SEO 场景下是需要的。

## 性能考虑

路由匹配的性能在大型应用中变得重要。当路由表包含数百条规则时，线性扫描的成本会累积。

Vue Router 的优化策略包括：

预处理路由配置，将路径编译为正则表达式。匹配时直接执行编译好的正则，而不是每次解析路径语法。

按评分排序，高优先级的路由先被检查。这在大多数情况下减少了需要检查的路由数量。

对于极大的路由表，可以考虑动态路由加载，只注册当前需要的路由：

```javascript
// 动态添加路由
router.addRoute({
  path: '/admin',
  component: () => import('./views/Admin.vue')
})
```

## 调试支持

Vue Router 提供了工具帮助调试路由匹配问题。

```javascript
// 获取所有路由
router.getRoutes()

// 检查路径会匹配哪个路由
router.resolve('/user/123')
```

Vue DevTools 也提供了路由面板，显示当前匹配的路由、参数值、路由历史等信息。

当路由行为不符合预期时，首先检查路由配置的顺序和优先级。动态参数的路由如果定义在静态路由之前，可能会"吃掉"本应匹配静态路由的 URL。
