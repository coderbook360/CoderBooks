# 章节写作指导：渲染器架构设计

## 1. 章节信息

- **章节标题**: 渲染器架构设计
- **文件名**: rendering/renderer-architecture.md
- **所属部分**: 第二部分：渲染器架构
- **章节序号**: 6
- **预计阅读时间**: 35分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 深入理解 PixiJS v8 渲染器的分层架构设计思想
- 掌握 AbstractRenderer → WebGLRenderer/WebGPURenderer 的继承体系
- 理解 System 组合模式如何实现渲染器的模块化
- 掌握渲染器配置选项、初始化流程与生命周期管理

### 技能目标
- 能够追踪 `render()` 方法的完整执行链路
- 能够分析任意 System 如何被注册和初始化
- 能够创建自定义配置的渲染器实例
- 能够诊断渲染器初始化失败的问题

## 3. 内容要点

### 核心概念（必须全部讲解）

#### 3.1 AbstractRenderer 核心接口
```typescript
abstract class AbstractRenderer {
  // 核心渲染入口
  abstract render(options: RenderOptions): void;
  
  // 渲染目标管理
  canvas: ICanvas;
  view: HTMLCanvasElement;
  
  // 尺寸控制
  width: number;
  height: number;
  resolution: number;
  
  // System 访问（动态挂载）
  [systemName: string]: System;
  
  // 生命周期
  resize(width: number, height: number): void;
  destroy(removeView?: boolean): void;
}
```

#### 3.2 渲染器 System 组成
| System 类别 | 典型 System | 职责 |
|------------|------------|------|
| **渲染管线** | RenderSystem | 渲染指令执行 |
| **纹理管理** | TextureSystem | 纹理上传与缓存 |
| **着色器** | ShaderSystem | Shader 编译与绑定 |
| **几何体** | GeometrySystem | 顶点数据管理 |
| **状态管理** | StateSystem | GPU 状态机控制 |
| **批处理** | BatchSystem | 绘制调用合并 |

#### 3.3 System 初始化顺序
```
1. 创建 Systems 实例 → 2. 调用 system.init() → 3. 建立依赖关系 → 4. 就绪
```
**关键：** 初始化顺序由 `runners` 配置决定，保证依赖关系正确

### 关键知识点（必须全部覆盖）
1. **渲染器的职责边界**: 协调 System，不直接操作 GPU
2. **System 注册机制**: `runners` 定义、`systems` 字典
3. **渲染器生命周期**: create → init → render → resize → destroy
4. **多渲染器实例**: 资源隔离 vs 资源共享策略
5. **渲染器与场景图解耦**: Container 不依赖具体渲染器类型
6. **Context Loss 处理**: WebGL 上下文丢失与恢复

### 前置知识
- 第1章：架构全景（整体设计理念）
- 第4章：扩展系统（Extensions 机制）
- WebGL/WebGPU 渲染管线基础

## 4. 写作要求

### 开篇方式
以"渲染器是 PixiJS 的心脏"开篇，强调理解渲染器架构对理解整个引擎的重要性。

### 结构组织
1. **引言**：渲染器在架构中的核心地位
2. **架构分层**：AbstractRenderer → 具体渲染器
3. **System 组合**：渲染器如何由 System 组成
4. **配置与初始化**：RendererOptions 详解
5. **渲染目标管理**：Canvas 与 RenderTexture
6. **生命周期**：创建、运行、销毁
7. **小结**：渲染器设计的关键决策

### 代码示例
- 创建自定义配置的渲染器
- AbstractRenderer 核心接口定义
- System 注册代码片段

### 图表需求
- **必须**：渲染器类继承关系图
- **必须**：渲染器 System 组成图
- **可选**：渲染器初始化时序图

## 5. 技术细节

### 源码参考
- `packages/core/src/rendering/renderers/shared/AbstractRenderer.ts`
- `packages/webgl/src/WebGLRenderer.ts`
- `packages/webgpu/src/WebGPURenderer.ts`
- `packages/core/src/rendering/renderers/types.ts`

### 实现要点
- AbstractRenderer 如何定义公共 API
- 渲染器如何收集和初始化 System
- 渲染循环的入口点 `render()` 方法
- 资源管理（context loss 处理）

### 常见问题
- Q: 一个页面能创建多个渲染器吗？
  A: 可以，但要注意资源管理和性能
- Q: 渲染器和 Application 是什么关系？
  A: Application 是渲染器的便捷封装，包含 Ticker 和 Stage

## 6. 风格指导

### 语气语调
- 架构设计视角，解释"为什么这样设计"
- 使用 UML 类图辅助说明
- 强调设计模式的应用

### 类比方向
- 将渲染器类比为"汽车引擎"—— 核心动力源
- 将 System 类比为"引擎部件"—— 各司其职

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
- 第1章：架构全景
- 第4章：扩展系统

### 后续章节
- 第7章将深入 System 模式
- 第11-19章将详解 WebGL 渲染器
- 第20-27章将详解 WebGPU 渲染器
