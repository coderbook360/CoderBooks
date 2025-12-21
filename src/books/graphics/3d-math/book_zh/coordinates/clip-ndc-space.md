# 裁剪空间与NDC

裁剪空间（Clip Space）和NDC（Normalized Device Coordinates，标准化设备坐标）是渲染管线中的关键环节。

## 为什么需要裁剪空间？

在视图空间中，坐标范围是无限的。但屏幕是有限的，需要：
1. **裁剪**：删除视锥体外的物体
2. **归一化**：将可见区域映射到标准范围

## 投影矩阵

**投影矩阵** $\mathbf{P}$ 将视图空间变换到裁剪空间：

$$
\mathbf{p}_{clip} = \mathbf{P} \times \mathbf{p}_{view}
$$

投影矩阵有两种：
- **透视投影**（Perspective）：近大远小
- **正交投影**（Orthographic）：无透视效果

## 裁剪空间

变换后的坐标 $(x_{clip}, y_{clip}, z_{clip}, w_{clip})$ 是**齐次坐标**。

**裁剪规则**：如果顶点满足以下条件，则可见：

$$
-w_{clip} \leq x_{clip} \leq w_{clip}
$$
$$
-w_{clip} \leq y_{clip} \leq w_{clip}
$$
$$
-w_{clip} \leq z_{clip} \leq w_{clip}
$$

超出范围的图元被裁剪掉。

## 透视除法

裁剪后，执行**透视除法**，将齐次坐标转换为3D坐标：

$$
\mathbf{p}_{ndc} = \left( \frac{x_{clip}}{w_{clip}}, \frac{y_{clip}}{w_{clip}}, \frac{z_{clip}}{w_{clip}} \right)
$$

得到的坐标范围是 $[-1, 1]$，这就是**NDC**。

```javascript
function perspectiveDivide(clipCoords) {
  const x = clipCoords.x / clipCoords.w;
  const y = clipCoords.y / clipCoords.w;
  const z = clipCoords.z / clipCoords.w;
  return new Vector3(x, y, z);
}
```

## NDC到屏幕坐标

NDC范围是 $[-1, 1]$，需要映射到屏幕像素：

$$
x_{screen} = \frac{(x_{ndc} + 1) \times width}{2}
$$
$$
y_{screen} = \frac{(1 - y_{ndc}) \times height}{2}
$$

注意：$y$ 坐标翻转（屏幕坐标系原点在左上角）。

```javascript
function ndcToScreen(ndc, width, height) {
  const x = (ndc.x + 1) * width / 2;
  const y = (1 - ndc.y) * height / 2;
  return { x, y };
}
```

## 完整变换流程

```
局部空间
  ↓ (Model Matrix)
世界空间
  ↓ (View Matrix)
视图空间
  ↓ (Projection Matrix)
裁剪空间 (齐次坐标)
  ↓ (裁剪 + 透视除法)
NDC ([-1, 1]³)
  ↓ (Viewport Transform)
屏幕坐标 (像素)
```

代码示例：

```javascript
function fullTransform(vertex, M, V, P, width, height) {
  // 1. 变换到裁剪空间
  const MVP = P.multiply(V).multiply(M);
  const clipCoords = MVP.transformPoint(vertex);  // 返回 (x, y, z, w)
  
  // 2. 裁剪测试
  if (Math.abs(clipCoords.x) > clipCoords.w ||
      Math.abs(clipCoords.y) > clipCoords.w ||
      Math.abs(clipCoords.z) > clipCoords.w) {
    return null;  // 被裁剪
  }
  
  // 3. 透视除法得到NDC
  const ndc = new Vector3(
    clipCoords.x / clipCoords.w,
    clipCoords.y / clipCoords.w,
    clipCoords.z / clipCoords.w
  );
  
  // 4. NDC到屏幕坐标
  const screen = {
    x: (ndc.x + 1) * width / 2,
    y: (1 - ndc.y) * height / 2,
    z: ndc.z  // 深度值，用于深度测试
  };
  
  return screen;
}
```

## 深度值

NDC的 $z$ 坐标（深度）范围：
- **OpenGL**：$[-1, 1]$
- **DirectX / WebGPU**：$[0, 1]$

深度值用于**深度测试**（Z-Buffer），决定遮挡关系。

## 小结

- **裁剪空间**：齐次坐标，用于裁剪测试
- **透视除法**：$(x, y, z, w) \rightarrow (x/w, y/w, z/w)$
- **NDC**：标准化范围 $[-1, 1]^3$
- **屏幕坐标**：最终像素位置
- **深度值**：用于深度测试
