# 视野角度与焦距

视野角度（Field of View, FOV）和焦距（Focal Length）控制透视投影的"强度"。

## 视野角度（FOV）

FOV是相机能看到的角度范围，通常指**垂直视野角度**。

- **窄FOV**（< 45°）：望远镜效果，物体被"拉近"
- **标准FOV**（45°-75°）：接近人眼视角，自然舒适
- **宽FOV**（> 90°）：鱼眼效果，夸张的透视

## FOV与焦距的关系

焦距 $f$ 和FOV的关系：

$$
f = \frac{1}{\tan(\frac{fov}{2})}
$$

反过来：

$$
fov = 2 \cdot \arctan\left(\frac{1}{f}\right)
$$

**解释**：
- FOV越大，焦距越短（广角镜头）
- FOV越小，焦距越长（长焦镜头）

## 代码示例

```javascript
function fovToFocalLength(fov) {
  return 1 / Math.tan(fov / 2);
}

function focalLengthToFov(f) {
  return 2 * Math.atan(1 / f);
}

// 测试
const fov60 = Math.PI / 3;  // 60度
const f = fovToFocalLength(fov60);
console.log('Focal length:', f);  // 约 1.732

const fovBack = focalLengthToFov(f);
console.log('FOV:', fovBack * 180 / Math.PI);  // 60度
```

## 水平FOV vs 垂直FOV

通常我们指定**垂直FOV**，水平FOV根据宽高比计算：

$$
fov_h = 2 \cdot \arctan\left(\tan\left(\frac{fov_v}{2}\right) \cdot aspect\right)
$$

```javascript
function verticalToHorizontalFOV(fovV, aspect) {
  return 2 * Math.atan(Math.tan(fovV / 2) * aspect);
}

// 16:9屏幕，垂直FOV=60度
const aspect = 16 / 9;
const fovV = Math.PI / 3;
const fovH = verticalToHorizontalFOV(fovV, aspect);
console.log('Horizontal FOV:', fovH * 180 / Math.PI);  // 约 90.5度
```

## 透视投影矩阵中的FOV

回顾透视投影矩阵：

$$
\mathbf{P} = \begin{bmatrix}
\frac{f}{aspect} & 0 & 0 & 0 \\
0 & f & 0 & 0 \\
0 & 0 & -\frac{far+near}{far-near} & -\frac{2 \cdot far \cdot near}{far-near} \\
0 & 0 & -1 & 0
\end{bmatrix}
$$

其中 $f = \frac{1}{\tan(\frac{fov}{2})}$

第一行：$\frac{f}{aspect}$ 控制水平缩放
第二行：$f$ 控制垂直缩放

## 动态调整FOV

游戏中常见效果：
- **奔跑时FOV增大**：速度感
- **瞄准时FOV减小**：聚焦效果

```javascript
class Camera {
  constructor() {
    this.baseFOV = Math.PI / 3;  // 60度
    this.currentFOV = this.baseFOV;
    this.fovSpeed = 0.1;
  }
  
  setZooming(isZooming) {
    const targetFOV = isZooming ? Math.PI / 6 : this.baseFOV;  // 30度或60度
    this.currentFOV += (targetFOV - this.currentFOV) * this.fovSpeed;
  }
  
  getProjectionMatrix(aspect, near, far) {
    return perspective(this.currentFOV, aspect, near, far);
  }
}

// 使用
const camera = new Camera();

function update() {
  if (isPlayerAiming) {
    camera.setZooming(true);
  } else {
    camera.setZooming(false);
  }
  
  const projMatrix = camera.getProjectionMatrix(aspect, 0.1, 100);
  // ... 渲染
}
```

## FOV与性能

- **宽FOV**：需要渲染更多物体，性能开销大
- **窄FOV**：可见物体少，性能好但视野受限

优化技巧：
- 使用视锥体裁剪（Frustum Culling）
- 只渲染视锥体内的物体

## FOV的选择建议

| 应用场景 | 推荐FOV | 理由 |
|----------|---------|------|
| 第一人称射击 | 75°-90° | 宽广视野，空间感 |
| 第三人称游戏 | 60°-75° | 平衡视野和真实感 |
| 恐怖游戏 | 45°-60° | 窄视野增加紧张感 |
| 建筑漫游 | 60°-70° | 接近人眼，真实自然 |
| VR | 90°-110° | 覆盖人眼视野 |

## 小结

- **FOV**：控制透视强度的关键参数
- **焦距**：$f = \frac{1}{\tan(\frac{fov}{2})}$
- **垂直vs水平**：通常指定垂直FOV，水平根据宽高比计算
- **动态调整**：实现缩放、速度感等效果
- **选择建议**：根据应用场景选择合适的FOV
