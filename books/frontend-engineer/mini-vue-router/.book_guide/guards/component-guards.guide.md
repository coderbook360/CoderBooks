# 章节写作指导：组件内守卫实现

## 1. 章节信息
- **章节标题**: 组件内守卫实现
- **文件名**: guards/component-guards.md
- **所属部分**: 第四部分：导航守卫系统
- **预计阅读时间**: 18分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 理解三种组件内守卫的差异
- 掌握组件守卫的提取与调用机制

### 技能目标
- 能够实现组件内守卫的提取
- 理解 beforeRouteEnter 的特殊 next 回调

## 3. 内容要点

### 三种组件内守卫
- `beforeRouteEnter`：进入前（无法访问 this）
- `beforeRouteUpdate`：路由变化但组件复用
- `beforeRouteLeave`：离开前

### 关键知识点
1. 组件守卫的定义位置
2. 从组件实例中提取守卫
3. beforeRouteEnter 的 next(vm => {}) 机制
4. 组件复用场景的判断

## 4. 写作要求

### 开篇方式
"组件内守卫让你可以在组件级别控制导航。特别是 beforeRouteLeave，是实现'离开确认'的最佳方式。"

### 结构组织
```
1. 组件内守卫使用场景
2. beforeRouteLeave 实现
3. beforeRouteUpdate 实现
4. beforeRouteEnter 的特殊性
   - 为什么无法访问 this
   - next 回调的实现
5. 从组件中提取守卫
6. Composition API 中的守卫
7. 本章小结
```

## 5. 技术细节

### 源码参考
- `packages/router/src/navigationGuards.ts`

### 实现要点
```typescript
// beforeRouteEnter 特殊处理
beforeRouteEnter(to, from, next) {
  next(vm => {
    // 通过 vm 访问组件实例
    vm.fetchData()
  })
}

// 组件守卫提取
function extractComponentsGuards(
  matched: RouteRecordNormalized[],
  guardType: string
): NavigationGuard[]
```

## 6. 风格指导

### 语气语调
深入实现细节，解释设计决策

## 7. 章节检查清单
- [ ] 三种守卫完整
- [ ] beforeRouteEnter 的 next 机制
- [ ] 组件提取逻辑
- [ ] Composition API 支持
