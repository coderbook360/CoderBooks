# 章节写作指导：事件系统架构

## 1. 章节信息

- **章节标题**: 事件系统架构
- **文件名**: events/event-system.md
- **所属部分**: 第十七部分：Events 事件系统
- **章节序号**: 101
- **预计阅读时间**: 32分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 深入理解 PixiJS 事件系统的分层架构
- 掌握 DOM 事件到 PixiJS 事件的完整流转链路
- 理解 FederatedEvent 的设计动机与实现
- 掌握 eventMode 的三种模式及其适用场景

### 技能目标
- 能够为任意显示对象添加交互事件
- 能够诊断事件不触发的常见问题
- 能够优化大量交互对象的性能

## 3. 内容要点

### 核心概念（必须全部讲解）

#### 3.1 事件系统核心组件
```typescript
// 事件系统主类
class EventSystem {
  domElement: HTMLElement;       // DOM 监听目标
  rootBoundary: EventBoundary;   // 根事件边界
  
  // DOM 事件到 PixiJS 事件的映射
  mapPositionToPoint(point: Point, x: number, y: number): void;
}

// 事件边界 - 负责命中测试和事件分发
class EventBoundary {
  rootTarget: Container;         // 根容器
  hitTest(x: number, y: number): Container | null;
  dispatch(event: FederatedEvent): void;
}
```

#### 3.2 事件流转链路
```
DOM 事件 (MouseEvent/TouchEvent)
    ↓
EventSystem.onPointerDown() 捕获
    ↓
坐标转换 (mapPositionToPoint)
    ↓
EventBoundary.hitTest() 确定目标
    ↓
创建 FederatedPointerEvent
    ↓
事件传播 (捕获 → 目标 → 冒泡)
    ↓
调用 target.emit(type, event)
```

#### 3.3 eventMode 三种模式
| 模式 | 值 | 行为 | 适用场景 |
|------|-----|------|----------|
| **无交互** | `'none'` | 不参与命中测试 | 纯装饰元素 |
| **静态** | `'static'` | 参与命中，但不检测移动 | 按钮、图标 |
| **动态** | `'dynamic'` | 始终检测，支持 hover | 拖拽元素 |
| **自动** | `'auto'` | 有监听器时自动启用 | 默认值 |

### 关键知识点（必须全部覆盖）
1. **架构设计**: EventSystem / EventBoundary / FederatedEvent
2. **DOM 事件映射**: pointer/mouse/touch 到 FederatedEvent
3. **命中测试算法**: 遍历顺序、边界检查、透明度处理
4. **事件传播**: 捕获阶段 → 目标阶段 → 冒泡阶段
5. **性能优化**: eventMode 选择、interactiveChildren
6. **触摸支持**: 多点触摸的追踪与管理
7. **v8 变化**: interactive → eventMode 的迁移

### 前置知识
- 第34章：Container 容器实现
- DOM 事件模型基础

## 4. 写作要求

### 开篇方式
以"如何让画布上的精灵响应点击？"开篇，引出事件系统。

### 结构组织
1. **引言**：交互的重要性
2. **系统架构**：组件关系
3. **事件映射**：DOM → PixiJS
4. **基本使用**：事件监听
5. **事件类型**：类型概览
6. **交互设置**：启用交互
7. **小结**：事件系统要点

### 代码示例
- 基本事件监听
- 事件类型使用
- 交互设置

### 图表需求
- **必须**：事件系统架构图
- **可选**：事件流程图

## 5. 技术细节

### 源码参考
- `packages/events/src/EventSystem.ts`
- `packages/events/src/FederatedEvent.ts`

### 实现要点
- DOM 事件监听
- 事件代理模式
- 坐标转换
- 性能优化

### 常见问题
- Q: 为什么点击没有反应？
  A: 需要设置 eventMode 为 'static' 或 'dynamic'
- Q: 事件会冒泡吗？
  A: 是的，遵循类似 DOM 的冒泡机制

## 6. 风格指导

### 语气语调
- 交互视角
- 实用导向
- 对比 DOM 事件

### 类比方向
- 将事件系统类比为"神经系统"—— 传递用户操作
- 将事件边界类比为"感知范围"—— 决定谁接收事件

## 7. 章节检查清单

- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操

## 8. 与其他章节的关系

### 前置章节
- 第7章：Container

### 后续章节
- 第102章：FederatedEvent
- 第103-106章：事件系统详解
