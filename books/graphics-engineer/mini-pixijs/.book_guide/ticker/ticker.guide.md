# 章节写作指导：Ticker 帧循环系统

## 1. 章节信息

- **章节标题**: Ticker 帧循环系统
- **文件名**: ticker/ticker.md
- **所属部分**: 第十八部分：Ticker 动画系统
- **章节序号**: 107
- **预计阅读时间**: 30分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 深入理解 Ticker 的帧循环实现机制
- 掌握 deltaTime 的计算原理与应用
- 理解优先级系统的设计与作用
- 掌握 Ticker.shared 与自定义 Ticker 的使用场景

### 技能目标
- 能够使用 Ticker API 实现流畅的动画
- 能够使用 deltaTime 实现帧率无关动画
- 能够诊断帧循环相关的性能问题

## 3. 内容要点

### 核心概念（必须全部讲解）

#### 3.1 Ticker 类结构
```typescript
class Ticker {
  // 状态
  started: boolean;
  autoStart: boolean;
  
  // 时间数据
  deltaTime: number;      // 帧间隔（归一化，60fps 时约等于 1）
  deltaMS: number;        // 帧间隔（毫秒）
  elapsedMS: number;      // 上一帧耗时
  lastTime: number;       // 上一帧时间戳
  
  // 配置
  speed: number;          // 时间缩放系数
  minFPS: number;         // 最低帧率限制
  maxFPS: number;         // 最高帧率限制
  
  // 回调管理
  add(fn: TickerCallback, context?, priority?): this;
  addOnce(fn: TickerCallback, context?, priority?): this;
  remove(fn: TickerCallback, context?): this;
}
```

#### 3.2 帧循环流程
```
requestAnimationFrame 触发
    ↓
计算 deltaTime = (now - lastTime) / (1000/60)
    ↓
应用 speed 系数: deltaTime *= speed
    ↓
限制帧率: clamp(minFPS, maxFPS)
    ↓
按优先级排序回调列表
    ↓
依次执行回调: fn(deltaTime)
    ↓
下一帧请求
```

#### 3.3 优先级系统
```typescript
enum UPDATE_PRIORITY {
  INTERACTION = 50,  // 交互检测（最先执行）
  HIGH = 25,
  NORMAL = 0,        // 默认优先级
  LOW = -25,
  UTILITY = -50,     // 工具任务（最后执行）
}

// 使用示例
ticker.add(updateAnimation, null, UPDATE_PRIORITY.HIGH);
ticker.add(render, null, UPDATE_PRIORITY.LOW);
```

### 关键知识点（必须全部覆盖）
1. **deltaTime 含义**: 归一化到 60fps 的时间间隔
2. **回调管理**: add/addOnce/remove 的实现
3. **优先级排序**: 回调执行顺序控制
4. **Ticker.shared**: 全局共享实例
5. **暂停与恢复**: start()/stop() 方法
6. **帧率限制**: minFPS/maxFPS 的作用
7. **与 Application 的集成**: app.ticker 的用法

### 前置知识
- JavaScript 事件循环
- requestAnimationFrame 基础

## 4. 写作要求

### 开篇方式
以"游戏中的动画是如何动起来的？"开篇，引出 Ticker 的作用。

### 结构组织
1. **引言**：帧循环的必要性
2. **基本用法**：add 和 remove
3. **deltaTime**：时间计算
4. **优先级**：执行顺序
5. **共享 Ticker**：全局实例
6. **控制方法**：暂停、帧率
7. **小结**：Ticker 使用要点

### 代码示例
- 基本回调添加
- deltaTime 使用
- 优先级设置

### 图表需求
- **可选**：Ticker 工作流程图

## 5. 技术细节

### 源码参考
- `packages/ticker/src/Ticker.ts`

### 实现要点
- requestAnimationFrame 封装
- 回调列表管理
- deltaTime 计算
- 优先级排序

### 常见问题
- Q: 为什么用 deltaTime 而不是固定值？
  A: 确保不同帧率下动画速度一致
- Q: 共享 Ticker 和自己创建的有什么区别？
  A: 共享 Ticker 是全局的，自己创建的可以独立控制

## 6. 风格指导

### 语气语调
- 动画视角
- 实用导向
- 示例丰富

### 类比方向
- 将 Ticker 类比为"节拍器"—— 控制动画节奏
- 将 deltaTime 类比为"时间间隔"—— 告诉你过了多久

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
- 无特定前置

### 后续章节
- 第108章：Ticker 实现原理
- 第109-110章：其他 Ticker 章节
