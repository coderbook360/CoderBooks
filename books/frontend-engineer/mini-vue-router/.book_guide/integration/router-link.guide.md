# 章节写作指导：RouterLink 组件实现

## 1. 章节信息
- **章节标题**: RouterLink 组件实现
- **文件名**: integration/router-link.md
- **所属部分**: 第六部分：Vue 集成与组件
- **预计阅读时间**: 20分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 RouterLink 的设计目标
- 掌握链接激活状态的判断逻辑

### 技能目标
- 能够实现完整的 RouterLink 组件
- 能够处理各种导航场景

## 3. 内容要点

### 核心功能
- 渲染为 `<a>` 标签
- 点击触发导航
- 自动添加激活类名
- 支持自定义渲染

### 关键知识点
1. props 设计（to、replace、custom 等）
2. 点击事件处理
3. href 计算
4. 激活状态判断
5. exact 匹配与包含匹配
6. v-slot 作用域插槽

## 4. 写作要求

### 开篇方式
"RouterLink 是声明式导航的核心。它比直接使用 `<a>` 标签更强大，也更智能。"

### 结构组织
```
1. RouterLink vs 普通 a 标签
2. Props 设计
3. 组件实现
   - setup 函数
   - href 计算
   - 点击处理
   - 激活状态
4. custom 模式与 v-slot
5. 无障碍支持
6. 本章小结
```

## 5. 技术细节

### 源码参考
- `packages/router/src/RouterLink.ts`

### 实现要点
```typescript
export const RouterLink = defineComponent({
  name: 'RouterLink',
  props: {
    to: { type: [String, Object], required: true },
    replace: Boolean,
    custom: Boolean,
    activeClass: String,
    exactActiveClass: String,
  },
  setup(props, { slots }) {
    const router = inject(routerKey)!
    const currentRoute = inject(routeLocationKey)!
    
    const link = computed(() => router.resolve(props.to))
    
    const isActive = computed(() => {
      // 激活状态判断逻辑
    })
    
    // ...
  }
})
```

## 6. 风格指导

### 语气语调
组件实现风格，关注用户体验

## 7. 章节检查清单
- [ ] Props 完整
- [ ] 激活逻辑正确
- [ ] 点击处理完善
- [ ] 作用域插槽支持
