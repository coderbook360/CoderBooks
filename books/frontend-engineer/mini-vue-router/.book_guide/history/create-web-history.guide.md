# 章节写作指导：createWebHistory 实现

## 1. 章节信息
- **章节标题**: createWebHistory 实现
- **文件名**: history/create-web-history.md
- **所属部分**: 第二部分：History 模式实现
- **预计阅读时间**: 20分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 createWebHistory 的设计目标
- 掌握 History 模式的完整实现

### 技能目标
- 能够实现一个功能完备的 createWebHistory
- 能够处理 base 路径配置

## 3. 内容要点

### 核心功能
- 创建 History 对象
- push/replace 导航
- 监听 popstate 事件
- 处理 base 路径
- 状态管理

### 关键知识点
1. RouterHistory 接口设计
2. 位置对象的构建
3. base 路径的处理逻辑
4. 导航事件的监听与销毁
5. 滚动位置保存

## 4. 写作要求

### 开篇方式
"History 模式是现代 SPA 的标配。让我们实现 createWebHistory。"

### 结构组织
```
1. RouterHistory 接口定义
2. 位置对象 HistoryLocation 结构
3. createWebHistory 骨架
4. push 方法实现
5. replace 方法实现
6. listen 方法实现
7. base 路径处理
8. 完整代码整合
9. 测试验证
```

### 代码示例
- 演化式代码：从骨架到完整实现
- 每一步都可运行

## 5. 技术细节

### 源码参考
- `packages/router/src/history/html5.ts`
- `packages/router/src/history/common.ts`

### 实现要点
```typescript
interface RouterHistory {
  readonly location: HistoryLocation
  readonly state: HistoryState
  push(to: HistoryLocation, data?: HistoryState): void
  replace(to: HistoryLocation, data?: HistoryState): void
  go(delta: number): void
  listen(callback: NavigationCallback): () => void
  destroy(): void
}
```

### 常见问题
- 如何正确处理带有 base 的路径？
- 多次快速导航如何处理？
- 如何与 Vue Router 的其他模块对接？

## 6. 风格指导

### 语气语调
实现导向，边写边解释

### 代码演化
1. 先定义接口
2. 实现最简版本（只有 push/replace）
3. 添加 listen 功能
4. 添加 base 处理
5. 完善边界情况

## 7. 章节检查清单
- [ ] 接口清晰：RouterHistory 定义明确
- [ ] 演化清晰：代码从简到繁
- [ ] 可测试：提供测试用例
- [ ] 对齐源码：与官方实现思路一致
