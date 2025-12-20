# 章节写作指导：Sprite 精灵基础

## 1. 章节信息

- **章节标题**: Sprite 精灵基础
- **文件名**: sprite/sprite.md
- **所属部分**: 第十部分：Sprite 精灵系统
- **章节序号**: 54
- **预计阅读时间**: 30分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 深入理解 Sprite 在 PixiJS 显示架构中的核心地位
- 掌握 Sprite 类的完整属性体系与内部结构
- 理解 Sprite 与 Texture、Container 的协作关系
- 掌握 Sprite 渲染指令生成的完整机制

### 技能目标
- 能够高效创建和配置 Sprite 实例
- 能够诊断常见的 Sprite 显示问题（尺寸、锚点、颜色）
- 能够理解 Sprite 如何被 Batcher 处理
- 能够优化大量 Sprite 的渲染性能

## 3. 内容要点

### 核心概念（必须全部讲解）

#### 3.1 Sprite 类核心结构
```typescript
class Sprite extends Container {
  // 纹理
  texture: Texture;
  
  // 锚点（归一化 0-1）
  anchor: ObservablePoint;
  
  // 着色（16进制颜色）
  tint: number;           // 默认 0xFFFFFF
  tintColor: Color;       // Color 对象封装
  
  // 混合模式
  blendMode: BLEND_MODES; // 默认 NORMAL
  
  // 尺寸（计算属性）
  get width(): number { return Math.abs(this.scale.x) * this.texture.orig.width; }
  get height(): number { return Math.abs(this.scale.y) * this.texture.orig.height; }
}
```

#### 3.2 Anchor 锚点详解
| anchor 值 | 位置 | 适用场景 |
|----------|------|----------|
| `(0, 0)` | 左上角 | 默认，适合 UI 布局 |
| `(0.5, 0.5)` | 中心 | 旋转、缩放效果 |
| `(0.5, 1)` | 底部中心 | 角色站立定位 |
| `(1, 0)` | 右上角 | 右对齐 UI |

#### 3.3 渲染指令生成
```typescript
// Sprite 生成的渲染指令结构
interface SpriteRenderInstruction {
  type: 'sprite';
  texture: Texture;
  vertices: Float32Array;  // 4个顶点位置
  uvs: Float32Array;       // 4个UV坐标
  indices: Uint16Array;    // [0,1,2, 0,2,3]
  tint: number;
  blendMode: BLEND_MODES;
}
```

### 关键知识点（必须全部覆盖）
1. **继承体系**: Sprite → Container → EventEmitter
2. **创建方式**: `new Sprite(texture)`, `Sprite.from(source)`
3. **属性响应式**: texture/anchor/tint 变更触发脏标记
4. **尺寸与边界**: `width/height` 受 `scale` 和 `texture.orig` 影响
5. **顶点计算**: 考虑 anchor、scale、rotation 的顶点位置
6. **批处理兼容**: 相同纹理、blendMode 的 Sprite 可合批
7. **View 模式**: SpriteView 分离渲染逻辑

### 前置知识
- 第33-37章：场景图结构与变换
- 第48-50章：Texture 与 TextureSource

## 4. 写作要求

### 开篇方式
以"如何在屏幕上显示一张图片？"开篇，用最基本的需求引入 Sprite。

### 结构组织
1. **引言**：显示图片的需求
2. **Sprite 概念**：定义与作用
3. **创建 Sprite**：多种创建方式
4. **核心属性**：逐一详解
5. **渲染流程**：如何变成像素
6. **使用模式**：常见应用场景
7. **小结**：Sprite 要点回顾

### 代码示例
- 创建 Sprite
- 设置属性
- 动态换肤（更换 Texture）

### 图表需求
- **必须**：Sprite 类图
- **必须**：anchor 效果示意图
- **可选**：渲染流程简图

## 5. 技术细节

### 源码参考
- `packages/scene/src/sprite/Sprite.ts`
- `packages/scene/src/sprite/SpriteView.ts`

### 实现要点
- 继承自 Container
- View 模式的应用
- 属性变更的脏标记
- 尺寸与边界计算

### 常见问题
- Q: Sprite 和 Container 有什么区别？
  A: Sprite 是带纹理的 Container，专门用于显示图片
- Q: 如何让 Sprite 以中心旋转？
  A: 设置 anchor.set(0.5)

## 6. 风格指导

### 语气语调
- 入门友好
- 概念清晰
- 示例丰富

### 类比方向
- 将 Sprite 类比为"贴纸"—— 一张可以移动、旋转、缩放的图片
- 将 Anchor 类比为"图钉"—— 固定在哪个点

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
- 第33-37章：场景图
- 第48-50章：纹理系统

### 后续章节
- 第55章：Sprite 渲染管线
- 第56-59章：Sprite 系统其他章节
