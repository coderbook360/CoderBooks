# CameraHelper 相机辅助器

> "可视化工具帮助我们理解相机的视角和渲染范围。"

## 相机辅助器概述

```
CameraHelper 可视化：

透视相机视锥体：
         n1───────n4
         ╱│       │╲
        ╱ │       │ ╲
       ╱  └───────┘  ╲
      ╱    center     ╲
     ╱                 ╲
    ╱                   ╲
   f1─────────────────f4
   │                   │
   │                   │
   f2─────────────────f3

- 黄色：视锥体边缘
- 红色：相机朝向（-Z）
- 绿色：上方向（Y）
- 蓝色：右方向（X）
```

## 完整实现

```typescript
// src/helpers/CameraHelper.ts
import { Camera } from '../cameras/Camera';
import { PerspectiveCamera } from '../cameras/PerspectiveCamera';
import { OrthographicCamera } from '../cameras/OrthographicCamera';
import { LineSegments } from '../objects/LineSegments';
import { BufferGeometry } from '../core/BufferGeometry';
import { Float32BufferAttribute } from '../core/BufferAttribute';
import { LineBasicMaterial } from '../materials/LineBasicMaterial';
import { Vector3 } from '../math/Vector3';
import { Color } from '../math/Color';

export class CameraHelper extends LineSegments {
  readonly isCameraHelper = true;
  readonly type = 'CameraHelper';
  
  camera: Camera;
  pointMap: Map<string, number[]>;
  
  private _vector = new Vector3();
  private _camera = new Camera();
  
  constructor(camera: Camera) {
    const geometry = new BufferGeometry();
    const material = new LineBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      toneMapped: false,
    });
    
    super(geometry, material);
    
    this.camera = camera;
    
    // 使用相机的世界矩阵
    this.matrix = camera.matrixWorld;
    this.matrixAutoUpdate = false;
    
    this.pointMap = new Map();
    
    // 定义顶点
    const vertices: number[] = [];
    const colors: number[] = [];
    
    // 定义颜色
    const colorFrustum = new Color(0xffaa00);  // 黄色
    const colorCone = new Color(0xff0000);      // 红色
    const colorUp = new Color(0x00aaff);        // 蓝色
    const colorTarget = new Color(0xffffff);    // 白色
    const colorCross = new Color(0x333333);     // 灰色
    
    // 添加视锥体线段
    // 近平面
    addLine('n1', 'n2', colorFrustum);
    addLine('n2', 'n4', colorFrustum);
    addLine('n4', 'n3', colorFrustum);
    addLine('n3', 'n1', colorFrustum);
    
    // 远平面
    addLine('f1', 'f2', colorFrustum);
    addLine('f2', 'f4', colorFrustum);
    addLine('f4', 'f3', colorFrustum);
    addLine('f3', 'f1', colorFrustum);
    
    // 连接线
    addLine('n1', 'f1', colorFrustum);
    addLine('n2', 'f2', colorFrustum);
    addLine('n3', 'f3', colorFrustum);
    addLine('n4', 'f4', colorFrustum);
    
    // 锥体（相机原点到近平面）
    addLine('p', 'n1', colorCone);
    addLine('p', 'n2', colorCone);
    addLine('p', 'n3', colorCone);
    addLine('p', 'n4', colorCone);
    
    // 上方向标记
    addLine('u1', 'u2', colorUp);
    addLine('u2', 'u3', colorUp);
    addLine('u3', 'u1', colorUp);
    
    // 目标十字
    addLine('c', 't', colorTarget);
    addLine('p', 'c', colorCross);
    
    // 近平面十字
    addLine('cn1', 'cn2', colorCross);
    addLine('cn3', 'cn4', colorCross);
    
    // 远平面十字
    addLine('cf1', 'cf2', colorCross);
    addLine('cf3', 'cf4', colorCross);
    
    function addLine(a: string, b: string, color: Color) {
      addPoint(a, color);
      addPoint(b, color);
    }
    
    function addPoint(id: string, color: Color) {
      vertices.push(0, 0, 0);
      colors.push(color.r, color.g, color.b);
      
      if (!this.pointMap.has(id)) {
        this.pointMap.set(id, []);
      }
      
      this.pointMap.get(id)!.push((vertices.length / 3) - 1);
    }
    
    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    
    this.update();
  }
  
  // 更新辅助器
  update(): void {
    const geometry = this.geometry;
    const pointMap = this.pointMap;
    
    const w = 1;
    const h = 1;
    
    // 更新相机矩阵
    this._camera.projectionMatrixInverse.copy(this.camera.projectionMatrixInverse);
    
    // 近平面顶点
    setPoint('n1', -w, -h, -1);
    setPoint('n2', w, -h, -1);
    setPoint('n3', -w, h, -1);
    setPoint('n4', w, h, -1);
    
    // 远平面顶点
    setPoint('f1', -w, -h, 1);
    setPoint('f2', w, -h, 1);
    setPoint('f3', -w, h, 1);
    setPoint('f4', w, h, 1);
    
    // 相机原点
    setPoint('p', 0, 0, -1);
    
    // 上方向三角形
    setPoint('u1', w * 0.7, h * 1.1, -1);
    setPoint('u2', -w * 0.7, h * 1.1, -1);
    setPoint('u3', 0, h * 2, -1);
    
    // 目标和中心
    setPoint('c', 0, 0, -1);
    setPoint('t', 0, 0, 1);
    
    // 近平面十字
    setPoint('cn1', -w, 0, -1);
    setPoint('cn2', w, 0, -1);
    setPoint('cn3', 0, -h, -1);
    setPoint('cn4', 0, h, -1);
    
    // 远平面十字
    setPoint('cf1', -w, 0, 1);
    setPoint('cf2', w, 0, 1);
    setPoint('cf3', 0, -h, 1);
    setPoint('cf4', 0, h, 1);
    
    geometry.getAttribute('position').needsUpdate = true;
    
    function setPoint(point: string, x: number, y: number, z: number) {
      const vector = this._vector;
      
      // 从 NDC 转换到相机空间
      vector.set(x, y, z).unproject(this._camera);
      
      const points = pointMap.get(point);
      if (points !== undefined) {
        const position = geometry.getAttribute('position');
        
        for (let i = 0, l = points.length; i < l; i++) {
          position.setXYZ(points[i], vector.x, vector.y, vector.z);
        }
      }
    }
  }
  
  dispose(): void {
    this.geometry.dispose();
    (this.material as LineBasicMaterial).dispose();
  }
}
```

## 视锥体可视化

```
透视相机视锥体：                正交相机视锥体：

        △ (up)                         △ (up)
        │                              │
     ┌──┼──┐ n                    ┌────┼────┐
    ╱   │   ╲                     │    │    │
   ╱    ●────→                    │    ●────→
  ╱     │     ╲                   │    │    │
 ╱      │      ╲                  │    │    │
┌───────┼───────┐ f              └────┼────┘
│       │       │                     │

- n: 近平面
- f: 远平面
- ●: 相机位置
- →: 相机朝向 (-Z)
- △: 上方向 (Y)
```

## 使用示例

### 基础使用

```typescript
import { CameraHelper } from 'three';

// 创建要可视化的相机
const debugCamera = new PerspectiveCamera(75, 1, 0.1, 100);
debugCamera.position.set(5, 5, 5);
debugCamera.lookAt(0, 0, 0);

// 创建辅助器
const cameraHelper = new CameraHelper(debugCamera);
scene.add(cameraHelper);

// 每帧更新（如果相机参数变化）
function animate() {
  debugCamera.updateProjectionMatrix();
  cameraHelper.update();
  
  renderer.render(scene, mainCamera);
  requestAnimationFrame(animate);
}
```

### 调试阴影相机

```typescript
// 可视化方向光阴影相机
const directionalLight = new DirectionalLight(0xffffff, 1);
directionalLight.position.set(10, 20, 10);
directionalLight.castShadow = true;

// 配置阴影
directionalLight.shadow.camera.left = -20;
directionalLight.shadow.camera.right = 20;
directionalLight.shadow.camera.top = 20;
directionalLight.shadow.camera.bottom = -20;
directionalLight.shadow.camera.near = 0.1;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.updateProjectionMatrix();

// 添加阴影相机辅助器
const shadowCameraHelper = new CameraHelper(directionalLight.shadow.camera);
scene.add(shadowCameraHelper);

// 可视化光源方向
const directionalLightHelper = new DirectionalLightHelper(directionalLight, 5);
scene.add(directionalLightHelper);
```

### 多相机视图

```typescript
// 多相机调试
class MultiCameraDebugger {
  cameras: Map<string, Camera> = new Map();
  helpers: Map<string, CameraHelper> = new Map();
  scene: Scene;
  
  constructor(scene: Scene) {
    this.scene = scene;
  }
  
  addCamera(name: string, camera: Camera, showHelper = true): void {
    this.cameras.set(name, camera);
    
    if (showHelper) {
      const helper = new CameraHelper(camera);
      this.helpers.set(name, helper);
      this.scene.add(helper);
    }
  }
  
  removeCamera(name: string): void {
    const helper = this.helpers.get(name);
    if (helper) {
      this.scene.remove(helper);
      helper.dispose();
      this.helpers.delete(name);
    }
    this.cameras.delete(name);
  }
  
  setHelperVisible(name: string, visible: boolean): void {
    const helper = this.helpers.get(name);
    if (helper) {
      helper.visible = visible;
    }
  }
  
  update(): void {
    for (const helper of this.helpers.values()) {
      helper.update();
    }
  }
  
  dispose(): void {
    for (const helper of this.helpers.values()) {
      this.scene.remove(helper);
      helper.dispose();
    }
    this.helpers.clear();
    this.cameras.clear();
  }
}
```

## 自定义辅助器

```typescript
// 扩展相机辅助器
class EnhancedCameraHelper extends CameraHelper {
  private frustrumMesh: Mesh;
  
  constructor(camera: Camera, showFrustumVolume = false) {
    super(camera);
    
    if (showFrustumVolume) {
      // 添加半透明视锥体体积
      const frustumGeometry = this.createFrustumGeometry(camera);
      const frustumMaterial = new MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.1,
        side: DoubleSide,
        depthWrite: false,
      });
      
      this.frustrumMesh = new Mesh(frustumGeometry, frustumMaterial);
      this.add(this.frustrumMesh);
    }
  }
  
  private createFrustumGeometry(camera: Camera): BufferGeometry {
    const geometry = new BufferGeometry();
    const vertices: number[] = [];
    const indices: number[] = [];
    
    // 计算视锥体顶点
    const near = this.getNearPlaneVertices(camera);
    const far = this.getFarPlaneVertices(camera);
    
    // 添加近平面
    vertices.push(...near.flat());
    // 添加远平面
    vertices.push(...far.flat());
    
    // 定义面
    // 近平面
    indices.push(0, 1, 2, 2, 3, 0);
    // 远平面
    indices.push(4, 6, 5, 6, 4, 7);
    // 侧面
    indices.push(0, 4, 1, 1, 4, 5);
    indices.push(1, 5, 2, 2, 5, 6);
    indices.push(2, 6, 3, 3, 6, 7);
    indices.push(3, 7, 0, 0, 7, 4);
    
    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    
    return geometry;
  }
  
  private getNearPlaneVertices(camera: Camera): number[][] {
    // ... 计算近平面四个角的位置
    return [];
  }
  
  private getFarPlaneVertices(camera: Camera): number[][] {
    // ... 计算远平面四个角的位置
    return [];
  }
}
```

## 视锥体裁剪可视化

```typescript
// 可视化视锥体裁剪
class FrustumCullingVisualizer {
  frustum = new Frustum();
  helper: CameraHelper;
  objects: Object3D[] = [];
  
  constructor(camera: Camera, scene: Scene) {
    this.helper = new CameraHelper(camera);
    scene.add(this.helper);
  }
  
  // 检查对象是否在视锥体内
  checkVisibility(camera: Camera, objects: Object3D[]): void {
    // 更新视锥体
    this.frustum.setFromProjectionMatrix(
      new Matrix4().multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse
      )
    );
    
    for (const object of objects) {
      if (!object.geometry) continue;
      
      // 计算边界球
      object.geometry.computeBoundingSphere();
      const sphere = object.geometry.boundingSphere!.clone();
      sphere.applyMatrix4(object.matrixWorld);
      
      // 检查是否与视锥体相交
      const isVisible = this.frustum.intersectsSphere(sphere);
      
      // 可视化：可见对象高亮
      if (object instanceof Mesh) {
        object.material.opacity = isVisible ? 1.0 : 0.3;
        object.material.transparent = !isVisible;
      }
    }
  }
  
  update(camera: Camera): void {
    this.helper.update();
    this.checkVisibility(camera, this.objects);
  }
}
```

## 交互式相机调试

```typescript
// 带 GUI 的相机调试器
import GUI from 'lil-gui';

class CameraDebugGUI {
  camera: PerspectiveCamera;
  helper: CameraHelper;
  gui: GUI;
  
  constructor(
    camera: PerspectiveCamera,
    scene: Scene,
    parentGUI?: GUI
  ) {
    this.camera = camera;
    this.helper = new CameraHelper(camera);
    scene.add(this.helper);
    
    this.gui = parentGUI ? parentGUI.addFolder('Camera') : new GUI();
    this.setupGUI();
  }
  
  private setupGUI(): void {
    // 投影参数
    this.gui.add(this.camera, 'fov', 10, 120, 1)
      .name('FOV')
      .onChange(() => this.updateCamera());
    
    this.gui.add(this.camera, 'near', 0.01, 10, 0.01)
      .name('Near')
      .onChange(() => this.updateCamera());
    
    this.gui.add(this.camera, 'far', 10, 1000, 1)
      .name('Far')
      .onChange(() => this.updateCamera());
    
    this.gui.add(this.camera, 'zoom', 0.1, 5, 0.1)
      .name('Zoom')
      .onChange(() => this.updateCamera());
    
    // 位置
    const posFolder = this.gui.addFolder('Position');
    posFolder.add(this.camera.position, 'x', -50, 50);
    posFolder.add(this.camera.position, 'y', -50, 50);
    posFolder.add(this.camera.position, 'z', -50, 50);
    
    // 辅助器
    this.gui.add(this.helper, 'visible').name('Show Helper');
    
    // 预设
    const presets = {
      wide: () => { this.camera.fov = 90; this.updateCamera(); },
      normal: () => { this.camera.fov = 50; this.updateCamera(); },
      tele: () => { this.camera.fov = 20; this.updateCamera(); },
    };
    
    this.gui.add(presets, 'wide').name('Wide Angle');
    this.gui.add(presets, 'normal').name('Normal');
    this.gui.add(presets, 'tele').name('Telephoto');
  }
  
  private updateCamera(): void {
    this.camera.updateProjectionMatrix();
    this.helper.update();
  }
  
  dispose(): void {
    this.gui.destroy();
    this.helper.dispose();
  }
}
```

## 其他辅助器

```typescript
// Box3Helper - 显示边界盒
const box = new Box3().setFromObject(mesh);
const boxHelper = new Box3Helper(box, 0xffff00);
scene.add(boxHelper);

// PlaneHelper - 显示平面
const plane = new Plane(new Vector3(0, 1, 0), 0);
const planeHelper = new PlaneHelper(plane, 10, 0x00ff00);
scene.add(planeHelper);

// ArrowHelper - 显示方向
const dir = new Vector3(1, 0, 0);
const origin = new Vector3(0, 0, 0);
const arrowHelper = new ArrowHelper(dir, origin, 5, 0xff0000);
scene.add(arrowHelper);

// AxesHelper - 显示坐标轴
const axesHelper = new AxesHelper(5);
scene.add(axesHelper);

// GridHelper - 显示网格
const gridHelper = new GridHelper(10, 10);
scene.add(gridHelper);
```

## 辅助器一览

| 辅助器 | 用途 | 可视化内容 |
|--------|------|------------|
| CameraHelper | 相机调试 | 视锥体 |
| DirectionalLightHelper | 方向光 | 光源方向和范围 |
| SpotLightHelper | 聚光灯 | 光锥 |
| PointLightHelper | 点光源 | 光源位置和范围 |
| HemisphereLightHelper | 半球光 | 光源方向 |
| SkeletonHelper | 骨骼动画 | 骨骼结构 |
| Box3Helper | 边界盒 | AABB 边界 |
| PlaneHelper | 平面 | 无限平面 |
| ArrowHelper | 方向 | 向量 |
| AxesHelper | 坐标轴 | XYZ 轴 |
| GridHelper | 网格 | 地面参考 |
| PolarGridHelper | 极坐标网格 | 极坐标参考 |

## 本章小结

- CameraHelper 可视化相机视锥体
- 对调试阴影相机特别有用
- 辅助器跟随相机世界矩阵
- 相机参数变化后需要调用 update()
- Three.js 提供丰富的辅助器

下一章，我们将学习几何体系统的理论基础。
