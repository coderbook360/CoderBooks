# 实战案例：相机控制器实现

本章将综合应用前面学习的所有数学知识，实现一个功能完整的3D相机控制器。

## 相机控制器设计目标

一个实用的相机控制器需要支持：
- **轨道控制（Orbit）**：围绕目标点旋转
- **缩放控制（Zoom）**：调整相机距离
- **平移控制（Pan）**：在平面上移动
- **平滑过渡**：避免突兀的视角变化
- **约束限制**：防止相机翻转和穿透

## 相机状态数据结构

首先定义相机的状态：

```typescript
interface CameraState {
  // 目标点（相机注视的点）
  target: Vec3;
  
  // 球坐标系参数
  radius: number;    // 距离目标点的距离
  theta: number;     // 水平旋转角（弧度）
  phi: number;       // 垂直旋转角（弧度）
  
  // 约束
  minRadius: number;
  maxRadius: number;
  minPhi: number;    // 最小俯仰角
  maxPhi: number;    // 最大俯仰角
}
```

**为什么使用球坐标系？**

在轨道控制中，相机位置由以下三个参数确定：
- $r$：距离目标点的半径
- $\theta$：水平旋转角
- $\phi$：垂直旋转角（俯仰角）

球坐标转笛卡尔坐标：

$$
\begin{aligned}
x &= r \cdot \sin(\phi) \cdot \cos(\theta) \\
y &= r \cdot \cos(\phi) \\
z &= r \cdot \sin(\phi) \cdot \sin(\theta)
\end{aligned}
$$

## 核心实现

### 1. OrbitCamera 类

```typescript
export class OrbitCamera {
  private state: CameraState;
  private isDragging = false;
  private lastMousePos = new Vec2();
  
  constructor(
    target: Vec3,
    radius: number = 10,
    theta: number = 0,
    phi: number = Math.PI / 4
  ) {
    this.state = {
      target,
      radius,
      theta,
      phi,
      minRadius: 1,
      maxRadius: 100,
      minPhi: 0.1,        // 避免垂直向上
      maxPhi: Math.PI - 0.1  // 避免垂直向下
    };
  }
  
  // 获取相机位置（球坐标转笛卡尔坐标）
  getPosition(): Vec3 {
    const { target, radius, theta, phi } = this.state;
    
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    
    return new Vec3(x, y, z).add(target);
  }
  
  // 获取视图矩阵
  getViewMatrix(): Mat4 {
    const eye = this.getPosition();
    const up = Vec3.up();  // (0, 1, 0)
    
    return Mat4.lookAt(eye, this.state.target, up);
  }
}
```

### 2. 旋转控制

鼠标拖拽实现视角旋转：

```typescript
export class OrbitCamera {
  // ... 前面的代码
  
  // 旋转速度系数
  private rotateSpeed = 0.005;
  
  rotate(deltaX: number, deltaY: number): void {
    // 水平旋转（theta）
    this.state.theta -= deltaX * this.rotateSpeed;
    
    // 垂直旋转（phi）
    this.state.phi -= deltaY * this.rotateSpeed;
    
    // 约束phi在有效范围内
    this.state.phi = Math.max(
      this.state.minPhi,
      Math.min(this.state.maxPhi, this.state.phi)
    );
  }
  
  // 鼠标事件处理
  onMouseDown(x: number, y: number): void {
    this.isDragging = true;
    this.lastMousePos.set(x, y);
  }
  
  onMouseMove(x: number, y: number): void {
    if (!this.isDragging) return;
    
    const deltaX = x - this.lastMousePos.x;
    const deltaY = y - this.lastMousePos.y;
    
    this.rotate(deltaX, deltaY);
    
    this.lastMousePos.set(x, y);
  }
  
  onMouseUp(): void {
    this.isDragging = false;
  }
}
```

**为什么约束phi？**

- 当 $\phi = 0$ 或 $\phi = \pi$ 时，相机垂直向上或向下
- 此时叉积 $\mathbf{forward} \times \mathbf{up}$ 会退化为零向量
- 导致万向节死锁（Gimbal Lock）

### 3. 缩放控制

鼠标滚轮实现距离调整：

```typescript
export class OrbitCamera {
  // ... 前面的代码
  
  private zoomSpeed = 0.1;
  
  zoom(delta: number): void {
    // delta > 0 放大，delta < 0 缩小
    this.state.radius *= Math.pow(0.95, delta * this.zoomSpeed);
    
    // 约束半径范围
    this.state.radius = Math.max(
      this.state.minRadius,
      Math.min(this.state.maxRadius, this.state.radius)
    );
  }
  
  onWheel(deltaY: number): void {
    this.zoom(deltaY);
  }
}
```

**缩放策略**：
- 使用指数衰减：$r_{new} = r_{old} \cdot k^{\Delta}$
- 而非线性缩放：$r_{new} = r_{old} + \Delta$
- 优势：近处缩放慢，远处缩放快，符合感知

### 4. 平移控制

右键拖拽实现相机平移：

```typescript
export class OrbitCamera {
  // ... 前面的代码
  
  private panSpeed = 0.01;
  
  pan(deltaX: number, deltaY: number): void {
    const eye = this.getPosition();
    const forward = this.state.target.sub(eye).normalize();
    
    // 计算相机的right和up向量
    const right = forward.cross(Vec3.up()).normalize();
    const up = right.cross(forward).normalize();
    
    // 平移目标点
    const offset = right.mul(deltaX * this.panSpeed * this.state.radius)
      .add(up.mul(-deltaY * this.panSpeed * this.state.radius));
    
    this.state.target.addSelf(offset);
  }
  
  onRightMouseMove(x: number, y: number): void {
    if (!this.isRightDragging) return;
    
    const deltaX = x - this.lastMousePos.x;
    const deltaY = y - this.lastMousePos.y;
    
    this.pan(deltaX, deltaY);
    
    this.lastMousePos.set(x, y);
  }
}
```

**为什么平移速度与radius相关？**

- 距离远时，相同的像素移动对应更大的世界空间位移
- $\text{worldDelta} = \text{screenDelta} \cdot r \cdot k$
- 保证平移速度的视觉一致性

### 5. 平滑过渡

使用线性插值实现平滑动画：

```typescript
export class OrbitCamera {
  // ... 前面的代码
  
  private targetState: Partial<CameraState> | null = null;
  private transitionDuration = 0.5; // 秒
  private transitionProgress = 0;
  
  // 设置目标状态
  transitionTo(state: Partial<CameraState>): void {
    this.targetState = { ...this.state, ...state };
    this.transitionProgress = 0;
  }
  
  // 每帧更新
  update(deltaTime: number): void {
    if (!this.targetState) return;
    
    this.transitionProgress += deltaTime / this.transitionDuration;
    
    if (this.transitionProgress >= 1) {
      // 过渡完成
      this.state = { ...this.state, ...this.targetState };
      this.targetState = null;
      return;
    }
    
    // 线性插值
    const t = this.transitionProgress;
    
    if (this.targetState.radius !== undefined) {
      this.state.radius = lerp(this.state.radius, this.targetState.radius, t);
    }
    
    if (this.targetState.theta !== undefined) {
      this.state.theta = lerpAngle(this.state.theta, this.targetState.theta, t);
    }
    
    if (this.targetState.phi !== undefined) {
      this.state.phi = lerp(this.state.phi, this.targetState.phi, t);
    }
    
    if (this.targetState.target) {
      this.state.target = Vec3.lerp(this.state.target, this.targetState.target, t);
    }
  }
}

// 工具函数：线性插值
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// 角度插值（处理2π周期）
function lerpAngle(a: number, b: number, t: number): number {
  let delta = b - a;
  
  // 选择最短路径
  if (delta > Math.PI) delta -= 2 * Math.PI;
  if (delta < -Math.PI) delta += 2 * Math.PI;
  
  return a + delta * t;
}
```

**为什么需要角度插值？**

- 普通插值：从 $350°$ 到 $10°$ 会旋转 $-340°$（反向大圈）
- 角度插值：识别到最短路径是 $+20°$（正向小圈）

## 完整使用示例

```typescript
// 创建相机
const camera = new OrbitCamera(
  new Vec3(0, 0, 0),  // 目标点
  10,                  // 初始距离
  0,                   // 初始水平角
  Math.PI / 4          // 初始俯仰角（45度）
);

// 设置约束
camera.setConstraints({
  minRadius: 2,
  maxRadius: 50,
  minPhi: 0.1,
  maxPhi: Math.PI - 0.1
});

// 鼠标事件
canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0) {  // 左键
    camera.onMouseDown(e.clientX, e.clientY);
  } else if (e.button === 2) {  // 右键
    camera.onRightMouseDown(e.clientX, e.clientY);
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (e.buttons & 1) {  // 左键拖拽
    camera.onMouseMove(e.clientX, e.clientY);
  } else if (e.buttons & 2) {  // 右键拖拽
    camera.onRightMouseMove(e.clientX, e.clientY);
  }
});

canvas.addEventListener('mouseup', () => {
  camera.onMouseUp();
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  camera.onWheel(e.deltaY);
});

// 动画循环
let lastTime = 0;
function animate(time: number) {
  const deltaTime = (time - lastTime) / 1000;
  lastTime = time;
  
  // 更新相机（处理平滑过渡）
  camera.update(deltaTime);
  
  // 获取视图矩阵
  const viewMatrix = camera.getViewMatrix();
  
  // 传递给渲染器
  renderer.setViewMatrix(viewMatrix);
  renderer.render();
  
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

// 预设视角
function focusOnObject(position: Vec3, distance: number = 10) {
  camera.transitionTo({
    target: position,
    radius: distance,
    theta: 0,
    phi: Math.PI / 3
  });
}

// 使用预设
focusOnObject(new Vec3(5, 2, 3), 15);
```

## 高级功能扩展

### 1. 自动旋转

实现相机自动围绕目标点旋转：

```typescript
export class OrbitCamera {
  // ... 前面的代码
  
  private autoRotate = false;
  private autoRotateSpeed = 0.5; // 弧度/秒
  
  setAutoRotate(enable: boolean, speed: number = 0.5): void {
    this.autoRotate = enable;
    this.autoRotateSpeed = speed;
  }
  
  update(deltaTime: number): void {
    // 自动旋转
    if (this.autoRotate && !this.isDragging) {
      this.state.theta += this.autoRotateSpeed * deltaTime;
    }
    
    // ... 其他更新逻辑
  }
}
```

### 2. 阻尼效果

实现惯性滑动：

```typescript
export class OrbitCamera {
  // ... 前面的代码
  
  private velocity = { theta: 0, phi: 0, radius: 0 };
  private damping = 0.9;  // 阻尼系数
  
  rotate(deltaX: number, deltaY: number): void {
    this.velocity.theta = -deltaX * this.rotateSpeed;
    this.velocity.phi = -deltaY * this.rotateSpeed;
  }
  
  update(deltaTime: number): void {
    // 应用速度
    this.state.theta += this.velocity.theta;
    this.state.phi += this.velocity.phi;
    
    // 约束
    this.state.phi = Math.max(
      this.state.minPhi,
      Math.min(this.state.maxPhi, this.state.phi)
    );
    
    // 阻尼衰减
    if (!this.isDragging) {
      this.velocity.theta *= this.damping;
      this.velocity.phi *= this.damping;
      
      // 速度足够小时停止
      if (Math.abs(this.velocity.theta) < 0.001) this.velocity.theta = 0;
      if (Math.abs(this.velocity.phi) < 0.001) this.velocity.phi = 0;
    }
  }
}
```

### 3. 第一人称模式

支持切换到FPS相机：

```typescript
export class OrbitCamera {
  // ... 前面的代码
  
  private mode: 'orbit' | 'fps' = 'orbit';
  
  switchToFPS(): void {
    this.mode = 'fps';
    // 在FPS模式下，相机位置就是target
  }
  
  getViewMatrix(): Mat4 {
    if (this.mode === 'fps') {
      return this.getFPSViewMatrix();
    }
    return this.getOrbitViewMatrix();
  }
  
  private getFPSViewMatrix(): Mat4 {
    // 从欧拉角计算方向
    const forward = new Vec3(
      Math.cos(this.state.phi) * Math.sin(this.state.theta),
      Math.sin(this.state.phi),
      Math.cos(this.state.phi) * Math.cos(this.state.theta)
    );
    
    const target = this.state.target.add(forward);
    return Mat4.lookAt(this.state.target, target, Vec3.up());
  }
}
```

## 性能优化建议

### 1. 避免频繁创建对象

```typescript
// 不好：每帧创建新对象
getPosition(): Vec3 {
  return new Vec3(x, y, z).add(target);
}

// 好：复用对象
private cachedPosition = new Vec3();

getPosition(): Vec3 {
  const { target, radius, theta, phi } = this.state;
  
  this.cachedPosition.set(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
  
  return this.cachedPosition.addSelf(target);
}
```

### 2. 延迟计算

只在需要时计算矩阵：

```typescript
export class OrbitCamera {
  private viewMatrix = Mat4.identity();
  private isDirty = true;
  
  rotate(deltaX: number, deltaY: number): void {
    // ... 更新状态
    this.isDirty = true;  // 标记需要重新计算
  }
  
  getViewMatrix(): Mat4 {
    if (this.isDirty) {
      const eye = this.getPosition();
      this.viewMatrix = Mat4.lookAt(eye, this.state.target, Vec3.up());
      this.isDirty = false;
    }
    return this.viewMatrix;
  }
}
```

### 3. 事件节流

限制更新频率：

```typescript
private lastUpdateTime = 0;
private updateInterval = 16; // 约60fps

onMouseMove(x: number, y: number): void {
  const now = Date.now();
  if (now - this.lastUpdateTime < this.updateInterval) {
    return;
  }
  
  // ... 处理移动
  this.lastUpdateTime = now;
}
```

## 与Three.js对比

Three.js的OrbitControls提供了类似功能：

```typescript
// Three.js
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// 我们的实现
const camera = new OrbitCamera(target, radius);
camera.setDamping(0.05);
```

**我们的实现优势**：
- 更小的体积（不依赖Three.js）
- 更容易理解和定制
- 学习价值：理解相机控制的数学原理

**Three.js优势**：
- 更完善的功能（触摸支持、键盘控制等）
- 经过充分测试
- 活跃的社区支持

## 总结

本章通过实现相机控制器，综合运用了：

1. **向量运算**：计算相机位置和方向
2. **矩阵变换**：构建视图矩阵
3. **球坐标系**：直观的旋转参数化
4. **插值算法**：平滑过渡动画
5. **几何约束**：避免万向节死锁

**关键要点**：

- 球坐标系最适合轨道控制
- 必须约束phi避免垂直视角
- 平移速度应与距离成正比
- 角度插值要选择最短路径
- 缓存和延迟计算提升性能

这是3D图形学数学知识的完整应用案例，展示了数学理论如何转化为实用功能。

## 思考题

1. 如何实现相机绕任意轴旋转（而非仅绕Y轴）？
2. 如何添加碰撞检测，防止相机穿透物体？
3. 如何实现相机路径动画（如轨道飞行）？
4. 四元数能否替代欧拉角实现更平滑的旋转？

探索这些问题，将进一步深化你对3D数学的理解。
