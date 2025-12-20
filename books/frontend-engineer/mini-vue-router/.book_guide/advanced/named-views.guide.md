# 章节写作指导：命名视图与多视图渲染

## 1. 章节信息
- **章节标题**: 命名视图与多视图渲染
- **文件名**: advanced/named-views.md
- **所属部分**: 第七部分：高级特性
- **预计阅读时间**: 12分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解命名视图的应用场景
- 掌握多视图的配置与渲染

### 技能目标
- 能够配置命名视图
- 能够实现复杂布局

## 3. 内容要点
### 应用场景
- 侧边栏 + 主内容区
- 三栏布局
- 条件渲染不同组件

### 关键知识点
1. components（复数）配置
2. RouterView 的 name 属性
3. 默认视图（default）
4. 与嵌套路由的配合

## 4. 写作要求
### 开篇方式
"一个页面需要同时渲染多个独立的区域？命名视图是解决方案。"

### 结构组织
```
1. 命名视图的场景
2. 配置语法
3. RouterView name 属性
4. 实现原理
5. 与嵌套路由的配合
6. 本章小结
```

## 5. 技术细节
### 实现要点
```typescript
const routes = [
  {
    path: '/dashboard',
    components: {
      default: Dashboard,
      sidebar: DashboardSidebar,
      header: DashboardHeader,
    }
  }
]

// 模板
<RouterView />
<RouterView name="sidebar" />
<RouterView name="header" />
```

## 7. 章节检查清单
- [ ] 配置语法清晰
- [ ] 渲染原理说明
- [ ] 实际场景示例
