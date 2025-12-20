# 章节写作指导：go、back、forward 实现

## 1. 章节信息
- **章节标题**: go、back、forward 实现
- **文件名**: router/history-navigation.md
- **所属部分**: 第五部分：核心 Router 实例
- **预计阅读时间**: 10分钟
- **难度等级**: 初级

## 2. 学习目标
### 知识目标
- 理解历史导航方法的实现原理
- 掌握与 History API 的对接

### 技能目标
- 能够实现 go、back、forward 方法

## 3. 内容要点
### 核心方法
- `go(delta)`：前进或后退 delta 步
- `back()`：等价于 `go(-1)`
- `forward()`：等价于 `go(1)`

### 关键知识点
1. 委托给 History 模块
2. 与 popstate 事件的配合
3. 守卫的触发时机

## 4. 写作要求
### 开篇方式
"浏览器的前进后退按钮背后，是 history.go() 方法。Vue Router 如何与之配合？"

### 结构组织
```
1. 历史导航 API 概述
2. go 方法实现
3. back 和 forward 实现
4. popstate 事件处理
5. 与守卫的关系
6. 本章小结
```

## 5. 技术细节
### 实现要点
```typescript
function go(delta: number) {
  routerHistory.go(delta)
}

const back = () => go(-1)
const forward = () => go(1)
```

## 7. 章节检查清单
- [ ] 三个方法完整
- [ ] History 委托清晰
- [ ] popstate 配合正确
