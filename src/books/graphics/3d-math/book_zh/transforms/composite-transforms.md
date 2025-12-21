# 复合变换与变换顺序

实际应用中，通常需要组合多种变换：先缩放，再旋转，最后平移。

## 变换的组合

三个变换矩阵 $\mathbf{S}$（缩放）、$\mathbf{R}$（旋转）、$\mathbf{T}$（平移），组合顺序：

$$
\mathbf{M} = \mathbf{T} \times \mathbf{R} \times \mathbf{S}
$$

应用到点 $\mathbf{p}$：

$$
\mathbf{p}' = \mathbf{M} \times \mathbf{p} = \mathbf{T} \times (\mathbf{R} \times (\mathbf{S} \times \mathbf{p}))
$$

**执行顺序**：先缩放 → 再旋转 → 最后平移（从右到左）

## 为什么顺序重要？

矩阵乘法不满足交换律：$\mathbf{A} \times \mathbf{B} \neq \mathbf{B} \times \mathbf{A}$

**例子**：
- **先平移再旋转**：物体绕远离原点的轴旋转（轨道运动）
- **先旋转再平移**：物体绕自身轴旋转后移动

## 代码实现

```javascript
function createModelMatrix(translation, rotation, scale) {
  const S = new Matrix4().makeScale(scale.x, scale.y, scale.z);
  const R = new Matrix4().makeRotationFromEuler(rotation.x, rotation.y, rotation.z);
  const T = new Matrix4().makeTranslation(translation.x, translation.y, translation.z);
  
  // 组合：T * R * S
  return T.multiply(R).multiply(S);
}

// 使用示例
const modelMatrix = createModelMatrix(
  new Vector3(5, 0, 0),   // translation
  new Vector3(0, 0, Math.PI / 4),  // rotation
  new Vector3(2, 2, 2)    // scale
);

const point = new Vector3(1, 0, 0);
const transformed = modelMatrix.transformPoint(point);
```

## TRS约定

**TRS** = Translation * Rotation * Scale

这是业界标准顺序：
- Unity、Unreal、Three.js 都采用TRS
- 从右到左执行：先S后R最后T

## 局部空间 vs 世界空间

- **局部变换**：$\mathbf{M}_{local} = \mathbf{T} \times \mathbf{R} \times \mathbf{S}$
- **父物体变换**：$\mathbf{M}_{parent}$
- **世界变换**：$\mathbf{M}_{world} = \mathbf{M}_{parent} \times \mathbf{M}_{local}$

父子关系链：

$$
\mathbf{M}_{final} = \mathbf{M}_{grandparent} \times \mathbf{M}_{parent} \times \mathbf{M}_{local}
$$

## 优化：预计算组合矩阵

对于静态物体，可以预先计算组合矩阵，避免每帧重复计算：

```javascript
class Transform {
  constructor() {
    this.position = new Vector3();
    this.rotation = new Vector3();
    this.scale = new Vector3(1, 1, 1);
    this.matrix = new Matrix4();
    this.dirty = true;
  }
  
  getMatrix() {
    if (this.dirty) {
      this.matrix = createModelMatrix(this.position, this.rotation, this.scale);
      this.dirty = false;
    }
    return this.matrix;
  }
  
  setPosition(x, y, z) {
    this.position.set(x, y, z);
    this.dirty = true;
  }
}
```

## 小结

- 复合变换：矩阵相乘
- 标准顺序：TRS（平移 * 旋转 * 缩放）
- 执行顺序：从右到左
- 优化：标记脏数据，按需更新
