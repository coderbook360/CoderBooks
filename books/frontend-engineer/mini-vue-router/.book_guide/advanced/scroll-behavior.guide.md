# 章节写作指导：滚动行为控制

## 1. 章节信息
- **章节标题**: 滚动行为控制
- **文件名**: advanced/scroll-behavior.md
- **所属部分**: 第七部分：高级特性
- **预计阅读时间**: 12分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解滚动行为的配置方式
- 掌握滚动位置的保存与恢复

### 技能目标
- 能够实现自定义滚动行为
- 能够处理异步滚动

## 3. 内容要点
### 核心功能
- 导航时的滚动位置控制
- 返回时恢复滚动位置
- 滚动到锚点

### 关键知识点
1. scrollBehavior 配置选项
2. savedPosition 参数
3. 异步滚动支持
4. 平滑滚动
5. History scrollRestoration

## 4. 写作要求
### 开篇方式
"用户按返回键时，页面应该恢复到之前的滚动位置。这是良好用户体验的重要组成部分。"

### 结构组织
```
1. 滚动行为的需求
2. scrollBehavior 配置
3. 返回值类型
4. savedPosition 的使用
5. 异步滚动
6. 实现原理
7. 本章小结
```

## 5. 技术细节
### 源码参考
- `packages/router/src/scrollBehavior.ts`

### 实现要点
```typescript
const router = createRouter({
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' }
    }
    return { top: 0 }
  }
})
```

## 7. 章节检查清单
- [ ] 配置方式完整
- [ ] 实现原理清晰
- [ ] 异步支持说明
