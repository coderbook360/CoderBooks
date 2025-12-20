# 视图空间与相机变换

视图空间（View Space / Camera Space）是从相机视角观察的坐标系。

## 为什么需要视图空间？

在世界空间中，相机可以在任意位置和方向。但渲染管线需要一个"标准化"的视角：
- 相机在原点 $(0, 0, 0)$
- 朝向 $-Z$ 方向
- $+Y$ 是上方

## 视图矩阵

**视图矩阵** $\mathbf{V}$ 将世界坐标变换到相机坐标：

$$
\mathbf{p}_{view} = \mathbf{V} \times \mathbf{p}_{world}
$$

视图矩阵是相机模型矩阵的**逆矩阵**：

$$
\mathbf{V} = \mathbf{M}_{camera}^{-1}
$$

**原因**：
- 相机向右移动5单位 = 世界向左移动5单位（相对运动）
- 移动相机 vs 移动整个世界，效果相同

## 构建视图矩阵

### 方法1：逆矩阵法

```javascript
function createViewMatrix(cameraPosition, cameraRotation) {
  const M = new Matrix4()
    .makeTranslation(cameraPosition.x, cameraPosition.y, cameraPosition.z)
    .multiply(new Matrix4().makeRotationFromEuler(cameraRotation.x, cameraRotation.y, cameraRotation.z));
  
  return M.invert();
}
```

### 方法2：Look-At法（推荐）

```javascript
const viewMatrix = lookAt(
  new Vector3(0, 5, 10),  // 相机位置
  new Vector3(0, 0, 0),   // 目标点
  new Vector3(0, 1, 0)    // 上方向
);
```

Look-At更直观，适合大多数场景。

## 视图空间的特性

变换到视图空间后：
- 相机在原点
- 看向 $-Z$ 方向
- 物体的深度（Z坐标）代表离相机的距离

```javascript
// 世界空间：相机在 (0, 5, 10)，物体在 (0, 0, 0)
const worldPos = new Vector3(0, 0, 0);

// 变换到视图空间
const viewMatrix = lookAt(
  new Vector3(0, 5, 10),
  new Vector3(0, 0, 0),
  new Vector3(0, 1, 0)
);
const viewPos = viewMatrix.transformPoint(worldPos);

console.log(viewPos.toString());  // 约 (0, 0, -11.2)
// 物体在相机前方 11.2 个单位
```

## 完整的MVP变换

```
局部空间 --(M)--> 世界空间 --(V)--> 视图空间 --(P)--> 裁剪空间
```

组合矩阵：

$$
\mathbf{MVP} = \mathbf{P} \times \mathbf{V} \times \mathbf{M}
$$

应用到顶点：

$$
\mathbf{p}_{clip} = \mathbf{P} \times \mathbf{V} \times \mathbf{M} \times \mathbf{p}_{local}
$$

```javascript
function transformVertex(vertex, modelMatrix, viewMatrix, projectionMatrix) {
  const MVP = projectionMatrix.multiply(viewMatrix).multiply(modelMatrix);
  return MVP.transformPoint(vertex);
}
```

## 第一人称相机实现

```javascript
class Camera {
  constructor(position) {
    this.position = position.clone();
    this.yaw = 0;
    this.pitch = 0;
  }
  
  getViewMatrix() {
    const forward = new Vector3(
      Math.cos(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.sin(this.yaw) * Math.cos(this.pitch)
    ).normalize();
    
    const target = this.position.add(forward);
    return lookAt(this.position, target, new Vector3(0, 1, 0));
  }
  
  moveForward(distance) {
    const forward = new Vector3(
      Math.cos(this.yaw),
      0,  // 水平移动（忽略pitch）
      Math.sin(this.yaw)
    ).normalize();
    
    this.position = this.position.add(forward.multiplyScalar(distance));
  }
  
  rotate(deltaYaw, deltaPitch) {
    this.yaw += deltaYaw;
    this.pitch += deltaPitch;
    
    // 限制pitch防止翻转
    this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
  }
}

// 使用示例
const camera = new Camera(new Vector3(0, 5, 10));
camera.rotate(Math.PI / 4, 0);  // 向右转45度
camera.moveForward(2);           // 前进2单位

const viewMatrix = camera.getViewMatrix();
```

## 小结

- **视图空间**：相机视角的标准化坐标系
- **视图矩阵**：$\mathbf{V} = \mathbf{M}_{camera}^{-1}$
- **构建方法**：逆矩阵法 / Look-At法
- **MVP变换**：$\mathbf{MVP} = \mathbf{P} \times \mathbf{V} \times \mathbf{M}$
