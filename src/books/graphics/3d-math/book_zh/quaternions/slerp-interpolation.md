# 四元数插值（Slerp）

Slerp（Spherical Linear Interpolation，球面线性插值）是四元数最重要的应用之一，用于平滑的旋转动画。

## 为什么需要Slerp？

**线性插值（Lerp）的问题**：

```javascript
// 错误方法：直接Lerp
function lerpQuaternion(q1, q2, t) {
  return q1.multiplyScalar(1 - t).add(q2.multiplyScalar(t));
}
```

问题：
- 结果不是单位四元数（需要重新归一化）
- 旋转速度不均匀（中间变慢，两端变快）

## Slerp原理

Slerp在四维单位球面上进行插值，保证：
- 结果始终是单位四元数
- 旋转角速度恒定
- 最短路径旋转

**数学公式**：

$$
\text{Slerp}(\mathbf{q}_1, \mathbf{q}_2, t) = \frac{\sin((1-t)\theta)}{\sin(\theta)} \mathbf{q}_1 + \frac{\sin(t\theta)}{\sin(\theta)} \mathbf{q}_2
$$

其中 $\theta$ 是两个四元数之间的"角度"：

$$
\cos(\theta) = \mathbf{q}_1 \cdot \mathbf{q}_2
$$

## 代码实现

```javascript
class Quaternion {
  static slerp(q1, q2, t) {
    // 计算夹角的余弦值
    let dot = q1.dot(q2);
    
    // 如果点积为负，取q2的相反数（选择最短路径）
    let q2b = q2;
    if (dot < 0) {
      dot = -dot;
      q2b = q2.multiplyScalar(-1);
    }
    
    // 如果两个四元数非常接近，使用线性插值
    if (dot > 0.9995) {
      return q1.multiplyScalar(1 - t)
        .add(q2b.multiplyScalar(t))
        .normalize();
    }
    
    // 计算角度
    const theta = Math.acos(dot);
    const sinTheta = Math.sin(theta);
    
    // Slerp公式
    const w1 = Math.sin((1 - t) * theta) / sinTheta;
    const w2 = Math.sin(t * theta) / sinTheta;
    
    return q1.multiplyScalar(w1).add(q2b.multiplyScalar(w2));
  }
}

// 使用示例
const q1 = Quaternion.fromAxisAngle(new Vector3(0, 1, 0), 0);
const q2 = Quaternion.fromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);

// 插值25%
const q = Quaternion.slerp(q1, q2, 0.25);

// 验证：应该是22.5度（45度 × 0.25）
const angle = 2 * Math.acos(q.w);
console.log('Interpolated angle:', angle * 180 / Math.PI);  // 22.5度
```

## 最短路径问题

四元数有**双重覆盖**：$\mathbf{q}$ 和 $-\mathbf{q}$ 表示同一旋转。

Slerp需要选择最短路径：

```javascript
// 检查点积
let dot = q1.dot(q2);

if (dot < 0) {
  // 反向是更短路径
  q2 = q2.multiplyScalar(-1);
  dot = -dot;
}
```

**示例**：
- 从0度到359度：直接插值会绕一整圈
- 正确做法：从0度到-1度（最短1度）

## Lerp + Normalize（近似方法）

当角度较小（< 30度）时，可以用更快的近似方法：

```javascript
function nlerp(q1, q2, t) {
  let dot = q1.dot(q2);
  
  let q2b = q2;
  if (dot < 0) {
    q2b = q2.multiplyScalar(-1);
  }
  
  return q1.multiplyScalar(1 - t)
    .add(q2b.multiplyScalar(t))
    .normalize();
}
```

**对比**：
- Slerp：角速度恒定，数学上完美
- Nlerp：角速度略不均匀，但更快（无三角函数）

## 动画应用

```javascript
class RotationAnimation {
  constructor(startQuat, endQuat, duration) {
    this.start = startQuat;
    this.end = endQuat;
    this.duration = duration;
    this.elapsed = 0;
  }
  
  update(deltaTime) {
    this.elapsed += deltaTime;
    const t = Math.min(this.elapsed / this.duration, 1);
    
    return Quaternion.slerp(this.start, this.end, t);
  }
}

// 使用示例
const anim = new RotationAnimation(
  Quaternion.fromAxisAngle(new Vector3(0, 1, 0), 0),
  Quaternion.fromAxisAngle(new Vector3(0, 1, 0), Math.PI),
  2000  // 2秒
);

function animate(deltaTime) {
  const currentRotation = anim.update(deltaTime);
  object.setRotation(currentRotation);
}
```

## 多个四元数插值（Squad）

Squad（Spherical Quadratic Interpolation）用于平滑多个关键帧：

```javascript
function squad(q0, q1, q2, q3, t) {
  const slerp1 = Quaternion.slerp(q0, q3, t);
  const slerp2 = Quaternion.slerp(q1, q2, t);
  return Quaternion.slerp(slerp1, slerp2, 2 * t * (1 - t));
}
```

## 性能对比

| 方法 | 速度 | 质量 | 适用场景 |
|------|------|------|----------|
| Lerp | 最快 | 差（需归一化） | 不推荐 |
| Nlerp | 快 | 较好（角度小时） | 实时游戏 |
| Slerp | 中 | 完美 | 动画、电影 |
| Squad | 慢 | 完美（多关键帧） | 复杂动画 |

## 小结

- **Slerp**：球面线性插值，四元数动画的标准方法
- **最短路径**：检查点积，选择正确方向
- **Nlerp近似**：快速但略不精确的替代方案
- **应用**：相机平滑旋转、骨骼动画、物体旋转动画
- **Squad**：多关键帧平滑插值
