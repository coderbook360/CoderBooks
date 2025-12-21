# 四元数插值：Slerp

想要让相机从当前方向平滑旋转到目标方向，或者让角色的骨骼在两个关键帧之间自然过渡，你需要**旋转插值**。

四元数的**Slerp**（Spherical Linear Interpolation，球面线性插值）是最佳方案。

## 线性插值的问题

首先尝试简单的线性插值：

```javascript
function lerpQuaternion(q1, q2, t) {
  return {
    x: q1.x * (1 - t) + q2.x * t,
    y: q1.y * (1 - t) + q2.y * t,
    z: q1.z * (1 - t) + q2.z * t,
    w: q1.w * (1 - t) + q2.w * t
  };
}

// 从无旋转插值到90度旋转
const q1 = { x: 0, y: 0, z: 0, w: 1 };
const q2 = { x: 0, y: 0.707, z: 0, w: 0.707 };

const q_mid = lerpQuaternion(q1, q2, 0.5);
console.log(q_mid);  // { x: 0, y: 0.353, z: 0, w: 0.853 }

// 问题：长度不是1！
const len = Math.sqrt(q_mid.x**2 + q_mid.y**2 + q_mid.z**2 + q_mid.w**2);
console.log(len);  // 0.927，不是1 ❌
```

**问题**：
- 线性插值破坏单位长度
- 旋转速度不均匀（中间快，两端慢）
- 需要重新归一化，但仍然不够平滑

## Slerp：球面线性插值

四元数在4维空间中位于单位超球面上。Slerp沿着球面的**大圆弧**插值，保持恒定的角速度。

### 数学原理

给定两个四元数 $\mathbf{q}_1$ 和 $\mathbf{q}_2$，Slerp公式：

$$
\text{Slerp}(\mathbf{q}_1, \mathbf{q}_2, t) = \frac{\sin((1-t)\theta)}{\sin\theta} \mathbf{q}_1 + \frac{\sin(t\theta)}{\sin\theta} \mathbf{q}_2
$$

其中 $\theta$ 是两个四元数的夹角：

$$
\cos\theta = \mathbf{q}_1 \cdot \mathbf{q}_2 = x_1x_2 + y_1y_2 + z_1z_2 + w_1w_2
$$

### 完整实现

```javascript
function slerp(q1, q2, t) {
  // 计算夹角的余弦
  let dot = q1.x * q2.x + q1.y * q2.y + q1.z * q2.z + q1.w * q2.w;
  
  // 确保最短路径
  if (dot < 0) {
    q2 = { x: -q2.x, y: -q2.y, z: -q2.z, w: -q2.w };
    dot = -dot;
  }
  
  // 如果非常接近，使用线性插值避免除零
  if (dot > 0.9995) {
    const result = {
      x: q1.x + t * (q2.x - q1.x),
      y: q1.y + t * (q2.y - q1.y),
      z: q1.z + t * (q2.z - q1.z),
      w: q1.w + t * (q2.w - q1.w)
    };
    return normalize(result);
  }
  
  // 球面插值
  const theta = Math.acos(dot);
  const sinTheta = Math.sin(theta);
  
  const w1 = Math.sin((1 - t) * theta) / sinTheta;
  const w2 = Math.sin(t * theta) / sinTheta;
  
  return {
    x: w1 * q1.x + w2 * q2.x,
    y: w1 * q1.y + w2 * q2.y,
    z: w1 * q1.z + w2 * q2.z,
    w: w1 * q1.w + w2 * q2.w
  };
}
```

### 优化版本（Fast Slerp）

对于实时应用，可以用Nlerp（归一化线性插值）近似：

```javascript
function nlerp(q1, q2, t) {
  let dot = q1.x * q2.x + q1.y * q2.y + q1.z * q2.z + q1.w * q2.w;
  
  // 最短路径
  if (dot < 0) {
    q2 = { x: -q2.x, y: -q2.y, z: -q2.z, w: -q2.w };
  }
  
  // 线性插值 + 归一化
  const result = {
    x: q1.x + t * (q2.x - q1.x),
    y: q1.y + t * (q2.y - q1.y),
    z: q1.z + t * (q2.z - q1.z),
    w: q1.w + t * (q2.w - q1.w)
  };
  
  return normalize(result);
}
```

**优势**：
- 快3-4倍（无三角函数）
- 视觉上差异很小（夹角<90度时）

**缺点**：
- 旋转速度不完全均匀
- 夹角很大时明显非线性

## 实际应用场景

### 场景1：相机平滑跟随

```javascript
class SmoothCamera {
  constructor() {
    this.rotation = { x: 0, y: 0, z: 0, w: 1 };
    this.targetRotation = { x: 0, y: 0, z: 0, w: 1 };
  }
  
  lookAt(target) {
    const direction = normalize(subtract(target, this.position));
    this.targetRotation = lookRotation(direction, { x: 0, y: 1, z: 0 });
  }
  
  update(dt) {
    // 平滑插值
    const speed = 5.0;  // 每秒插值速度
    const t = 1 - Math.exp(-speed * dt);  // 指数平滑
    
    this.rotation = slerp(this.rotation, this.targetRotation, t);
  }
}

// 使用
const camera = new SmoothCamera();
camera.lookAt(enemy.position);

function gameLoop(dt) {
  camera.update(dt);  // 自动平滑过渡
}
```

### 场景2：角色动画混合

```javascript
class AnimationBlender {
  blend(anim1, anim2, weight) {
    const blendedPose = {};
    
    // 对每个骨骼的旋转进行Slerp
    Object.keys(anim1.bones).forEach(boneName => {
      const rot1 = anim1.bones[boneName].rotation;
      const rot2 = anim2.bones[boneName].rotation;
      
      blendedPose[boneName] = {
        position: lerp(anim1.bones[boneName].position,
                       anim2.bones[boneName].position, weight),
        rotation: slerp(rot1, rot2, weight)  // ✅ 平滑旋转混合
      };
    });
    
    return blendedPose;
  }
}

// 示例：混合走路和跑步动画
const walkAnim = loadAnimation('walk');
const runAnim = loadAnimation('run');

const blendWeight = playerSpeed / maxSpeed;  // 0-1
const currentPose = blender.blend(walkAnim, runAnim, blendWeight);
```

### 场景3：关键帧动画

```javascript
class KeyframeAnimation {
  constructor(keyframes) {
    this.keyframes = keyframes;  // [{ time: 0, rotation: q1 }, ...]
  }
  
  evaluate(time) {
    // 找到相邻关键帧
    let i = 0;
    while (i < this.keyframes.length && this.keyframes[i].time < time) {
      i++;
    }
    
    if (i === 0) return this.keyframes[0].rotation;
    if (i >= this.keyframes.length) return this.keyframes[this.keyframes.length - 1].rotation;
    
    const prev = this.keyframes[i - 1];
    const next = this.keyframes[i];
    
    // 计算插值参数
    const t = (time - prev.time) / (next.time - prev.time);
    
    // Slerp插值
    return slerp(prev.rotation, next.rotation, t);
  }
}

// 使用
const anim = new KeyframeAnimation([
  { time: 0, rotation: q1 },
  { time: 1, rotation: q2 },
  { time: 2, rotation: q3 }
]);

const currentRotation = anim.evaluate(1.5);  // 在q2和q3之间插值
```

### 场景4：缓动函数

```javascript
function slerpWithEasing(q1, q2, t, easingFunc) {
  const easedT = easingFunc(t);
  return slerp(q1, q2, easedT);
}

// 缓动函数示例
const easeInOutCubic = t => 
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// 使用
const smoothRotation = slerpWithEasing(
  startRotation,
  endRotation,
  progress,
  easeInOutCubic
);
```

## 性能对比

| 方法 | 性能 | 精度 | 适用场景 |
|------|------|------|---------|
| **Lerp** | 最快 | 差（需归一化） | 不推荐 |
| **Nlerp** | 快 | 好 | 实时游戏，夹角<90° |
| **Slerp** | 慢 | 完美 | 动画导出，大角度旋转 |

```javascript
// 性能测试
const iterations = 100000;

console.time('Nlerp');
for (let i = 0; i < iterations; i++) {
  nlerp(q1, q2, 0.5);
}
console.timeEnd('Nlerp');  // ~15ms

console.time('Slerp');
for (let i = 0; i < iterations; i++) {
  slerp(q1, q2, 0.5);
}
console.timeEnd('Slerp');  // ~50ms
```

## 常见陷阱

### 陷阱1：忘记检查最短路径

```javascript
// 错误：不检查dot符号
function slerpWrong(q1, q2, t) {
  let dot = q1.x * q2.x + q1.y * q2.y + q1.z * q2.z + q1.w * q2.w;
  // ❌ 如果dot<0，会绕远路

  const theta = Math.acos(dot);
  // ...
}

// 正确：翻转q2确保最短路径
if (dot < 0) {
  q2 = { x: -q2.x, y: -q2.y, z: -q2.z, w: -q2.w };
  dot = -dot;
}
```

### 陷阱2：除零错误

```javascript
// 错误：当q1和q2非常接近时
const sinTheta = Math.sin(theta);
const w1 = Math.sin((1 - t) * theta) / sinTheta;  // ❌ sinTheta ≈ 0

// 正确：特殊处理
if (dot > 0.9995) {
  // 使用线性插值
  return normalize(lerpQuaternion(q1, q2, t));
}
```

### 陷阱3：多次插值累积误差

```javascript
// 错误：每帧插值
function update(dt) {
  this.rotation = slerp(this.rotation, this.target, dt);  // ❌
  // 永远无法完全到达target
}

// 正确：使用指数衰减
function update(dt) {
  const t = 1 - Math.exp(-5 * dt);  // ✅ 保证收敛
  this.rotation = slerp(this.rotation, this.target, t);
}
```

## 扩展：Squad插值

对于4个及以上关键帧的平滑插值，使用**Squad**（Spherical Quadrangle）：

```javascript
function squad(q1, q2, s1, s2, t) {
  const temp1 = slerp(q1, q2, t);
  const temp2 = slerp(s1, s2, t);
  return slerp(temp1, temp2, 2 * t * (1 - t));
}

// s1和s2是控制点，类似贝塞尔曲线
const s1 = computeControlPoint(q0, q1, q2);
const s2 = computeControlPoint(q1, q2, q3);

const smoothRotation = squad(q1, q2, s1, s2, t);
```

## 总结

Slerp是四元数插值的核心：

| 特性 | 说明 |
|------|------|
| **恒定角速度** | 沿大圆弧插值 |
| **最短路径** | 需检查dot<0 |
| **避免除零** | dot>0.9995时用Lerp |
| **Nlerp近似** | 快3-4倍，小角度下效果好 |

关键要点：
- Slerp提供**最平滑的旋转插值**
- 必须处理**最短路径**和**除零**
- Nlerp是**高性能替代**方案
- 适合**相机控制**、**角色动画**、**关键帧插值**

掌握Slerp，你的旋转动画将无比流畅！
