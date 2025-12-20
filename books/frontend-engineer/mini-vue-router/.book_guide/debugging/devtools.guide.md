# 章节写作指导：DevTools 集成

## 1. 章节信息
- **章节标题**: DevTools 集成
- **文件名**: debugging/devtools.md
- **所属部分**: 第九部分：调试与错误处理
- **预计阅读时间**: 10分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解 Vue DevTools 中路由面板的工作原理
- 掌握 DevTools API 的使用

### 技能目标
- 能够为 Mini Router 添加 DevTools 支持
- 能够调试路由问题

## 3. 内容要点
### DevTools 功能
- 路由历史记录
- 当前路由信息
- 导航时间线
- 路由配置查看

### 关键知识点
1. Vue DevTools 插件 API
2. 路由事件的上报
3. 状态的暴露
4. 时间线事件

## 4. 写作要求
### 开篇方式
"Vue DevTools 是调试 Vue 应用的利器。Vue Router 与它深度集成。"

### 结构组织
```
1. DevTools 路由面板概览
2. 插件 API 介绍
3. 事件上报实现
4. 状态暴露
5. 在 Mini Router 中集成
6. 本章小结
```

## 5. 技术细节
### 源码参考
- `packages/router/src/devtools.ts`

### 实现要点
```typescript
import { setupDevtoolsPlugin } from '@vue/devtools-api'

export function addDevtools(app: App, router: Router) {
  setupDevtoolsPlugin({
    id: 'vue-router',
    label: 'Vue Router',
    app,
  }, api => {
    // 添加时间线
    api.addTimelineLayer({
      id: 'router:navigations',
      label: 'Router Navigations',
      color: 0x40a8c4,
    })
    
    // 监听导航
    router.afterEach((to, from, failure) => {
      api.addTimelineEvent({
        layerId: 'router:navigations',
        event: {
          title: to.path,
          data: { to, from, failure },
        },
      })
    })
  })
}
```

## 7. 章节检查清单
- [ ] DevTools API 介绍
- [ ] 集成代码完整
- [ ] 调试效果展示
