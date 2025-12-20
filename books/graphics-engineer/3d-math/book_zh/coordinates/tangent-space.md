# 切线空间与 TBN 矩阵

当你在 3D 模型上应用法线贴图（Normal Map）时，会遇到一个问题：

法线贴图存储的是**局部表面法线**，但光照计算需要**世界空间法线**。

如何将法线贴图中的法线转换到世界空间？答案是使用 **TBN 矩阵**。

## 什么是切线空间

首先要问一个问题：为什么法线贴图不直接存储世界空间法线？

原因：
1. **通用性**：同一张法线贴图可以用于不同方向的表面
2. **内存效率**：不需要为每个实例存储不同的法线贴图
3. **动画友好**：模型变形时，法线贴图不需要更新

**切线空间**（Tangent Space）是以表面为参考的局部坐标系：

- **N**（Normal）：表面法线，垂直于表面，指向外侧
- **T**（Tangent）：切线，沿着 UV 的 u 方向
- **B**（Bitangent 或 Binormal）：副切线，沿着 UV 的 v 方向

这三个向量互相垂直，构成一个**正交基**。

## 法线贴图的存储格式

法线贴图中的颜色值 (R, G, B) 实际上存储的是法线向量 (x, y, z)：

```javascript
// 法线贴图的像素值 (0-255)
const pixel = { r: 128, g: 128, b: 255 };

// 转换为法线向量 (-1 到 1)
const normal = {
  x: (pixel.r / 255) * 2 - 1,  // 128 → 0
  y: (pixel.g / 255) * 2 - 1,  // 128 → 0
  z: (pixel.b / 255) * 2 - 1   // 255 → 1
};

console.log(normal); // { x: 0, y: 0, z: 1 }
```

注意：
- 蓝紫色区域（128, 128, 255）表示"未扰动"法线 (0, 0, 1)
- 法线总是指向 +z 方向（远离表面）
- x 和 y 的变化表示表面的起伏

## TBN 矩阵的构建

**TBN 矩阵**将切线空间的向量转换到世界空间（或其他空间）。

矩阵形式：

$$
\mathbf{TBN} = \begin{bmatrix}
T_x & B_x & N_x \\
T_y & B_y & N_y \\
T_z & B_z & N_z
\end{bmatrix}
$$

每一列是一个基向量：
- 第1列：切线 **T**（Tangent）
- 第2列：副切线 **B**（Bitangent）
- 第3列：法线 **N**（Normal）

### 应用变换

切线空间法线 → 世界空间法线：

$$
\mathbf{n}_{\text{world}} = \mathbf{TBN} \cdot \mathbf{n}_{\text{tangent}}
$$

代码：

```javascript
function transformNormalToWorld(tangentNormal, T, B, N) {
  return {
    x: tangentNormal.x * T.x + tangentNormal.y * B.x + tangentNormal.z * N.x,
    y: tangentNormal.x * T.y + tangentNormal.y * B.y + tangentNormal.z * N.y,
    z: tangentNormal.x * T.z + tangentNormal.y * B.z + tangentNormal.z * N.z
  };
}
```

## 切线和副切线的计算

法线 **N** 可以从顶点属性获得，但切线 **T** 和副切线 **B** 需要计算。

### 从 UV 坐标推导

给定三角形的三个顶点：

- 位置：$\mathbf{P}_0, \mathbf{P}_1, \mathbf{P}_2$
- UV：$(u_0, v_0), (u_1, v_1), (u_2, v_2)$

边向量：

$$
\Delta \mathbf{P}_1 = \mathbf{P}_1 - \mathbf{P}_0 \\
\Delta \mathbf{P}_2 = \mathbf{P}_2 - \mathbf{P}_0
$$

UV 差值：

$$
\Delta u_1 = u_1 - u_0, \quad \Delta v_1 = v_1 - v_0 \\
\Delta u_2 = u_2 - u_0, \quad \Delta v_2 = v_2 - v_0
$$

关系方程：

$$
\Delta \mathbf{P}_1 = \Delta u_1 \cdot \mathbf{T} + \Delta v_1 \cdot \mathbf{B} \\
\Delta \mathbf{P}_2 = \Delta u_2 \cdot \mathbf{T} + \Delta v_2 \cdot \mathbf{B}
$$

求解 **T** 和 **B**：

$$
\mathbf{T} = \frac{\Delta v_2 \cdot \Delta \mathbf{P}_1 - \Delta v_1 \cdot \Delta \mathbf{P}_2}{\Delta u_1 \Delta v_2 - \Delta u_2 \Delta v_1} \\
\mathbf{B} = \frac{\Delta u_1 \cdot \Delta \mathbf{P}_2 - \Delta u_2 \cdot \Delta \mathbf{P}_1}{\Delta u_1 \Delta v_2 - \Delta u_2 \Delta v_1}
$$

### 代码实现

```javascript
function calculateTangentBitangent(p0, p1, p2, uv0, uv1, uv2) {
  // 边向量
  const edge1 = {
    x: p1.x - p0.x,
    y: p1.y - p0.y,
    z: p1.z - p0.z
  };
  const edge2 = {
    x: p2.x - p0.x,
    y: p2.y - p0.y,
    z: p2.z - p0.z
  };
  
  // UV 差值
  const deltaUV1 = {
    u: uv1.u - uv0.u,
    v: uv1.v - uv0.v
  };
  const deltaUV2 = {
    u: uv2.u - uv0.u,
    v: uv2.v - uv0.v
  };
  
  // 计算分母
  const denominator = deltaUV1.u * deltaUV2.v - deltaUV2.u * deltaUV1.v;
  
  if (Math.abs(denominator) < 0.00001) {
    // UV 坐标退化，返回默认值
    return {
      tangent: { x: 1, y: 0, z: 0 },
      bitangent: { x: 0, y: 1, z: 0 }
    };
  }
  
  const f = 1.0 / denominator;
  
  // 计算切线
  const tangent = {
    x: f * (deltaUV2.v * edge1.x - deltaUV1.v * edge2.x),
    y: f * (deltaUV2.v * edge1.y - deltaUV1.v * edge2.y),
    z: f * (deltaUV2.v * edge1.z - deltaUV1.v * edge2.z)
  };
  
  // 计算副切线
  const bitangent = {
    x: f * (deltaUV1.u * edge2.x - deltaUV2.u * edge1.x),
    y: f * (deltaUV1.u * edge2.y - deltaUV2.u * edge1.y),
    z: f * (deltaUV1.u * edge2.z - deltaUV2.u * edge1.z)
  };
  
  return { tangent, bitangent };
}
```

### 正交化处理（Gram-Schmidt）

计算出的 T 和 B 可能不完全垂直于 N，需要正交化：

```javascript
function orthogonalizeTBN(T, B, N) {
  // 1. 归一化法线
  const normal = normalize(N);
  
  // 2. 正交化切线：T' = T - (T·N)N
  const tangent = normalize({
    x: T.x - dot(T, normal) * normal.x,
    y: T.y - dot(T, normal) * normal.y,
    z: T.z - dot(T, normal) * normal.z
  });
  
  // 3. 副切线：B' = N × T'
  const bitangent = cross(normal, tangent);
  
  return { tangent, bitangent, normal };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}

function normalize(v) {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  return len > 0 ? { x: v.x / len, y: v.y / len, z: v.z / len } : v;
}
```

## 完整的法线贴图应用流程

### 第一步：预计算顶点属性

为每个顶点存储切线和副切线：

```javascript
function computeMeshTangents(vertices, indices, uvs) {
  const tangents = new Array(vertices.length).fill(null).map(() => ({ x: 0, y: 0, z: 0 }));
  const bitangents = new Array(vertices.length).fill(null).map(() => ({ x: 0, y: 0, z: 0 }));
  const counts = new Array(vertices.length).fill(0);
  
  // 遍历所有三角形
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i];
    const i1 = indices[i + 1];
    const i2 = indices[i + 2];
    
    // 计算切线和副切线
    const { tangent, bitangent } = calculateTangentBitangent(
      vertices[i0], vertices[i1], vertices[i2],
      uvs[i0], uvs[i1], uvs[i2]
    );
    
    // 累加到顶点
    [i0, i1, i2].forEach(idx => {
      tangents[idx].x += tangent.x;
      tangents[idx].y += tangent.y;
      tangents[idx].z += tangent.z;
      
      bitangents[idx].x += bitangent.x;
      bitangents[idx].y += bitangent.y;
      bitangents[idx].z += bitangent.z;
      
      counts[idx]++;
    });
  }
  
  // 平均并归一化
  for (let i = 0; i < vertices.length; i++) {
    if (counts[i] > 0) {
      tangents[i].x /= counts[i];
      tangents[i].y /= counts[i];
      tangents[i].z /= counts[i];
      tangents[i] = normalize(tangents[i]);
      
      bitangents[i].x /= counts[i];
      bitangents[i].y /= counts[i];
      bitangents[i].z /= counts[i];
      bitangents[i] = normalize(bitangents[i]);
    }
  }
  
  return { tangents, bitangents };
}
```

### 第二步：着色器中构建 TBN 矩阵

顶点着色器：

```glsl
attribute vec3 position;
attribute vec3 normal;
attribute vec3 tangent;
attribute vec2 uv;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix; // 逆转置矩阵

varying vec2 vUV;
varying mat3 vTBN;

void main() {
  // 变换位置
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
  
  // 传递 UV
  vUV = uv;
  
  // 构建世界空间 TBN 矩阵
  vec3 T = normalize(normalMatrix * tangent);
  vec3 N = normalize(normalMatrix * normal);
  
  // 重新正交化
  T = normalize(T - dot(T, N) * N);
  
  // 计算副切线
  vec3 B = cross(N, T);
  
  // 构建 TBN 矩阵
  vTBN = mat3(T, B, N);
}
```

片段着色器：

```glsl
precision mediump float;

uniform sampler2D normalMap;
uniform vec3 lightDirection;

varying vec2 vUV;
varying mat3 vTBN;

void main() {
  // 从法线贴图读取切线空间法线
  vec3 tangentNormal = texture2D(normalMap, vUV).rgb;
  tangentNormal = tangentNormal * 2.0 - 1.0; // [0,1] → [-1,1]
  
  // 转换到世界空间
  vec3 worldNormal = normalize(vTBN * tangentNormal);
  
  // 光照计算
  float diffuse = max(dot(worldNormal, lightDirection), 0.0);
  
  gl_FragColor = vec4(vec3(diffuse), 1.0);
}
```

## 实际应用场景

### 场景1：凹凸效果

平坦的墙面通过法线贴图表现砖块纹理：

```javascript
// 没有法线贴图：平坦反射
const flatNormal = { x: 0, y: 0, z: 1 }; // 总是垂直于表面

// 有法线贴图：每个像素法线不同
const bumpyNormal = sampleNormalMap(u, v); // 随位置变化
```

### 场景2：细节增强

低多边形模型通过法线贴图表现高模细节：

```javascript
// 低模：只有 1000 个三角形
const lowPolyModel = loadModel('character_low.obj');

// 法线贴图：从高模（100万三角形）烘焙
const normalMap = bakefromHighPoly('character_high.obj');

// 渲染：看起来像高模，但性能好
render(lowPolyModel, { normalMap });
```

### 场景3：水面波纹

实时计算水面法线：

```javascript
function generateWaterNormals(x, y, time) {
  // 叠加多个正弦波
  const wave1 = Math.sin(x * 0.1 + time) * 0.1;
  const wave2 = Math.sin(y * 0.15 - time * 0.7) * 0.08;
  
  // 计算法线
  const dx = Math.cos(x * 0.1 + time) * 0.01;
  const dy = Math.cos(y * 0.15 - time * 0.7) * 0.012;
  
  return normalize({ x: -dx, y: -dy, z: 1.0 });
}
```

## 常见陷阱与注意事项

### 陷阱1：法线贴图颜色空间

法线贴图可能是 sRGB 编码的：

```javascript
// 错误：直接使用 sRGB 值
const tangentNormal = {
  x: pixel.r / 255 * 2 - 1, // ❌ sRGB 非线性
  y: pixel.g / 255 * 2 - 1,
  z: pixel.b / 255 * 2 - 1
};

// 正确：先转换到线性空间
function sRGBToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

const tangentNormal = {
  x: sRGBToLinear(pixel.r / 255) * 2 - 1, // ✅
  y: sRGBToLinear(pixel.g / 255) * 2 - 1,
  z: sRGBToLinear(pixel.b / 255) * 2 - 1
};
```

在 WebGL 中，设置正确的纹理格式：

```javascript
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
// 对于法线贴图，确保使用线性采样
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
```

### 陷阱2：镜像 UV 的切线方向

UV 镜像后，切线方向需要翻转：

```javascript
// 检测 UV 镜像
const det = deltaUV1.u * deltaUV2.v - deltaUV2.u * deltaUV1.v;

if (det < 0) {
  // UV 镜像，翻转副切线
  bitangent.x = -bitangent.x;
  bitangent.y = -bitangent.y;
  bitangent.z = -bitangent.z;
}
```

### 陷阱3：非均匀缩放

模型有非均匀缩放时，TBN 矩阵需要使用逆转置矩阵：

```javascript
// 错误：直接用世界矩阵变换
const T_world = multiply(worldMatrix, tangent); // ❌

// 正确：用逆转置矩阵
const normalMatrix = transpose(inverse(worldMatrix));
const T_world = multiply(normalMatrix, tangent); // ✅
```

### 陷阱4：法线未归一化

插值后的法线需要重新归一化：

```javascript
// 片段着色器中
vec3 worldNormal = vTBN * tangentNormal;

// 错误：直接使用
float diffuse = dot(worldNormal, lightDir); // ❌ 长度可能不是 1

// 正确：归一化
worldNormal = normalize(worldNormal);
float diffuse = dot(worldNormal, lightDir); // ✅
```

## 优化技巧

### 技巧1：预计算 TBN 矩阵

如果模型静态，可以预计算世界空间 TBN：

```javascript
// CPU 端预计算
const tangents_world = vertices.map((v, i) => 
  transformToWorld(tangents[i], modelMatrix)
);
```

### 技巧2：只存储切线和 Handedness

副切线可以从法线和切线重建，节省内存：

```javascript
// 只存储切线和 handedness 符号
attribute vec3 tangent; // xyz: 切线方向
attribute float tangentW; // w: handedness (±1)

// 片段着色器重建副切线
vec3 T = normalize(vTangent);
vec3 N = normalize(vNormal);
vec3 B = cross(N, T) * vTangentW;
```

### 技巧3：使用四元数存储旋转

对于动画模型，用四元数存储旋转更高效：

```javascript
const rotation = quaternionSlerp(keyframe1.rotation, keyframe2.rotation, t);
const TBN = quaternionToMatrix(rotation);
```

## 总结

切线空间与 TBN 矩阵是法线贴图的核心技术：

| 概念 | 定义 | 用途 |
|------|------|------|
| **切线空间** | 以表面为参考的局部坐标系 | 存储法线贴图 |
| **T（切线）** | 沿 UV u 方向的向量 | TBN 矩阵第1列 |
| **B（副切线）** | 沿 UV v 方向的向量 | TBN 矩阵第2列 |
| **N（法线）** | 垂直于表面的向量 | TBN 矩阵第3列 |
| **TBN 矩阵** | 切线空间到世界空间的变换 | 变换法线贴图 |

关键要点：
- 切线和副切线从 **UV 坐标推导**
- TBN 必须保持 **正交归一化**
- 法线贴图存储 **切线空间法线**
- 非均匀缩放需要 **逆转置矩阵**
- 插值后必须 **重新归一化**
- 可以只存储切线和 **handedness** 节省内存

掌握 TBN 矩阵，你就能为低模模型添加逼真的表面细节！
