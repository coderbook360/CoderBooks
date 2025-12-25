# EffectComposer 后处理

> "后处理效果为画面增添电影般的质感。"

## 后处理概述

```
后处理渲染管线：

场景渲染
    │
    ▼
┌─────────────────┐
│  RenderTarget   │  ← 渲染到纹理
└────────┬────────┘
         │
    ┌────▼────┐
    │ Pass 1  │  ← 辉光效果
    └────┬────┘
         │
    ┌────▼────┐
    │ Pass 2  │  ← 色调映射
    └────┬────┘
         │
    ┌────▼────┐
    │ Pass 3  │  ← 抗锯齿
    └────┬────┘
         │
    ┌────▼────┐
    │ Pass N  │  ← 更多效果...
    └────┬────┘
         │
         ▼
    输出到屏幕
```

## EffectComposer 基础

```typescript
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// 创建合成器
const composer = new EffectComposer(renderer);

// 添加渲染通道（必需的第一个通道）
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// 添加输出通道（处理颜色空间转换）
const outputPass = new OutputPass();
composer.addPass(outputPass);

// 渲染循环
function animate() {
  // 使用 composer 替代 renderer
  composer.render();
  // 不要再调用 renderer.render()
  
  requestAnimationFrame(animate);
}
```

## 常用后处理效果

### 辉光效果（Bloom）

```typescript
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const bloomPass = new UnrealBloomPass(
  new Vector2(window.innerWidth, window.innerHeight),
  1.5,   // 强度
  0.4,   // 半径
  0.85   // 阈值
);

composer.addPass(bloomPass);

// 运行时调整参数
bloomPass.strength = 2.0;
bloomPass.radius = 0.5;
bloomPass.threshold = 0.8;

// 选择性辉光（只让特定物体发光）
class SelectiveBloom {
  private bloomComposer: EffectComposer;
  private finalComposer: EffectComposer;
  private bloomLayer = new Layers();
  
  constructor(renderer: WebGLRenderer, scene: Scene, camera: Camera) {
    this.bloomLayer.set(1); // 辉光层
    
    // 辉光合成器
    this.bloomComposer = new EffectComposer(renderer);
    this.bloomComposer.renderToScreen = false;
    
    const renderPass = new RenderPass(scene, camera);
    this.bloomComposer.addPass(renderPass);
    
    const bloomPass = new UnrealBloomPass(
      new Vector2(window.innerWidth, window.innerHeight),
      1.5, 0.4, 0.1
    );
    this.bloomComposer.addPass(bloomPass);
    
    // 最终合成器
    this.finalComposer = new EffectComposer(renderer);
    
    const finalPass = new ShaderPass(
      new ShaderMaterial({
        uniforms: {
          baseTexture: { value: null },
          bloomTexture: { value: this.bloomComposer.renderTarget2.texture },
        },
        vertexShader: /* glsl */`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */`
          uniform sampler2D baseTexture;
          uniform sampler2D bloomTexture;
          varying vec2 vUv;
          void main() {
            gl_FragColor = texture2D(baseTexture, vUv) + texture2D(bloomTexture, vUv);
          }
        `,
      }),
      'baseTexture'
    );
    finalPass.needsSwap = true;
    
    this.finalComposer.addPass(renderPass);
    this.finalComposer.addPass(finalPass);
  }
  
  render(scene: Scene): void {
    // 先渲染辉光物体
    scene.traverse(obj => {
      if (obj instanceof Mesh) {
        if (!obj.layers.test(this.bloomLayer)) {
          obj.visible = false;
        }
      }
    });
    this.bloomComposer.render();
    
    // 恢复所有物体并最终渲染
    scene.traverse(obj => {
      if (obj instanceof Mesh) {
        obj.visible = true;
      }
    });
    this.finalComposer.render();
  }
}

// 标记发光物体
glowMesh.layers.enable(1);
```

### 抗锯齿（FXAA/SMAA）

```typescript
// FXAA - 快速近似抗锯齿
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

const fxaaPass = new ShaderPass(FXAAShader);
fxaaPass.material.uniforms['resolution'].value.set(
  1 / window.innerWidth,
  1 / window.innerHeight
);
composer.addPass(fxaaPass);

// SMAA - 增强子像素形态学抗锯齿
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';

const smaaPass = new SMAAPass(
  window.innerWidth * renderer.getPixelRatio(),
  window.innerHeight * renderer.getPixelRatio()
);
composer.addPass(smaaPass);

// TAA - 时间性抗锯齿
import { TAARenderPass } from 'three/addons/postprocessing/TAARenderPass.js';

const taaPass = new TAARenderPass(scene, camera);
taaPass.unbiased = false;
taaPass.sampleLevel = 2;
composer.addPass(taaPass);
```

### 屏幕空间环境光遮蔽（SSAO）

```typescript
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';

const ssaoPass = new SSAOPass(
  scene,
  camera,
  window.innerWidth,
  window.innerHeight
);

ssaoPass.kernelRadius = 16;    // 采样半径
ssaoPass.minDistance = 0.005;  // 最小距离
ssaoPass.maxDistance = 0.1;    // 最大距离

composer.addPass(ssaoPass);

// 使用 N8AO（更现代的实现）
import { N8AOPass } from 'three/addons/postprocessing/N8AOPass.js';

const n8aoPass = new N8AOPass(
  scene,
  camera,
  window.innerWidth,
  window.innerHeight
);

n8aoPass.configuration.aoRadius = 5.0;
n8aoPass.configuration.intensity = 1.0;

composer.addPass(n8aoPass);
```

### 景深效果（DOF）

```typescript
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';

const bokehPass = new BokehPass(scene, camera, {
  focus: 10.0,      // 焦距
  aperture: 0.025,  // 光圈大小
  maxblur: 0.01,    // 最大模糊
});

composer.addPass(bokehPass);

// 动态焦点
function updateFocus(targetPosition: Vector3): void {
  const distance = camera.position.distanceTo(targetPosition);
  bokehPass.uniforms['focus'].value = distance;
}
```

### 运动模糊

```typescript
import { MotionBlurPass } from 'three/addons/postprocessing/MotionBlurPass.js';

// 注意：需要启用速度缓冲
const motionBlurPass = new MotionBlurPass(scene, camera, {
  samples: 16,
  expandGeometry: 0,
  interpolateGeometry: 1,
  smearIntensity: 1,
  blurTransparent: false,
});

composer.addPass(motionBlurPass);
```

### 轮廓效果

```typescript
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';

const outlinePass = new OutlinePass(
  new Vector2(window.innerWidth, window.innerHeight),
  scene,
  camera
);

outlinePass.edgeStrength = 3.0;
outlinePass.edgeGlow = 0.0;
outlinePass.edgeThickness = 1.0;
outlinePass.visibleEdgeColor.set(0xffffff);
outlinePass.hiddenEdgeColor.set(0x190a05);

composer.addPass(outlinePass);

// 设置要描边的物体
outlinePass.selectedObjects = [selectedMesh];
```

## 色彩调整

```typescript
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// 亮度/对比度
import { BrightnessContrastShader } from 'three/addons/shaders/BrightnessContrastShader.js';

const bcPass = new ShaderPass(BrightnessContrastShader);
bcPass.uniforms['brightness'].value = 0.1;
bcPass.uniforms['contrast'].value = 0.2;
composer.addPass(bcPass);

// 色相/饱和度
import { HueSaturationShader } from 'three/addons/shaders/HueSaturationShader.js';

const hsPass = new ShaderPass(HueSaturationShader);
hsPass.uniforms['hue'].value = 0.0;
hsPass.uniforms['saturation'].value = 0.3;
composer.addPass(hsPass);

// 颜色查找表（LUT）
import { LUTPass } from 'three/addons/postprocessing/LUTPass.js';
import { LUTCubeLoader } from 'three/addons/loaders/LUTCubeLoader.js';

const lutLoader = new LUTCubeLoader();
const lutTexture = await lutLoader.loadAsync('luts/cinematic.cube');

const lutPass = new LUTPass({
  lut: lutTexture.texture3D,
  intensity: 1.0,
});
composer.addPass(lutPass);
```

## 自定义后处理效果

```typescript
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// 创建自定义着色器
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    offset: { value: 1.0 },
    darkness: { value: 1.0 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float offset;
    uniform float darkness;
    varying vec2 vUv;
    
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      
      // 计算到中心的距离
      vec2 center = vUv - 0.5;
      float dist = length(center);
      
      // 应用暗角
      float vignette = smoothstep(offset, offset - 0.5, dist);
      color.rgb *= mix(1.0 - darkness, 1.0, vignette);
      
      gl_FragColor = color;
    }
  `,
};

const vignettePass = new ShaderPass(VignetteShader);
vignettePass.uniforms['offset'].value = 0.95;
vignettePass.uniforms['darkness'].value = 0.5;
composer.addPass(vignettePass);

// 扫描线效果
const ScanlineShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    count: { value: 100 },
    intensity: { value: 0.1 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float count;
    uniform float intensity;
    varying vec2 vUv;
    
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      
      float scanline = sin((vUv.y + time * 0.1) * count * 3.14159) * intensity;
      color.rgb -= scanline;
      
      gl_FragColor = color;
    }
  `,
};
```

## 完整后处理设置

```typescript
class PostProcessingManager {
  composer: EffectComposer;
  private passes: Map<string, Pass> = new Map();
  
  constructor(renderer: WebGLRenderer, scene: Scene, camera: Camera) {
    this.composer = new EffectComposer(renderer);
    
    // 基础渲染
    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);
    
    // 预设效果
    this.setupDefaultPasses(scene, camera);
    
    // 输出
    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }
  
  private setupDefaultPasses(scene: Scene, camera: Camera): void {
    // SSAO
    const ssaoPass = new SSAOPass(scene, camera);
    ssaoPass.enabled = false;
    this.passes.set('ssao', ssaoPass);
    this.composer.insertPass(ssaoPass, 1);
    
    // Bloom
    const bloomPass = new UnrealBloomPass(
      new Vector2(window.innerWidth, window.innerHeight),
      0.5, 0.4, 0.85
    );
    bloomPass.enabled = false;
    this.passes.set('bloom', bloomPass);
    this.composer.insertPass(bloomPass, 2);
    
    // FXAA
    const fxaaPass = new ShaderPass(FXAAShader);
    fxaaPass.enabled = true;
    this.passes.set('fxaa', fxaaPass);
    this.composer.insertPass(fxaaPass, 3);
  }
  
  setEnabled(name: string, enabled: boolean): void {
    const pass = this.passes.get(name);
    if (pass) {
      pass.enabled = enabled;
    }
  }
  
  setBloomStrength(strength: number): void {
    const bloom = this.passes.get('bloom') as UnrealBloomPass;
    if (bloom) {
      bloom.strength = strength;
    }
  }
  
  resize(width: number, height: number): void {
    this.composer.setSize(width, height);
    
    const fxaa = this.passes.get('fxaa') as ShaderPass;
    if (fxaa) {
      fxaa.material.uniforms['resolution'].value.set(1 / width, 1 / height);
    }
  }
  
  render(): void {
    this.composer.render();
  }
}
```

## 本章小结

- EffectComposer 管理后处理渲染管线
- RenderPass 是第一个必需的通道
- 常用效果：Bloom、SSAO、DOF、抗锯齿
- 可以创建自定义着色器效果
- 注意性能影响，按需启用效果
- OutputPass 处理最终颜色空间转换

下一章，我们将学习物理引擎集成。
