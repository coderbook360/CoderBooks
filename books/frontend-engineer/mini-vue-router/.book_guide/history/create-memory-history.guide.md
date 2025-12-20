# 章节写作指导：createMemoryHistory 实现

## 1. 章节信息
- **章节标题**: createMemoryHistory 实现
- **文件名**: history/create-memory-history.md
- **所属部分**: 第二部分：History 模式实现
- **预计阅读时间**: 12分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 Memory 模式的应用场景
- 理解不依赖浏览器 API 的路由实现

### 技能目标
- 能够实现 createMemoryHistory
- 理解如何在 SSR/测试环境中使用

## 3. 内容要点

### 核心特点
- 不依赖浏览器 History API
- 在内存中维护路由栈
- 适用于 SSR、测试、非浏览器环境

### 关键知识点
1. Memory 模式的设计目标
2. 内存路由栈的数据结构
3. push/replace/go 的纯内存实现
4. 与浏览器模式的接口统一

## 4. 写作要求

### 开篇方式
"不是所有代码都运行在浏览器中。SSR、单元测试、Electron 都需要一个不依赖 window 的路由方案。"

### 结构组织
```
1. Memory 模式的应用场景
2. 内存路由栈设计
3. createMemoryHistory 实现
   - 栈结构定义
   - push/replace 实现
   - go/back/forward 实现
   - listen 实现
4. 在 SSR 中使用
5. 在测试中使用
6. 本章小结
```

### 代码示例
- 完整的 createMemoryHistory 实现
- SSR 使用示例
- 测试用例示例

## 5. 技术细节

### 源码参考
- `packages/router/src/history/memory.ts`

### 实现要点
```typescript
interface MemoryHistoryState {
  queue: HistoryLocation[]  // 路由栈
  position: number          // 当前位置
}
```

### 常见问题
- Memory 模式的初始路由如何设置？
- 栈溢出如何处理？

## 6. 风格指导

### 语气语调
实用主义风格，强调场景驱动

## 7. 章节检查清单
- [ ] 场景明确：SSR/测试场景说明
- [ ] 实现完整：与浏览器模式接口一致
- [ ] 示例可用：SSR 和测试示例
