# 章节写作指导：addRoute 与 removeRoute 动态路由

## 1. 章节信息
- **章节标题**: addRoute 与 removeRoute 动态路由
- **文件名**: router/dynamic-routes-api.md
- **所属部分**: 第五部分：核心 Router 实例
- **预计阅读时间**: 12分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解动态路由的应用场景
- 掌握运行时修改路由的机制

### 技能目标
- 能够实现 addRoute 和 removeRoute
- 能够处理动态路由的边界情况

## 3. 内容要点
### 应用场景
- 权限驱动的路由
- 插件系统的路由注册
- 微前端子应用路由

### 关键知识点
1. addRoute 的参数形式
2. 父路由指定
3. removeRoute 的方式
4. 与导航的关系
5. 热更新支持

## 4. 写作要求
### 开篇方式
"有些路由不是静态配置的，而是根据用户权限、插件加载等动态添加的。"

### 结构组织
```
1. 动态路由的场景
2. addRoute 实现
3. removeRoute 实现
4. getRoutes 实现
5. 权限路由示例
6. 本章小结
```

## 5. 技术细节
### 实现要点
```typescript
function addRoute(
  parentOrRoute: RouteRecordRaw | string,
  route?: RouteRecordRaw
): () => void {
  let parent: RouteRecordMatcher | undefined
  let record: RouteRecordRaw
  
  if (typeof parentOrRoute === 'string') {
    parent = matcher.getRecordMatcher(parentOrRoute)
    record = route!
  } else {
    record = parentOrRoute
  }
  
  return matcher.addRoute(record, parent)
}

function removeRoute(name: string): void {
  matcher.removeRoute(name)
}

function getRoutes(): RouteRecord[] {
  return matcher.getRoutes().map(m => m.record)
}
```

## 7. 章节检查清单
- [ ] 两个 API 完整
- [ ] 场景说明清晰
- [ ] 边界情况处理
