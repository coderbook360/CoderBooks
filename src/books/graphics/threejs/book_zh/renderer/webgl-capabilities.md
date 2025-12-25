# WebGLCapabilities 能力检测

> "了解 GPU 的能力边界，才能发挥最佳性能。"

## 能力检测项

```
WebGLCapabilities
├── 精度
│   ├── 顶点着色器精度
│   └── 片段着色器精度
├── 扩展
│   ├── 压缩纹理
│   ├── 浮点纹理
│   └── 各向异性过滤
├── 限制
│   ├── 最大纹理尺寸
│   ├── 最大纹理单元
│   ├── 最大属性数
│   └── 最大 Uniform 数
└── 功能
    ├── 实例化
    ├── 多重渲染目标
    └── 深度纹理
```

## WebGLExtensions 实现

```typescript
// src/renderers/webgl/WebGLExtensions.ts
export class WebGLExtensions {
  private _gl: WebGL2RenderingContext;
  private _extensions = new Map<string, any>();
  
  constructor(gl: WebGL2RenderingContext) {
    this._gl = gl;
  }
  
  has(name: string): boolean {
    return this.get(name) !== null;
  }
  
  get(name: string): any {
    if (this._extensions.has(name)) {
      return this._extensions.get(name);
    }
    
    let extension: any = null;
    
    switch (name) {
      case 'WEBGL_depth_texture':
        // WebGL 2 内置支持
        extension = true;
        break;
        
      case 'EXT_texture_filter_anisotropic':
        extension = this._gl.getExtension('EXT_texture_filter_anisotropic') ||
                   this._gl.getExtension('MOZ_EXT_texture_filter_anisotropic') ||
                   this._gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
        break;
        
      case 'WEBGL_compressed_texture_s3tc':
        extension = this._gl.getExtension('WEBGL_compressed_texture_s3tc') ||
                   this._gl.getExtension('MOZ_WEBGL_compressed_texture_s3tc') ||
                   this._gl.getExtension('WEBKIT_WEBGL_compressed_texture_s3tc');
        break;
        
      case 'WEBGL_compressed_texture_pvrtc':
        extension = this._gl.getExtension('WEBGL_compressed_texture_pvrtc') ||
                   this._gl.getExtension('WEBKIT_WEBGL_compressed_texture_pvrtc');
        break;
        
      case 'WEBGL_compressed_texture_etc':
        extension = this._gl.getExtension('WEBGL_compressed_texture_etc');
        break;
        
      case 'WEBGL_compressed_texture_etc1':
        extension = this._gl.getExtension('WEBGL_compressed_texture_etc1');
        break;
        
      case 'WEBGL_compressed_texture_astc':
        extension = this._gl.getExtension('WEBGL_compressed_texture_astc');
        break;
        
      case 'EXT_color_buffer_half_float':
        extension = this._gl.getExtension('EXT_color_buffer_half_float');
        break;
        
      case 'EXT_color_buffer_float':
        extension = this._gl.getExtension('EXT_color_buffer_float');
        break;
        
      case 'WEBGL_multisampled_render_to_texture':
        extension = this._gl.getExtension('WEBGL_multisampled_render_to_texture');
        break;
        
      case 'OVR_multiview2':
        extension = this._gl.getExtension('OVR_multiview2');
        break;
        
      case 'KHR_parallel_shader_compile':
        extension = this._gl.getExtension('KHR_parallel_shader_compile');
        break;
        
      case 'WEBGL_lose_context':
        extension = this._gl.getExtension('WEBGL_lose_context');
        break;
        
      case 'WEBGL_debug_shaders':
        extension = this._gl.getExtension('WEBGL_debug_shaders');
        break;
        
      case 'EXT_disjoint_timer_query_webgl2':
        extension = this._gl.getExtension('EXT_disjoint_timer_query_webgl2');
        break;
        
      default:
        extension = this._gl.getExtension(name);
    }
    
    this._extensions.set(name, extension);
    
    return extension;
  }
}
```

## WebGLCapabilities 实现

```typescript
// src/renderers/webgl/WebGLCapabilities.ts
export class WebGLCapabilities {
  private _gl: WebGL2RenderingContext;
  private _extensions: WebGLExtensions;
  
  // 精度
  precision: 'highp' | 'mediump' | 'lowp';
  
  // 是否为 WebGL 2
  readonly isWebGL2 = true;
  
  // 最大值
  maxTextures: number;
  maxVertexTextures: number;
  maxTextureSize: number;
  maxCubemapSize: number;
  maxAttributes: number;
  maxVertexUniforms: number;
  maxVaryings: number;
  maxFragmentUniforms: number;
  maxSamples: number;
  max3DTextureSize: number;
  maxArrayTextureLayers: number;
  
  // 浮点纹理
  floatFragmentTextures: boolean;
  floatVertexTextures: boolean;
  
  // 各向异性
  private _maxAnisotropy: number | null = null;
  
  // 调试
  logarithmicDepthBuffer: boolean;
  reverseDepthBuffer: boolean;
  
  constructor(
    gl: WebGL2RenderingContext,
    extensions: WebGLExtensions,
    parameters: { precision?: string; logarithmicDepthBuffer?: boolean }
  ) {
    this._gl = gl;
    this._extensions = extensions;
    
    // 获取精度
    this.precision = this._getMaxPrecision(parameters.precision || 'highp');
    
    // 获取限制值
    this.maxTextures = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
    this.maxVertexTextures = gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS);
    this.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    this.maxCubemapSize = gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE);
    this.maxAttributes = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
    this.maxVertexUniforms = gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS);
    this.maxVaryings = gl.getParameter(gl.MAX_VARYING_VECTORS);
    this.maxFragmentUniforms = gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS);
    this.maxSamples = gl.getParameter(gl.MAX_SAMPLES);
    this.max3DTextureSize = gl.getParameter(gl.MAX_3D_TEXTURE_SIZE);
    this.maxArrayTextureLayers = gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS);
    
    // 浮点纹理支持
    this.floatFragmentTextures = true; // WebGL 2 内置
    this.floatVertexTextures = this.maxVertexTextures > 0;
    
    // 深度缓冲
    this.logarithmicDepthBuffer = parameters.logarithmicDepthBuffer === true;
    this.reverseDepthBuffer = false;
  }
  
  // ==================== 精度检测 ====================
  
  private _getMaxPrecision(precision: string): 'highp' | 'mediump' | 'lowp' {
    const gl = this._gl;
    
    if (precision === 'highp') {
      // 检查顶点着色器
      const vsHighp = gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.HIGH_FLOAT);
      // 检查片段着色器
      const fsHighp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
      
      if (vsHighp && fsHighp && vsHighp.precision > 0 && fsHighp.precision > 0) {
        return 'highp';
      }
      
      precision = 'mediump';
    }
    
    if (precision === 'mediump') {
      const vsMediump = gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.MEDIUM_FLOAT);
      const fsMediump = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT);
      
      if (vsMediump && fsMediump && vsMediump.precision > 0 && fsMediump.precision > 0) {
        return 'mediump';
      }
    }
    
    return 'lowp';
  }
  
  // ==================== 各向异性 ====================
  
  getMaxAnisotropy(): number {
    if (this._maxAnisotropy !== null) {
      return this._maxAnisotropy;
    }
    
    const extension = this._extensions.get('EXT_texture_filter_anisotropic');
    
    if (extension) {
      this._maxAnisotropy = this._gl.getParameter(
        extension.MAX_TEXTURE_MAX_ANISOTROPY_EXT
      );
    } else {
      this._maxAnisotropy = 0;
    }
    
    return this._maxAnisotropy;
  }
  
  // ==================== 纹理格式支持 ====================
  
  textureFormatSupported(format: number): boolean {
    const gl = this._gl;
    
    // WebGL 2 内置格式
    const webgl2Formats = [
      gl.R8, gl.R16F, gl.R32F,
      gl.RG8, gl.RG16F, gl.RG32F,
      gl.RGB8, gl.RGB16F, gl.RGB32F,
      gl.RGBA8, gl.RGBA16F, gl.RGBA32F,
      gl.R11F_G11F_B10F,
      gl.RGB9_E5,
      gl.SRGB8,
      gl.SRGB8_ALPHA8,
      gl.DEPTH_COMPONENT16, gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT32F,
      gl.DEPTH24_STENCIL8, gl.DEPTH32F_STENCIL8,
    ];
    
    return webgl2Formats.includes(format);
  }
  
  // ==================== 压缩纹理支持 ====================
  
  getCompressedTextureFormats(): number[] {
    const gl = this._gl;
    const formats: number[] = [];
    
    // S3TC (DXT)
    if (this._extensions.has('WEBGL_compressed_texture_s3tc')) {
      const ext = this._extensions.get('WEBGL_compressed_texture_s3tc');
      formats.push(
        ext.COMPRESSED_RGB_S3TC_DXT1_EXT,
        ext.COMPRESSED_RGBA_S3TC_DXT1_EXT,
        ext.COMPRESSED_RGBA_S3TC_DXT3_EXT,
        ext.COMPRESSED_RGBA_S3TC_DXT5_EXT
      );
    }
    
    // PVRTC
    if (this._extensions.has('WEBGL_compressed_texture_pvrtc')) {
      const ext = this._extensions.get('WEBGL_compressed_texture_pvrtc');
      formats.push(
        ext.COMPRESSED_RGB_PVRTC_4BPPV1_IMG,
        ext.COMPRESSED_RGB_PVRTC_2BPPV1_IMG,
        ext.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG,
        ext.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG
      );
    }
    
    // ETC
    if (this._extensions.has('WEBGL_compressed_texture_etc')) {
      const ext = this._extensions.get('WEBGL_compressed_texture_etc');
      formats.push(
        ext.COMPRESSED_RGB8_ETC2,
        ext.COMPRESSED_RGBA8_ETC2_EAC
      );
    }
    
    // ASTC
    if (this._extensions.has('WEBGL_compressed_texture_astc')) {
      const ext = this._extensions.get('WEBGL_compressed_texture_astc');
      formats.push(
        ext.COMPRESSED_RGBA_ASTC_4x4_KHR,
        ext.COMPRESSED_RGBA_ASTC_5x4_KHR,
        ext.COMPRESSED_RGBA_ASTC_5x5_KHR,
        ext.COMPRESSED_RGBA_ASTC_6x5_KHR,
        ext.COMPRESSED_RGBA_ASTC_6x6_KHR,
        ext.COMPRESSED_RGBA_ASTC_8x5_KHR,
        ext.COMPRESSED_RGBA_ASTC_8x6_KHR,
        ext.COMPRESSED_RGBA_ASTC_8x8_KHR,
        ext.COMPRESSED_RGBA_ASTC_10x5_KHR,
        ext.COMPRESSED_RGBA_ASTC_10x6_KHR,
        ext.COMPRESSED_RGBA_ASTC_10x8_KHR,
        ext.COMPRESSED_RGBA_ASTC_10x10_KHR,
        ext.COMPRESSED_RGBA_ASTC_12x10_KHR,
        ext.COMPRESSED_RGBA_ASTC_12x12_KHR
      );
    }
    
    return formats;
  }
}
```

## 能力检测报告

```typescript
// src/utils/WebGLCapabilitiesReport.ts
export function generateCapabilitiesReport(capabilities: WebGLCapabilities): string {
  const lines: string[] = [];
  
  lines.push('=== WebGL Capabilities Report ===');
  lines.push('');
  
  // 基本信息
  lines.push('【基本信息】');
  lines.push(`WebGL 版本: 2.0`);
  lines.push(`着色器精度: ${capabilities.precision}`);
  lines.push('');
  
  // 纹理限制
  lines.push('【纹理限制】');
  lines.push(`最大纹理尺寸: ${capabilities.maxTextureSize}x${capabilities.maxTextureSize}`);
  lines.push(`最大立方体贴图尺寸: ${capabilities.maxCubemapSize}x${capabilities.maxCubemapSize}`);
  lines.push(`最大 3D 纹理尺寸: ${capabilities.max3DTextureSize}`);
  lines.push(`最大纹理数组层数: ${capabilities.maxArrayTextureLayers}`);
  lines.push(`片段着色器纹理单元: ${capabilities.maxTextures}`);
  lines.push(`顶点着色器纹理单元: ${capabilities.maxVertexTextures}`);
  lines.push(`最大各向异性: ${capabilities.getMaxAnisotropy()}`);
  lines.push('');
  
  // 着色器限制
  lines.push('【着色器限制】');
  lines.push(`最大顶点属性: ${capabilities.maxAttributes}`);
  lines.push(`最大顶点 Uniform 向量: ${capabilities.maxVertexUniforms}`);
  lines.push(`最大 Varying 向量: ${capabilities.maxVaryings}`);
  lines.push(`最大片段 Uniform 向量: ${capabilities.maxFragmentUniforms}`);
  lines.push('');
  
  // 功能支持
  lines.push('【功能支持】');
  lines.push(`浮点片段纹理: ${capabilities.floatFragmentTextures ? '✓' : '✗'}`);
  lines.push(`浮点顶点纹理: ${capabilities.floatVertexTextures ? '✓' : '✗'}`);
  lines.push(`最大 MSAA 采样数: ${capabilities.maxSamples}`);
  lines.push('');
  
  return lines.join('\n');
}

// 使用示例
const report = generateCapabilitiesReport(capabilities);
console.log(report);

/* 输出示例:
=== WebGL Capabilities Report ===

【基本信息】
WebGL 版本: 2.0
着色器精度: highp

【纹理限制】
最大纹理尺寸: 16384x16384
最大立方体贴图尺寸: 16384x16384
最大 3D 纹理尺寸: 2048
最大纹理数组层数: 2048
片段着色器纹理单元: 16
顶点着色器纹理单元: 16
最大各向异性: 16

【着色器限制】
最大顶点属性: 16
最大顶点 Uniform 向量: 4096
最大 Varying 向量: 32
最大片段 Uniform 向量: 1024

【功能支持】
浮点片段纹理: ✓
浮点顶点纹理: ✓
最大 MSAA 采样数: 16
*/
```

## 平台差异处理

```typescript
// src/utils/PlatformDetection.ts
export interface PlatformInfo {
  isMobile: boolean;
  isApple: boolean;
  isAndroid: boolean;
  isWindows: boolean;
  gpu: string;
  renderer: string;
}

export function detectPlatform(gl: WebGL2RenderingContext): PlatformInfo {
  const ua = navigator.userAgent;
  
  // 获取 GPU 信息
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const vendor = debugInfo
    ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
    : gl.getParameter(gl.VENDOR);
  const renderer = debugInfo
    ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
    : gl.getParameter(gl.RENDERER);
  
  return {
    isMobile: /Android|iPhone|iPad|iPod/i.test(ua),
    isApple: /Mac|iPhone|iPad|iPod/i.test(ua),
    isAndroid: /Android/i.test(ua),
    isWindows: /Windows/i.test(ua),
    gpu: vendor,
    renderer: renderer,
  };
}

// 根据平台调整设置
export function getOptimalSettings(
  capabilities: WebGLCapabilities,
  platform: PlatformInfo
): { pixelRatio: number; antialias: boolean; shadowMapSize: number } {
  if (platform.isMobile) {
    return {
      pixelRatio: Math.min(window.devicePixelRatio, 2),
      antialias: false,
      shadowMapSize: 512,
    };
  }
  
  // 检查是否为低端 GPU
  const lowEndGPUs = [
    'Intel HD Graphics',
    'Intel UHD Graphics',
    'Mali',
    'Adreno 5',
    'Adreno 6',
  ];
  
  const isLowEnd = lowEndGPUs.some(gpu =>
    platform.renderer.toLowerCase().includes(gpu.toLowerCase())
  );
  
  if (isLowEnd) {
    return {
      pixelRatio: 1,
      antialias: false,
      shadowMapSize: 1024,
    };
  }
  
  // 高端设备
  return {
    pixelRatio: Math.min(window.devicePixelRatio, 2),
    antialias: true,
    shadowMapSize: 2048,
  };
}
```

## 使用示例

```typescript
// 创建扩展和能力检测
const extensions = new WebGLExtensions(gl);
const capabilities = new WebGLCapabilities(gl, extensions, {
  precision: 'highp',
  logarithmicDepthBuffer: false,
});

// 检查扩展
if (extensions.has('EXT_texture_filter_anisotropic')) {
  console.log('各向异性过滤可用');
}

// 获取能力值
console.log('最大纹理尺寸:', capabilities.maxTextureSize);
console.log('最大各向异性:', capabilities.getMaxAnisotropy());
console.log('精度:', capabilities.precision);

// 检测平台
const platform = detectPlatform(gl);
console.log('平台:', platform);

// 获取最优设置
const settings = getOptimalSettings(capabilities, platform);
renderer.setPixelRatio(settings.pixelRatio);
```

## 本章小结

- WebGLExtensions 管理 WebGL 扩展
- WebGLCapabilities 检测 GPU 能力
- 支持精度、纹理、着色器限制检测
- 支持压缩纹理格式查询
- 提供平台检测和自适应设置
- 帮助实现跨设备兼容性

下一章，我们将学习材质理论基础。
