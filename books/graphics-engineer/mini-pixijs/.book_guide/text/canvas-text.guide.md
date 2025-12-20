# 章节写作指导：Canvas 文本渲染机制

## 1. 章节信息

- **章节标题**: Canvas 文本渲染机制
- **文件名**: text/canvas-text.md
- **所属部分**: 第十二部分：Text 文本渲染
- **章节序号**: 71
- **预计阅读时间**: 35分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 深入理解 Canvas 2D 文本渲染到 GPU 纹理的完整流程
- 掌握文本度量与多行布局算法
- 理解 resolution 对文本清晰度的影响机制
- 掌握文本渲染的性能优化策略

### 技能目标
- 能够诊断文本模糊、塑形异常等常见问题
- 能够优化大量动态文本的渲染性能
- 能够选择 Text vs BitmapText 的最优方案

## 3. 内容要点

### 核心概念（必须全部讲解）

#### 3.1 文本渲染流程
```
Text 内容变更
    ↓
创建离屏 Canvas (OffscreenCanvas)
    ↓
计算文本度量 (measureText)
    → 字体、字号、行高、总宽高
    ↓
设置 Canvas 尺寸 = 文本尺寸 × resolution
    ↓
样式映射 (TextStyle → Canvas API)
    ↓
绘制文本 (fillText/strokeText)
    ↓
Canvas 转 GPU 纹理 (gl.texImage2D)
    ↓
作为 Sprite 渲染
```

#### 3.2 文本度量细节
```typescript
interface TextMetrics {
  text: string;
  width: number;           // 文本宽度
  height: number;          // 文本高度
  lines: string[];         // 分行后的文本
  lineWidths: number[];    // 每行宽度
  lineHeight: number;      // 行高
  fontProperties: {        // 字体属性
    ascent: number;        // 基线上高度
    descent: number;       // 基线下高度
    fontSize: number;      // 字号
  };
}
```

#### 3.3 性能影响因素
| 因素 | 影响 | 优化建议 |
|------|------|----------|
| **频繁更新** | 每次重绘 Canvas + 上传纹理 | 使用 BitmapText |
| **高 resolution** | 纹理尺寸增加，内存占用高 | 根据屏幕设置合理值 |
| **多行文本** | 换行计算开销 | 预计算并缓存 |
| **特殊效果** | dropShadow、stroke 增加绘制次数 | 简化样式 |

### 关键知识点（必须全部覆盖）
1. **Canvas 2D API**: fillText、strokeText、measureText
2. **度量算法**: 单行 vs 多行、换行策略
3. **样式映射**: TextStyle 到 Canvas 属性的转换
4. **resolution 处理**: 纹理尺寸 = 逻辑尺寸 × resolution
5. **基线对齐**: textBaseline 与垂直布局
6. **纹理缓存**: 未变化时复用已有纹理
7. **与 BitmapText 对比**: 动态 vs 静态的权衡

### 前置知识
- 第69-70章：Text 与 TextStyle
- Canvas 2D API 基础

## 4. 写作要求

### 开篇方式
以"Text 内部是一个隐藏的 Canvas"开篇，揭示文本渲染的实现方式。

### 结构组织
1. **引言**：Canvas 渲染方式
2. **Canvas 2D API**：fillText 等
3. **文本度量**：尺寸计算
4. **换行算法**：多行文本
5. **纹理生成**：Canvas 转纹理
6. **分辨率处理**：高清适配
7. **小结**：Canvas 文本要点

### 代码示例
- Canvas 2D 文本绑制
- 文本度量实现
- 纹理生成逻辑

### 图表需求
- **必须**：文本渲染流程图
- **可选**：文本度量示意图

## 5. 技术细节

### 源码参考
- `packages/text/src/canvas/CanvasTextSystem.ts`
- `packages/text/src/canvas/CanvasTextRenderer.ts`

### 实现要点
- 离屏 Canvas 管理
- 样式到 Canvas 属性映射
- 基线与对齐处理
- 纹理上传时机

### 常见问题
- Q: 文本模糊怎么处理？
  A: 增加 resolution，确保纹理尺寸足够
- Q: 频繁更新文本性能差怎么办？
  A: 考虑使用 BitmapText，或减少更新频率

## 6. 风格指导

### 语气语调
- 实现细节视角
- 解释内部机制
- 提供优化建议

### 类比方向
- 将 Canvas 渲染类比为"拍照"—— 把文本画到 Canvas 再拍成纹理
- 将分辨率类比为"照片清晰度"—— 越高越清晰但越大

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
- 第69-70章：Text 与 TextStyle

### 后续章节
- 第72章：BitmapFont
- 第73-75章：其他文本章节
