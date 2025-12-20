# 章节写作指导：嵌套路由与路由树

## 1. 章节信息
- **章节标题**: 嵌套路由与路由树
- **文件名**: matcher/nested-routes.md
- **所属部分**: 第三部分：路由匹配器
- **预计阅读时间**: 18分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 理解嵌套路由的数据结构
- 掌握路由树的构建与遍历
- 理解 matched 数组的含义

### 技能目标
- 能够构建路由树结构
- 能够实现嵌套路由的匹配
- 理解 RouterView 如何利用 matched 数组渲染

## 3. 内容要点

### 核心问题
嵌套路由（children）如何转换为可匹配的数据结构？

### 关键知识点
1. 路由配置的树形结构
2. 路由记录的扁平化
3. parent 指针的建立
4. matched 数组的构建
5. 路径拼接逻辑

## 4. 写作要求

### 开篇方式
"现代应用几乎都有嵌套布局：顶部导航、侧边栏、主内容区。嵌套路由就是为此而生的。"

### 结构组织
```
1. 嵌套路由使用场景
2. 路由配置的树形表示
3. 路由记录的标准化
4. 构建路由树
5. 嵌套匹配算法
6. matched 数组的作用
7. 与 RouterView 的配合
8. 本章小结
```

### 代码示例
```typescript
// 路由配置
const routes = [
  {
    path: '/user',
    component: UserLayout,
    children: [
      { path: '', component: UserHome },
      { path: 'profile', component: UserProfile },
      { path: 'settings', component: UserSettings },
    ]
  }
]

// 匹配 /user/profile 时的 matched 数组
matched = [UserLayout, UserProfile]
```

## 5. 技术细节

### 源码参考
- `packages/router/src/matcher/index.ts`

### 实现要点
- 子路由的 path 是相对路径还是绝对路径
- parent 和 children 的双向引用
- 递归遍历构建 matched

### 常见问题
- 子路由的 path 可以以 `/` 开头吗？
- 如何处理多层嵌套？

## 6. 风格指导

### 语气语调
数据结构分析风格

### 类比方向
- 路由树 → 文件系统目录树
- matched 数组 → 面包屑导航

## 7. 章节检查清单
- [ ] 树结构清晰
- [ ] 匹配算法完整
- [ ] matched 解释清楚
- [ ] 与组件渲染关联
