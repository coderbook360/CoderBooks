# 材质系统设计

> "材质系统是渲染器的核心，连接艺术表达与技术实现。"

## 材质系统架构

```
Material System
├── 基类 Material
│   ├── 渲染状态
│   ├── 着色器关联
│   └── 参数管理
├── 材质类型
│   ├── 基础材质
│   ├── 光照材质
│   └── 特殊效果材质
├── 着色器系统
│   ├── 着色器模板
│   ├── 着色器块 (Chunk)
│   └── 条件编译
└── 纹理系统
    ├── 纹理映射
    └── UV 变换
```

## Material 基类设计

```typescript
// src/materials/Material.ts
export interface MaterialParameters {
  name?: string;
  color?: ColorRepresentation;
  opacity?: number;
  transparent?: boolean;
  side?: Side;
  visible?: boolean;
  depthTest?: boolean;
  depthWrite?: boolean;
  blending?: Blending;
}

export abstract class Material extends EventDispatcher {
  readonly isMaterial = true;
  readonly type: string = 'Material';
  
  // 唯一标识
  readonly id: number = materialId++;
  uuid: string = generateUUID();
  name: string = '';
  
  // 渲染状态
  side: Side = FrontSide;
  vertexColors = false;
  opacity = 1;
  transparent = false;
  
  // 混合
  blending: Blending = NormalBlending;
  blendSrc: BlendFactor = SrcAlphaFactor;
  blendDst: BlendFactor = OneMinusSrcAlphaFactor;
  blendEquation: BlendEquation = AddEquation;
  blendSrcAlpha: BlendFactor | null = null;
  blendDstAlpha: BlendFactor | null = null;
  blendEquationAlpha: BlendEquation | null = null;
  premultipliedAlpha = false;
  
  // 深度
  depthTest = true;
  depthWrite = true;
  depthFunc: DepthFunc = LessEqualDepth;
  
  // 模板
  stencilWrite = false;
  stencilFunc: StencilFunc = AlwaysStencilFunc;
  stencilRef = 0;
  stencilWriteMask = 0xff;
  stencilFuncMask = 0xff;
  stencilFail: StencilOp = KeepStencilOp;
  stencilZFail: StencilOp = KeepStencilOp;
  stencilZPass: StencilOp = KeepStencilOp;
  
  // 多边形偏移
  polygonOffset = false;
  polygonOffsetFactor = 0;
  polygonOffsetUnits = 0;
  
  // 裁剪
  clippingPlanes: Plane[] | null = null;
  clipIntersection = false;
  clipShadows = false;
  
  // 其他
  colorWrite = true;
  precision: 'highp' | 'mediump' | 'lowp' | null = null;
  
  // 雾效
  fog = true;
  
  // 版本
  version = 0;
  needsUpdate = false;
  
  // 着色器关联
  program: WebGLProgram | null = null;
  defines: Record<string, string> = {};
  
  // 扩展
  extensions: {
    clipCullDistance: boolean;
    multiDraw: boolean;
  } = {
    clipCullDistance: false,
    multiDraw: false,
  };
  
  // 自定义着色器
  vertexShader: string | null = null;
  fragmentShader: string | null = null;
  
  // uniforms
  uniforms: Record<string, { value: any }> = {};
  
  constructor(parameters?: MaterialParameters) {
    super();
    
    if (parameters) {
      this.setValues(parameters);
    }
  }
  
  // ==================== 参数设置 ====================
  
  setValues(values: Record<string, any>): this {
    for (const key in values) {
      const newValue = values[key];
      
      if (newValue === undefined) {
        console.warn(`Material: '${key}' parameter is undefined.`);
        continue;
      }
      
      const currentValue = (this as any)[key];
      
      if (currentValue === undefined) {
        console.warn(`Material: '${key}' is not a property of this material.`);
        continue;
      }
      
      // 特殊类型处理
      if (currentValue && currentValue.isColor) {
        currentValue.set(newValue);
      } else if (currentValue && currentValue.isVector2) {
        currentValue.copy(newValue);
      } else if (currentValue && currentValue.isVector3) {
        currentValue.copy(newValue);
      } else if (currentValue && currentValue.isMatrix3) {
        currentValue.copy(newValue);
      } else {
        (this as any)[key] = newValue;
      }
    }
    
    return this;
  }
  
  // ==================== 克隆/复制 ====================
  
  clone(): this {
    return new (this.constructor as any)().copy(this);
  }
  
  copy(source: Material): this {
    this.name = source.name;
    
    this.side = source.side;
    this.vertexColors = source.vertexColors;
    this.opacity = source.opacity;
    this.transparent = source.transparent;
    
    this.blending = source.blending;
    this.blendSrc = source.blendSrc;
    this.blendDst = source.blendDst;
    this.blendEquation = source.blendEquation;
    this.blendSrcAlpha = source.blendSrcAlpha;
    this.blendDstAlpha = source.blendDstAlpha;
    this.blendEquationAlpha = source.blendEquationAlpha;
    this.premultipliedAlpha = source.premultipliedAlpha;
    
    this.depthTest = source.depthTest;
    this.depthWrite = source.depthWrite;
    this.depthFunc = source.depthFunc;
    
    this.stencilWrite = source.stencilWrite;
    this.stencilWriteMask = source.stencilWriteMask;
    this.stencilFunc = source.stencilFunc;
    this.stencilRef = source.stencilRef;
    this.stencilFuncMask = source.stencilFuncMask;
    this.stencilFail = source.stencilFail;
    this.stencilZFail = source.stencilZFail;
    this.stencilZPass = source.stencilZPass;
    
    this.polygonOffset = source.polygonOffset;
    this.polygonOffsetFactor = source.polygonOffsetFactor;
    this.polygonOffsetUnits = source.polygonOffsetUnits;
    
    this.fog = source.fog;
    
    if (source.clippingPlanes !== null) {
      this.clippingPlanes = source.clippingPlanes.map(p => p.clone());
    }
    this.clipIntersection = source.clipIntersection;
    this.clipShadows = source.clipShadows;
    
    this.colorWrite = source.colorWrite;
    this.precision = source.precision;
    
    return this;
  }
  
  // ==================== 序列化 ====================
  
  toJSON(meta?: any): any {
    const data: any = {
      metadata: {
        version: 4.5,
        type: 'Material',
        generator: 'Material.toJSON',
      },
      uuid: this.uuid,
      type: this.type,
    };
    
    if (this.name !== '') data.name = this.name;
    
    // 基本属性
    data.side = this.side;
    data.opacity = this.opacity;
    data.transparent = this.transparent;
    data.depthTest = this.depthTest;
    data.depthWrite = this.depthWrite;
    data.colorWrite = this.colorWrite;
    
    // 混合
    if (this.blending !== NormalBlending) data.blending = this.blending;
    if (this.blendSrc !== SrcAlphaFactor) data.blendSrc = this.blendSrc;
    if (this.blendDst !== OneMinusSrcAlphaFactor) data.blendDst = this.blendDst;
    if (this.blendEquation !== AddEquation) data.blendEquation = this.blendEquation;
    
    // 模板
    if (this.stencilWrite === true) data.stencilWrite = this.stencilWrite;
    if (this.stencilWriteMask !== 0xff) data.stencilWriteMask = this.stencilWriteMask;
    if (this.stencilFunc !== AlwaysStencilFunc) data.stencilFunc = this.stencilFunc;
    if (this.stencilRef !== 0) data.stencilRef = this.stencilRef;
    if (this.stencilFuncMask !== 0xff) data.stencilFuncMask = this.stencilFuncMask;
    
    // 多边形偏移
    if (this.polygonOffset === true) data.polygonOffset = true;
    if (this.polygonOffsetFactor !== 0) data.polygonOffsetFactor = this.polygonOffsetFactor;
    if (this.polygonOffsetUnits !== 0) data.polygonOffsetUnits = this.polygonOffsetUnits;
    
    return data;
  }
  
  // ==================== 更新 ====================
  
  onBeforeRender(
    renderer: WebGLRenderer,
    scene: Scene,
    camera: Camera,
    geometry: BufferGeometry,
    object: Object3D
  ): void {
    // 子类可重写
  }
  
  onBeforeCompile(
    shader: { vertexShader: string; fragmentShader: string; uniforms: any },
    renderer: WebGLRenderer
  ): void {
    // 子类可重写
  }
  
  customProgramCacheKey(): string {
    return this.onBeforeCompile.toString();
  }
  
  // ==================== 清理 ====================
  
  dispose(): void {
    this.dispatchEvent({ type: 'dispose' });
  }
}

let materialId = 0;
```

## 具体材质实现

### MeshBasicMaterial

```typescript
// src/materials/MeshBasicMaterial.ts
export interface MeshBasicMaterialParameters extends MaterialParameters {
  color?: ColorRepresentation;
  map?: Texture | null;
  lightMap?: Texture | null;
  lightMapIntensity?: number;
  aoMap?: Texture | null;
  aoMapIntensity?: number;
  alphaMap?: Texture | null;
  envMap?: Texture | null;
  combine?: Combine;
  reflectivity?: number;
  refractionRatio?: number;
  wireframe?: boolean;
  wireframeLinewidth?: number;
  fog?: boolean;
}

export class MeshBasicMaterial extends Material {
  readonly isMeshBasicMaterial = true;
  readonly type = 'MeshBasicMaterial';
  
  color = new Color(0xffffff);
  
  map: Texture | null = null;
  lightMap: Texture | null = null;
  lightMapIntensity = 1;
  aoMap: Texture | null = null;
  aoMapIntensity = 1;
  alphaMap: Texture | null = null;
  
  envMap: Texture | null = null;
  combine: Combine = MultiplyOperation;
  reflectivity = 1;
  refractionRatio = 0.98;
  
  wireframe = false;
  wireframeLinewidth = 1;
  wireframeLinecap: 'butt' | 'round' | 'square' = 'round';
  wireframeLinejoin: 'round' | 'bevel' | 'miter' = 'round';
  
  constructor(parameters?: MeshBasicMaterialParameters) {
    super();
    this.setValues(parameters);
  }
  
  copy(source: MeshBasicMaterial): this {
    super.copy(source);
    
    this.color.copy(source.color);
    
    this.map = source.map;
    this.lightMap = source.lightMap;
    this.lightMapIntensity = source.lightMapIntensity;
    this.aoMap = source.aoMap;
    this.aoMapIntensity = source.aoMapIntensity;
    this.alphaMap = source.alphaMap;
    
    this.envMap = source.envMap;
    this.combine = source.combine;
    this.reflectivity = source.reflectivity;
    this.refractionRatio = source.refractionRatio;
    
    this.wireframe = source.wireframe;
    this.wireframeLinewidth = source.wireframeLinewidth;
    this.wireframeLinecap = source.wireframeLinecap;
    this.wireframeLinejoin = source.wireframeLinejoin;
    
    return this;
  }
}
```

### MeshStandardMaterial

```typescript
// src/materials/MeshStandardMaterial.ts
export interface MeshStandardMaterialParameters extends MaterialParameters {
  color?: ColorRepresentation;
  roughness?: number;
  metalness?: number;
  map?: Texture | null;
  roughnessMap?: Texture | null;
  metalnessMap?: Texture | null;
  normalMap?: Texture | null;
  normalScale?: Vector2;
  bumpMap?: Texture | null;
  bumpScale?: number;
  displacementMap?: Texture | null;
  displacementScale?: number;
  displacementBias?: number;
  emissive?: ColorRepresentation;
  emissiveIntensity?: number;
  emissiveMap?: Texture | null;
  aoMap?: Texture | null;
  aoMapIntensity?: number;
  envMap?: Texture | null;
  envMapIntensity?: number;
  wireframe?: boolean;
  flatShading?: boolean;
}

export class MeshStandardMaterial extends Material {
  readonly isMeshStandardMaterial = true;
  readonly type = 'MeshStandardMaterial';
  
  // 定义
  defines: Record<string, string> = { 'STANDARD': '' };
  
  // PBR 参数
  color = new Color(0xffffff);
  roughness = 1;
  metalness = 0;
  
  // 纹理
  map: Texture | null = null;
  lightMap: Texture | null = null;
  lightMapIntensity = 1;
  aoMap: Texture | null = null;
  aoMapIntensity = 1;
  
  // 自发光
  emissive = new Color(0x000000);
  emissiveIntensity = 1;
  emissiveMap: Texture | null = null;
  
  // 法线
  normalMap: Texture | null = null;
  normalMapType: NormalMapType = TangentSpaceNormalMap;
  normalScale = new Vector2(1, 1);
  
  // 凹凸
  bumpMap: Texture | null = null;
  bumpScale = 1;
  
  // 置换
  displacementMap: Texture | null = null;
  displacementScale = 1;
  displacementBias = 0;
  
  // PBR 贴图
  roughnessMap: Texture | null = null;
  metalnessMap: Texture | null = null;
  
  // Alpha
  alphaMap: Texture | null = null;
  alphaTest = 0;
  alphaToCoverage = false;
  
  // 环境
  envMap: Texture | null = null;
  envMapIntensity = 1;
  envMapRotation = new Euler();
  
  // 渲染选项
  wireframe = false;
  wireframeLinewidth = 1;
  flatShading = false;
  
  constructor(parameters?: MeshStandardMaterialParameters) {
    super();
    this.setValues(parameters);
  }
  
  copy(source: MeshStandardMaterial): this {
    super.copy(source);
    
    this.defines = { 'STANDARD': '' };
    
    this.color.copy(source.color);
    this.roughness = source.roughness;
    this.metalness = source.metalness;
    
    this.map = source.map;
    
    this.lightMap = source.lightMap;
    this.lightMapIntensity = source.lightMapIntensity;
    
    this.aoMap = source.aoMap;
    this.aoMapIntensity = source.aoMapIntensity;
    
    this.emissive.copy(source.emissive);
    this.emissiveIntensity = source.emissiveIntensity;
    this.emissiveMap = source.emissiveMap;
    
    this.normalMap = source.normalMap;
    this.normalMapType = source.normalMapType;
    this.normalScale.copy(source.normalScale);
    
    this.bumpMap = source.bumpMap;
    this.bumpScale = source.bumpScale;
    
    this.displacementMap = source.displacementMap;
    this.displacementScale = source.displacementScale;
    this.displacementBias = source.displacementBias;
    
    this.roughnessMap = source.roughnessMap;
    this.metalnessMap = source.metalnessMap;
    
    this.alphaMap = source.alphaMap;
    this.alphaTest = source.alphaTest;
    this.alphaToCoverage = source.alphaToCoverage;
    
    this.envMap = source.envMap;
    this.envMapIntensity = source.envMapIntensity;
    this.envMapRotation.copy(source.envMapRotation);
    
    this.wireframe = source.wireframe;
    this.wireframeLinewidth = source.wireframeLinewidth;
    
    this.flatShading = source.flatShading;
    
    return this;
  }
}
```

## 着色器系统

### 着色器模板

```typescript
// src/renderers/shaders/ShaderLib.ts
export const ShaderLib: Record<string, { uniforms: any; vertexShader: string; fragmentShader: string }> = {
  basic: {
    uniforms: UniformsUtils.merge([
      UniformsLib.common,
      UniformsLib.fog,
      UniformsLib.envmap,
    ]),
    vertexShader: ShaderChunk.meshbasic_vert,
    fragmentShader: ShaderChunk.meshbasic_frag,
  },
  
  lambert: {
    uniforms: UniformsUtils.merge([
      UniformsLib.common,
      UniformsLib.fog,
      UniformsLib.lights,
      UniformsLib.envmap,
      { emissive: { value: new Color(0x000000) } },
    ]),
    vertexShader: ShaderChunk.meshlambert_vert,
    fragmentShader: ShaderChunk.meshlambert_frag,
  },
  
  phong: {
    uniforms: UniformsUtils.merge([
      UniformsLib.common,
      UniformsLib.fog,
      UniformsLib.lights,
      UniformsLib.normalmap,
      UniformsLib.envmap,
      {
        emissive: { value: new Color(0x000000) },
        specular: { value: new Color(0x111111) },
        shininess: { value: 30 },
      },
    ]),
    vertexShader: ShaderChunk.meshphong_vert,
    fragmentShader: ShaderChunk.meshphong_frag,
  },
  
  standard: {
    uniforms: UniformsUtils.merge([
      UniformsLib.common,
      UniformsLib.fog,
      UniformsLib.lights,
      UniformsLib.normalmap,
      UniformsLib.envmap,
      {
        emissive: { value: new Color(0x000000) },
        roughness: { value: 1 },
        metalness: { value: 0 },
        envMapIntensity: { value: 1 },
      },
    ]),
    vertexShader: ShaderChunk.meshphysical_vert,
    fragmentShader: ShaderChunk.meshphysical_frag,
  },
};
```

### 材质类型映射

```typescript
// 材质到着色器的映射
function getMaterialShaderType(material: Material): string {
  if (material.isMeshBasicMaterial) return 'basic';
  if (material.isMeshLambertMaterial) return 'lambert';
  if (material.isMeshPhongMaterial) return 'phong';
  if (material.isMeshStandardMaterial) return 'standard';
  if (material.isMeshPhysicalMaterial) return 'physical';
  if (material.isPointsMaterial) return 'points';
  if (material.isLineMaterial) return 'line';
  if (material.isSpriteMaterial) return 'sprite';
  if (material.isShaderMaterial) return 'custom';
  
  return 'basic';
}
```

## 材质继承关系

```
Material
├── MeshBasicMaterial (无光照)
├── MeshLambertMaterial (Lambert 光照)
├── MeshPhongMaterial (Phong 光照)
├── MeshStandardMaterial (PBR)
│   └── MeshPhysicalMaterial (高级 PBR)
├── MeshToonMaterial (卡通)
├── MeshNormalMaterial (法线可视化)
├── MeshDepthMaterial (深度)
├── MeshDistanceMaterial (距离)
├── PointsMaterial (点云)
├── LineBasicMaterial (线条)
│   └── LineDashedMaterial (虚线)
├── SpriteMaterial (精灵)
├── ShadowMaterial (阴影)
├── ShaderMaterial (自定义)
│   └── RawShaderMaterial (原始)
```

## 使用示例

```typescript
// 基础材质
const basicMat = new MeshBasicMaterial({
  color: 0xff0000,
  wireframe: true,
});

// PBR 材质
const standardMat = new MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.5,
  metalness: 0.5,
  map: diffuseTexture,
  normalMap: normalTexture,
  roughnessMap: roughnessTexture,
  metalnessMap: metalnessTexture,
  envMap: envTexture,
  envMapIntensity: 1.0,
});

// 材质更新
standardMat.roughness = 0.8;
standardMat.needsUpdate = true;

// 材质克隆
const clonedMat = standardMat.clone();
clonedMat.color.set(0x00ff00);

// 材质释放
standardMat.dispose();
```

## 本章小结

- Material 基类定义渲染状态和参数
- MeshBasicMaterial 无光照计算
- MeshStandardMaterial 实现 PBR
- 着色器系统通过模板和条件编译
- 材质支持克隆、序列化和释放

下一章，我们将学习具体材质类的实现。
