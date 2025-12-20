# 绂诲睆 Canvas 涓庣紦瀛樹紭鍖?

棣栧厛瑕侀棶涓€涓棶棰橈細濡傛灉涓€涓鏉傚浘褰紙澶ч噺璺緞銆侀槾褰便€佹护闀滐級闇€瑕佹瘡甯ч噸缁橈紝浣嗗畠鏈韩寰堝皯鍙樺寲锛屾湁浠€涔堝姙娉曞姞閫燂紵

绛旀鏄細**绂诲睆 Canvas 缂撳瓨**銆傚氨鍍忛鍘呮彁鍓嶅仛濂藉崐鎴愬搧锛岀敤椁愭椂鍙渶鍔犵儹涓婅彍锛岃€屼笉鏄粠澶村紑濮嬪仛姣忛亾鑿溿€?

---

## 1. 绂诲睆 Canvas 姒傚康

### 浠€涔堟槸绂诲睆 Canvas锛?

**绂诲睆 Canvas** 鏄笉鏄剧ず鍦ㄩ〉闈笂鐨?Canvas 鍏冪礌锛岀敤浣滀复鏃剁粯鍒剁紦鍐插尯銆?

```javascript
// 鍒涘缓绂诲睆 Canvas
const offscreen = document.createElement('canvas');
offscreen.width = 200;
offscreen.height = 200;
const offCtx = offscreen.getContext('2d');

// 鍦ㄧ灞?Canvas 涓婄粯鍒?
offCtx.fillStyle = 'red';
offCtx.fillRect(0, 0, 200, 200);

// 灏嗙灞?Canvas 缁樺埗鍒颁富 Canvas
mainCtx.drawImage(offscreen, 100, 100);
```

鐜板湪鎴戣闂浜屼釜闂锛氳繖鏈変粈涔堢敤锛?

绛旀鏄細**澶嶇敤**銆傚鏉傜殑缁樺埗鎿嶄綔鍋氫竴娆★紝瀛樺湪绂诲睆 Canvas 涓紝涔嬪悗姣忔鍙渶瑕佸揩閫熺殑 `drawImage` 鎿嶄綔銆?

---

## 2. 涓轰粈涔堜娇鐢ㄧ灞?Canvas

### 鎬ц兘瀵规瘮

**鏈紦瀛?*锛氭瘡甯ч噸缁?

```javascript
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 澶嶆潅鐨勭粯鍒讹紙姣忓抚閮芥墽琛岋級
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetX = 5;
  ctx.shadowOffsetY = 5;
  
  for (let i = 0; i < 100; i++) {
    ctx.fillStyle = `hsl(${i * 3.6}, 70%, 50%)`;
    ctx.beginPath();
    ctx.arc(x + i, y + i, 50 - i * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}
```

**宸茬紦瀛?*锛氶娓叉煋鍒扮灞?Canvas

```javascript
// 鍙墽琛屼竴娆?
const complexShape = createComplexShape();

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 蹇€熺粯鍒剁紦瀛樼殑鍥惧儚
  ctx.drawImage(complexShape, x, y);
}

function createComplexShape() {
  const offscreen = document.createElement('canvas');
  offscreen.width = 200;
  offscreen.height = 200;
  const ctx = offscreen.getContext('2d');
  
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetX = 5;
  ctx.shadowOffsetY = 5;
  
  for (let i = 0; i < 100; i++) {
    ctx.fillStyle = `hsl(${i * 3.6}, 70%, 50%)`;
    ctx.beginPath();
    ctx.arc(100 + i, 100 + i, 50 - i * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  
  return offscreen;
}
```

鎬ц兘鎻愬崌锛?*10-100 鍊?*锛堝彇鍐充簬鍥惧舰澶嶆潅搴︼級銆?

---

## 3. 瀹炵幇棰勬覆鏌?

### 閫氱敤棰勬覆鏌撳嚱鏁?

```javascript
function prerenderShape(width, height, drawFn) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  drawFn(ctx);
  
  return canvas;
}

// 浣跨敤绀轰緥
const gradientCircle = prerenderShape(100, 100, (ctx) => {
  const gradient = ctx.createRadialGradient(50, 50, 0, 50, 50, 50);
  gradient.addColorStop(0, 'yellow');
  gradient.addColorStop(1, 'red');
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(50, 50, 50, 0, Math.PI * 2);
  ctx.fill();
});

// 浣跨敤
ctx.drawImage(gradientCircle, x, y);
```

### 楂?DPI 灞忓箷鏀寔

```javascript
function prerenderShapeHiDPI(width, height, drawFn) {
  const dpr = window.devicePixelRatio || 1;
  
  const canvas = document.createElement('canvas');
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  
  drawFn(ctx);
  
  return canvas;
}
```

---

## 4. 甯︾紦瀛樼殑鍥惧舰瀵硅薄

### 缂撳瓨澶辨晥鏈哄埗

绗笁涓棶棰橈細濡傛灉瀵硅薄灞炴€у彉鍖栦簡锛堝棰滆壊銆佸ぇ灏忥級锛岀紦瀛樻€庝箞鍔烇紵

绛旀鏄細**鑴忔爣璁?(Dirty Flag)**銆?

```javascript
class CachedShape {
  constructor(x, y, width, height, color) {
    this.x = x;
    this.y = y;
    this._width = width;
    this._height = height;
    this._color = color;
    
    this._cache = null;
    this._cacheDirty = true;  // 鍒濆鏍囪涓鸿剰
  }
  
  get width() {
    return this._width;
  }
  
  set width(value) {
    if (this._width !== value) {
      this._width = value;
      this._cacheDirty = true;  // 鏍囪缂撳瓨澶辨晥
    }
  }
  
  get height() {
    return this._height;
  }
  
  set height(value) {
    if (this._height !== value) {
      this._height = value;
      this._cacheDirty = true;
    }
  }
  
  get color() {
    return this._color;
  }
  
  set color(value) {
    if (this._color !== value) {
      this._color = value;
      this._cacheDirty = true;
    }
  }
  
  invalidateCache() {
    this._cacheDirty = true;
  }
  
  updateCache() {
    if (!this._cacheDirty) return;  // 缂撳瓨鏈夋晥锛屾棤闇€鏇存柊
    
    // 鍒涘缓鎴栬皟鏁寸紦瀛?Canvas 澶у皬
    if (!this._cache || 
        this._cache.width !== this._width ||
        this._cache.height !== this._height) {
      this._cache = document.createElement('canvas');
      this._cache.width = this._width;
      this._cache.height = this._height;
    }
    
    const ctx = this._cache.getContext('2d');
    ctx.clearRect(0, 0, this._width, this._height);
    
    // 缁樺埗鍒扮紦瀛?
    this.renderToCache(ctx);
    
    this._cacheDirty = false;
  }
  
  renderToCache(ctx) {
    // 瀛愮被瀹炵幇鍏蜂綋缁樺埗
    ctx.fillStyle = this._color;
    ctx.fillRect(0, 0, this._width, this._height);
  }
  
  draw(mainCtx) {
    this.updateCache();  // 鎸夐渶鏇存柊缂撳瓨
    mainCtx.drawImage(this._cache, this.x, this.y);
  }
}

// 浣跨敤
const shape = new CachedShape(100, 100, 200, 150, 'blue');

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  shape.draw(ctx);
}

// 鏀瑰彉灞炴€ф椂锛岀紦瀛樿嚜鍔ㄥけ鏁堝苟閲嶅缓
shape.color = 'red';   // 涓嬫 draw() 鏃朵細閲嶆柊娓叉煋缂撳瓨
shape.width = 250;     // 鍚屼笂
```

---

## 5. 澶嶆潅鍥惧舰缂撳瓨

### 娓愬彉鍦嗙幆

```javascript
class CachedGradientRing extends CachedShape {
  constructor(x, y, radius, thickness, startColor, endColor) {
    super(x, y, radius * 2, radius * 2);
    this.radius = radius;
    this.thickness = thickness;
    this.startColor = startColor;
    this.endColor = endColor;
  }
  
  renderToCache(ctx) {
    const centerX = this.radius;
    const centerY = this.radius;
    
    // 鍒涘缓娓愬彉
    const gradient = ctx.createRadialGradient(
      centerX, centerY, this.radius - this.thickness,
      centerX, centerY, this.radius
    );
    gradient.addColorStop(0, this.startColor);
    gradient.addColorStop(1, this.endColor);
    
    // 缁樺埗鍦嗙幆
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, this.radius, 0, Math.PI * 2);
    ctx.arc(centerX, centerY, this.radius - this.thickness, 0, Math.PI * 2, true);
    ctx.fill();
  }
}
```

### 闃村奖鏂囧瓧

```javascript
class CachedShadowText extends CachedShape {
  constructor(x, y, text, fontSize, color) {
    super(x, y, 200, 100);  // 棰勪及澶у皬
    this.text = text;
    this.fontSize = fontSize;
    this._color = color;
  }
  
  renderToCache(ctx) {
    ctx.font = `${this.fontSize}px Arial`;
    
    // 娴嬮噺鏂囨湰瀹藉害
    const metrics = ctx.measureText(this.text);
    this._width = metrics.width + 20;
    this._height = this.fontSize + 20;
    
    // 璋冩暣 Canvas 澶у皬
    if (this._cache.width !== this._width || this._cache.height !== this._height) {
      this._cache.width = this._width;
      this._cache.height = this._height;
      ctx.font = `${this.fontSize}px Arial`;  // 閲嶆柊璁剧疆瀛椾綋
    }
    
    // 缁樺埗闃村奖
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    
    ctx.fillStyle = this._color;
    ctx.textBaseline = 'top';
    ctx.fillText(this.text, 10, 10);
  }
}
```

---

## 6. OffscreenCanvas API

---

## 本章小结

本章介绍了离屏 Canvas 的基础概念：

**核心概念**：
- 离屏 Canvas 作为缓存缓冲区
- 复杂图形预渲染，多次复用
- 10-100倍性能提升

**实现方式**：
- 通用预渲染函数
- 带缓存失效的图形对象
- 脏标记机制

**应用场景**：
- 复杂图形缓存
- 渐变和阴影效果
- 重复使用的图形元素

在下一章，我们将学习 OffscreenCanvas API 和高级缓存管理策略。