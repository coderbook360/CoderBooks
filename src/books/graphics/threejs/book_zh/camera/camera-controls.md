# CameraControls 相机控制器

> "好的相机控制让用户与 3D 世界的交互变得自然流畅。"

## 相机控制概述

```
Three.js 相机控制器：

OrbitControls          轨道控制器（环绕目标旋转）
├── 鼠标左键：旋转
├── 鼠标右键：平移
└── 滚轮：缩放

TrackballControls      轨迹球控制器
├── 全方向旋转
└── 无视角锁定

FlyControls            飞行控制器
├── 第一人称飞行
└── 六自由度

PointerLockControls    指针锁定控制器
├── FPS 游戏风格
└── 鼠标锁定

MapControls            地图控制器
├── 俯视地图导航
└── 类 Google Maps
```

## OrbitControls 实现

```typescript
// 简化版 OrbitControls
import { Camera } from '../cameras/Camera';
import { Vector2 } from '../math/Vector2';
import { Vector3 } from '../math/Vector3';
import { Spherical } from '../math/Spherical';
import { Quaternion } from '../math/Quaternion';

export class OrbitControls {
  // 目标对象
  object: Camera;
  domElement: HTMLElement;
  
  // 公共属性
  enabled = true;
  target = new Vector3();  // 环绕目标
  
  // 缩放限制
  minDistance = 0;
  maxDistance = Infinity;
  
  // 垂直角度限制
  minPolarAngle = 0;              // 最小仰角（0 = 北极）
  maxPolarAngle = Math.PI;        // 最大仰角（π = 南极）
  
  // 水平角度限制
  minAzimuthAngle = -Infinity;
  maxAzimuthAngle = Infinity;
  
  // 阻尼（惯性）
  enableDamping = false;
  dampingFactor = 0.05;
  
  // 旋转速度
  rotateSpeed = 1.0;
  panSpeed = 1.0;
  zoomSpeed = 1.0;
  
  // 功能开关
  enableRotate = true;
  enablePan = true;
  enableZoom = true;
  
  // 自动旋转
  autoRotate = false;
  autoRotateSpeed = 2.0;
  
  // 内部状态
  private spherical = new Spherical();
  private sphericalDelta = new Spherical();
  private scale = 1;
  private panOffset = new Vector3();
  
  private rotateStart = new Vector2();
  private rotateEnd = new Vector2();
  private rotateDelta = new Vector2();
  
  private panStart = new Vector2();
  private panEnd = new Vector2();
  private panDelta = new Vector2();
  
  private dollyStart = new Vector2();
  private dollyEnd = new Vector2();
  private dollyDelta = new Vector2();
  
  private state = STATE.NONE;
  
  constructor(object: Camera, domElement: HTMLElement) {
    this.object = object;
    this.domElement = domElement;
    
    this.domElement.style.touchAction = 'none';
    
    // 绑定事件
    this.domElement.addEventListener('contextmenu', this.onContextMenu);
    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.domElement.addEventListener('pointercancel', this.onPointerUp);
    this.domElement.addEventListener('wheel', this.onMouseWheel, { passive: false });
    
    this.update();
  }
  
  // 更新相机位置
  update(): boolean {
    const offset = new Vector3();
    const quat = new Quaternion().setFromUnitVectors(
      this.object.up,
      new Vector3(0, 1, 0)
    );
    const quatInverse = quat.clone().invert();
    
    // 计算相机位置相对于目标的偏移
    const position = this.object.position;
    offset.copy(position).sub(this.target);
    
    // 转换到 Y-up 空间
    offset.applyQuaternion(quat);
    
    // 转换为球坐标
    this.spherical.setFromVector3(offset);
    
    // 应用自动旋转
    if (this.autoRotate && this.state === STATE.NONE) {
      this.rotateLeft(this.getAutoRotationAngle());
    }
    
    // 应用阻尼
    if (this.enableDamping) {
      this.spherical.theta += this.sphericalDelta.theta * this.dampingFactor;
      this.spherical.phi += this.sphericalDelta.phi * this.dampingFactor;
    } else {
      this.spherical.theta += this.sphericalDelta.theta;
      this.spherical.phi += this.sphericalDelta.phi;
    }
    
    // 限制角度范围
    this.spherical.theta = Math.max(
      this.minAzimuthAngle,
      Math.min(this.maxAzimuthAngle, this.spherical.theta)
    );
    this.spherical.phi = Math.max(
      this.minPolarAngle,
      Math.min(this.maxPolarAngle, this.spherical.phi)
    );
    this.spherical.makeSafe();
    
    // 应用缩放
    this.spherical.radius *= this.scale;
    this.spherical.radius = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, this.spherical.radius)
    );
    
    // 应用平移
    this.target.add(this.panOffset);
    
    // 转换回笛卡尔坐标
    offset.setFromSpherical(this.spherical);
    offset.applyQuaternion(quatInverse);
    
    position.copy(this.target).add(offset);
    
    this.object.lookAt(this.target);
    
    // 重置增量
    if (this.enableDamping) {
      this.sphericalDelta.theta *= (1 - this.dampingFactor);
      this.sphericalDelta.phi *= (1 - this.dampingFactor);
      this.panOffset.multiplyScalar(1 - this.dampingFactor);
    } else {
      this.sphericalDelta.set(0, 0, 0);
      this.panOffset.set(0, 0, 0);
    }
    
    this.scale = 1;
    
    return true;
  }
  
  // 旋转
  private rotateLeft(angle: number): void {
    this.sphericalDelta.theta -= angle;
  }
  
  private rotateUp(angle: number): void {
    this.sphericalDelta.phi -= angle;
  }
  
  // 平移
  private panLeft(distance: number, objectMatrix: Matrix4): void {
    const v = new Vector3();
    v.setFromMatrixColumn(objectMatrix, 0);
    v.multiplyScalar(-distance);
    this.panOffset.add(v);
  }
  
  private panUp(distance: number, objectMatrix: Matrix4): void {
    const v = new Vector3();
    v.setFromMatrixColumn(objectMatrix, 1);
    v.multiplyScalar(distance);
    this.panOffset.add(v);
  }
  
  // 缩放
  private dollyIn(dollyScale: number): void {
    this.scale /= dollyScale;
  }
  
  private dollyOut(dollyScale: number): void {
    this.scale *= dollyScale;
  }
  
  // 获取自动旋转角度
  private getAutoRotationAngle(): number {
    return (2 * Math.PI / 60 / 60) * this.autoRotateSpeed;
  }
  
  // 获取缩放比例
  private getZoomScale(): number {
    return Math.pow(0.95, this.zoomSpeed);
  }
  
  // 鼠标事件处理
  private onPointerDown = (event: PointerEvent): void => {
    if (!this.enabled) return;
    
    if (event.pointerType === 'touch') {
      this.onTouchStart(event);
    } else {
      this.onMouseDown(event);
    }
  };
  
  private onMouseDown(event: PointerEvent): void {
    let mouseAction: number;
    
    switch (event.button) {
      case 0: // 左键
        mouseAction = this.enableRotate ? STATE.ROTATE : STATE.NONE;
        break;
      case 1: // 中键
        mouseAction = this.enableZoom ? STATE.DOLLY : STATE.NONE;
        break;
      case 2: // 右键
        mouseAction = this.enablePan ? STATE.PAN : STATE.NONE;
        break;
      default:
        mouseAction = STATE.NONE;
    }
    
    if (mouseAction === STATE.ROTATE) {
      this.rotateStart.set(event.clientX, event.clientY);
      this.state = STATE.ROTATE;
    } else if (mouseAction === STATE.DOLLY) {
      this.dollyStart.set(event.clientX, event.clientY);
      this.state = STATE.DOLLY;
    } else if (mouseAction === STATE.PAN) {
      this.panStart.set(event.clientX, event.clientY);
      this.state = STATE.PAN;
    }
    
    if (this.state !== STATE.NONE) {
      this.domElement.addEventListener('pointermove', this.onPointerMove);
      this.domElement.addEventListener('pointerup', this.onPointerUp);
    }
  }
  
  private onPointerMove = (event: PointerEvent): void => {
    if (!this.enabled) return;
    
    if (event.pointerType === 'touch') {
      this.onTouchMove(event);
    } else {
      this.onMouseMove(event);
    }
  };
  
  private onMouseMove(event: PointerEvent): void {
    if (this.state === STATE.ROTATE) {
      this.rotateEnd.set(event.clientX, event.clientY);
      this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart)
        .multiplyScalar(this.rotateSpeed);
      
      const element = this.domElement;
      this.rotateLeft(2 * Math.PI * this.rotateDelta.x / element.clientHeight);
      this.rotateUp(2 * Math.PI * this.rotateDelta.y / element.clientHeight);
      
      this.rotateStart.copy(this.rotateEnd);
    } else if (this.state === STATE.DOLLY) {
      this.dollyEnd.set(event.clientX, event.clientY);
      this.dollyDelta.subVectors(this.dollyEnd, this.dollyStart);
      
      if (this.dollyDelta.y > 0) {
        this.dollyOut(this.getZoomScale());
      } else if (this.dollyDelta.y < 0) {
        this.dollyIn(this.getZoomScale());
      }
      
      this.dollyStart.copy(this.dollyEnd);
    } else if (this.state === STATE.PAN) {
      this.panEnd.set(event.clientX, event.clientY);
      this.panDelta.subVectors(this.panEnd, this.panStart)
        .multiplyScalar(this.panSpeed);
      
      this.pan(this.panDelta.x, this.panDelta.y);
      this.panStart.copy(this.panEnd);
    }
    
    this.update();
  }
  
  private onPointerUp = (event: PointerEvent): void => {
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerup', this.onPointerUp);
    
    this.state = STATE.NONE;
  };
  
  private onMouseWheel = (event: WheelEvent): void => {
    if (!this.enabled || !this.enableZoom) return;
    
    event.preventDefault();
    
    if (event.deltaY < 0) {
      this.dollyIn(this.getZoomScale());
    } else if (event.deltaY > 0) {
      this.dollyOut(this.getZoomScale());
    }
    
    this.update();
  };
  
  private onContextMenu = (event: Event): void => {
    if (!this.enabled) return;
    event.preventDefault();
  };
  
  private pan(deltaX: number, deltaY: number): void {
    const element = this.domElement;
    const position = this.object.position;
    
    const offset = position.clone().sub(this.target);
    let targetDistance = offset.length();
    
    // FOV 调整
    if ('fov' in this.object) {
      targetDistance *= Math.tan(
        ((this.object as any).fov / 2) * Math.PI / 180
      );
    }
    
    this.panLeft(
      2 * deltaX * targetDistance / element.clientHeight,
      this.object.matrix
    );
    this.panUp(
      2 * deltaY * targetDistance / element.clientHeight,
      this.object.matrix
    );
  }
  
  // 触摸处理（简化）
  private onTouchStart(event: PointerEvent): void {
    // 单点触摸旋转
    this.rotateStart.set(event.clientX, event.clientY);
    this.state = STATE.ROTATE;
    
    this.domElement.addEventListener('pointermove', this.onPointerMove);
    this.domElement.addEventListener('pointerup', this.onPointerUp);
  }
  
  private onTouchMove(event: PointerEvent): void {
    if (this.state === STATE.ROTATE) {
      this.rotateEnd.set(event.clientX, event.clientY);
      this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart)
        .multiplyScalar(this.rotateSpeed);
      
      const element = this.domElement;
      this.rotateLeft(2 * Math.PI * this.rotateDelta.x / element.clientHeight);
      this.rotateUp(2 * Math.PI * this.rotateDelta.y / element.clientHeight);
      
      this.rotateStart.copy(this.rotateEnd);
    }
    
    this.update();
  }
  
  // 重置
  reset(): void {
    this.target.set(0, 0, 0);
    this.object.position.set(0, 0, 5);
    this.object.lookAt(0, 0, 0);
    this.update();
  }
  
  // 销毁
  dispose(): void {
    this.domElement.removeEventListener('contextmenu', this.onContextMenu);
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.domElement.removeEventListener('pointercancel', this.onPointerUp);
    this.domElement.removeEventListener('wheel', this.onMouseWheel);
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerup', this.onPointerUp);
  }
}

// 状态枚举
const STATE = {
  NONE: -1,
  ROTATE: 0,
  DOLLY: 1,
  PAN: 2,
  TOUCH_ROTATE: 3,
  TOUCH_PAN: 4,
  TOUCH_DOLLY_PAN: 5,
  TOUCH_DOLLY_ROTATE: 6,
};
```

## 球坐标系

```
球坐标系（Spherical）：

         Y (up)
         │
         │    ● (点)
         │   ╱│
         │  ╱ │ phi (仰角)
         │ ╱  │
         │╱θ  │
─────────●────────── X
        ╱│
       ╱ │
      ╱  │
     Z   │

- radius: 到原点距离
- phi: 仰角 [0, π]
- theta: 方位角 [-π, π]

笛卡尔转换：
x = r * sin(phi) * sin(theta)
y = r * cos(phi)
z = r * sin(phi) * cos(theta)
```

## 使用示例

### 基础使用

```typescript
import { OrbitControls } from 'three/addons/controls/OrbitControls';

const camera = new PerspectiveCamera(75, aspect, 0.1, 1000);
camera.position.set(0, 5, 10);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

function animate() {
  requestAnimationFrame(animate);
  controls.update();  // 必须调用（启用阻尼时）
  renderer.render(scene, camera);
}
```

### 限制范围

```typescript
// 限制缩放
controls.minDistance = 2;
controls.maxDistance = 100;

// 限制垂直角度（避免翻转）
controls.minPolarAngle = Math.PI / 6;  // 30°
controls.maxPolarAngle = Math.PI / 2;  // 90°

// 限制水平角度
controls.minAzimuthAngle = -Math.PI / 4;  // -45°
controls.maxAzimuthAngle = Math.PI / 4;   // 45°
```

### 自动旋转

```typescript
controls.autoRotate = true;
controls.autoRotateSpeed = 2.0;  // 每秒旋转角度

// 用户交互后暂停自动旋转
controls.addEventListener('start', () => {
  controls.autoRotate = false;
});

// 无操作一段时间后恢复
let idleTimer: number;
controls.addEventListener('end', () => {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    controls.autoRotate = true;
  }, 3000);
});
```

### 平滑过渡到目标

```typescript
// 平滑移动到新位置
function animateToTarget(
  controls: OrbitControls,
  targetPosition: Vector3,
  targetLookAt: Vector3,
  duration = 1000
): void {
  const startPosition = controls.object.position.clone();
  const startTarget = controls.target.clone();
  const startTime = performance.now();
  
  function animate() {
    const elapsed = performance.now() - startTime;
    const t = Math.min(elapsed / duration, 1);
    
    // 缓动
    const ease = 1 - Math.pow(1 - t, 3);
    
    controls.object.position.lerpVectors(startPosition, targetPosition, ease);
    controls.target.lerpVectors(startTarget, targetLookAt, ease);
    controls.update();
    
    if (t < 1) {
      requestAnimationFrame(animate);
    }
  }
  
  animate();
}

// 使用
animateToTarget(
  controls,
  new Vector3(10, 5, 10),
  new Vector3(0, 0, 0),
  1500
);
```

## FlyControls

```typescript
// 飞行控制器（六自由度）
import { FlyControls } from 'three/addons/controls/FlyControls';

const flyControls = new FlyControls(camera, renderer.domElement);
flyControls.movementSpeed = 10;
flyControls.rollSpeed = Math.PI / 6;
flyControls.autoForward = false;
flyControls.dragToLook = true;

// 需要传入 delta time
const clock = new Clock();
function animate() {
  const delta = clock.getDelta();
  flyControls.update(delta);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

// 键盘控制：
// W/S - 前进/后退
// A/D - 左移/右移
// R/F - 上升/下降
// Q/E - 翻滚
```

## PointerLockControls

```typescript
// FPS 风格控制器
import { PointerLockControls } from 'three/addons/controls/PointerLockControls';

const pointerControls = new PointerLockControls(camera, document.body);

// 点击锁定鼠标
document.addEventListener('click', () => {
  pointerControls.lock();
});

pointerControls.addEventListener('lock', () => {
  console.log('Pointer locked');
});

pointerControls.addEventListener('unlock', () => {
  console.log('Pointer unlocked');
});

// 移动控制
const velocity = new Vector3();
const direction = new Vector3();
const keys = { forward: false, backward: false, left: false, right: false };

document.addEventListener('keydown', (e) => {
  switch (e.code) {
    case 'KeyW': keys.forward = true; break;
    case 'KeyS': keys.backward = true; break;
    case 'KeyA': keys.left = true; break;
    case 'KeyD': keys.right = true; break;
  }
});

document.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'KeyW': keys.forward = false; break;
    case 'KeyS': keys.backward = false; break;
    case 'KeyA': keys.left = false; break;
    case 'KeyD': keys.right = false; break;
  }
});

function animate() {
  const delta = clock.getDelta();
  
  if (pointerControls.isLocked) {
    // 速度衰减
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;
    
    direction.z = Number(keys.forward) - Number(keys.backward);
    direction.x = Number(keys.right) - Number(keys.left);
    direction.normalize();
    
    if (keys.forward || keys.backward) {
      velocity.z -= direction.z * 100.0 * delta;
    }
    if (keys.left || keys.right) {
      velocity.x -= direction.x * 100.0 * delta;
    }
    
    pointerControls.moveRight(-velocity.x * delta);
    pointerControls.moveForward(-velocity.z * delta);
  }
  
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
```

## 控制器对比

| 控制器 | 适用场景 | 交互方式 |
|--------|----------|----------|
| OrbitControls | 模型查看器 | 环绕旋转 |
| TrackballControls | 无限制旋转 | 轨迹球 |
| FlyControls | 场景漫游 | 六自由度 |
| PointerLockControls | FPS 游戏 | 鼠标锁定 |
| MapControls | 地图导航 | 俯视平移 |
| DragControls | 物体拖拽 | 拖放对象 |
| TransformControls | 物体变换 | 移动/旋转/缩放 |

## 本章小结

- OrbitControls 是最常用的相机控制器
- 球坐标系用于描述环绕运动
- 阻尼使运动更平滑
- 不同控制器适合不同场景
- 需要在动画循环中调用 update()

下一章，我们将学习 CameraHelper 相机辅助器。
