# 章节写作指导：System 系统模式与生命周期

## 1. 章节信息

- **章节标题**: System 系统模式与生命周期
- **文件名**: rendering/system-pattern.md
- **所属部分**: 第二部分：渲染器架构
- **章节序号**: 7
- **预计阅读时间**: 20分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 System 模式的设计理念与优势
- 掌握 System 接口定义与生命周期钩子
- 了解内置 System 的分类与职责
- 理解 System 之间的依赖与协作

### 技能目标
- 能够编写自定义 System
- 能够理解 System 的初始化顺序
- 能够调试 System 相关问题

## 3. 内容要点

### 核心概念（必须全部讲解）
- **System 接口**: init、destroy、contextChange 等钩子
- **SystemRunner**: System 执行管理器
- **System 类型**: rendering system、resource system
- **System 注册**: 通过扩展系统注册

### 关键知识点（必须全部覆盖）
- System 模式 vs 传统继承的优势
- System 生命周期钩子详解
- System 间的依赖注入
- System 的懒初始化机制
- 内置 System 分类（State、Buffer、Texture 等）

### 前置知识
- 第4章扩展系统
- 第6章渲染器架构
- 组合优于继承的设计原则

## 4. 写作要求

### 开篇方式
提出问题："如何在不修改渲染器核心的情况下添加新功能？"引出 System 模式的设计动机。

### 结构组织
1. **引言**：System 模式解决的问题
2. **System 接口**：详解接口定义
3. **生命周期钩子**：init、destroy 等
4. **内置 System 分类**：分类介绍
5. **实战：创建自定义 System**：完整示例
6. **System 间协作**：依赖与通信
7. **小结**：System 模式的设计智慧

### 代码示例
- System 接口完整定义
- 自定义 System 完整实现
- System 注册与使用

### 图表需求
- **必须**：System 生命周期图
- **必须**：内置 System 分类图
- **可选**：System 依赖关系图

## 5. 技术细节

### 源码参考
- `packages/core/src/rendering/renderers/shared/system/System.ts`
- `packages/core/src/rendering/renderers/shared/system/SystemRunner.ts`
- `packages/webgl/src/state/GlStateSystem.ts` - 示例 System

### 实现要点
- System 如何获取渲染器引用
- System 如何访问其他 System
- contextChange 钩子的触发时机
- System 的销毁与资源清理

### 常见问题
- Q: System 之间如何通信？
  A: 通过 renderer 获取其他 System 引用
- Q: System 初始化顺序由什么决定？
  A: 由扩展的 priority 和依赖声明决定

## 6. 风格指导

### 语气语调
- 设计模式视角，强调"分离关注点"
- 对比其他引擎的实现方式
- 用代码说明设计意图

### 类比方向
- 将 System 类比为"器官"—— 各司其职，协同工作
- 将 SystemRunner 类比为"神经系统"—— 协调各器官

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
- 第4章：扩展系统
- 第6章：渲染器架构

### 后续章节
- 第11-19章各 WebGL System 详解
- 第20-27章各 WebGPU System 详解
