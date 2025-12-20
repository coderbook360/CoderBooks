# 章节写作指导：History API 深度剖析

## 1. 章节信息
- **章节标题**: History API 深度剖析
- **文件名**: history/history-api-deep-dive.md
- **所属部分**: 第二部分：History 模式实现
- **预计阅读时间**: 15分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 深入理解 HTML5 History API 的设计与实现
- 掌握 pushState、replaceState、popstate 的完整行为
- 理解 state 对象的作用与限制

### 技能目标
- 能够直接使用 History API 实现页面导航
- 能够处理 History API 的各种边界情况

## 3. 内容要点

### 核心 API
- `history.pushState(state, title, url)`
- `history.replaceState(state, title, url)`
- `history.go(delta)`
- `history.back()` / `history.forward()`
- `popstate` 事件

### 关键知识点
1. pushState vs replaceState 的区别
2. state 对象的序列化限制
3. popstate 事件的触发时机（注意：pushState 不触发！）
4. scrollRestoration 属性
5. History API 的浏览器兼容性

## 4. 写作要求

### 开篇方式
"History API 看似简单，但有很多反直觉的行为。这一章我们彻底搞清楚它。"

### 结构组织
```
1. History API 概述
2. pushState 详解
   - 参数解析
   - URL 同源限制
   - 与页面刷新的关系
3. replaceState 详解
4. popstate 事件的真相
   - 什么情况会触发
   - 什么情况不会触发
   - state 对象的获取
5. go/back/forward 方法
6. scrollRestoration 控制
7. 常见陷阱与注意事项
8. 本章小结
```

### 代码示例
- 完整的 History API 演示代码
- popstate 事件监听示例
- state 对象使用示例

## 5. 技术细节

### 源码参考
- Vue Router: `packages/router/src/history/html5.ts`

### 实现要点
- pushState 的第二个参数（title）目前被大多数浏览器忽略
- state 对象有大小限制（约 640KB）
- popstate 在页面首次加载时不触发（但某些浏览器行为不一致）

### 常见问题
- 为什么 pushState 后地址栏变了，但 popstate 没触发？
- state 对象什么时候应该使用？
- 如何处理用户直接输入 URL 访问？

## 6. 风格指导

### 语气语调
技术深挖风格，像在写 API 文档的深度解析版

### 类比方向
- pushState → 往历史记录栈中压入一个新条目
- replaceState → 替换当前栈顶条目

## 7. 章节检查清单
- [ ] API 覆盖完整：所有 History 方法
- [ ] 边界情况：陷阱和注意事项
- [ ] 代码可运行：示例可直接复制执行
- [ ] 浏览器差异：提及兼容性问题
