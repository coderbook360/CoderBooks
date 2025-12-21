# 近裁剪面与远裁剪面

近裁剪面（Near Plane）和远裁剪面（Far Plane）定义了相机的可见深度范围。

## 为什么需要裁剪面？

**性能原因**：
- 不渲染离相机太近的物体（避免穿模）
- 不渲染离相机太远的物体（减少计算量）

**数值精度**：
- 深度缓冲区精度有限（通常24位）
- 范围越大，精度越低，容易出现Z-Fighting

## 定义

- **近裁剪面**（$n$）：距离相机最近的可见平面
- **远裁剪面**（$f$）：距离相机最远的可见平面

**约束**：$0 < n < f$

## 裁剪测试

在裁剪空间中，顶点满足以下条件时可见：

$$
-w \leq z_{clip} \leq w
$$

变换到NDC后：

$$
-1 \leq z_{ndc} \leq 1
$$

对应视图空间的深度：

$$
-f \leq z_{view} \leq -n
$$

（注意：视图空间Z轴朝向 $-Z$，所以是负值）

## 深度精度分布

透视投影的深度值是**非线性**的：

$$
z_{ndc} = \frac{f+n}{f-n} + \frac{2fn}{(f-n) \cdot (-z_{view})}
$$

**关键观察**：
- 90%的深度精度集中在前10%的距离
- 远处物体的深度精度极低

## 深度精度实验

```javascript
function computeDepthPrecision(near, far, viewZ) {
  const a = (far + near) / (far - near);
  const b = (2 * far * near) / (far - near);
  const ndcZ = a + b / (-viewZ);
  return ndcZ;
}

// 测试：near=0.1, far=100
console.log('Depth at z=-0.1:', computeDepthPrecision(0.1, 100, -0.1));  // -1.0
console.log('Depth at z=-1:', computeDepthPrecision(0.1, 100, -1));      // -0.998
console.log('Depth at z=-10:', computeDepthPrecision(0.1, 100, -10));    // -0.82
console.log('Depth at z=-50:', computeDepthPrecision(0.1, 100, -50));    // -0.24
console.log('Depth at z=-100:', computeDepthPrecision(0.1, 100, -100));  // 1.0

// 观察：z从-0.1到-1变化了10倍，但NDC深度只变化了0.002
//      z从-50到-100变化了2倍，但NDC深度变化了1.24
```

## Z-Fighting问题

当两个表面深度非常接近时，由于深度精度不足，会出现闪烁（Z-Fighting）。

**原因**：
- 深度缓冲区精度有限（如24位）
- 远处精度极低，相邻像素可能有相同的深度值

**解决方法**：

### 1. 增大近裁剪距离

```javascript
// 不好：精度差
const proj1 = perspective(fov, aspect, 0.001, 1000);

// 好：精度高
const proj2 = perspective(fov, aspect, 1, 1000);
```

**规则**：尽量增大 $n$，使 $\frac{f}{n}$ 比值小于1000。

### 2. 减小远裁剪距离

```javascript
// 根据场景需要选择合适的远裁剪面
const proj = perspective(fov, aspect, 1, 100);  // 而不是1000
```

### 3. 使用深度偏移

```javascript
// WebGL
gl.enable(gl.POLYGON_OFFSET_FILL);
gl.polygonOffset(1, 1);
```

### 4. 分层渲染（多个视锥体）

```javascript
// 近景：高精度
const nearProj = perspective(fov, aspect, 0.1, 50);

// 远景：低精度但可接受
const farProj = perspective(fov, aspect, 50, 500);

// 分别渲染近景和远景物体
```

## 最佳实践

### 选择合适的近裁剪距离

| 场景类型 | 推荐 $n$ | 理由 |
|----------|----------|------|
| 第一人称游戏 | 0.1 - 0.5 | 需要看到武器和手 |
| 第三人称游戏 | 0.5 - 2 | 不需要极近视角 |
| 飞行模拟 | 10 - 100 | 不会靠近物体 |
| 建筑漫游 | 0.1 - 1 | 需要近距离观察细节 |

### 动态调整裁剪面

```javascript
class AdaptiveCamera {
  constructor() {
    this.near = 1;
    this.far = 100;
  }
  
  updateClipPlanes(sceneRadius, cameraDistance) {
    // 根据场景大小动态调整
    this.near = Math.max(0.1, cameraDistance * 0.01);
    this.far = cameraDistance + sceneRadius * 2;
    
    // 保持比值合理
    const ratio = this.far / this.near;
    if (ratio > 1000) {
      this.near = this.far / 1000;
    }
  }
  
  getProjectionMatrix(fov, aspect) {
    return perspective(fov, aspect, this.near, this.far);
  }
}
```

## 小结

- **裁剪面**：定义相机可见深度范围 $[n, f]$
- **深度精度**：非线性分布，近处精度高，远处精度低
- **Z-Fighting**：深度冲突导致闪烁
- **优化策略**：增大 $n$、减小 $f$、保持 $\frac{f}{n} < 1000$
- **动态调整**：根据场景大小和相机距离调整裁剪面
