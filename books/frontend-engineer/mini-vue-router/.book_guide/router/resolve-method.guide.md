# 章节写作指导：路由解析与 resolve 方法

## 1. 章节信息
- **章节标题**: 路由解析与 resolve 方法
- **文件名**: router/resolve-method.md
- **所属部分**: 第五部分：核心 Router 实例
- **预计阅读时间**: 15分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解 resolve 方法的作用
- 掌握位置解析的完整流程

### 技能目标
- 能够实现 resolve 方法
- 能够处理各种位置格式的解析

## 3. 内容要点
### 核心功能
resolve 方法将用户输入的位置（字符串或对象）解析为完整的 RouteLocation。

### 关键知识点
1. 输入格式的多样性
2. 相对路径的解析
3. 命名路由的解析
4. query 和 hash 的处理
5. 返回值结构

## 4. 写作要求
### 开篇方式
"resolve 是导航的第一步：把用户的输入转换为标准的路由位置对象。"

### 结构组织
```
1. resolve 的作用
2. 输入格式处理
3. 路径解析
4. 命名路由解析
5. 完整实现
6. 本章小结
```

## 5. 技术细节
### 源码参考
- `packages/router/src/router.ts`

### 实现要点
```typescript
function resolve(
  rawLocation: RouteLocationRaw,
  currentLocation?: RouteLocation
): RouteLocation {
  const current = currentLocation || currentRoute.value
  
  if (typeof rawLocation === 'string') {
    const locationNormalized = parseURL(rawLocation)
    const matchedRoute = matcher.resolve(locationNormalized, current)
    return matchedRoute
  }
  
  // 对象形式
  if (rawLocation.name) {
    // 命名路由
  } else if (rawLocation.path) {
    // 路径路由
  }
}
```

## 7. 章节检查清单
- [ ] 输入格式完整
- [ ] 解析逻辑正确
- [ ] 返回值结构清晰
