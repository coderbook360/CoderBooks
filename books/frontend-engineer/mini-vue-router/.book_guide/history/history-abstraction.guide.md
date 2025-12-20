# 章节写作指导：History 抽象层设计

## 1. 章节信息
- **章节标题**: History 抽象层设计
- **文件名**: history/history-abstraction.md
- **所属部分**: 第二部分：History 模式实现
- **预计阅读时间**: 12分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 理解三种 History 模式的统一抽象设计
- 理解接口隔离与依赖倒置原则的应用

### 技能目标
- 能够设计可扩展的 History 抽象接口
- 理解工厂模式在路由库中的应用

## 3. 内容要点

### 设计思想
- 接口统一：三种模式实现同一接口
- 依赖倒置：Router 依赖抽象而非具体实现
- 开闭原则：新增模式无需修改现有代码

### 关键知识点
1. RouterHistory 接口设计
2. HistoryLocation 和 HistoryState 类型
3. NavigationCallback 回调类型
4. 工厂函数 vs 类的选择
5. 公共工具函数抽取

## 4. 写作要求

### 开篇方式
"三种 History 模式，一套统一接口。这就是抽象的力量。"

### 结构组织
```
1. 为什么需要抽象
2. RouterHistory 接口全解析
3. 公共类型定义
4. 公共工具函数
   - normalizeBase
   - createHref
   - parseURL
5. 设计模式分析
6. 如何扩展新的 History 模式
7. 本章小结
```

### 代码示例
- 完整的类型定义
- 公共工具函数实现

## 5. 技术细节

### 源码参考
- `packages/router/src/history/common.ts`

### 实现要点
```typescript
export interface RouterHistory {
  readonly base: string
  readonly location: HistoryLocation
  readonly state: HistoryState
  
  push(to: HistoryLocation, data?: HistoryState): void
  replace(to: HistoryLocation, data?: HistoryState): void
  go(delta: number, triggerListeners?: boolean): void
  
  listen(callback: NavigationCallback): () => void
  createHref(location: HistoryLocation): string
  destroy(): void
}
```

## 6. 风格指导

### 语气语调
架构设计风格，强调设计决策背后的思考

### 类比方向
- 抽象接口 → USB 接口标准
- 不同实现 → 不同厂商的 USB 设备

## 7. 章节检查清单
- [ ] 接口完整：覆盖所有公共方法
- [ ] 设计原则：SOLID 原则的体现
- [ ] 扩展性：说明如何添加新模式
