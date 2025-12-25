# 阴影系统进阶

> "阴影赋予物体重量，让场景更真实。"

## 阴影原理回顾

```
阴影映射流程：

第一遍：从光源视角渲染
┌──────────────────┐
│   Light Camera   │
│   (光源相机)      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Shadow Map      │
│  (深度纹理)       │
│  存储到光源的距离  │
└────────┬─────────┘
         │
第二遍：从摄像机视角渲染
         │
         ▼
┌──────────────────┐
│ 比较片段深度和    │
│ Shadow Map 中的值 │
│ 判断是否在阴影中  │
└──────────────────┘
```

## 阴影配置详解

```typescript
// 渲染器设置
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap; // VSMShadowMap, BasicShadowMap

// 光源设置
const light = new DirectionalLight(0xffffff, 1);
light.castShadow = true;

// 阴影相机配置
light.shadow.camera.left = -10;
light.shadow.camera.right = 10;
light.shadow.camera.top = 10;
light.shadow.camera.bottom = -10;
light.shadow.camera.near = 0.5;
light.shadow.camera.far = 50;

// 阴影贴图分辨率
light.shadow.mapSize.width = 2048;
light.shadow.mapSize.height = 2048;

// 阴影偏移（防止阴影痤疮）
light.shadow.bias = -0.0001;
light.shadow.normalBias = 0.02;

// 阴影半径（软阴影）
light.shadow.radius = 4; // 仅 PCFSoftShadowMap

// 物体设置
mesh.castShadow = true;    // 投射阴影
mesh.receiveShadow = true; // 接收阴影
```

## 阴影类型对比

```
阴影类型对比：

类型              质量    性能    软边缘
──────────────────────────────────────────
BasicShadowMap    低      高      无
PCFShadowMap      中      中      有
PCFSoftShadowMap  高      低      更好
VSMShadowMap      高      低      最好

VSM (Variance Shadow Maps):
- 需要更多内存
- 可能有漏光问题
- 适合大面积软阴影
```

```typescript
// 不同阴影类型设置
import {
  BasicShadowMap,
  PCFShadowMap,
  PCFSoftShadowMap,
  VSMShadowMap,
} from 'three';

// 基础硬阴影
renderer.shadowMap.type = BasicShadowMap;

// PCF 软阴影
renderer.shadowMap.type = PCFShadowMap;

// PCF 更软的阴影
renderer.shadowMap.type = PCFSoftShadowMap;

// VSM 阴影（需要特殊设置）
renderer.shadowMap.type = VSMShadowMap;
light.shadow.blurSamples = 25;
```

## 级联阴影贴图（CSM）

CSM 用于处理大型场景中的阴影质量问题。

```typescript
import { CSM } from 'three/addons/csm/CSM.js';
import { CSMHelper } from 'three/addons/csm/CSMHelper.js';

// 创建 CSM
const csm = new CSM({
  maxFar: camera.far,
  cascades: 4,               // 级联数量
  mode: 'practical',         // uniform, logarithmic, practical, custom
  parent: scene,
  shadowMapSize: 2048,
  lightDirection: new Vector3(-1, -1, -1).normalize(),
  camera: camera,
  lightIntensity: 1,
  lightNear: 1,
  lightFar: 5000,
});

// 更新（每帧）
function animate() {
  csm.update();
  renderer.render(scene, camera);
}

// 材质需要更新
csm.setupMaterial(material);

// 调试助手
const csmHelper = new CSMHelper(csm);
scene.add(csmHelper);

// 相机更新时
window.addEventListener('resize', () => {
  csm.updateFrustums();
});
```

## 接触阴影

接触阴影在物体与地面接触处添加柔和的阴影。

```typescript
import { ContactShadows } from 'three/addons/objects/ContactShadows.js';

// 创建接触阴影
const contactShadows = new ContactShadows({
  opacity: 0.5,
  scale: 10,
  blur: 2.5,
  far: 4,
  resolution: 512,
  color: 0x000000,
});

contactShadows.position.y = 0;
scene.add(contactShadows);

// 自定义实现
class CustomContactShadows {
  private renderTarget: WebGLRenderTarget;
  private shadowCamera: OrthographicCamera;
  private shadowMaterial: MeshDepthMaterial;
  private blurMaterial: ShaderMaterial;
  plane: Mesh;
  
  constructor(options: {
    size?: number;
    resolution?: number;
    blur?: number;
  }) {
    const size = options.size || 10;
    const resolution = options.resolution || 512;
    
    // 创建渲染目标
    this.renderTarget = new WebGLRenderTarget(resolution, resolution, {
      format: RGBAFormat,
    });
    
    // 阴影相机
    this.shadowCamera = new OrthographicCamera(
      -size / 2, size / 2,
      size / 2, -size / 2,
      0, 10
    );
    this.shadowCamera.position.y = 5;
    this.shadowCamera.lookAt(0, 0, 0);
    
    // 深度材质
    this.shadowMaterial = new MeshDepthMaterial({
      depthPacking: RGBADepthPacking,
    });
    
    // 显示平面
    const planeGeometry = new PlaneGeometry(size, size);
    planeGeometry.rotateX(-Math.PI / 2);
    
    const planeMaterial = new MeshBasicMaterial({
      map: this.renderTarget.texture,
      transparent: true,
      opacity: 0.5,
      blending: MultiplyBlending,
    });
    
    this.plane = new Mesh(planeGeometry, planeMaterial);
    this.plane.renderOrder = -1;
  }
  
  update(
    renderer: WebGLRenderer,
    scene: Scene,
    objects: Object3D[]
  ): void {
    // 保存原始状态
    const originalOverrideMaterial = scene.overrideMaterial;
    
    // 渲染阴影
    scene.overrideMaterial = this.shadowMaterial;
    
    // 只渲染指定物体
    const originalVisibility = new Map<Object3D, boolean>();
    scene.traverse(obj => {
      originalVisibility.set(obj, obj.visible);
      obj.visible = objects.includes(obj);
    });
    
    renderer.setRenderTarget(this.renderTarget);
    renderer.render(scene, this.shadowCamera);
    renderer.setRenderTarget(null);
    
    // 恢复状态
    scene.overrideMaterial = originalOverrideMaterial;
    originalVisibility.forEach((visible, obj) => {
      obj.visible = visible;
    });
  }
}
```

## 平面阴影

```typescript
// 简单的平面投影阴影
class PlanarShadow {
  shadowMesh: Mesh;
  private lightPosition: Vector3;
  private groundY: number;
  
  constructor(
    sourceMesh: Mesh,
    lightPosition: Vector3,
    groundY = 0
  ) {
    this.lightPosition = lightPosition;
    this.groundY = groundY;
    
    // 克隆几何体
    const geometry = sourceMesh.geometry.clone();
    
    // 阴影材质
    const material = new MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
      side: DoubleSide,
      depthWrite: false,
    });
    
    this.shadowMesh = new Mesh(geometry, material);
    this.shadowMesh.renderOrder = -1;
  }
  
  update(sourcePosition: Vector3, sourceQuaternion: Quaternion): void {
    // 计算阴影矩阵
    const shadowMatrix = new Matrix4();
    
    const light = this.lightPosition;
    const ground = this.groundY;
    
    // 平面阴影投影矩阵
    shadowMatrix.set(
      light.y - ground, -light.x, 0, light.x * ground,
      0, 0, 0, ground * light.y,
      0, -light.z, light.y - ground, light.z * ground,
      0, -1, 0, light.y
    );
    
    // 应用源物体变换
    const sourceMatrix = new Matrix4().compose(
      sourcePosition,
      sourceQuaternion,
      new Vector3(1, 1, 1)
    );
    
    this.shadowMesh.matrix.copy(shadowMatrix.multiply(sourceMatrix));
    this.shadowMesh.matrixAutoUpdate = false;
  }
}
```

## 阴影烘焙

```typescript
// 预烘焙阴影到纹理
class ShadowBaker {
  private renderer: WebGLRenderer;
  private renderTarget: WebGLRenderTarget;
  private shadowCamera: OrthographicCamera;
  
  constructor(renderer: WebGLRenderer, resolution = 1024) {
    this.renderer = renderer;
    
    this.renderTarget = new WebGLRenderTarget(resolution, resolution, {
      format: RGBAFormat,
      type: UnsignedByteType,
    });
    
    this.shadowCamera = new OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
    this.shadowCamera.position.y = 20;
    this.shadowCamera.lookAt(0, 0, 0);
  }
  
  bake(
    scene: Scene,
    objects: Object3D[]
  ): Texture {
    // 创建阴影场景
    const shadowScene = new Scene();
    shadowScene.background = new Color(1, 1, 1);
    
    // 添加光源
    const light = new DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 5);
    shadowScene.add(light);
    shadowScene.add(new AmbientLight(0xffffff, 0.5));
    
    // 克隆物体（使用纯色材质）
    objects.forEach(obj => {
      if (obj instanceof Mesh) {
        const clone = obj.clone();
        clone.material = new MeshBasicMaterial({ color: 0x000000 });
        shadowScene.add(clone);
      }
    });
    
    // 添加地面
    const ground = new Mesh(
      new PlaneGeometry(20, 20),
      new ShadowMaterial({ opacity: 0.5 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    shadowScene.add(ground);
    
    // 渲染阴影
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(shadowScene, this.shadowCamera);
    this.renderer.setRenderTarget(null);
    
    return this.renderTarget.texture;
  }
  
  applyToGround(ground: Mesh): void {
    const bakedTexture = this.renderTarget.texture;
    
    (ground.material as MeshStandardMaterial).map = bakedTexture;
    (ground.material as MeshStandardMaterial).needsUpdate = true;
  }
}
```

## 阴影优化

```typescript
class ShadowOptimizer {
  // 根据物体距离调整阴影质量
  static optimizeByCameraDistance(
    objects: Object3D[],
    camera: Camera,
    maxDistance = 50
  ): void {
    const cameraPosition = camera.position;
    
    objects.forEach(obj => {
      if (obj instanceof Mesh) {
        const distance = obj.position.distanceTo(cameraPosition);
        
        // 远处物体不投射阴影
        obj.castShadow = distance < maxDistance;
        
        // 非常近的物体使用高质量阴影
        if (obj.userData.shadowMapSize) {
          const size = distance < maxDistance / 3 ? 2048 : 
                       distance < maxDistance / 2 ? 1024 : 512;
          obj.userData.shadowMapSize = size;
        }
      }
    });
  }
  
  // 动态调整阴影贴图大小
  static adjustShadowMapSize(
    light: DirectionalLight | SpotLight,
    visibleObjects: Object3D[]
  ): void {
    if (visibleObjects.length === 0) {
      light.castShadow = false;
      return;
    }
    
    light.castShadow = true;
    
    // 根据物体数量调整分辨率
    const objectCount = visibleObjects.length;
    
    if (objectCount > 100) {
      light.shadow.mapSize.setScalar(512);
    } else if (objectCount > 50) {
      light.shadow.mapSize.setScalar(1024);
    } else {
      light.shadow.mapSize.setScalar(2048);
    }
  }
  
  // 紧凑阴影相机范围
  static fitShadowCamera(
    light: DirectionalLight,
    objects: Object3D[],
    padding = 1
  ): void {
    const box = new Box3();
    
    objects.forEach(obj => {
      box.expandByObject(obj);
    });
    
    const center = box.getCenter(new Vector3());
    const size = box.getSize(new Vector3());
    
    const camera = light.shadow.camera;
    
    camera.left = -size.x / 2 - padding;
    camera.right = size.x / 2 + padding;
    camera.top = size.z / 2 + padding;
    camera.bottom = -size.z / 2 - padding;
    
    camera.updateProjectionMatrix();
    
    // 更新光源目标
    if (light.target) {
      light.target.position.copy(center);
    }
  }
}
```

## 调试工具

```typescript
// 阴影调试助手
class ShadowDebugHelper {
  private helpers: Object3D[] = [];
  
  addLightHelper(light: DirectionalLight | SpotLight, scene: Scene): void {
    // 光源助手
    if (light instanceof DirectionalLight) {
      const helper = new DirectionalLightHelper(light, 5);
      scene.add(helper);
      this.helpers.push(helper);
    } else {
      const helper = new SpotLightHelper(light);
      scene.add(helper);
      this.helpers.push(helper);
    }
    
    // 阴影相机助手
    const shadowHelper = new CameraHelper(light.shadow.camera);
    scene.add(shadowHelper);
    this.helpers.push(shadowHelper);
  }
  
  visualizeShadowMap(
    light: DirectionalLight | SpotLight,
    scene: Scene
  ): Mesh {
    const geometry = new PlaneGeometry(5, 5);
    const material = new MeshBasicMaterial({
      map: light.shadow.map?.texture,
    });
    
    const plane = new Mesh(geometry, material);
    plane.position.set(10, 5, 0);
    scene.add(plane);
    this.helpers.push(plane);
    
    return plane;
  }
  
  dispose(scene: Scene): void {
    this.helpers.forEach(helper => {
      scene.remove(helper);
    });
    this.helpers = [];
  }
}
```

## 本章小结

- 阴影贴图是深度比较的结果
- PCFSoftShadowMap 提供较好的软阴影
- CSM 解决大场景阴影质量问题
- 接触阴影增强物体接地感
- 阴影烘焙适合静态场景
- 动态优化保持性能

下一章，我们将学习 Raycast 交互系统。
