# OrthographicCamera 正交相机

> "正交投影保持物体的真实比例，不受距离影响——这正是工程制图和 2D 游戏所需要的。"

## 正交投影原理

```
正交视锥体（长方体）：

     ┌─────────────────────┐
    ╱│                    ╱│
   ╱ │                   ╱ │
  ┌─────────────────────┐  │
  │  │                  │  │
  │  │      👁          │  │ ← 相机在中心
  │  │                  │  │
  │  └──────────────────│──┘
  │ ╱                   │ ╱
  │╱                    │╱
  └─────────────────────┘
  left              right

特征：
- 平行线保持平行
- 无透视变形
- 物体大小与距离无关
```

## 完整实现

```typescript
// src/cameras/OrthographicCamera.ts
import { Camera } from './Camera';
import { Matrix4 } from '../math/Matrix4';

export class OrthographicCamera extends Camera {
  readonly isOrthographicCamera = true;
  readonly type = 'OrthographicCamera';
  
  // 视锥体边界
  left: number;
  right: number;
  top: number;
  bottom: number;
  
  // 裁剪面
  near: number;
  far: number;
  
  // 缩放因子
  zoom = 1;
  
  // 子视图参数
  view: {
    enabled: boolean;
    fullWidth: number;
    fullHeight: number;
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
  } | null = null;
  
  constructor(
    left = -1,
    right = 1,
    top = 1,
    bottom = -1,
    near = 0.1,
    far = 2000
  ) {
    super();
    
    this.left = left;
    this.right = right;
    this.top = top;
    this.bottom = bottom;
    this.near = near;
    this.far = far;
    
    this.updateProjectionMatrix();
  }
  
  // 设置子视图
  setViewOffset(
    fullWidth: number,
    fullHeight: number,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    this.view = {
      enabled: true,
      fullWidth,
      fullHeight,
      offsetX: x,
      offsetY: y,
      width,
      height,
    };
    
    this.updateProjectionMatrix();
  }
  
  // 清除子视图
  clearViewOffset(): void {
    if (this.view !== null) {
      this.view.enabled = false;
    }
    this.updateProjectionMatrix();
  }
  
  // 更新投影矩阵
  updateProjectionMatrix(): void {
    const dx = (this.right - this.left) / (2 * this.zoom);
    const dy = (this.top - this.bottom) / (2 * this.zoom);
    const cx = (this.right + this.left) / 2;
    const cy = (this.top + this.bottom) / 2;
    
    let left = cx - dx;
    let right = cx + dx;
    let top = cy + dy;
    let bottom = cy - dy;
    
    // 应用子视图
    if (this.view !== null && this.view.enabled) {
      const scaleW = (this.right - this.left) / this.view.fullWidth / this.zoom;
      const scaleH = (this.top - this.bottom) / this.view.fullHeight / this.zoom;
      
      left += scaleW * this.view.offsetX;
      right = left + scaleW * this.view.width;
      top -= scaleH * this.view.offsetY;
      bottom = top - scaleH * this.view.height;
    }
    
    // 构建正交投影矩阵
    this.projectionMatrix.makeOrthographic(
      left, right,
      top, bottom,
      this.near, this.far,
      this.coordinateSystem
    );
    
    this.projectionMatrixInverse.copy(this.projectionMatrix).invert();
  }
  
  copy(source: OrthographicCamera, recursive?: boolean): this {
    super.copy(source, recursive);
    
    this.left = source.left;
    this.right = source.right;
    this.top = source.top;
    this.bottom = source.bottom;
    this.near = source.near;
    this.far = source.far;
    
    this.zoom = source.zoom;
    
    if (source.view !== null) {
      this.view = { ...source.view };
    }
    
    return this;
  }
  
  toJSON(meta?: any): any {
    const data = super.toJSON(meta);
    
    data.object.left = this.left;
    data.object.right = this.right;
    data.object.top = this.top;
    data.object.bottom = this.bottom;
    data.object.near = this.near;
    data.object.far = this.far;
    
    if (this.zoom !== 1) {
      data.object.zoom = this.zoom;
    }
    
    return data;
  }
}
```

## 正交投影矩阵

```typescript
// Matrix4 中的正交投影矩阵构建
makeOrthographic(
  left: number,
  right: number,
  top: number,
  bottom: number,
  near: number,
  far: number,
  coordinateSystem: number
): Matrix4 {
  const te = this.elements;
  
  const w = 1.0 / (right - left);
  const h = 1.0 / (top - bottom);
  const p = 1.0 / (far - near);
  
  const x = (right + left) * w;
  const y = (top + bottom) * h;
  
  let z: number, zInv: number;
  
  if (coordinateSystem === WebGLCoordinateSystem) {
    // WebGL: z 范围 [-1, 1]
    z = (far + near) * p;
    zInv = -2 * p;
  } else if (coordinateSystem === WebGPUCoordinateSystem) {
    // WebGPU: z 范围 [0, 1]
    z = near * p;
    zInv = -p;
  }
  
  // 设置矩阵元素
  te[0] = 2 * w;  te[4] = 0;      te[8] = 0;     te[12] = -x;
  te[1] = 0;      te[5] = 2 * h;  te[9] = 0;     te[13] = -y;
  te[2] = 0;      te[6] = 0;      te[10] = zInv; te[14] = -z;
  te[3] = 0;      te[7] = 0;      te[11] = 0;    te[15] = 1;
  
  return this;
}
```

## 矩阵推导

```
正交投影矩阵（WebGL）：

        ┌                                        ┐
        │ 2/(r-l)    0        0     -(r+l)/(r-l) │
        │    0    2/(t-b)     0     -(t+b)/(t-b) │
    P = │    0       0     -2/(f-n) -(f+n)/(f-n) │
        │    0       0        0          1       │
        └                                        ┘

作用：
- 将视锥体映射到标准立方体 [-1,1]³
- 无透视除法（w = 1）
- 深度线性分布
```

## 透视 vs 正交

```
          透视投影                    正交投影
    
       ╱─────────╲                ┌─────────┐
      ╱    远      ╲              │    远    │
     ╱             ╲              │         │
    ╱   ◯          ╲             │   ◯     │
   ╱               ╲              │         │
  ◯ 近             ╱              │    近    │
   ╲             ╱                └─────────┘
    ╲           ╱
     
  → 近大远小                      → 大小不变
  → 有消失点                      → 平行线平行
  → 3D 效果                       → 2D/工程视图

使用场景：
  透视：游戏、3D 可视化          正交：2D 游戏、CAD、UI
```

## 使用示例

### 基础使用

```typescript
// 创建正交相机
const frustumSize = 10;
const aspect = window.innerWidth / window.innerHeight;

const camera = new OrthographicCamera(
  -frustumSize * aspect / 2,  // left
  frustumSize * aspect / 2,   // right
  frustumSize / 2,            // top
  -frustumSize / 2,           // bottom
  0.1,                        // near
  1000                        // far
);

camera.position.set(0, 10, 10);
camera.lookAt(0, 0, 0);

// 窗口调整
window.addEventListener('resize', () => {
  const aspect = window.innerWidth / window.innerHeight;
  
  camera.left = -frustumSize * aspect / 2;
  camera.right = frustumSize * aspect / 2;
  camera.top = frustumSize / 2;
  camera.bottom = -frustumSize / 2;
  
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```

### 2D 游戏相机

```typescript
class Camera2D {
  camera: OrthographicCamera;
  private worldWidth: number;
  private worldHeight: number;
  
  constructor(worldWidth: number, worldHeight: number) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    
    this.camera = new OrthographicCamera(
      -worldWidth / 2,
      worldWidth / 2,
      worldHeight / 2,
      -worldHeight / 2,
      -1000,
      1000
    );
    
    // 2D 视图：相机看向 -Z
    this.camera.position.set(0, 0, 100);
    this.camera.lookAt(0, 0, 0);
  }
  
  // 跟随目标
  follow(target: Vector3, smoothing = 0.1): void {
    this.camera.position.x += (target.x - this.camera.position.x) * smoothing;
    this.camera.position.y += (target.y - this.camera.position.y) * smoothing;
  }
  
  // 缩放
  setZoom(zoom: number): void {
    this.camera.zoom = zoom;
    this.camera.updateProjectionMatrix();
  }
  
  // 屏幕坐标转世界坐标
  screenToWorld(screenX: number, screenY: number): Vector3 {
    const ndcX = (screenX / window.innerWidth) * 2 - 1;
    const ndcY = -(screenY / window.innerHeight) * 2 + 1;
    
    const worldPos = new Vector3(ndcX, ndcY, 0).unproject(this.camera);
    return worldPos;
  }
  
  // 限制相机范围
  clampToWorld(
    minX: number,
    maxX: number,
    minY: number,
    maxY: number
  ): void {
    const halfWidth = (this.camera.right - this.camera.left) / 2 / this.camera.zoom;
    const halfHeight = (this.camera.top - this.camera.bottom) / 2 / this.camera.zoom;
    
    this.camera.position.x = Math.max(minX + halfWidth, 
      Math.min(maxX - halfWidth, this.camera.position.x));
    this.camera.position.y = Math.max(minY + halfHeight, 
      Math.min(maxY - halfHeight, this.camera.position.y));
  }
}
```

### 等距视图（Isometric）

```typescript
// 等距视图相机
class IsometricCamera {
  camera: OrthographicCamera;
  
  constructor(size: number, aspect: number) {
    this.camera = new OrthographicCamera(
      -size * aspect / 2,
      size * aspect / 2,
      size / 2,
      -size / 2,
      -1000,
      1000
    );
    
    // 等距视角：约 35.264° (arctan(1/√2))
    const distance = 100;
    this.camera.position.set(distance, distance, distance);
    this.camera.lookAt(0, 0, 0);
    
    // 确保 Y 轴朝上
    this.camera.up.set(0, 1, 0);
  }
  
  // 四方向等距视图切换
  setDirection(direction: 'NE' | 'NW' | 'SE' | 'SW'): void {
    const d = 100;
    switch (direction) {
      case 'NE': this.camera.position.set(d, d, d); break;
      case 'NW': this.camera.position.set(-d, d, d); break;
      case 'SE': this.camera.position.set(d, d, -d); break;
      case 'SW': this.camera.position.set(-d, d, -d); break;
    }
    this.camera.lookAt(0, 0, 0);
  }
}
```

### 正交阴影相机

```typescript
// 方向光使用正交相机计算阴影
const directionalLight = new DirectionalLight(0xffffff, 1);
directionalLight.position.set(10, 20, 10);

// 配置阴影相机
const shadowCamera = directionalLight.shadow.camera;
shadowCamera.left = -20;
shadowCamera.right = 20;
shadowCamera.top = 20;
shadowCamera.bottom = -20;
shadowCamera.near = 0.1;
shadowCamera.far = 100;
shadowCamera.updateProjectionMatrix();

// 可视化阴影相机
const shadowHelper = new CameraHelper(shadowCamera);
scene.add(shadowHelper);
```

### 小地图

```typescript
// 小地图使用正交相机
class Minimap {
  camera: OrthographicCamera;
  renderer: WebGLRenderer;
  private target: HTMLElement;
  
  constructor(worldSize: number, target: HTMLElement) {
    this.target = target;
    
    // 俯视图相机
    this.camera = new OrthographicCamera(
      -worldSize / 2,
      worldSize / 2,
      worldSize / 2,
      -worldSize / 2,
      0.1,
      1000
    );
    this.camera.position.set(0, 100, 0);
    this.camera.lookAt(0, 0, 0);
    
    // 单独的渲染器
    this.renderer = new WebGLRenderer({ alpha: true });
    this.renderer.setSize(target.clientWidth, target.clientHeight);
    target.appendChild(this.renderer.domElement);
  }
  
  render(scene: Scene): void {
    this.renderer.render(scene, this.camera);
  }
  
  // 跟随主相机位置
  follow(position: Vector3): void {
    this.camera.position.x = position.x;
    this.camera.position.z = position.z;
  }
}
```

## 相机切换

```typescript
// 透视与正交切换
class DualCamera {
  perspectiveCamera: PerspectiveCamera;
  orthographicCamera: OrthographicCamera;
  currentCamera: Camera;
  
  constructor(aspect: number) {
    this.perspectiveCamera = new PerspectiveCamera(50, aspect, 0.1, 1000);
    
    const frustumSize = 20;
    this.orthographicCamera = new OrthographicCamera(
      -frustumSize * aspect / 2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      1000
    );
    
    this.currentCamera = this.perspectiveCamera;
    
    // 同步位置
    this.syncCameras();
  }
  
  toggle(): void {
    if (this.currentCamera === this.perspectiveCamera) {
      this.currentCamera = this.orthographicCamera;
    } else {
      this.currentCamera = this.perspectiveCamera;
    }
    this.syncCameras();
  }
  
  private syncCameras(): void {
    const source = this.currentCamera === this.perspectiveCamera 
      ? this.orthographicCamera 
      : this.perspectiveCamera;
    
    this.currentCamera.position.copy(source.position);
    this.currentCamera.rotation.copy(source.rotation);
  }
  
  updateAspect(aspect: number): void {
    this.perspectiveCamera.aspect = aspect;
    this.perspectiveCamera.updateProjectionMatrix();
    
    const frustumSize = 20;
    this.orthographicCamera.left = -frustumSize * aspect / 2;
    this.orthographicCamera.right = frustumSize * aspect / 2;
    this.orthographicCamera.updateProjectionMatrix();
  }
}
```

## 平滑缩放

```typescript
// 平滑缩放动画
function smoothZoom(
  camera: OrthographicCamera,
  targetZoom: number,
  duration: number = 500
): void {
  const startZoom = camera.zoom;
  const startTime = performance.now();
  
  function animate() {
    const elapsed = performance.now() - startTime;
    const t = Math.min(elapsed / duration, 1);
    
    // 缓动函数
    const eased = 1 - Math.pow(1 - t, 3);
    
    camera.zoom = startZoom + (targetZoom - startZoom) * eased;
    camera.updateProjectionMatrix();
    
    if (t < 1) {
      requestAnimationFrame(animate);
    }
  }
  
  animate();
}

// 使用
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  const newZoom = Math.max(0.1, Math.min(10, camera.zoom * delta));
  smoothZoom(camera, newZoom, 200);
});
```

## 本章小结

- OrthographicCamera 实现正交投影
- 物体大小不受距离影响
- 适合 2D 游戏、CAD、UI 渲染
- zoom 控制视图缩放
- 阴影相机使用正交投影

下一章，我们将学习 CameraControls 相机控制器。
