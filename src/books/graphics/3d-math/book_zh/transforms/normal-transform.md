# 法线变换与逆转置矩阵

法线（Normal）在光照计算中至关重要，但其变换规则与普通向量不同。这是很多初学者容易踩的坑。

## 问题：为什么不能直接变换法线？

考虑一个立方体，顶面法向量是 $(0, 1, 0)$。

如果用矩阵 $\mathbf{S}(2, 0.5, 1)$ 进行非均匀缩放：
- 顶面被压扁（y方向缩小0.5倍）
- 但法向量仍应指向"垂直于表面"的方向

如果直接用 $\mathbf{S}$ 变换法向量：

$$
\mathbf{n}' = \mathbf{S} \times (0, 1, 0) = (0, 0.5, 0)
$$

归一化后仍是 $(0, 1, 0)$，看似正确。

但考虑斜面法向量 $(1, 1, 0)$：

$$
\mathbf{n}' = \mathbf{S} \times (1, 1, 0) = (2, 0.5, 0)
$$

归一化后是 $(0.97, 0.24, 0)$，**不再垂直于表面**！

这会导致什么问题？在光照计算中，错误的法线会导致明暗不正确，物体看起来"歪"了。

## 正确的法线变换

法线必须用**逆转置矩阵**变换：

$$
\mathbf{n}' = (\mathbf{M}^{-1})^T \times \mathbf{n}
$$

其中 $\mathbf{M}$ 是模型矩阵。

### 为什么是逆转置？数学推导

这个公式不是凭空而来的，让我们从头推导。

**核心约束**：法线的定义是"垂直于表面的向量"。变换后，这个垂直关系必须保持。

设切向量 $\mathbf{t}$ 和法向量 $\mathbf{n}$ 垂直（切向量沿着表面方向）：

$$
\mathbf{t} \cdot \mathbf{n} = 0
$$

变换后，切向量变为 $\mathbf{t}' = \mathbf{M} \mathbf{t}$（切向量可以直接用 M 变换）。

假设法向量用某个矩阵 $\mathbf{G}$ 变换：$\mathbf{n}' = \mathbf{G} \mathbf{n}$

变换后仍需垂直：

$$
\mathbf{t}' \cdot \mathbf{n}' = 0
$$

展开（点积可写成转置乘法）：

$$
(\mathbf{M} \mathbf{t})^T (\mathbf{G} \mathbf{n}) = 0
$$

$$
\mathbf{t}^T \mathbf{M}^T \mathbf{G} \mathbf{n} = 0
$$

我们知道原来的关系是 $\mathbf{t}^T \mathbf{n} = 0$。

为了让上式成立，最简单的方式是让 $\mathbf{M}^T \mathbf{G} = \mathbf{I}$（单位矩阵）。

因此：

$$
\mathbf{G} = (\mathbf{M}^T)^{-1} = (\mathbf{M}^{-1})^T
$$

这就是**逆转置矩阵**！

### 直观理解

另一种理解方式：
- 模型矩阵 M 会"拉伸"表面
- 法线应该反向"收缩"以保持垂直
- 逆矩阵实现"反向操作"
- 转置确保方向正确（行列互换）

## 代码实现

```javascript
function createNormalMatrix(modelMatrix) {
  return modelMatrix.invert().transpose();
}

// 使用示例
const modelMatrix = new Matrix4().makeScale(2, 0.5, 1);
const normalMatrix = createNormalMatrix(modelMatrix);

const normal = new Vector3(1, 1, 0).normalize();
const transformedNormal = normalMatrix.transformDirection(normal).normalize();
```

## 特殊情况：正交矩阵

如果模型矩阵是**正交矩阵**（纯旋转，无缩放）：

$$
\mathbf{M}^{-1} = \mathbf{M}^T
$$

因此：

$$
(\mathbf{M}^{-1})^T = (\mathbf{M}^T)^T = \mathbf{M}
$$

**结论**：纯旋转变换的法线可以直接用原矩阵变换！

## 优化策略

```javascript
class Transform {
  getNormalMatrix() {
    const m = this.getMatrix();
    
    // 如果只有旋转（无缩放），直接使用模型矩阵
    if (this.scale.x === 1 && this.scale.y === 1 && this.scale.z === 1) {
      return m;
    }
    
    // 有缩放，计算逆转置
    return m.invert().transpose();
  }
}
```

## 在着色器中

通常在CPU端计算法线矩阵，传给着色器：

```glsl
// Vertex Shader
uniform mat4 modelMatrix;
uniform mat3 normalMatrix; // 3×3即可（忽略平移）

attribute vec3 normal;

void main() {
  vec3 transformedNormal = normalize(normalMatrix * normal);
  // ...
}
```

为什么用3×3？因为法线是方向（w=0），不受平移影响。

## 小结

- 法线变换：使用 $(\mathbf{M}^{-1})^T$
- 原因：保持垂直性
- 特殊情况：纯旋转可直接用 $\mathbf{M}$
- 优化：区分有无缩放
