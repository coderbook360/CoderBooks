# Camera 相机基类

> "相机定义了我们观察 3D 世界的方式，是渲染管线的核心组件。"

## 相机系统概述

```
Camera extends Object3D
├── 核心属性
│   ├── matrixWorldInverse（视图矩阵）
│   └── projectionMatrix（投影矩阵）
├── 子类
│   ├── PerspectiveCamera（透视相机）
│   ├── OrthographicCamera（正交相机）
│   ├── ArrayCamera（多视口相机）
│   └── CubeCamera（立方体相机）
└── 视锥体
    └── 定义可见区域
```

## 完整实现

```typescript
// src/cameras/Camera.ts
import { Object3D } from '../core/Object3D';
import { Matrix4 } from '../math/Matrix4';
import { Vector3 } from '../math/Vector3';

export class Camera extends Object3D {
  readonly isCamera = true;
  readonly type = 'Camera';
  
  // 视图矩阵（相机世界矩阵的逆）
  matrixWorldInverse = new Matrix4();
  
  // 投影矩阵
  projectionMatrix = new Matrix4();
  
  // 投影矩阵的逆
  projectionMatrixInverse = new Matrix4();
  
  // 协调系统（用于 VR）
  coordinateSystem: CoordinateSystem;
  
  constructor() {
    super();
    
    // 默认使用 WebGL 坐标系
    this.coordinateSystem = WebGLCoordinateSystem;
  }
  
  // 复制相机属性
  copy(source: Camera, recursive?: boolean): this {
    super.copy(source, recursive);
    
    this.matrixWorldInverse.copy(source.matrixWorldInverse);
    this.projectionMatrix.copy(source.projectionMatrix);
    this.projectionMatrixInverse.copy(source.projectionMatrixInverse);
    
    this.coordinateSystem = source.coordinateSystem;
    
    return this;
  }
  
  // 获取世界方向
  getWorldDirection(target: Vector3): Vector3 {
    this.updateWorldMatrix(true, false);
    
    const e = this.matrixWorld.elements;
    
    // 相机看向 -Z 方向
    return target.set(-e[8], -e[9], -e[10]).normalize();
  }
  
  // 更新世界矩阵时同时更新视图矩阵
  updateMatrixWorld(force?: boolean): void {
    super.updateMatrixWorld(force);
    
    // matrixWorldInverse 是 matrixWorld 的逆
    this.matrixWorldInverse.copy(this.matrixWorld).invert();
  }
  
  // 更新投影矩阵（子类实现）
  updateProjectionMatrix(): void {
    // 子类重写
  }
  
  // 克隆相机
  clone(): Camera {
    return new (this.constructor as any)().copy(this);
  }
  
  toJSON(meta?: any): any {
    const data = super.toJSON(meta);
    
    data.object.type = this.type;
    
    return data;
  }
}

// 坐标系定义
export const WebGLCoordinateSystem = 2000;
export const WebGPUCoordinateSystem = 2001;
```

## 视图矩阵

```typescript
// 视图矩阵将世界坐标转换到相机空间
class ViewMatrix {
  // 构建视图矩阵（LookAt）
  static makeLookAt(
    eye: Vector3,     // 相机位置
    target: Vector3,  // 目标位置
    up: Vector3       // 上方向
  ): Matrix4 {
    const matrix = new Matrix4();
    
    // 计算相机坐标轴
    const z = new Vector3().subVectors(eye, target).normalize();  // 后向
    const x = new Vector3().crossVectors(up, z).normalize();      // 右向
    const y = new Vector3().crossVectors(z, x);                   // 上向
    
    // 构建旋转矩阵
    matrix.set(
      x.x, y.x, z.x, 0,
      x.y, y.y, z.y, 0,
      x.z, y.z, z.z, 0,
      0, 0, 0, 1
    );
    
    // 添加平移
    const translation = new Matrix4().makeTranslation(
      -eye.x, -eye.y, -eye.z
    );
    
    matrix.multiply(translation);
    
    return matrix;
  }
}
```

## 视图矩阵图解

```
世界坐标 → 视图矩阵 → 相机坐标

世界空间：              相机空间：
    Y ↑                    Y ↑
      │                      │
      │                      │
      ●───→ X       相机 ●───→ X
     ╱                      ╱
    Z                      Z

视图矩阵 = R × T
- T: 将相机移到原点
- R: 将相机朝向对齐到 -Z

    世界              相机空间
     │                  │
     │    View          │
   物体 ──────────→   物体
     │    Matrix        │
     ●(相机)            ●(原点)
```

## 投影矩阵

```
投影类型：

透视投影（Perspective）：
        near
         ┌─┐
        ╱   ╲
       ╱     ╲
      ╱       ╲
     ╱    ◯    ╲  ← 相机
    ╱           ╲
   └─────────────┘
         far

正交投影（Orthographic）：
    ┌───────────────┐
    │               │
    │       ◯       │ ← 相机
    │               │
    └───────────────┘
    near         far
```

## 裁剪空间

```typescript
// 裁剪空间：NDC (Normalized Device Coordinates)
// 范围：[-1, 1] × [-1, 1] × [-1, 1] (WebGL)
//       [-1, 1] × [-1, 1] × [0, 1]  (WebGPU/DirectX)

// 变换管线
const clipPosition = projectionMatrix
  .multiply(viewMatrix)
  .multiply(modelMatrix)
  .multiply(vertexPosition);

// 透视除法
const ndcPosition = clipPosition.xyz / clipPosition.w;

// 视口变换
const screenPosition = {
  x: (ndcPosition.x + 1) * 0.5 * viewportWidth,
  y: (1 - ndcPosition.y) * 0.5 * viewportHeight,
  z: (ndcPosition.z + 1) * 0.5,  // 深度 [0, 1]
};
```

## 相机辅助工具

```typescript
// 相机辅助器
class CameraHelper extends LineSegments {
  camera: Camera;
  pointMap: Map<string, number[]>;
  
  constructor(camera: Camera) {
    const geometry = new BufferGeometry();
    const material = new LineBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      toneMapped: false,
    });
    
    super(geometry, material);
    
    this.camera = camera;
    this.matrix = camera.matrixWorld;
    this.matrixAutoUpdate = false;
    
    this.pointMap = new Map();
    
    this.setColors();
    this.update();
  }
  
  update(): void {
    const camera = this.camera;
    const positions = this.geometry.getAttribute('position');
    
    // 更新视锥体顶点
    if (camera instanceof PerspectiveCamera) {
      this.updatePerspective(camera, positions);
    } else if (camera instanceof OrthographicCamera) {
      this.updateOrthographic(camera, positions);
    }
    
    positions.needsUpdate = true;
  }
  
  private updatePerspective(
    camera: PerspectiveCamera,
    positions: BufferAttribute
  ): void {
    const near = camera.near;
    const far = camera.far;
    const fov = camera.fov * MathUtils.DEG2RAD;
    const aspect = camera.aspect;
    
    // 计算近平面尺寸
    const nearH = Math.tan(fov / 2) * near;
    const nearW = nearH * aspect;
    
    // 计算远平面尺寸
    const farH = Math.tan(fov / 2) * far;
    const farW = farH * aspect;
    
    // 设置顶点位置
    this.setPoint('n1', -nearW, -nearH, -near, positions);
    this.setPoint('n2', nearW, -nearH, -near, positions);
    this.setPoint('n3', -nearW, nearH, -near, positions);
    this.setPoint('n4', nearW, nearH, -near, positions);
    
    this.setPoint('f1', -farW, -farH, -far, positions);
    this.setPoint('f2', farW, -farH, -far, positions);
    this.setPoint('f3', -farW, farH, -far, positions);
    this.setPoint('f4', farW, farH, -far, positions);
  }
}
```

## 使用示例

### 创建相机

```typescript
// 透视相机
const perspectiveCamera = new PerspectiveCamera(
  75,    // 视野角度
  window.innerWidth / window.innerHeight,  // 宽高比
  0.1,   // 近裁剪面
  1000   // 远裁剪面
);
perspectiveCamera.position.set(0, 5, 10);
perspectiveCamera.lookAt(0, 0, 0);

// 正交相机
const frustumSize = 10;
const aspect = window.innerWidth / window.innerHeight;
const orthographicCamera = new OrthographicCamera(
  -frustumSize * aspect / 2,
  frustumSize * aspect / 2,
  frustumSize / 2,
  -frustumSize / 2,
  0.1,
  1000
);
```

### 窗口调整

```typescript
function onWindowResize(): void {
  const aspect = window.innerWidth / window.innerHeight;
  
  // 透视相机
  perspectiveCamera.aspect = aspect;
  perspectiveCamera.updateProjectionMatrix();
  
  // 正交相机
  orthographicCamera.left = -frustumSize * aspect / 2;
  orthographicCamera.right = frustumSize * aspect / 2;
  orthographicCamera.top = frustumSize / 2;
  orthographicCamera.bottom = -frustumSize / 2;
  orthographicCamera.updateProjectionMatrix();
  
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onWindowResize);
```

## 变换矩阵管线

```
顶点 → 模型矩阵 → 世界空间 → 视图矩阵 → 相机空间 → 投影矩阵 → 裁剪空间

GLSL 中：
gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);

简化（ModelView 合并）：
gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
```

## 本章小结

- Camera 是所有相机的基类
- matrixWorldInverse 是视图矩阵
- projectionMatrix 是投影矩阵
- 相机将 3D 世界投影到 2D 屏幕
- 视图矩阵基于相机的位置和朝向

下一章，我们将学习 PerspectiveCamera 透视相机。
