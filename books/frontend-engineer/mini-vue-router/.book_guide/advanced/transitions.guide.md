# 章节写作指导：路由过渡动画

## 1. 章节信息
- **章节标题**: 路由过渡动画
- **文件名**: advanced/transitions.md
- **所属部分**: 第七部分：高级特性
- **预计阅读时间**: 12分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解路由过渡的实现方式
- 掌握不同路由使用不同动画

### 技能目标
- 能够实现路由切换动画
- 能够根据导航方向切换动画

## 3. 内容要点
### 核心功能
- 与 Vue Transition 组件配合
- RouterView 的 v-slot 用法
- 基于 meta 的动态过渡
- 基于导航方向的过渡

### 关键知识点
1. RouterView v-slot 暴露的数据
2. Transition 与 Component 的配合
3. 动态 transition name
4. 进入/离开动画

## 4. 写作要求
### 开篇方式
"页面切换时的流畅动画，能显著提升用户体验。"

### 结构组织
```
1. 路由过渡的需求
2. 基础用法
3. 动态过渡
4. 基于方向的过渡
5. KeepAlive 配合
6. 本章小结
```

## 5. 技术细节
### 实现要点
```html
<RouterView v-slot="{ Component, route }">
  <Transition :name="route.meta.transition || 'fade'">
    <component :is="Component" />
  </Transition>
</RouterView>

<!-- 基于方向 -->
<RouterView v-slot="{ Component, route }">
  <Transition :name="transitionName">
    <component :is="Component" :key="route.path" />
  </Transition>
</RouterView>

<script setup>
const transitionName = computed(() => {
  // 根据 from 和 to 判断方向
  return isForward ? 'slide-left' : 'slide-right'
})
</script>
```

## 7. 章节检查清单
- [ ] 基础用法清晰
- [ ] 动态过渡实现
- [ ] KeepAlive 配合
