# 章节写作指导：Geometry 几何体数据结构

## 1. 章节信息

- **章节标题**: Geometry 几何体数据结构
- **文件名**: mesh/geometry.md
- **所属部分**: 第十三部分：Mesh 网格系统
- **章节序号**: 77
- **预计阅读时间**: 35分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 深入理解 Geometry 的完整数据结构设计
- 掌握 Attribute 和 Buffer 的协作关系
- 理解索引缓冲区对渲染性能的影响
- 掌握动态几何体的更新机制

### 技能目标
- 能够从零创建自定义 Geometry
- 能够诊断顶点数据相关的渲染问题
- 能够优化几何体的内存与性能

## 3. 内容要点

### 核心概念（必须全部讲解）

#### 3.1 Geometry 类结构
```typescript
class Geometry {
  // 顶点属性集合
  attributes: Record<string, Attribute>;
  
  // 索引缓冲区（可选）
  indexBuffer: Buffer | null;
  
  // 标准属性名
  static POSITION = 'aPosition';  // vec2/vec3
  static UV = 'aUV';              // vec2
  static COLOR = 'aColor';        // vec4 (RGBA)
  static NORMAL = 'aNormal';      // vec3
}
```

#### 3.2 Attribute 配置详解
```typescript
interface Attribute {
  buffer: Buffer;           // 数据来源
  format: AttributeFormat;  // 数据格式
  offset: number;           // 起始偏移（字节）
  stride: number;           // 步长（字节）
  instance: boolean;        // 是否实例属性
}

// 常见格式
type AttributeFormat = 
  | 'float32x2'  // vec2: 8 bytes
  | 'float32x3'  // vec3: 12 bytes
  | 'float32x4'  // vec4: 16 bytes
  | 'uint8x4'    // 颜色: 4 bytes
  | 'uint16x2';  // 索引: 4 bytes
```

#### 3.3 布局方式对比
```
交叉存储 (Interleaved):
| pos.x | pos.y | uv.u | uv.v | pos.x | pos.y | uv.u | uv.v | ...
  stride = 16, position.offset = 0, uv.offset = 8

分离存储 (Separate):
Buffer1: | pos.x | pos.y | pos.x | pos.y | ...
Buffer2: | uv.u | uv.v | uv.u | uv.v | ...
  stride = 8, offset = 0

交叉存储缓存友好，分离存储更灵活
```

### 关键知识点（必须全部覆盖）
1. **Geometry 类结构**: 属性集合、索引、拓扑模式
2. **Buffer 创建**: 类型化数组、usage flags
3. **Attribute 配置**: format、stride、offset 的计算
4. **索引缓冲作用**: 顶点复用、减少数据量
5. **动态更新**: `buffer.update()` 的时机与性能
6. **GPU 资源同步**: WebGL VAO / WebGPU BindGroup
7. **内置几何体**: PlaneGeometry、QuadGeometry

### 前置知识
- 第76章：Mesh 基础
- 第14章：WebGL Buffer

## 4. 写作要求

### 开篇方式
以"顶点数据如何组织才能让 GPU 理解？"开篇，引入 Geometry 的数据组织。

### 结构组织
1. **引言**：顶点数据的组织
2. **Geometry 结构**：类设计
3. **Buffer 管理**：数据存储
4. **Attribute 配置**：属性定义
5. **索引缓冲**：顶点复用
6. **动态更新**：实时修改
7. **小结**：Geometry 使用要点

### 代码示例
- 创建自定义 Geometry
- 配置多个 Attribute
- 使用索引缓冲

### 图表需求
- **必须**：Geometry 数据结构图
- **必须**：索引缓冲作用示意
- **可选**：Attribute 布局图

## 5. 技术细节

### 源码参考
- `packages/core/src/rendering/geometry/Geometry.ts`
- `packages/core/src/rendering/geometry/Buffer.ts`
- `packages/core/src/rendering/geometry/Attribute.ts`

### 实现要点
- Buffer 的类型化数组管理
- Attribute 的 stride 和 offset
- 交叉存储与分离存储
- GPU 资源同步

### 常见问题
- Q: 如何动态更新几何体？
  A: 修改 Buffer 数据后调用 update()
- Q: 什么时候需要索引缓冲？
  A: 顶点共享时使用，可以减少数据量

## 6. 风格指导

### 语气语调
- 底层数据视角
- 结构清晰
- GPU 概念对接

### 类比方向
- 将 Geometry 类比为"零件清单"—— 记录所有顶点信息
- 将 Index 类比为"组装说明"—— 指定如何连接

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
- 第76章：Mesh 基础

### 后续章节
- 第78章：MeshGeometry
- 第79-81章：其他 Mesh 章节
