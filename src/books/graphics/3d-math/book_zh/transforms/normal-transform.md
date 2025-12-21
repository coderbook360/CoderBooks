# 法线变换与逆转置矩阵

法线（Normal）在光照计算中至关重要，但其变换规则与普通向量不同。

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

## 正确的法线变换

法线必须用**逆转置矩阵**变换：

$$
\mathbf{n}' = (\mathbf{M}^{-1})^T \times \mathbf{n}
$$

其中 $\mathbf{M}$ 是模型矩阵。

### 数学推导（简化）

设切向量 $\mathbf{t}$ 和法向量 $\mathbf{n}$ 垂直：

$$
\mathbf{t} \cdot \mathbf{n} = 0
$$

变换后仍需垂直：

$$
\mathbf{t}' \cdot \mathbf{n}' = 0
$$

其中 $\mathbf{t}' = \mathbf{M} \times \mathbf{t}$，$\mathbf{n}' = \mathbf{G} \times \mathbf{n}$

通过矩阵运算推导，可得：

$$
\mathbf{G} = (\mathbf{M}^{-1})^T
$$

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
