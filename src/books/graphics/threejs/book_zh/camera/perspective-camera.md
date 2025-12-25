# PerspectiveCamera 透视相机

> "透视投影模拟人眼看世界的方式——远处的物体看起来更小。"

## 透视投影原理

```
透视视锥体（Frustum）：

       近平面 (near)
          ┌──┐
         ╱    ╲
        ╱      ╲
       ╱   👁   ╲  ← 相机位置
      ╱    │     ╲
     ╱     │      ╲
    ╱      │       ╲
   └───────────────┘
      远平面 (far)

特征：
- 近大远小
- 有消失点
- 符合人类视觉
```

## 完整实现

```typescript
// src/cameras/PerspectiveCamera.ts
import { Camera } from './Camera';
import { Matrix4 } from '../math/Matrix4';
import * as MathUtils from '../math/MathUtils';

export class PerspectiveCamera extends Camera {
  readonly isPerspectiveCamera = true;
  readonly type = 'PerspectiveCamera';
  
  // 垂直视野角度（度）
  fov: number;
  
  // 视口宽高比
  aspect: number;
  
  // 近裁剪面距离
  near: number;
  
  // 远裁剪面距离
  far: number;
  
  // 对焦距离（用于 DOF 效果）
  focus = 10;
  
  // 缩放因子
  zoom = 1;
  
  // 胶片尺寸（毫米）
  filmGauge = 35;   // 35mm 胶片
  filmOffset = 0;   // 胶片偏移
  
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
    fov = 50,
    aspect = 1,
    near = 0.1,
    far = 2000
  ) {
    super();
    
    this.fov = fov;
    this.aspect = aspect;
    this.near = near;
    this.far = far;
    
    this.updateProjectionMatrix();
  }
  
  // 根据焦距设置 FOV
  setFocalLength(focalLength: number): void {
    // FOV = 2 * arctan(filmGauge / (2 * focalLength))
    const vExtentSlope = 0.5 * this.getFilmHeight() / focalLength;
    this.fov = MathUtils.RAD2DEG * 2 * Math.atan(vExtentSlope);
    this.updateProjectionMatrix();
  }
  
  // 获取焦距
  getFocalLength(): number {
    const vExtentSlope = Math.tan(MathUtils.DEG2RAD * 0.5 * this.fov);
    return 0.5 * this.getFilmHeight() / vExtentSlope;
  }
  
  // 获取有效 FOV（考虑缩放）
  getEffectiveFOV(): number {
    return MathUtils.RAD2DEG * 2 * Math.atan(
      Math.tan(MathUtils.DEG2RAD * 0.5 * this.fov) / this.zoom
    );
  }
  
  // 获取胶片宽度
  getFilmWidth(): number {
    return this.filmGauge * Math.min(this.aspect, 1);
  }
  
  // 获取胶片高度
  getFilmHeight(): number {
    return this.filmGauge / Math.max(this.aspect, 1);
  }
  
  // 设置子视图（用于分块渲染大图）
  setViewOffset(
    fullWidth: number,
    fullHeight: number,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    this.aspect = fullWidth / fullHeight;
    
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
    const near = this.near;
    let top = near * Math.tan(MathUtils.DEG2RAD * 0.5 * this.fov) / this.zoom;
    let height = 2 * top;
    let width = this.aspect * height;
    let left = -0.5 * width;
    
    const view = this.view;
    
    // 应用子视图
    if (view !== null && view.enabled) {
      const fullWidth = view.fullWidth;
      const fullHeight = view.fullHeight;
      
      left += view.offsetX * width / fullWidth;
      top -= view.offsetY * height / fullHeight;
      width *= view.width / fullWidth;
      height *= view.height / fullHeight;
    }
    
    // 应用胶片偏移
    const skew = this.filmOffset;
    if (skew !== 0) {
      left += near * skew / this.getFilmWidth();
    }
    
    // 构建透视投影矩阵
    this.projectionMatrix.makePerspective(
      left,
      left + width,
      top,
      top - height,
      near,
      this.far,
      this.coordinateSystem
    );
    
    this.projectionMatrixInverse.copy(this.projectionMatrix).invert();
  }
  
  copy(source: PerspectiveCamera, recursive?: boolean): this {
    super.copy(source, recursive);
    
    this.fov = source.fov;
    this.aspect = source.aspect;
    this.near = source.near;
    this.far = source.far;
    this.zoom = source.zoom;
    
    this.focus = source.focus;
    this.filmGauge = source.filmGauge;
    this.filmOffset = source.filmOffset;
    
    if (source.view !== null) {
      this.view = { ...source.view };
    }
    
    return this;
  }
  
  toJSON(meta?: any): any {
    const data = super.toJSON(meta);
    
    data.object.fov = this.fov;
    data.object.aspect = this.aspect;
    data.object.near = this.near;
    data.object.far = this.far;
    data.object.zoom = this.zoom;
    
    if (this.filmGauge !== 35) {
      data.object.filmGauge = this.filmGauge;
    }
    if (this.filmOffset !== 0) {
      data.object.filmOffset = this.filmOffset;
    }
    
    return data;
  }
}
```

## 透视投影矩阵

```typescript
// Matrix4 中的透视投影矩阵构建
makePerspective(
  left: number,
  right: number,
  top: number,
  bottom: number,
  near: number,
  far: number,
  coordinateSystem: number
): Matrix4 {
  const te = this.elements;
  
  const x = 2 * near / (right - left);
  const y = 2 * near / (top - bottom);
  
  const a = (right + left) / (right - left);
  const b = (top + bottom) / (top - bottom);
  
  let c: number, d: number;
  
  if (coordinateSystem === WebGLCoordinateSystem) {
    // WebGL: z 范围 [-1, 1]
    c = -(far + near) / (far - near);
    d = -2 * far * near / (far - near);
  } else if (coordinateSystem === WebGPUCoordinateSystem) {
    // WebGPU/DirectX: z 范围 [0, 1]
    c = -far / (far - near);
    d = -far * near / (far - near);
  }
  
  // 设置矩阵元素
  te[0] = x;    te[4] = 0;    te[8] = a;     te[12] = 0;
  te[1] = 0;    te[5] = y;    te[9] = b;     te[13] = 0;
  te[2] = 0;    te[6] = 0;    te[10] = c;    te[14] = d;
  te[3] = 0;    te[7] = 0;    te[11] = -1;   te[15] = 0;
  
  return this;
}
```

## 投影矩阵推导

```
透视投影矩阵（WebGL）：

        ┌                                       ┐
        │ 2n/(r-l)     0      (r+l)/(r-l)    0  │
        │    0      2n/(t-b)  (t+b)/(t-b)    0  │
    P = │    0         0      -(f+n)/(f-n)  -2fn/(f-n) │
        │    0         0         -1          0  │
        └                                       ┘

对于对称视锥体（l = -r, b = -t）：

        ┌                                   ┐
        │ n/r    0       0          0       │
        │  0    n/t      0          0       │
    P = │  0     0    -(f+n)/(f-n)  -2fn/(f-n) │
        │  0     0      -1          0       │
        └                                   ┘

用 FOV 和 aspect 表示：
  t = n * tan(fov/2)
  r = t * aspect
```

## 深度精度问题

```
深度缓冲分布：

非线性深度（透视）：
1.0 ┤■■■■■■■■■■■■■■■■■■■              
    │                  ■■■■           
    │                      ■■■■       
0.5 ┤                          ■■■    
    │                            ■■   
    │                              ■■ 
0.0 ┤                                ■
    └──────────────────────────────────
    near                           far

问题：近处精度高，远处精度低
→ 远处物体可能产生 Z-fighting
```

### 对数深度缓冲

```typescript
// 对数深度缓冲解决精度问题
class LogarithmicDepthBuffer {
  // 顶点着色器中计算对数深度
  static vertexShaderChunk = /* glsl */`
    #ifdef USE_LOGDEPTHBUF
      varying float vFragDepth;
      varying float vIsPerspective;
      
      void setLogDepth() {
        vFragDepth = 1.0 + gl_Position.w;
        vIsPerspective = float(isPerspectiveMatrix(projectionMatrix));
      }
    #endif
  `;
  
  // 片段着色器中写入深度
  static fragmentShaderChunk = /* glsl */`
    #if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)
      varying float vFragDepth;
      varying float vIsPerspective;
      uniform float logDepthBufFC;
      
      void writeLogDepth() {
        gl_FragDepthEXT = vIsPerspective == 0.0 
          ? gl_FragCoord.z 
          : log2(vFragDepth) * logDepthBufFC * 0.5;
      }
    #endif
  `;
}

// 在渲染器中启用
const renderer = new WebGLRenderer({
  logarithmicDepthBuffer: true,
});
```

## 使用示例

### 基础使用

```typescript
// 创建透视相机
const camera = new PerspectiveCamera(
  75,                                    // FOV（度）
  window.innerWidth / window.innerHeight, // 宽高比
  0.1,                                   // 近裁剪面
  1000                                   // 远裁剪面
);

camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

// 窗口调整时更新
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```

### 电影级 FOV

```typescript
// 使用焦距设置（更专业的方式）
camera.filmGauge = 35;  // 35mm 胶片

// 50mm 镜头（标准）
camera.setFocalLength(50);

// 35mm 镜头（广角）
camera.setFocalLength(35);

// 85mm 镜头（人像）
camera.setFocalLength(85);

// 常见 FOV 对照表
const fovTable = {
  '16mm': 100,  // 超广角
  '24mm': 84,   // 广角
  '35mm': 63,   // 中广角
  '50mm': 47,   // 标准
  '85mm': 28,   // 人像
  '135mm': 18,  // 长焦
  '200mm': 12,  // 超长焦
};
```

### 分块渲染（超高分辨率）

```typescript
// 用于渲染超大图片
class TileRenderer {
  render(
    renderer: WebGLRenderer,
    scene: Scene,
    camera: PerspectiveCamera,
    width: number,
    height: number,
    tileSize: number
  ): HTMLCanvasElement {
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = width;
    finalCanvas.height = height;
    const ctx = finalCanvas.getContext('2d')!;
    
    const tilesX = Math.ceil(width / tileSize);
    const tilesY = Math.ceil(height / tileSize);
    
    for (let y = 0; y < tilesY; y++) {
      for (let x = 0; x < tilesX; x++) {
        const tileWidth = Math.min(tileSize, width - x * tileSize);
        const tileHeight = Math.min(tileSize, height - y * tileSize);
        
        // 设置子视图
        camera.setViewOffset(
          width, height,
          x * tileSize, y * tileSize,
          tileWidth, tileHeight
        );
        
        renderer.setSize(tileWidth, tileHeight);
        renderer.render(scene, camera);
        
        // 将瓦片复制到最终画布
        ctx.drawImage(
          renderer.domElement,
          x * tileSize, y * tileSize
        );
      }
    }
    
    camera.clearViewOffset();
    
    return finalCanvas;
  }
}
```

### 景深效果

```typescript
// 配合后处理实现景深
import { BokehPass } from 'three/addons/postprocessing/BokehPass';

const bokehPass = new BokehPass(scene, camera, {
  focus: camera.focus,  // 对焦距离
  aperture: 0.025,      // 光圈大小
  maxblur: 0.01,        // 最大模糊
});

composer.addPass(bokehPass);

// 动态调整对焦
function focusOnObject(object: Object3D): void {
  const distance = camera.position.distanceTo(object.position);
  camera.focus = distance;
  bokehPass.uniforms.focus.value = distance;
}
```

## ArrayCamera

```typescript
// 多视口相机（用于 VR/多人分屏）
class ArrayCamera extends PerspectiveCamera {
  readonly isArrayCamera = true;
  cameras: PerspectiveCamera[];
  
  constructor(cameras: PerspectiveCamera[] = []) {
    super();
    this.cameras = cameras;
  }
}

// 示例：创建分屏相机
function createSplitScreenCameras(): ArrayCamera {
  const cameras: PerspectiveCamera[] = [];
  
  // 左半屏相机
  const cameraL = new PerspectiveCamera(50, 0.5, 0.1, 100);
  cameraL.viewport = new Vector4(0, 0, 0.5, 1);
  cameras.push(cameraL);
  
  // 右半屏相机
  const cameraR = new PerspectiveCamera(50, 0.5, 0.1, 100);
  cameraR.viewport = new Vector4(0.5, 0, 0.5, 1);
  cameras.push(cameraR);
  
  return new ArrayCamera(cameras);
}
```

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 物体消失 | 超出裁剪范围 | 调整 near/far |
| Z-fighting | 深度精度不足 | 减小 far/near 比值或使用对数深度 |
| 变形 | 宽高比错误 | 更新 aspect |
| 太窄/太宽 | FOV 不合适 | 调整 FOV（通常 60-90） |

## 本章小结

- PerspectiveCamera 实现透视投影
- FOV 控制视野范围
- aspect 必须与视口匹配
- near/far 影响深度精度
- 支持焦距设置和分块渲染

下一章，我们将学习 OrthographicCamera 正交相机。
