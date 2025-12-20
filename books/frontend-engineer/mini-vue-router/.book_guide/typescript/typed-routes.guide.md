# 章节写作指导：类型安全的路由

## 1. 章节信息
- **章节标题**: 类型安全的路由
- **文件名**: typescript/typed-routes.md
- **所属部分**: 第八部分：TypeScript 类型系统
- **预计阅读时间**: 15分钟
- **难度等级**: 高级

## 2. 学习目标
### 知识目标
- 理解类型安全路由的设计目标
- 掌握 Vue Router 4 的 typed routes 特性

### 技能目标
- 能够配置类型安全的路由
- 能够在导航时获得类型提示

## 3. 内容要点
### 核心目标
- 路由名称的自动补全
- 参数类型的校验
- query 类型的定义

### 关键知识点
1. RouteNamedMap 类型
2. 模板字面量类型的应用
3. 类型推断的边界
4. 与代码生成工具的配合

## 4. 写作要求
### 开篇方式
"`router.push({ name: 'usr' })`——拼写错误直到运行时才发现？类型安全路由解决这个问题。"

### 结构组织
```
1. 类型安全的意义
2. 现有的类型限制
3. typed routes 特性
4. 配置方式
5. 工作原理
6. 第三方方案
7. 本章小结
```

## 5. 技术细节
### 源码参考
- `packages/router/src/typed-routes/`

### 实现要点
```typescript
// 声明路由名称类型
declare module 'vue-router' {
  interface RouteNamedMap {
    home: { params: never; query: never }
    user: { params: { id: string }; query: { tab?: string } }
    'user-profile': { params: { id: string }; query: never }
  }
}

// 使用时获得类型检查
router.push({ name: 'user', params: { id: '123' } }) // ✓
router.push({ name: 'user' }) // ✗ 缺少 params
router.push({ name: 'usr' }) // ✗ 名称不存在
```

## 7. 章节检查清单
- [ ] 设计目标清晰
- [ ] 配置方式完整
- [ ] 实际效果展示
