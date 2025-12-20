# OffscreenCanvas API 与高级缓存管理


### 鍩烘湰鐢ㄦ硶

`OffscreenCanvas` 鏄彲浠ュ湪 Web Worker 涓娇鐢ㄧ殑 Canvas API銆?

```javascript
// 妫€娴嬫敮鎸?
if (typeof OffscreenCanvas !== 'undefined') {
  const offscreen = new OffscreenCanvas(256, 256);
  const ctx = offscreen.getContext('2d');
  
  // 缁樺埗
  ctx.fillStyle = 'green';
  ctx.fillRect(0, 0, 256, 256);
  
  // 杞负 Blob 鎴?ImageBitmap
  const blob = await offscreen.convertToBlob();
  const bitmap = await offscreen.transferToImageBitmap();
}
```

### 鍦?Web Worker 涓娇鐢?

**涓荤嚎绋?(main.js)**锛?

```javascript
const canvas = document.getElementById('canvas');

// 灏?Canvas 鎺у埗鏉冭浆绉荤粰 Worker
const offscreen = canvas.transferControlToOffscreen();

const worker = new Worker('render-worker.js');
worker.postMessage({ canvas: offscreen }, [offscreen]);

// 鍙戦€佸懡浠?
worker.postMessage({ command: 'render', data: { x: 100, y: 100 } });
```

**Worker 绾跨▼ (render-worker.js)**锛?

```javascript
let ctx;

self.onmessage = (e) => {
  if (e.data.canvas) {
    // 鎺ユ敹 Canvas
    ctx = e.data.canvas.getContext('2d');
    startRender();
  } else if (e.data.command === 'render') {
    render(e.data.data);
  }
};

function startRender() {
  function loop() {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // 澶嶆潅鐨勭粯鍒舵搷浣滐紙涓嶉樆濉炰富绾跨▼锛?
    for (let i = 0; i < 1000; i++) {
      ctx.fillStyle = `hsl(${i * 0.36}, 70%, 50%)`;
      ctx.fillRect(Math.random() * 800, Math.random() * 600, 5, 5);
    }
    
    requestAnimationFrame(loop);
  }
  loop();
}

function render(data) {
  ctx.fillStyle = 'red';
  ctx.fillRect(data.x, data.y, 50, 50);
}
```

鏈夋病鏈夊緢寮哄ぇ锛熸覆鏌撴搷浣滃湪 Worker 涓墽琛岋紝涓荤嚎绋嬪畬鍏ㄤ笉鍙楀奖鍝嶏紒

---

## 7. 缂撳瓨绠＄悊

### 缂撳瓨绠＄悊鍣?

褰撳璞℃暟閲忓緢澶氭椂锛岄渶瑕侀檺鍒剁紦瀛樻€诲ぇ灏忋€?

```javascript
class CacheManager {
  constructor(maxSize = 50 * 1024 * 1024) {  // 50MB
    this.cache = new Map();
    this.currentSize = 0;
    this.maxSize = maxSize;
    this.accessOrder = [];  // LRU 闃熷垪
  }
  
  getCacheSize(canvas) {
    // RGBA 姣忓儚绱?4 瀛楄妭
    return canvas.width * canvas.height * 4;
  }
  
  set(key, canvas) {
    const size = this.getCacheSize(canvas);
    
    // 绉婚櫎鏃х殑缂撳瓨浠ヨ吘鍑虹┖闂?
    while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
      this.evictLRU();
    }
    
    // 濡傛灉宸插瓨鍦紝鍏堢Щ闄?
    if (this.cache.has(key)) {
      this.remove(key);
    }
    
    this.cache.set(key, { canvas, size, timestamp: Date.now() });
    this.currentSize += size;
    this.accessOrder.push(key);
  }
  
  get(key) {
    const entry = this.cache.get(key);
    
    if (entry) {
      // 鏇存柊璁块棶鏃堕棿锛圠RU锛?
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
        this.accessOrder.push(key);
      }
      
      return entry.canvas;
    }
    
    return null;
  }
  
  remove(key) {
    const entry = this.cache.get(key);
    
    if (entry) {
      this.currentSize -= entry.size;
      this.cache.delete(key);
      
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
    }
  }
  
  evictLRU() {
    // 绉婚櫎鏈€杩戞渶灏戜娇鐢ㄧ殑缂撳瓨
    if (this.accessOrder.length > 0) {
      const oldestKey = this.accessOrder[0];
      this.remove(oldestKey);
    }
  }
  
  clear() {
    this.cache.clear();
    this.accessOrder = [];
    this.currentSize = 0;
  }
  
  getStats() {
    return {
      count: this.cache.size,
      size: this.currentSize,
      maxSize: this.maxSize,
      usage: (this.currentSize / this.maxSize * 100).toFixed(2) + '%'
    };
  }
}

// 浣跨敤
const cacheManager = new CacheManager(20 * 1024 * 1024);  // 20MB

// 缂撳瓨鍥惧舰
function getCachedShape(id, width, height, drawFn) {
  let cached = cacheManager.get(id);
  
  if (!cached) {
    cached = prerenderShape(width, height, drawFn);
    cacheManager.set(id, cached);
  }
  
  return cached;
}

// 浣跨敤
const shape1 = getCachedShape('gradient-circle', 100, 100, (ctx) => {
  // 缁樺埗...
});

ctx.drawImage(shape1, x, y);

// 鏌ョ湅缂撳瓨缁熻
console.log(cacheManager.getStats());
// { count: 1, size: 40000, maxSize: 20971520, usage: "0.19%" }
```

---

## 鎬ц兘鏉冭　锛氱灞廋anvas鐨勭紦瀛樺喅绛?

绂诲睆Canvas缂撳瓨鐪嬩技绠€鍗曗€斺€旈娓叉煋涓€娆★紝澶氭澶嶇敤鈥斺€斾絾骞堕潪鎵€鏈夊満鏅兘鑳借幏鐩娿€傝鎴戜滑閫氳繃鍩哄噯娴嬭瘯寤虹珛娓呮櫚鐨勫喅绛栨鏋躲€?

### 鍩哄噯娴嬭瘯1锛氱畝鍗曞浘褰?vs 澶嶆潅鍥惧舰

```javascript
/**
 * 娴嬭瘯锛氫笉鍚屽鏉傚害鍥惧舰鐨勭紦瀛樻敹鐩?
 */
function benchmarkCacheByComplexity() {
  const frames = 1000;
  
  // 鍦烘櫙1锛氱畝鍗曠煩褰紙鏈紦瀛橈級
  console.time('Simple Shape - No Cache');
  for (let i = 0; i < frames; i++) {
    ctx.clearRect(0, 0, 800, 600);
    ctx.fillStyle = '#3498db';
    ctx.fillRect(100, 100, 200, 150);
  }
  console.timeEnd('Simple Shape - No Cache');
  // 缁撴灉锛氱害 25ms
  
  // 鍦烘櫙2锛氱畝鍗曠煩褰紙宸茬紦瀛橈級
  const simpleCache = document.createElement('canvas');
  simpleCache.width = 200;
  simpleCache.height = 150;
  const simpleCtx = simpleCache.getContext('2d');
  simpleCtx.fillStyle = '#3498db';
  simpleCtx.fillRect(0, 0, 200, 150);
  
  console.time('Simple Shape - Cached');
  for (let i = 0; i < frames; i++) {
    ctx.clearRect(0, 0, 800, 600);
    ctx.drawImage(simpleCache, 100, 100);
  }
  console.timeEnd('Simple Shape - Cached');
  // 缁撴灉锛氱害 22ms
  
  console.log('绠€鍗曞浘褰㈢紦瀛樻敹鐩?', ((25-22)/25*100).toFixed(1) + '%');
  // 缁撴灉锛氱害 12%锛屾敹鐩婂緢灏?
  
  // 鍦烘櫙3锛氬鏉傚浘褰紙鏈紦瀛橈級
  console.time('Complex Shape - No Cache');
  for (let i = 0; i < frames; i++) {
    ctx.clearRect(0, 0, 800, 600);
    
    // 澶嶆潅缁樺埗锛氭笎鍙?+ 闃村奖 + 澶氫釜璺緞
    const gradient = ctx.createRadialGradient(200, 175, 0, 200, 175, 100);
    gradient.addColorStop(0, '#3498db');
    gradient.addColorStop(1, '#2c3e50');
    ctx.fillStyle = gradient;
    
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;
    
    for (let j = 0; j < 50; j++) {
      ctx.beginPath();
      ctx.arc(200 + Math.cos(j * 0.126) * 80, 
              175 + Math.sin(j * 0.126) * 80, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.shadowColor = 'transparent';
  }
  console.timeEnd('Complex Shape - No Cache');
  // 缁撴灉锛氱害 850ms
  
  // 鍦烘櫙4锛氬鏉傚浘褰紙宸茬紦瀛橈級
  const complexCache = document.createElement('canvas');
  complexCache.width = 400;
  complexCache.height = 350;
  const complexCtx = complexCache.getContext('2d');
  
  const gradient = complexCtx.createRadialGradient(200, 175, 0, 200, 175, 100);
  gradient.addColorStop(0, '#3498db');
  gradient.addColorStop(1, '#2c3e50');
  complexCtx.fillStyle = gradient;
  
  complexCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  complexCtx.shadowBlur = 20;
  complexCtx.shadowOffsetX = 5;
  complexCtx.shadowOffsetY = 5;
  
  for (let j = 0; j < 50; j++) {
    complexCtx.beginPath();
    complexCtx.arc(200 + Math.cos(j * 0.126) * 80, 
                    175 + Math.sin(j * 0.126) * 80, 10, 0, Math.PI * 2);
    complexCtx.fill();
  }
  
  console.time('Complex Shape - Cached');
  for (let i = 0; i < frames; i++) {
    ctx.clearRect(0, 0, 800, 600);
    ctx.drawImage(complexCache, 0, 0);
  }
  console.timeEnd('Complex Shape - Cached');
  // 缁撴灉锛氱害 28ms
  
  console.log('澶嶆潅鍥惧舰缂撳瓨鏀剁泭:', ((850-28)/850*100).toFixed(1) + '%');
  // 缁撴灉锛氱害 96.7%锛屾敹鐩婂法澶?
}
```

**娴嬭瘯缁撴灉**锛?000甯э級锛?

| 鍥惧舰澶嶆潅搴?| 鏈紦瀛?| 宸茬紦瀛?| 鏀剁泭 | 鍔犻€熷€嶆暟 |
|-----------|-------|--------|------|---------|
| 绠€鍗曠煩褰?| 25ms | 22ms | 12% | 1.1x |
| 涓瓑澶嶆潅锛?0璺緞锛?| 180ms | 26ms | 85.6% | 6.9x 猸?|
| 楂樺害澶嶆潅锛?0璺緞+娓愬彉+闃村奖锛墊 850ms | 28ms | **96.7%** | **30.4x** 猸愨瓙猸?|

**鍏抽敭娲炲療**锛?
- **绠€鍗曞浘褰?*锛氱紦瀛樺嚑涔庢病鐢紙< 20% 鏀剁泭锛?
- **涓瓑澶嶆潅**锛氱紦瀛樻湁鏄庢樉鏀剁泭锛?-10鍊嶆彁鍗囷級
- **楂樺害澶嶆潅**锛氱紦瀛樻敹鐩婂法澶э紙20-30鍊嶆彁鍗囷級
- **drawImage鎬ц兘**锛氬熀鏈亽瀹氾紙绾?.025ms/娆★級锛屼笌婧愬浘澶嶆潅搴︽棤鍏?

---

### 鍩哄噯娴嬭瘯2锛氱紦瀛樼殑鍐呭瓨鎴愭湰

```javascript
/**
 * 娴嬭瘯锛氱灞廋anvas鐨勫唴瀛樺崰鐢?
 */
function benchmarkCacheMemory() {
  // 璁＄畻鍗曚釜缂撳瓨鐨勫唴瀛?
  function calcMemory(width, height) {
    return width * height * 4;  // RGBA 4瀛楄妭/鍍忕礌
  }
  
  const scenarios = [
    { size: '灏?100x100)', width: 100, height: 100 },
    { size: '涓?400x400)', width: 400, height: 400 },
    { size: '澶?1000x1000)', width: 1000, height: 1000 },
    { size: '鍏ㄥ睆(1920x1080)', width: 1920, height: 1080 }
  ];
  
  scenarios.forEach(s => {
    const memory = calcMemory(s.width, s.height);
    const mb = (memory / 1024 / 1024).toFixed(2);
    console.log(`${s.size}: ${mb} MB`);
  });
  
  // 缁撴灉锛?
  // 灏?100x100): 0.04 MB
  // 涓?400x400): 0.61 MB
  // 澶?1000x1000): 3.81 MB
  // 鍏ㄥ睆(1920x1080): 8.29 MB
  
  // 澶氫釜缂撳瓨鐨勬€诲唴瀛?
  const cacheCount = 100;
  const avgSize = { width: 200, height: 200 };
  const totalMemory = calcMemory(avgSize.width, avgSize.height) * cacheCount;
  console.log(`\n100涓?00x200缂撳瓨: ${(totalMemory / 1024 / 1024).toFixed(2)} MB`);
  // 缁撴灉锛氱害 15.26 MB
}
```

**鍐呭瓨鍗犵敤鍒嗘瀽**锛?

| 缂撳瓨灏哄 | 鍗曚釜鍐呭瓨 | 100涓€昏 |
|---------|---------|----------|
| 100脳100 | 0.04 MB | 3.8 MB |
| 200脳200 | 0.15 MB | 15.3 MB |
| 400脳400 | 0.61 MB | 61.0 MB 鈿狅笍 |
| 1000脳1000 | 3.81 MB | 381 MB 鉂?|

**鍏抽敭娲炲療**锛?
- **灏忕紦瀛?*锛?200px锛夛細鍐呭瓨鍙拷鐣ワ紙< 0.2 MB锛?
- **涓瓑缂撳瓨**锛?00-500px锛夛細闇€瑕佹帶鍒舵暟閲忥紙姣忎釜绾?.6 MB锛?
- **澶х紦瀛?*锛?1000px锛夛細鎱庣敤锛堟瘡涓害4 MB锛?
- **涓寸晫鐐?*锛?00涓?00脳400缂撳瓨 = 61 MB锛岀Щ鍔ㄨ澶囧帇鍔涘ぇ

---

### 鍩哄噯娴嬭瘯3锛氱紦瀛樻洿鏂扮殑鎬ц兘寮€閿€

```javascript
/**
 * 娴嬭瘯锛氬姩鎬佸睘鎬у彉鍖栨椂鐨勭紦瀛樻洿鏂版垚鏈?
 */
function benchmarkCacheUpdate() {
  const frames = 1000;
  
  // 鍦烘櫙1锛氭瘡甯ч兘鍙樺寲锛堢紦瀛樻棤鎰忎箟锛?
  console.time('Change Every Frame - Cached');
  const cache1 = document.createElement('canvas');
  cache1.width = 200;
  cache1.height = 200;
  const cacheCtx1 = cache1.getContext('2d');
  
  for (let i = 0; i < frames; i++) {
    // 姣忓抚閲嶅缓缂撳瓨
    cacheCtx1.clearRect(0, 0, 200, 200);
    cacheCtx1.fillStyle = `hsl(${i % 360}, 70%, 50%)`;  // 棰滆壊姣忓抚鍙樺寲
    cacheCtx1.fillRect(0, 0, 200, 200);
    
    // 浣跨敤缂撳瓨
    ctx.drawImage(cache1, 100, 100);
  }
  console.timeEnd('Change Every Frame - Cached');
  // 缁撴灉锛氱害 35ms
  
  // 鍦烘櫙2锛氭瘡甯ч兘鍙樺寲锛堜笉缂撳瓨锛?
  console.time('Change Every Frame - No Cache');
  for (let i = 0; i < frames; i++) {
    ctx.fillStyle = `hsl(${i % 360}, 70%, 50%)`;
    ctx.fillRect(100, 100, 200, 200);
  }
  console.timeEnd('Change Every Frame - No Cache');
  // 缁撴灉锛氱害 28ms
  
  console.log('棰戠箒鍙樺寲鏃剁紦瀛樺弽鑰屾參:', ((35-28)/28*100).toFixed(1) + '%');
  // 缁撴灉锛氭參绾?25%
  
  // 鍦烘櫙3锛氭瘡10甯у彉鍖栦竴娆★紙缂撳瓨鏈夋剰涔夛級
  console.time('Change Every 10 Frames - Cached');
  const cache3 = document.createElement('canvas');
  cache3.width = 200;
  cache3.height = 200;
  const cacheCtx3 = cache3.getContext('2d');
  
  for (let i = 0; i < frames; i++) {
    // 姣?0甯ч噸寤轰竴娆＄紦瀛?
    if (i % 10 === 0) {
      cacheCtx3.clearRect(0, 0, 200, 200);
      cacheCtx3.fillStyle = `hsl(${Math.floor(i/10) * 36}, 70%, 50%)`;
      cacheCtx3.fillRect(0, 0, 200, 200);
    }
    
    ctx.drawImage(cache3, 100, 100);
  }
  console.timeEnd('Change Every 10 Frames - Cached');
  // 缁撴灉锛氱害 26ms
  
  console.log('浣庨鍙樺寲鏃剁紦瀛樻湁浼樺娍:', ((28-26)/28*100).toFixed(1) + '%');
  // 缁撴灉锛氬揩绾?7%
}
```

**娴嬭瘯缁撴灉**锛?000甯э紝绠€鍗曠煩褰級锛?

| 鍙樺寲棰戠巼 | 鏈紦瀛?| 宸茬紦瀛?| 缁撹 |
|---------|-------|--------|------|
| 姣忓抚鍙樺寲 | 28ms | 35ms | 缂撳瓨**鏇存參** 25% 鉂?|
| 姣?甯у彉鍖?| 28ms | 27ms | 缂撳瓨鎸佸钩 |
| 姣?0甯у彉鍖?| 28ms | 26ms | 缂撳瓨蹇?7% 鉁?|
| 浠庝笉鍙樺寲 | 28ms | 22ms | 缂撳瓨蹇?21% 鉁?|

**鍏抽敭娲炲療**锛?
- **楂橀鍙樺寲**锛堟瘡甯э級锛氱紦瀛樺弽鑰屾嫋绱€ц兘
- **涓鍙樺寲**锛堟瘡5-10甯э級锛氱紦瀛樻敹鐩婁笉鏄庢樉锛? 10%锛?
- **浣庨鍙樺寲**锛堟瘡10+甯э級锛氱紦瀛樺紑濮嬫湁鏀剁泭
- **闈欐€?*锛堜粠涓嶅彉鍖栵級锛氱紦瀛樻敹鐩婃渶澶?

**鍐崇瓥闃堝€?*锛?
```javascript
// 缁忛獙鍏紡
const updateInterval = 10;  // 甯?
const shouldCache = updateInterval >= 10;  // 鑷冲皯10甯т笉鍙樻墠鍊煎緱缂撳瓨
```

---

### 鍐崇瓥妗嗘灦锛氫綍鏃朵娇鐢ㄧ灞廋anvas缂撳瓨锛?

#### 鍦烘櫙1锛氱摲鐮栧湴鍥撅紙Tiled Map锛?

**鐗瑰緛**锛?
- 澶嶆潅鐡风爾锛堝灞傚彔鍔犮€佸厜鏁堬級
- 鐡风爾閲嶅浣跨敤锛堝64脳64鍦板浘锛屽彧鏈?0绉嶇摲鐮栵級
- 鐡风爾闈欐€佷笉鍙?

**鍐崇瓥**锛氣渽 **寮虹儓鎺ㄨ崘缂撳瓨**

**瀹炵幇**锛?
```javascript
class TileCache {
  constructor() {
    this.cache = new Map();
  }
  
  getTile(tileId) {
    if (!this.cache.has(tileId)) {
      // 棣栨娓叉煋鍒扮灞廋anvas
      const canvas = this.renderTile(tileId);
      this.cache.set(tileId, canvas);
    }
    return this.cache.get(tileId);
  }
  
  renderTile(tileId) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    // 澶嶆潅缁樺埗...
    this.drawComplexTile(ctx, tileId);
    
    return canvas;
  }
}

// 浣跨敤
const tileCache = new TileCache();

function renderMap(map) {
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const tileId = map.tiles[y][x];
      const cached = tileCache.getTile(tileId);  // 澶嶇敤缂撳瓨
      ctx.drawImage(cached, x * 64, y * 64);
    }
  }
}
```

**棰勬湡鏀剁泭**锛?
- 鎬ц兘鎻愬崌锛?*10-50鍊?*锛堢摲鐮栬秺澶嶆潅锛屾彁鍗囪秺澶э級
- 鍐呭瓨鍗犵敤锛?0绉嶇摲鐮?脳 0.02 MB = **0.2 MB**锛堝彲蹇界暐锛?
- 閫傜敤鎬э細鉁?瀹岀編鍖归厤

---

#### 鍦烘櫙2锛氱敤鎴峰ご鍍?鍥炬爣

**鐗瑰緛**锛?
- 灏哄灏忥紙50-100px锛?
- 鏁伴噺澶氾紙鏁板崄鍒版暟鐧句釜锛?
- 闇€瑕佸鐞嗭紙鍦嗗舰瑁佸壀銆佽竟妗嗐€侀槾褰憋級

**鍐崇瓥**锛氣渽 **鎺ㄨ崘缂撳瓨**

**瀹炵幇**锛?
```javascript
class AvatarCache {
  constructor(maxSize = 100) {
    this.cache = new LRUCache(maxSize);  // 浣跨敤LRU閬垮厤鍐呭瓨婧㈠嚭
  }
  
  getProcessedAvatar(imageUrl) {
    let cached = this.cache.get(imageUrl);
    
    if (!cached) {
      cached = this.processAvatar(imageUrl);
      this.cache.set(imageUrl, cached);
    }
    
    return cached;
  }
  
  processAvatar(imageUrl) {
    const size = 80;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // 鍦嗗舰瑁佸壀
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    
    // 缁樺埗鍥惧儚
    ctx.drawImage(image, 0, 0, size, size);
    
    // 杈规
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    return canvas;
  }
}
```

**棰勬湡鏀剁泭**锛?
- 鎬ц兘鎻愬崌锛?*5-10鍊?*锛堥伩鍏嶉噸澶嶈鍓拰缁樺埗锛?
- 鍐呭瓨鍗犵敤锛?00涓?脳 0.02 MB = **2 MB**
- 閫傜敤鎬э細鉁?寰堝ソ

---

#### 鍦烘櫙3锛氱矑瀛愮郴缁?

**鐗瑰緛**锛?
- 鏁扮櫨鍒版暟鍗冧釜绮掑瓙
- 姣忎釜绮掑瓙姣忓抚绉诲姩
- 绮掑瓙灏哄灏忥紙2-10px锛?

**鍐崇瓥**锛氣潓 **涓嶆帹鑽愮紦瀛?*

**鐞嗙敱**锛?
- **绮掑瓙绠€鍗?*锛氬崟涓矑瀛愮粯鍒舵垚鏈瀬浣庯紙fillRect鎴朼rc锛?
- **鏁伴噺澶**锛氱紦瀛樻暟鐧句釜Canvas鍐呭瓨寮€閿€澶?
- **楂橀鍙樺寲**锛氭瘡甯ч兘绉诲姩锛岀紦瀛樻棤鎰忎箟

**鏇夸唬鏂规**锛?
- 鐩存帴缁樺埗锛堟渶绠€鍗曢珮鏁堬級
- 绮剧伒鍥撅紙sprite sheet锛?
- OffscreenCanvas + Worker锛堝绾跨▼锛?

```javascript
// 绮掑瓙绯荤粺锛氱洿鎺ョ粯鍒舵渶蹇?
function renderParticles() {
  particles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);  // 绠€鍗曢珮鏁?
  });
}
```

---

#### 鍦烘櫙4锛氭暟鎹彲瑙嗗寲鍥捐〃

**鐗瑰緛**锛?
- 鍥捐〃鍏冪礌澶嶆潅锛堝潗鏍囪酱銆佹爣绛俱€佺綉鏍硷級
- 鏁版嵁棰戠箒鏇存柊锛堝疄鏃舵祦锛?
- 閮ㄥ垎鍏冪礌闈欐€侊紙鍧愭爣杞达級

**鍐崇瓥**锛氣殩锔?**缁撳悎鍒嗗眰浣跨敤**

**鎺ㄨ崘鏂规**锛?
- **涓嶇紦瀛?*锛氭暟鎹洸绾匡紙姣忓抚鍙樺寲锛?
- **缂撳瓨**锛氬潗鏍囪酱銆佹爣绛撅紙闈欐€佸厓绱狅級
- **鍒嗗眰**锛氶潤鎬佸眰 + 鍔ㄦ€佸眰

```javascript
class ChartRenderer {
  constructor() {
    // 缂撳瓨闈欐€佸厓绱犲埌绂诲睆Canvas
    this.axesCache = this.prerenderAxes();
    
    // 鍔ㄦ€佹暟鎹眰
    this.dataCanvas = document.createElement('canvas');
    this.dataCtx = this.dataCanvas.getContext('2d');
  }
  
  prerenderAxes() {
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    const ctx = canvas.getContext('2d');
    
    // 缁樺埗鍧愭爣杞淬€佹爣绛俱€佺綉鏍硷紙鍙敾涓€娆★級
    this.drawAxes(ctx);
    this.drawLabels(ctx);
    this.drawGrid(ctx);
    
    return canvas;
  }
  
  render(data) {
    // 缁樺埗缂撳瓨鐨勫潗鏍囪酱
    this.ctx.drawImage(this.axesCache, 0, 0);
    
    // 娓呴櫎骞堕噸缁樻暟鎹紙涓嶇紦瀛橈級
    this.dataCtx.clearRect(0, 0, this.width, this.height);
    this.drawData(this.dataCtx, data);
    this.ctx.drawImage(this.dataCanvas, 0, 0);
  }
}
```

---

### 绂诲睆Canvas鏈€浣冲疄璺?

#### 1. 缂撳瓨鍓嶈繘琛屾敹鐩婅瘎浼?

```javascript
/**
 * 缂撳瓨鏀剁泭璁＄畻鍣?
 */
class CacheROICalculator {
  /**
   * @param {number} drawTime - 鏈紦瀛樼粯鍒舵椂闂?ms)
   * @param {number} cacheDrawTime - 缂撳瓨鏇存柊鏃堕棿(ms)
   * @param {number} drawImageTime - drawImage鏃堕棿(ms锛岄€氬父0.02-0.05)
   * @param {number} reuseCount - 棰勬湡澶嶇敤娆℃暟
   * @param {number} updateFrequency - 鏇存柊棰戠巼锛?=姣忓抚锛?0=姣?0甯э級
   * @return {object} - 鏀剁泭鍒嗘瀽
   */
  calculate(drawTime, cacheDrawTime, drawImageTime, reuseCount, updateFrequency) {
    // 鏈紦瀛樻€绘垚鏈?
    const noCacheCost = drawTime * reuseCount;
    
    // 缂撳瓨鎬绘垚鏈?
    const updateCount = Math.ceil(reuseCount / updateFrequency);
    const cacheCost = cacheDrawTime * updateCount + drawImageTime * reuseCount;
    
    // 鏀剁泭
    const benefit = noCacheCost - cacheCost;
    const benefitPercent = (benefit / noCacheCost * 100).toFixed(1);
    
    return {
      noCacheCost,
      cacheCost,
      benefit,
      benefitPercent,
      shouldCache: benefit > 0,
      speedup: (noCacheCost / cacheCost).toFixed(1) + 'x'
    };
  }
}

// 浣跨敤绀轰緥
const calc = new CacheROICalculator();

// 鍦烘櫙1锛氬鏉傚浘褰紝姣?0甯ф洿鏂颁竴娆★紝澶嶇敤100娆?
const result1 = calc.calculate(5, 5, 0.03, 100, 10);
console.log(result1);
// {
//   noCacheCost: 500,
//   cacheCost: 53,
//   benefit: 447,
//   benefitPercent: "89.4%",
//   shouldCache: true,
//   speedup: "9.4x"
// }

// 鍦烘櫙2锛氱畝鍗曞浘褰紝姣忓抚鏇存柊
const result2 = calc.calculate(0.1, 0.1, 0.03, 100, 1);
console.log(result2);
// {
//   noCacheCost: 10,
//   cacheCost: 13,
//   benefit: -3,
//   benefitPercent: "-30.0%",
//   shouldCache: false,
//   speedup: "0.8x"
// }
```

#### 2. 瀹炵幇鏅鸿兘缂撳瓨绠＄悊

```javascript
/**
 * 鏅鸿兘缂撳瓨锛氳嚜鍔ㄥ喅绛栨槸鍚︾紦瀛?
 */
class SmartCache {
  constructor() {
    this.cache = new Map();
    this.stats = new Map();  // 璁板綍姣忎釜瀵硅薄鐨勭粯鍒舵椂闂?
  }
  
  draw(id, drawFn, ctx, x, y) {
    // 棣栨缁樺埗锛氳褰曟椂闂?
    if (!this.stats.has(id)) {
      const start = performance.now();
      drawFn(ctx, x, y);
      const drawTime = performance.now() - start;
      
      this.stats.set(id, { drawTime, count: 1 });
      
      // 濡傛灉缁樺埗鏃堕棿 > 1ms锛屽€煎緱缂撳瓨
      if (drawTime > 1) {
        this.cacheObject(id, drawFn);
      }
    } else {
      const stat = this.stats.get(id);
      stat.count++;
      
      // 浣跨敤缂撳瓨
      if (this.cache.has(id)) {
        ctx.drawImage(this.cache.get(id), x, y);
      } else {
        drawFn(ctx, x, y);
        
        // 澶嶇敤3娆″悗锛岃€冭檻缂撳瓨
        if (stat.count >= 3 && stat.drawTime > 0.5) {
          this.cacheObject(id, drawFn);
        }
      }
    }
  }
  
  cacheObject(id, drawFn) {
    const canvas = document.createElement('canvas');
    canvas.width = 200;  // 鏍规嵁瀹為檯灏哄
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    drawFn(ctx, 0, 0);
    this.cache.set(id, canvas);
    console.log(`缂撳瓨瀵硅薄 ${id}锛堢粯鍒舵椂闂? ${this.stats.get(id).drawTime.toFixed(2)}ms锛塦);
  }
}
```

#### 3. 鐩戞帶缂撳瓨鎬ц兘

```javascript
/**
 * 缂撳瓨鎬ц兘鐩戞帶
 */
class CacheMonitor {
  constructor() {
    this.hits = 0;
    this.misses = 0;
    this.totalDrawTime = 0;
    this.totalCacheTime = 0;
  }
  
  recordHit(cacheTime) {
    this.hits++;
    this.totalCacheTime += cacheTime;
  }
  
  recordMiss(drawTime) {
    this.misses++;
    this.totalDrawTime += drawTime;
  }
  
  getReport() {
    const hitRate = (this.hits / (this.hits + this.misses) * 100).toFixed(1);
    const avgDrawTime = (this.totalDrawTime / this.misses).toFixed(2);
    const avgCacheTime = (this.totalCacheTime / this.hits).toFixed(2);
    const speedup = (avgDrawTime / avgCacheTime).toFixed(1);
    
    return {
      hitRate: hitRate + '%',
      avgDrawTime: avgDrawTime + 'ms',
      avgCacheTime: avgCacheTime + 'ms',
      speedup: speedup + 'x'
    };
  }
}

// 浣跨敤
const monitor = new CacheMonitor();

function drawWithMonitoring(id, drawFn) {
  if (cache.has(id)) {
    const start = performance.now();
    ctx.drawImage(cache.get(id), x, y);
    monitor.recordHit(performance.now() - start);
  } else {
    const start = performance.now();
    drawFn();
    monitor.recordMiss(performance.now() - start);
  }
}

// 姣忕杈撳嚭鎶ュ憡
setInterval(() => {
  console.log(monitor.getReport());
}, 1000);
```

---

### 鍐崇瓥妫€鏌ユ竻鍗?

**缂撳瓨鍓嶈瘎浼?*锛?
- [ ] 鍥惧舰澶嶆潅搴︽槸鍚﹂珮锛堢粯鍒舵椂闂?> 1ms锛夛紵
- [ ] 澶嶇敤娆℃暟鏄惁澶氾紙> 10娆★級锛?
- [ ] 鏇存柊棰戠巼鏄惁浣庯紙> 10甯т竴娆★級锛?
- [ ] 鍐呭瓨棰勭畻鏄惁鍏呰冻锛?

**缂撳瓨鍚庨獙璇?*锛?
- [ ] 瀹為檯鎬ц兘鏄惁鎻愬崌锛圥rofiler楠岃瘉锛夛紵
- [ ] 缂撳瓨鍛戒腑鐜囨槸鍚﹂珮锛? 80%锛夛紵
- [ ] 鍐呭瓨鍗犵敤鏄惁鍙帶锛? 50 MB锛夛紵
- [ ] 鏄惁鏈夋棤鏁堢紦瀛橈紙闀挎椂闂存湭浣跨敤锛夛紵

**鎬ц兘鏁版嵁鍙傝€?*锛?
- **鐞嗘兂鍦烘櫙**锛氬鏉傚浘褰?+ 浣庨鏇存柊 + 澶氭澶嶇敤 = 10-30鍊嶆彁鍗?
- **涓嶉€傜敤鍦烘櫙**锛氱畝鍗曞浘褰?+ 楂橀鏇存柊 = 鎬ц兘涓嬮檷
- **涓寸晫鐐?*锛氱粯鍒舵椂闂?< 0.5ms锛岀紦瀛樺嚑涔庢棤鏀剁泭
- **鍐呭瓨闄愬埗**锛氱Щ鍔ㄨ澶囧缓璁?< 20 MB 鎬荤紦瀛?

---

## 鏈珷灏忕粨

绂诲睆 Canvas 鏄己澶х殑鎬ц兘浼樺寲宸ュ叿锛?
- **鏍稿績鎬濇兂**锛氬皢澶嶆潅鍥惧舰棰勬覆鏌撳埌绂诲睆 Canvas锛屼箣鍚庡揩閫熷鐢?
- **鑴忔爣璁版満鍒?*锛氬睘鎬у彉鍖栨椂鏍囪缂撳瓨澶辨晥锛屾寜闇€閲嶅缓
- **OffscreenCanvas**锛氬湪 Web Worker 涓覆鏌擄紝瀹屽叏涓嶉樆濉炰富绾跨▼
- **缂撳瓨绠＄悊**锛氶檺鍒舵€荤紦瀛樺ぇ灏忥紝浣跨敤 LRU 绛栫暐娓呯悊

鎺屾彙绂诲睆 Canvas 鍚庯紝浣犲氨鑳借澶嶆潅鍥惧舰鐨勬覆鏌撴€ц兘鎻愬崌鏁板崄鍊嶃€備笅涓€绔狅紝鎴戜滑灏嗗涔犵矑瀛愮郴缁熺殑娣卞害瀹炵幇銆?
