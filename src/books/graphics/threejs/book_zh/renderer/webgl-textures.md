# WebGLTextures 纹理系统

> "纹理是 3D 图形的皮肤，给几何体穿上丰富多彩的外衣。"

## WebGLTextures 结构

```
WebGLTextures
├── 纹理管理
│   ├── Texture → WebGLTexture
│   ├── 纹理单元分配
│   └── 引用计数
├── 纹理类型
│   ├── Texture (2D)
│   ├── DataTexture
│   ├── CompressedTexture
│   ├── CubeTexture
│   ├── Data3DTexture
│   └── DataArrayTexture
├── 渲染目标
│   ├── WebGLRenderTarget
│   └── WebGLCubeRenderTarget
└── Mipmap
    ├── 自动生成
    └── 手动设置
```

## 核心实现

### WebGLTextures 类

```typescript
// src/renderers/webgl/WebGLTextures.ts
interface TextureProperties {
  glTexture: WebGLTexture;
  glInit: boolean;
  glFormat: number;
  glType: number;
  glInternalFormat: number;
  version: number;
}

export class WebGLTextures {
  private _gl: WebGL2RenderingContext;
  private _state: WebGLState;
  private _extensions: WebGLExtensions;
  private _capabilities: WebGLCapabilities;
  
  private _textureProperties = new WeakMap<Texture, TextureProperties>();
  private _renderTargetProperties = new WeakMap<WebGLRenderTarget, any>();
  
  private _videoTextures = new WeakMap<HTMLVideoElement, Texture>();
  
  // 最大纹理尺寸
  private _maxTextureSize: number;
  private _maxCubemapSize: number;
  private _maxTextureUnits: number;
  
  constructor(
    gl: WebGL2RenderingContext,
    extensions: WebGLExtensions,
    state: WebGLState,
    capabilities: WebGLCapabilities
  ) {
    this._gl = gl;
    this._extensions = extensions;
    this._state = state;
    this._capabilities = capabilities;
    
    this._maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    this._maxCubemapSize = gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE);
    this._maxTextureUnits = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
  }
  
  // ==================== 2D 纹理 ====================
  
  setTexture2D(texture: Texture, slot: number): void {
    const gl = this._gl;
    
    // 获取或创建属性
    let textureProperties = this._textureProperties.get(texture);
    
    if (!textureProperties) {
      textureProperties = this._initTexture(texture);
    }
    
    // 激活纹理单元
    this._state.activeTexture(gl.TEXTURE0 + slot);
    
    // 绑定纹理
    this._state.bindTexture(gl.TEXTURE_2D, textureProperties.glTexture);
    
    // 检查是否需要更新
    if (texture.version !== textureProperties.version) {
      this._uploadTexture2D(texture, textureProperties);
    }
  }
  
  private _initTexture(texture: Texture): TextureProperties {
    const gl = this._gl;
    
    const glTexture = gl.createTexture()!;
    
    const properties: TextureProperties = {
      glTexture,
      glInit: false,
      glFormat: 0,
      glType: 0,
      glInternalFormat: 0,
      version: -1,
    };
    
    this._textureProperties.set(texture, properties);
    
    // 监听 dispose
    texture.addEventListener('dispose', () => {
      this._deallocateTexture(texture);
    });
    
    return properties;
  }
  
  private _uploadTexture2D(texture: Texture, properties: TextureProperties): void {
    const gl = this._gl;
    const image = texture.image;
    
    // 验证图像
    if (!this._isImageReady(image)) {
      return;
    }
    
    // 获取格式
    const glFormat = this._getGLFormat(texture.format);
    const glType = this._getGLType(texture.type);
    const glInternalFormat = this._getGLInternalFormat(
      texture.internalFormat,
      glFormat,
      glType
    );
    
    // 设置参数
    this._setTextureParameters(gl.TEXTURE_2D, texture);
    
    // 上传数据
    if (texture.isDataTexture) {
      // DataTexture
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        glInternalFormat,
        image.width,
        image.height,
        0,
        glFormat,
        glType,
        image.data
      );
    } else if (texture.isCompressedTexture) {
      // 压缩纹理
      this._uploadCompressedTexture(texture, properties);
    } else {
      // HTMLImageElement, Canvas, Video
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        glInternalFormat,
        glFormat,
        glType,
        image
      );
    }
    
    // 生成 mipmap
    if (this._shouldGenerateMipmaps(texture)) {
      gl.generateMipmap(gl.TEXTURE_2D);
    }
    
    properties.glFormat = glFormat;
    properties.glType = glType;
    properties.glInternalFormat = glInternalFormat;
    properties.version = texture.version;
  }
  
  // ==================== 纹理参数 ====================
  
  private _setTextureParameters(target: number, texture: Texture): void {
    const gl = this._gl;
    
    // 包装模式
    gl.texParameteri(target, gl.TEXTURE_WRAP_S, this._getWrapping(texture.wrapS));
    gl.texParameteri(target, gl.TEXTURE_WRAP_T, this._getWrapping(texture.wrapT));
    
    // 过滤模式
    gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, this._getFilter(texture.magFilter));
    gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, this._getFilter(texture.minFilter));
    
    // 各向异性过滤
    if (this._extensions.has('EXT_texture_filter_anisotropic')) {
      const extension = this._extensions.get('EXT_texture_filter_anisotropic');
      
      if (texture.anisotropy > 1) {
        gl.texParameterf(
          target,
          extension.TEXTURE_MAX_ANISOTROPY_EXT,
          Math.min(texture.anisotropy, this._capabilities.getMaxAnisotropy())
        );
      }
    }
  }
  
  private _getWrapping(wrap: Wrapping): number {
    const gl = this._gl;
    
    switch (wrap) {
      case RepeatWrapping: return gl.REPEAT;
      case ClampToEdgeWrapping: return gl.CLAMP_TO_EDGE;
      case MirroredRepeatWrapping: return gl.MIRRORED_REPEAT;
      default: return gl.CLAMP_TO_EDGE;
    }
  }
  
  private _getFilter(filter: TextureFilter): number {
    const gl = this._gl;
    
    switch (filter) {
      case NearestFilter: return gl.NEAREST;
      case NearestMipmapNearestFilter: return gl.NEAREST_MIPMAP_NEAREST;
      case NearestMipmapLinearFilter: return gl.NEAREST_MIPMAP_LINEAR;
      case LinearFilter: return gl.LINEAR;
      case LinearMipmapNearestFilter: return gl.LINEAR_MIPMAP_NEAREST;
      case LinearMipmapLinearFilter: return gl.LINEAR_MIPMAP_LINEAR;
      default: return gl.LINEAR;
    }
  }
  
  // ==================== 格式转换 ====================
  
  private _getGLFormat(format: PixelFormat): number {
    const gl = this._gl;
    
    switch (format) {
      case AlphaFormat: return gl.ALPHA;
      case LuminanceFormat: return gl.LUMINANCE;
      case LuminanceAlphaFormat: return gl.LUMINANCE_ALPHA;
      case RGBFormat: return gl.RGB;
      case RGBAFormat: return gl.RGBA;
      case RedFormat: return gl.RED;
      case RGFormat: return gl.RG;
      case RedIntegerFormat: return gl.RED_INTEGER;
      case RGIntegerFormat: return gl.RG_INTEGER;
      case RGBIntegerFormat: return gl.RGB_INTEGER;
      case RGBAIntegerFormat: return gl.RGBA_INTEGER;
      case DepthFormat: return gl.DEPTH_COMPONENT;
      case DepthStencilFormat: return gl.DEPTH_STENCIL;
      default: return gl.RGBA;
    }
  }
  
  private _getGLType(type: TextureDataType): number {
    const gl = this._gl;
    
    switch (type) {
      case UnsignedByteType: return gl.UNSIGNED_BYTE;
      case ByteType: return gl.BYTE;
      case ShortType: return gl.SHORT;
      case UnsignedShortType: return gl.UNSIGNED_SHORT;
      case IntType: return gl.INT;
      case UnsignedIntType: return gl.UNSIGNED_INT;
      case FloatType: return gl.FLOAT;
      case HalfFloatType: return gl.HALF_FLOAT;
      case UnsignedShort4444Type: return gl.UNSIGNED_SHORT_4_4_4_4;
      case UnsignedShort5551Type: return gl.UNSIGNED_SHORT_5_5_5_1;
      case UnsignedInt248Type: return gl.UNSIGNED_INT_24_8;
      default: return gl.UNSIGNED_BYTE;
    }
  }
  
  private _getGLInternalFormat(
    internalFormat: string | null,
    glFormat: number,
    glType: number
  ): number {
    const gl = this._gl;
    
    // 显式指定
    if (internalFormat !== null) {
      return (gl as any)[internalFormat] || gl.RGBA;
    }
    
    // 根据格式和类型推断
    if (glFormat === gl.RGBA) {
      if (glType === gl.FLOAT) return gl.RGBA32F;
      if (glType === gl.HALF_FLOAT) return gl.RGBA16F;
      return gl.RGBA8;
    }
    
    if (glFormat === gl.RGB) {
      if (glType === gl.FLOAT) return gl.RGB32F;
      if (glType === gl.HALF_FLOAT) return gl.RGB16F;
      return gl.RGB8;
    }
    
    if (glFormat === gl.RED) {
      if (glType === gl.FLOAT) return gl.R32F;
      if (glType === gl.HALF_FLOAT) return gl.R16F;
      return gl.R8;
    }
    
    if (glFormat === gl.DEPTH_COMPONENT) {
      if (glType === gl.UNSIGNED_INT) return gl.DEPTH_COMPONENT24;
      if (glType === gl.FLOAT) return gl.DEPTH_COMPONENT32F;
      return gl.DEPTH_COMPONENT16;
    }
    
    if (glFormat === gl.DEPTH_STENCIL) {
      return gl.DEPTH24_STENCIL8;
    }
    
    return glFormat;
  }
  
  // ==================== 立方体纹理 ====================
  
  setTextureCube(texture: CubeTexture, slot: number): void {
    const gl = this._gl;
    
    let textureProperties = this._textureProperties.get(texture);
    
    if (!textureProperties) {
      textureProperties = this._initTexture(texture);
    }
    
    this._state.activeTexture(gl.TEXTURE0 + slot);
    this._state.bindTexture(gl.TEXTURE_CUBE_MAP, textureProperties.glTexture);
    
    if (texture.version !== textureProperties.version) {
      this._uploadTextureCube(texture, textureProperties);
    }
  }
  
  private _uploadTextureCube(texture: CubeTexture, properties: TextureProperties): void {
    const gl = this._gl;
    const images = texture.image;
    
    if (!images || images.length !== 6) {
      return;
    }
    
    const glFormat = this._getGLFormat(texture.format);
    const glType = this._getGLType(texture.type);
    const glInternalFormat = this._getGLInternalFormat(null, glFormat, glType);
    
    // 设置参数
    this._setTextureParameters(gl.TEXTURE_CUBE_MAP, texture);
    
    // 6 个面
    const faces = [
      gl.TEXTURE_CUBE_MAP_POSITIVE_X,
      gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
      gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
      gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
      gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
      gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
    ];
    
    for (let i = 0; i < 6; i++) {
      const image = images[i];
      
      gl.texImage2D(
        faces[i],
        0,
        glInternalFormat,
        glFormat,
        glType,
        image
      );
    }
    
    if (this._shouldGenerateMipmaps(texture)) {
      gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    }
    
    properties.version = texture.version;
  }
  
  // ==================== 3D 纹理 ====================
  
  setTexture3D(texture: Data3DTexture, slot: number): void {
    const gl = this._gl;
    
    let textureProperties = this._textureProperties.get(texture);
    
    if (!textureProperties) {
      textureProperties = this._initTexture(texture);
    }
    
    this._state.activeTexture(gl.TEXTURE0 + slot);
    this._state.bindTexture(gl.TEXTURE_3D, textureProperties.glTexture);
    
    if (texture.version !== textureProperties.version) {
      this._uploadTexture3D(texture, textureProperties);
    }
  }
  
  private _uploadTexture3D(texture: Data3DTexture, properties: TextureProperties): void {
    const gl = this._gl;
    const image = texture.image;
    
    const glFormat = this._getGLFormat(texture.format);
    const glType = this._getGLType(texture.type);
    const glInternalFormat = this._getGLInternalFormat(null, glFormat, glType);
    
    // 设置参数
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, this._getWrapping(texture.wrapS));
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, this._getWrapping(texture.wrapT));
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, this._getWrapping(texture.wrapR));
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, this._getFilter(texture.magFilter));
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, this._getFilter(texture.minFilter));
    
    // 上传数据
    gl.texImage3D(
      gl.TEXTURE_3D,
      0,
      glInternalFormat,
      image.width,
      image.height,
      image.depth,
      0,
      glFormat,
      glType,
      image.data
    );
    
    properties.version = texture.version;
  }
  
  // ==================== 压缩纹理 ====================
  
  private _uploadCompressedTexture(texture: CompressedTexture, properties: TextureProperties): void {
    const gl = this._gl;
    const mipmaps = texture.mipmaps;
    
    if (!mipmaps || mipmaps.length === 0) {
      return;
    }
    
    const glInternalFormat = this._getCompressedFormat(texture.format);
    
    for (let level = 0; level < mipmaps.length; level++) {
      const mipmap = mipmaps[level];
      
      gl.compressedTexImage2D(
        gl.TEXTURE_2D,
        level,
        glInternalFormat,
        mipmap.width,
        mipmap.height,
        0,
        mipmap.data
      );
    }
    
    properties.version = texture.version;
  }
  
  private _getCompressedFormat(format: CompressedPixelFormat): number {
    const gl = this._gl;
    
    // S3TC (DXT)
    if (format === RGBA_S3TC_DXT1_Format) {
      return this._extensions.get('WEBGL_compressed_texture_s3tc')?.COMPRESSED_RGBA_S3TC_DXT1_EXT;
    }
    if (format === RGBA_S3TC_DXT3_Format) {
      return this._extensions.get('WEBGL_compressed_texture_s3tc')?.COMPRESSED_RGBA_S3TC_DXT3_EXT;
    }
    if (format === RGBA_S3TC_DXT5_Format) {
      return this._extensions.get('WEBGL_compressed_texture_s3tc')?.COMPRESSED_RGBA_S3TC_DXT5_EXT;
    }
    
    // ASTC
    if (format === RGBA_ASTC_4x4_Format) {
      return this._extensions.get('WEBGL_compressed_texture_astc')?.COMPRESSED_RGBA_ASTC_4x4_KHR;
    }
    
    // ETC
    if (format === RGB_ETC2_Format) {
      return this._extensions.get('WEBGL_compressed_texture_etc')?.COMPRESSED_RGB8_ETC2;
    }
    
    return 0;
  }
  
  // ==================== 渲染目标 ====================
  
  setupRenderTarget(renderTarget: WebGLRenderTarget): void {
    const gl = this._gl;
    
    let properties = this._renderTargetProperties.get(renderTarget);
    
    if (!properties) {
      properties = {
        framebuffer: gl.createFramebuffer(),
        depthRenderbuffer: null,
        stencilRenderbuffer: null,
        msaaFramebuffer: null,
        msaaRenderbuffers: [],
      };
      
      this._renderTargetProperties.set(renderTarget, properties);
      
      renderTarget.addEventListener('dispose', () => {
        this._deallocateRenderTarget(renderTarget);
      });
    }
    
    // 绑定帧缓冲
    gl.bindFramebuffer(gl.FRAMEBUFFER, properties.framebuffer);
    
    // 颜色附件
    const texture = renderTarget.texture;
    this.setTexture2D(texture, 0);
    
    const textureProperties = this._textureProperties.get(texture)!;
    
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      textureProperties.glTexture,
      0
    );
    
    // 深度/模板附件
    if (renderTarget.depthBuffer) {
      this._setupDepthRenderbuffer(renderTarget, properties);
    }
    
    // 检查完整性
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      console.error('Framebuffer not complete:', status);
    }
  }
  
  private _setupDepthRenderbuffer(renderTarget: WebGLRenderTarget, properties: any): void {
    const gl = this._gl;
    
    if (!properties.depthRenderbuffer) {
      properties.depthRenderbuffer = gl.createRenderbuffer();
    }
    
    gl.bindRenderbuffer(gl.RENDERBUFFER, properties.depthRenderbuffer);
    
    if (renderTarget.stencilBuffer) {
      // 深度 + 模板
      gl.renderbufferStorage(
        gl.RENDERBUFFER,
        gl.DEPTH24_STENCIL8,
        renderTarget.width,
        renderTarget.height
      );
      
      gl.framebufferRenderbuffer(
        gl.FRAMEBUFFER,
        gl.DEPTH_STENCIL_ATTACHMENT,
        gl.RENDERBUFFER,
        properties.depthRenderbuffer
      );
    } else {
      // 仅深度
      gl.renderbufferStorage(
        gl.RENDERBUFFER,
        gl.DEPTH_COMPONENT24,
        renderTarget.width,
        renderTarget.height
      );
      
      gl.framebufferRenderbuffer(
        gl.FRAMEBUFFER,
        gl.DEPTH_ATTACHMENT,
        gl.RENDERBUFFER,
        properties.depthRenderbuffer
      );
    }
  }
  
  // ==================== 清理 ====================
  
  private _deallocateTexture(texture: Texture): void {
    const properties = this._textureProperties.get(texture);
    
    if (properties) {
      this._gl.deleteTexture(properties.glTexture);
      this._textureProperties.delete(texture);
    }
  }
  
  private _deallocateRenderTarget(renderTarget: WebGLRenderTarget): void {
    const gl = this._gl;
    const properties = this._renderTargetProperties.get(renderTarget);
    
    if (properties) {
      gl.deleteFramebuffer(properties.framebuffer);
      
      if (properties.depthRenderbuffer) {
        gl.deleteRenderbuffer(properties.depthRenderbuffer);
      }
      
      this._renderTargetProperties.delete(renderTarget);
    }
    
    // 清理纹理
    this._deallocateTexture(renderTarget.texture);
  }
  
  dispose(): void {
    // 清理所有纹理和渲染目标
  }
  
  // ==================== 辅助函数 ====================
  
  private _isImageReady(image: any): boolean {
    if (!image) return false;
    
    // HTMLImageElement
    if (image instanceof HTMLImageElement) {
      return image.complete && image.naturalWidth > 0;
    }
    
    // HTMLVideoElement
    if (image instanceof HTMLVideoElement) {
      return image.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
    }
    
    // Canvas, ImageBitmap
    if (image instanceof HTMLCanvasElement || image instanceof ImageBitmap) {
      return image.width > 0 && image.height > 0;
    }
    
    // DataTexture
    if (image.data) {
      return image.width > 0 && image.height > 0;
    }
    
    return false;
  }
  
  private _shouldGenerateMipmaps(texture: Texture): boolean {
    return (
      texture.generateMipmaps &&
      this._isPowerOfTwo(texture.image) &&
      texture.minFilter !== NearestFilter &&
      texture.minFilter !== LinearFilter
    );
  }
  
  private _isPowerOfTwo(image: any): boolean {
    if (!image) return false;
    
    const width = image.width || image.videoWidth;
    const height = image.height || image.videoHeight;
    
    return (width & (width - 1)) === 0 && (height & (height - 1)) === 0;
  }
}
```

## 使用示例

```typescript
const textures = new WebGLTextures(gl, extensions, state, capabilities);

// 2D 纹理
const texture = new Texture(image);
textures.setTexture2D(texture, 0);

// 立方体纹理
const cubeTexture = new CubeTexture([px, nx, py, ny, pz, nz]);
textures.setTextureCube(cubeTexture, 1);

// 数据纹理
const dataTexture = new DataTexture(data, 256, 256);
textures.setTexture2D(dataTexture, 2);

// 渲染目标
const renderTarget = new WebGLRenderTarget(512, 512);
textures.setupRenderTarget(renderTarget);
```

## 本章小结

- WebGLTextures 管理所有纹理资源
- 支持 2D、立方体、3D 纹理
- 自动处理格式转换
- 支持压缩纹理
- 管理渲染目标帧缓冲
- 自动生成 mipmap

下一章，我们将学习 WebGLUniforms 统一变量。
