# 章节写作指导：Batcher 批处理器

## 1. 章节信息

- **章节标题**: Batcher 批处理器
- **文件名**: batch/batcher.md
- **所属部分**: 第十五部分：Batch 批处理系统
- **章节序号**: 91
- **预计阅读时间**: 35分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 理解 Batcher 的核心职责与设计动机
- 掌握批次数据结构与顶点布局
- 了解批次提交的触发条件与时机
- 理解多纹理批处理的实现原理

### 技能目标
- 能够追踪 Batcher 的完整工作流程
- 能够诊断批次打断的原因
- 能够评估批处理效率并进行优化

## 3. 内容要点

### 核心概念（必须全部讲解）
- **Batcher**: 批处理器核心类，负责收集、合并、提交绘制数据
- **BatchElement**: 批次元素，封装单个可批处理对象的数据
- **顶点布局**: aPosition(2) + aUV(2) + aColor(4) + aTextureId(1) = 9 floats/vertex
- **批次上限**: MAX_TEXTURES (通常8-16) 和 顶点缓冲容量

### 关键知识点（必须全部覆盖）

#### 3.1 Batcher 类核心结构
```typescript
// 关键属性（需详细解释每个属性的作用）
class Batcher {
  readonly uid: number;
  attributeBuffer: ViewableBuffer;  // 顶点数据缓冲
  indexBuffer: Uint16Array;         // 索引数据缓冲
  
  _vertexSize: number;              // 每顶点字节数
  _vertexCount: number;             // 当前顶点数
  _indexCount: number;              // 当前索引数
  
  _batchIndex: number;              // 批次中的元素索引
  _batches: Batch[];                // 批次数组
  
  _textures: BindableTexture[];     // 当前批次使用的纹理
  _textureCount: number;            // 当前纹理数量
}
```

#### 3.2 批次提交触发条件（必须详细说明）
1. **纹理超限**: 新元素纹理不在当前批次纹理列表且列表已满
2. **混合模式变化**: 新元素的 blendMode 与当前批次不同
3. **顶点缓冲满**: 剩余空间不足以容纳新元素
4. **手动刷新**: 调用 flush() 方法
5. **渲染结束**: 帧结束时提交所有剩余数据

#### 3.3 顶点数据填充流程
```
element.packAsQuad() 调用链：
1. calculateVertices() - 计算4个顶点的世界坐标
2. updateTextureData() - 获取UV和纹理ID
3. 填充 attributeBuffer:
   - offset+0: x, y (position)
   - offset+2: u, v (uv)
   - offset+4: r, g, b, a (color, packed)
   - offset+8: textureId
```

#### 3.4 性能关键指标
- **批次数量**: 理想情况下 < 50 per frame
- **顶点吞吐**: 每批次通常 4096-16384 顶点
- **纹理切换代价**: 每次切换约 0.1-0.5ms

### 前置知识
- 第90章：批处理概览与设计理念
- 第14章：GlBuffer 缓冲区管理
- WebGL 顶点属性理解

## 4. 写作要求

### 开篇方式
以实际问题开篇："当场景中有1000个Sprite时，如果每个都单独绘制，就需要1000次Draw Call，GPU会忙于处理命令而非真正渲染。Batcher的核心使命就是把这1000次调用合并成几次。"

### 结构组织
1. **引言** (5%): 批处理的必要性与性能对比数据
2. **Batcher 类设计** (20%): 属性、方法、生命周期
3. **顶点数据布局** (20%): 详细的内存布局与填充过程
4. **批次管理逻辑** (25%): 何时开始、何时提交、如何判断
5. **多纹理支持** (15%): 纹理数组与 textureId 的配合
6. **性能分析** (10%): 指标、瓶颈、优化方向
7. **小结** (5%): 设计权衡与最佳实践

### 代码示例要求
1. **必须展示**: Batcher.start() 和 Batcher.finish() 的完整流程
2. **必须展示**: packAsQuad() 的顶点填充细节
3. **必须展示**: 批次打断的判断逻辑
4. **推荐展示**: 自定义批处理元素的接口实现

### 图表需求
- **必须**: Batcher 数据流图（从 Sprite 到 GPU Buffer）
- **必须**: 顶点缓冲内存布局图（每个属性的偏移和大小）
- **必须**: 批次生命周期状态图
- **可选**: 性能对比图（有/无批处理的 Draw Call 对比）

## 5. 技术细节

### 源码精确引用
| 概念 | 文件路径 | 关键行号/方法 |
|-----|---------|--------------|
| Batcher 类定义 | `packages/rendering/src/batcher/shared/Batcher.ts` | class Batcher |
| 顶点属性定义 | `packages/rendering/src/batcher/shared/BatchGeometry.ts` | attributeBuffer 结构 |
| 批次提交逻辑 | `packages/rendering/src/batcher/shared/Batcher.ts` | break() 和 _finishBatch() |
| 纹理绑定 | `packages/rendering/src/batcher/gl/GlBatchAdaptor.ts` | execute() |

### 实现要点深度解析

#### 5.1 ViewableBuffer 的设计精妙
```typescript
// 同一块内存，不同视图访问
const buffer = new ViewableBuffer(size);
buffer.float32View  // 用于 position, uv
buffer.uint32View   // 用于 packed color
```
**必须解释**: 为什么用 Uint32 存储颜色而非 4 个 Float32？（内存效率：4字节 vs 16字节）

#### 5.2 纹理 ID 的传递机制
- 顶点着色器: `aTextureId` 作为 float 属性传入
- 片段着色器: 使用 `texture2D(uSamplers[int(vTextureId)], vUV)` 采样
- **关键限制**: WebGL 1.0 不支持动态索引，需要 switch-case 展开

#### 5.3 索引复用模式
```
四边形索引模式: [0,1,2, 0,2,3]
每增加一个 Sprite:
- 顶点 +4
- 索引 +6
索引值 = 基础值 + [0,1,2,0,2,3]
```

### 常见问题与深度解答

- **Q: 为什么批次打断时不直接绘制，而是记录 Batch 对象？**
  A: 延迟执行允许在渲染阶段一次性设置所有 GPU 状态，减少状态切换。BatcherPipe.execute() 才是真正触发绘制的地方。

- **Q: 相邻的两个 Sprite 使用同一纹理但 blendMode 不同，会被批处理吗？**
  A: 不会。blendMode 是批次边界条件之一。优化建议：对元素按 blendMode 分组排序。

- **Q: 如何诊断"为什么批次这么多"？**
  A: 使用 `renderer.renderPipes.batch._batchIndex` 在帧末获取批次数量，或使用 Spector.js 查看 Draw Call 序列。

## 6. 风格指导

### 语气语调
- 实现细节视角，假设读者要自己实现一个 Batcher
- 多用"因为...所以..."结构解释设计决策
- 适时提供性能数据支撑观点

### 类比方向
- 将 Batcher 类比为"物流分拣中心"—— 把零散包裹按目的地（纹理、混合模式）分拣后批量发车
- 将 ViewableBuffer 类比为"多功能储物格"—— 同一个格子，取出时可以当数字用，也可以当颜色用

### 深度要求
- 每个核心概念必须有源码级解释
- 至少 3 处"为什么这样设计"的分析
- 至少 2 处性能相关的量化说明

## 7. 章节检查清单

- [ ] 目标明确：读者能否说出 Batcher 的输入/输出是什么
- [ ] 术语统一：BatchElement、Batch、Batcher 是否区分清楚
- [ ] 最小实现：是否展示了最简单的批处理流程
- [ ] 边界处理：批次打断条件是否全部列出
- [ ] 性能与权衡：是否说明了批处理的代价（内存 vs 绘制次数）
- [ ] 替代方案：是否提及 Instancing 作为另一种批处理方式
- [ ] 图示与代码：顶点布局图是否与代码中的偏移量对应
- [ ] 总结与练习：是否提供诊断批次数量过多的排查步骤

## 8. 与其他章节的关系

### 前置章节
- 第90章：批处理概览（理解为什么需要批处理）
- 第14章：GlBuffer（理解 GPU 缓冲区）
- 第15章：GlGeometry（理解顶点属性布局）

### 后续章节
- 第92章：BatchGeometry（批次几何体的具体结构）
- 第93章：DefaultBatcher（默认实现与扩展方式）
- 第94章：纹理打包（如何进一步优化批处理）

### 交叉引用
- 第54章 Sprite：Sprite 如何参与批处理
- 第68章 Graphics GPU 渲染：Graphics 的批处理策略
