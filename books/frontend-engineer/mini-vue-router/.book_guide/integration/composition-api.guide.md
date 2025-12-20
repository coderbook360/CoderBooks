# 章节写作指导：Composition API 集成

## 1. 章节信息
- **章节标题**: Composition API 集成
- **文件名**: integration/composition-api.md
- **所属部分**: 第六部分：Vue 集成与组件
- **预计阅读时间**: 15分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解 Composition API 中路由的使用方式
- 掌握 onBeforeRouteLeave 等组合式守卫

### 技能目标
- 能够实现组合式 API 中的路由功能
- 能够在 setup 中使用路由

## 3. 内容要点
### 核心 API
- `useRouter()` / `useRoute()`
- `onBeforeRouteLeave()`
- `onBeforeRouteUpdate()`
- `useLink()`

### 关键知识点
1. 在 setup 中访问路由
2. 组合式守卫的实现
3. useLink 的复用设计
4. 与 Options API 的对比

## 4. 写作要求
### 开篇方式
"Composition API 让逻辑复用更加灵活。Vue Router 4 全面拥抱了这种新范式。"

### 结构组织
```
1. Composition API 中的路由访问
2. 组合式守卫
3. useLink 实现
4. 自定义组合函数
5. 最佳实践
6. 本章小结
```

## 5. 技术细节
### 源码参考
- `packages/router/src/useApi.ts`

### 实现要点
```typescript
export function onBeforeRouteLeave(leaveGuard: NavigationGuard) {
  const instance = getCurrentInstance()
  if (!instance) {
    __DEV__ && warn('onBeforeRouteLeave must be called in setup')
    return
  }
  
  const matchedRoute = inject(matchedRouteKey)!
  if (!matchedRoute.value) return
  
  matchedRoute.value.leaveGuards.add(leaveGuard)
  
  onUnmounted(() => {
    matchedRoute.value?.leaveGuards.delete(leaveGuard)
  })
}
```

## 7. 章节检查清单
- [ ] 核心 API 完整
- [ ] 守卫实现正确
- [ ] 生命周期处理
