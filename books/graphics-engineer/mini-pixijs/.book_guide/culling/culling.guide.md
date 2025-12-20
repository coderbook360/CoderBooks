# 章节写作指导：Culling 视锥裁剪机制

## 1. 章节信息

- **章节标题**: Culling 视锥裁剪机制
- **文件名**: culling/culling.md
- **所属部分**: 第八部分：Culling 与 Mask
- **章节序号**: 43
- **预计阅读时间**: 28分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 深入理解视锥裁剪的原理与实现机制
- 掌握 PixiJS Culling 系统的完整工作流程
- 理解 cullable/culled/cullArea 的协作关系
- 掌握 Culling 性能收益的评估方法

### 技能目标
- 能够为大场景正确配置 Culling
- 能够分析 Culling 是否适用于特定场景
- 能够诊断 Culling 相关的渲染问题

## 3. 内容要点

### 核心概念（必须全部讲解）

#### 3.1 Culling 相关属性
```typescript
// Container 上的 Culling 属性
class Container {
  cullable: boolean;       // 是否参与 Culling 检查
  culled: boolean;         // 是否被剪裁（读取用）
  cullArea: Rectangle | null; // 自定义裁剪区域
  cullableChildren: boolean;  // 是否检查子节点
}
```

#### 3.2 裁剪判断算法
```
Culling 检查流程:

1. 检查 container.cullable === true
     ↓
2. 获取边界：cullArea || getBounds()
     ↓
3. 与视口求交集：
   culled = !bounds.intersects(viewport)
     ↓
4. 如果 culled === true：
   - 跳过本节点渲染
   - 跳过所有子节点
```

#### 3.3 性能收益分析
| 场景 | Culling 效果 | 说明 |
|------|-------------|------|
| **大地图游戏** | ✅ 显著提升 | 90%以上对象可被剪裁 |
| **小屏幕 UI** | ❌ 可能降低 | 边界计算开销 > 渲染节省 |
| **全屏效果** | ❌ 无效 | 所有对象都在视口内 |

**判断公式**:
```
Culling收益 = 节省的渲染时间 - Bounds计算开销
当可见对象 < 50% 时，Culling 通常有收益
```

### 关键知识点（必须全部覆盖）
1. **Culling 原理**: AABB 与视口的交集检测
2. **cullable 启用**: 默认 false，需显式开启
3. **cullArea 作用**: 覆盖自动 Bounds 计算
4. **子节点传播**: 父节点 culled 则子节点不渲染
5. **性能权衡**: Bounds 计算也有开销
6. **动态场景**: 移动对象需每帧重新检查
7. **与 RenderLayer 配合**: 分层 Culling 策略

### 前置知识
- 第41-42章：Bounds 边界计算
- 渲染管线基础

## 4. 写作要求

### 开篇方式
以"为什么要绘制看不见的东西？"开篇，引出 Culling 的设计动机。

### 结构组织
1. **引言**：Culling 的必要性
2. **Culling 原理**：边界与视口交集
3. **启用 Culling**：配置方式
4. **cullArea**：自定义裁剪区域
5. **性能分析**：收益与开销
6. **使用场景**：何时应该使用
7. **小结**：Culling 最佳实践

### 代码示例
- 启用 Culling 配置
- 设置 cullArea
- 性能对比测试

### 图表需求
- **必须**：Culling 原理示意图
- **可选**：性能对比图

## 5. 技术细节

### 源码参考
- `packages/scene/src/culling/CullingSystem.ts`
- `packages/scene/src/container/Container.ts` culling 相关

### 实现要点
- 边界与视口的交集算法
- Culling 状态的传播
- 与渲染管线的集成
- Culling 的缓存策略

### 常见问题
- Q: Culling 总是能提升性能吗？
  A: 不一定，边界计算也有开销，需要权衡
- Q: 子节点会继承父节点的 culled 状态吗？
  A: 父节点被 cull 后子节点不会渲染

## 6. 风格指导

### 语气语调
- 性能优化视角
- 用数据说明效果
- 提供决策指南

### 类比方向
- 将 Culling 类比为"视野范围"—— 只渲染看得见的
- 将 cullArea 类比为"自定义边界"—— 覆盖自动计算

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
- 第41-42章：Bounds

### 后续章节
- 第44章：RenderLayer
- 第127章：性能优化
