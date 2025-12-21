# Look-At 矩阵构建详解

Look-At矩阵（视图矩阵）用于模拟相机，是3D图形学的核心概念。

## 什么是Look-At矩阵？

Look-At矩阵将世界空间变换到相机空间：
- **输入**：相机位置、目标点、上方向
- **输出**：视图矩阵 $\mathbf{V}$

效果：让相机"看向"目标点。

## 构建原理

### 第一步：建立相机坐标系

给定：
- 相机位置 $\mathbf{eye}$
- 目标点 $\mathbf{target}$
- 上方向 $\mathbf{up}$（通常是 $(0, 1, 0)$）

计算相机的三个轴：

**1. Forward（前方向）**：从相机指向目标

$$
\mathbf{forward} = \text{normalize}(\mathbf{target} - \mathbf{eye})
$$

**2. Right（右方向）**：与forward和up垂直

$$
\mathbf{right} = \text{normalize}(\mathbf{forward} \times \mathbf{up})
$$

**3. Up（上方向）**：与right和forward垂直

$$
\mathbf{up}_{camera} = \mathbf{right} \times \mathbf{forward}
$$

### 第二步：构建旋转矩阵

将世界坐标系的xyz轴变换到相机坐标系：

$$
\mathbf{R} = \begin{bmatrix}
r_x & r_y & r_z & 0 \\
u_x & u_y & u_z & 0 \\
-f_x & -f_y & -f_z & 0 \\
0 & 0 & 0 & 1
\end{bmatrix}
$$

注意：forward取负号（OpenGL约定：相机朝-z方向看）

### 第三步：添加平移

将世界原点移到相机位置：

$$
\mathbf{T} = \begin{bmatrix}
1 & 0 & 0 & -eye_x \\
0 & 1 & 0 & -eye_y \\
0 & 0 & 1 & -eye_z \\
0 & 0 & 0 & 1
\end{bmatrix}
$$

### 第四步：组合

$$
\mathbf{V} = \mathbf{R} \times \mathbf{T}
$$

## 代码实现

```javascript
function lookAt(eye, target, up) {
  const forward = target.sub(eye).normalize();
  const right = forward.cross(up).normalize();
  const cameraUp = right.cross(forward);
  
  const matrix = new Matrix4();
  const e = matrix.elements;
  
  // 设置旋转部分
  e[0] = right.x;    e[4] = right.y;    e[8]  = right.z;
  e[1] = cameraUp.x; e[5] = cameraUp.y; e[9]  = cameraUp.z;
  e[2] = -forward.x; e[6] = -forward.y; e[10] = -forward.z;
  
  // 设置平移部分
  e[12] = -right.dot(eye);
  e[13] = -cameraUp.dot(eye);
  e[14] = forward.dot(eye);
  
  e[3] = 0; e[7] = 0; e[11] = 0; e[15] = 1;
  
  return matrix;
}

// 使用示例
const viewMatrix = lookAt(
  new Vector3(0, 5, 10),  // 相机在 (0, 5, 10)
  new Vector3(0, 0, 0),   // 看向原点
  new Vector3(0, 1, 0)    // 上方向是y轴
);
```

## 应用：FPS相机

```javascript
class FPSCamera {
  constructor(position) {
    this.position = position.clone();
    this.yaw = 0;
    this.pitch = 0;
  }
  
  getViewMatrix() {
    // 计算前方向（基于yaw和pitch）
    const forward = new Vector3(
      Math.cos(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.sin(this.yaw) * Math.cos(this.pitch)
    );
    
    const target = this.position.add(forward);
    const up = new Vector3(0, 1, 0);
    
    return lookAt(this.position, target, up);
  }
  
  move(forward, right) {
    const f = new Vector3(
      Math.cos(this.yaw),
      0,
      Math.sin(this.yaw)
    ).normalize();
    
    const r = f.cross(new Vector3(0, 1, 0));
    
    this.position = this.position
      .add(f.multiplyScalar(forward))
      .add(r.multiplyScalar(right));
  }
}
```

## 小结

- Look-At矩阵：构建相机视图
- 步骤：计算相机坐标系 → 旋转 → 平移
- 应用：FPS相机、轨道相机
