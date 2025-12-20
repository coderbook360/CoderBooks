# 章节写作指导：矩阵运算与自定义变换

## 1. 章节信息

- **章节标题**: 矩阵运算与自定义变换
- **文件名**: transforms/matrix-operations.md
- **所属部分**: 第四部分：坐标变换与矩阵
- **预计阅读时间**: 35分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 掌握矩阵的求逆运算
- 理解逆矩阵在坐标转换中的作用
- 掌握错切变换的实现
- 理解 DOMMatrix 类的使用

### 技能目标
- 能够实现矩阵工具类
- 能够进行坐标的正向和逆向变换
- 能够实现任意复杂变换
- 能够使用 DOMMatrix API

## 3. 内容要点

### 核心概念

| 概念 | 解释要求 |
|------|---------|
| **矩阵求逆** | 计算逆矩阵，用于坐标反向变换 |
| **行列式** | 判断矩阵是否可逆的关键值 |
| **错切变换** | 沿某一轴方向的倾斜变换 |
| **DOMMatrix** | 浏览器原生的矩阵类 |

### 关键知识点

- 2x2 行列式计算
- 3x3 仿射矩阵的逆矩阵公式
- 错切矩阵的形式和效果
- DOMMatrix 的属性和方法
- 点坐标变换：正向和逆向

### 边界与限制

- 行列式为零时矩阵不可逆
- 浮点数精度问题
- DOMMatrix 的浏览器兼容性

## 4. 写作要求

### 开篇方式
提出实际问题：在编辑器中，我们需要将鼠标点击位置（屏幕坐标）转换为图形的本地坐标。这需要对变换矩阵进行逆运算。本章将深入矩阵运算，为复杂变换打下基础。

### 结构组织

```
1. 矩阵运算基础
   - 矩阵加减法
   - 矩阵乘法回顾
   - 单位矩阵
   
2. 矩阵求逆
   - 为什么需要逆矩阵
   - 行列式计算
   - 逆矩阵公式
   - 代码实现
   
3. 坐标变换
   - 正向变换：本地坐标 → 世界坐标
   - 逆向变换：世界坐标 → 本地坐标
   - 实际应用场景
   
4. 错切变换
   - 水平错切
   - 垂直错切
   - 组合错切
   - 实际效果
   
5. DOMMatrix API
   - 创建 DOMMatrix
   - 链式变换方法
   - 逆矩阵：invertSelf()
   - 变换点：transformPoint()
   
6. 矩阵工具类实现
   - 完整的 Matrix 类
   - 常用操作封装
   - 与 Canvas API 集成
   
7. 本章小结
```

### 代码示例

1. **行列式计算函数**
2. **矩阵求逆函数**
3. **点坐标变换**
4. **错切效果实现**
5. **DOMMatrix 使用示例**
6. **完整 Matrix 工具类**

### 图表需求

- **错切变换效果图**：展示水平和垂直错切的效果
- **坐标变换示意图**：展示正向和逆向变换的过程

## 5. 技术细节

### 实现要点

```javascript
// 矩阵类（简化版）
class Matrix {
  constructor(a = 1, b = 0, c = 0, d = 1, e = 0, f = 0) {
    this.a = a; this.b = b;
    this.c = c; this.d = d;
    this.e = e; this.f = f;
  }
  
  // 行列式
  determinant() {
    return this.a * this.d - this.b * this.c;
  }
  
  // 是否可逆
  isInvertible() {
    return Math.abs(this.determinant()) > 1e-10;
  }
  
  // 求逆矩阵
  invert() {
    const det = this.determinant();
    if (Math.abs(det) < 1e-10) {
      throw new Error('Matrix is not invertible');
    }
    
    const invDet = 1 / det;
    return new Matrix(
      this.d * invDet,
      -this.b * invDet,
      -this.c * invDet,
      this.a * invDet,
      (this.c * this.f - this.d * this.e) * invDet,
      (this.b * this.e - this.a * this.f) * invDet
    );
  }
  
  // 矩阵乘法
  multiply(m) {
    return new Matrix(
      this.a * m.a + this.c * m.b,
      this.b * m.a + this.d * m.b,
      this.a * m.c + this.c * m.d,
      this.b * m.c + this.d * m.d,
      this.a * m.e + this.c * m.f + this.e,
      this.b * m.e + this.d * m.f + this.f
    );
  }
  
  // 变换点（正向）
  transformPoint(x, y) {
    return {
      x: this.a * x + this.c * y + this.e,
      y: this.b * x + this.d * y + this.f
    };
  }
  
  // 逆变换点
  inverseTransformPoint(x, y) {
    return this.invert().transformPoint(x, y);
  }
  
  // 静态方法：创建变换矩阵
  static translate(tx, ty) {
    return new Matrix(1, 0, 0, 1, tx, ty);
  }
  
  static rotate(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Matrix(cos, sin, -sin, cos, 0, 0);
  }
  
  static scale(sx, sy) {
    return new Matrix(sx, 0, 0, sy, 0, 0);
  }
  
  static skewX(angle) {
    return new Matrix(1, 0, Math.tan(angle), 1, 0, 0);
  }
  
  static skewY(angle) {
    return new Matrix(1, Math.tan(angle), 0, 1, 0, 0);
  }
}

// DOMMatrix 使用示例
const matrix = new DOMMatrix()
  .translate(100, 100)
  .rotate(45)
  .scale(2, 2);

// 变换点
const point = new DOMPoint(10, 20);
const transformed = matrix.transformPoint(point);

// 求逆
const inverse = matrix.inverse();

// 应用到 Canvas
ctx.setTransform(matrix);
```

### 常见问题

| 问题 | 解决方案 |
|------|---------|
| 逆矩阵计算结果异常 | 检查行列式是否接近零 |
| 坐标转换不准确 | 检查正向/逆向变换是否用对 |
| DOMMatrix 不可用 | 使用自定义 Matrix 类作为 Polyfill |
| 浮点精度问题 | 使用适当的精度阈值判断 |

## 6. 风格指导

### 语气语调
- 数学公式配合代码实现
- 强调实际应用场景

### 类比方向
- 逆矩阵类比"撤销操作"
- 坐标变换类比"翻译"

## 7. 与其他章节的关系

### 前置依赖
- 第16章：变换矩阵原理

### 后续章节铺垫
- 为第19章"坐标系转换"提供矩阵工具
- 为第41章"对象变换"提供坐标转换基础

## 8. 章节检查清单

- [ ] 目标明确：读者能进行矩阵运算和自定义变换
- [ ] 术语统一：逆矩阵、行列式、错切等术语定义清晰
- [ ] 最小实现：提供完整的 Matrix 工具类
- [ ] 边界处理：说明矩阵不可逆的处理
- [ ] 性能与权衡：无特殊性能考虑
- [ ] 图示与代码：变换效果图与代码对应
- [ ] 总结与练习：提供矩阵运算练习
