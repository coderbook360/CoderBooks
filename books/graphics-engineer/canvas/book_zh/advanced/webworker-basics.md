# WebWorker 澶氱嚎绋嬪浘褰㈠鐞?

鍦ㄥ疄闄呯殑鍥惧舰缂栬緫鍣ㄥ紑鍙戜腑锛屼綘鍙兘閬囧埌杩囪繖鏍风殑闂锛氬綋鎵ц澶嶆潅鐨勫浘鍍忔护闀滃鐞嗐€佸ぇ閲忕煝閲忓浘褰㈡爡鏍煎寲鎴栭珮鍒嗚鲸鐜囩敾甯冩覆鏌撴椂锛屾暣涓晫闈細闄峰叆鍗￠】锛岀敤鎴锋棤娉曟嫋鎷姐€佺偣鍑伙紝鐢氳嚦杩炲姩鐢婚兘鍋滄浜嗐€傝繖鏄洜涓?JavaScript 杩愯鍦ㄥ崟绾跨▼鐜锛屾墍鏈夎绠椼€佹覆鏌撱€佷簨浠跺搷搴旈兘鍦ㄤ富绾跨▼鎺掗槦鎵ц锛屼竴鏃︽煇涓换鍔¤€楁椂杩囬暱锛屽氨浼氶樆濉炴暣涓簲鐢ㄣ€?

閭ｄ箞锛岃兘涓嶈兘鎶婅繖浜涜€楁椂鐨勫浘褰㈠鐞嗕换鍔?澶栧寘"缁欏叾浠栫嚎绋嬶紝璁╀富绾跨▼涓撴敞浜庣敤鎴蜂氦浜掑憿锛熺瓟妗堟槸锛氬彲浠ワ紝杩欏氨鏄?Web Worker 鐨勪环鍊笺€?

鏈珷灏嗕粠瀹為檯闂鍑哄彂锛岄€愭瑙ｇ瓟浠ヤ笅鏍稿績闂锛?
- 涓荤嚎绋嬩笌 Worker 濡備綍閫氫俊锛熷浣曡璁℃秷鎭崗璁紵
- 濡備綍鍦?Worker 涓覆鏌?Canvas锛圤ffscreenCanvas锛夛紵
- 濡備綍楂樻晥浼犺緭鍥惧儚鏁版嵁锛堝彲杞Щ瀵硅薄锛夛紵
- 濡備綍瀹炵幇鍒嗙墖娓叉煋涓庣粨鏋滃悎骞讹紵
- 浣曟椂閫傚悎浣跨敤 Worker锛屼綍鏃朵笉閫傚悎锛?

---

## 涓荤嚎绋嬩笌 Worker锛氭秷鎭┍鍔ㄧ殑骞惰妯″瀷

棣栧厛瑕侀棶涓€涓棶棰橈細**Worker 涓庝富绾跨▼鏄粈涔堝叧绯伙紵**

Worker 鏄繍琛屽湪鐙珛绾跨▼涓殑 JavaScript 鎵ц鐜銆傚畠涓庝富绾跨▼**鏃犳硶鍏变韩鍙橀噺銆佹棤娉曠洿鎺ヨ闂?DOM**锛屽敮涓€鐨勯€氫俊鏂瑰紡鏄?*娑堟伅浼犻€?*锛坄postMessage` 鍜?`onmessage`锛夈€傝繖绉嶉殧绂讳繚璇佷簡绾跨▼瀹夊叏锛屼絾涔熷甫鏉ヤ簡璁捐涓婄殑绾︽潫锛?

- **涓荤嚎绋?*锛氳礋璐?UI 娓叉煋銆佷簨浠跺搷搴斻€丏OM 鎿嶄綔
- **Worker**锛氳礋璐ｇ函璁＄畻浠诲姟锛堝鍥惧儚澶勭悊銆佹暟鎹浆鎹€佸鏉傛覆鏌擄級
- **閫氫俊**锛氶€氳繃寮傛娑堟伅浼犻€掓寚浠ゅ拰鏁版嵁

杩欑妯″紡绫讳技浜?澶栧寘宸ュ巶"锛氫富绾跨▼鏄敳鏂癸紝鍙戦€佷换鍔℃寚浠ゅ拰鍘熸潗鏂欙紱Worker 鏄箼鏂癸紝鎺ュ崟銆佸姞宸ャ€佷氦浠樻垚鍝併€?

### 浣曟椂閫傚悎浣跨敤 Worker锛?

骞堕潪鎵€鏈変换鍔￠兘閫傚悎 Worker銆傚垽鏂爣鍑嗘槸锛?

**閫傚悎**锛?
- 閲?CPU 杩愮畻锛堝婊ら暅銆佸ぇ瑙勬ā鍍忕礌澶勭悊銆佺煝閲忔爡鏍煎寲锛?
- 鍙媶鍒嗙殑骞惰浠诲姟锛堝鍒嗙墖娓叉煋銆佹壒閲忚浆鎹級
- 棰勮绠楁垨鍚庡彴澶勭悊锛堝缂撳瓨鐢熸垚銆佹暟鎹帇缂╋級

**涓嶉€傚悎**锛?
- 棰戠箒涓?DOM 浜や簰锛圵orker 鏃犳硶璁块棶 DOM锛?
- 杞婚噺绾ц绠楋紙閫氫俊寮€閿€澶т簬璁＄畻鏈韩锛?
- 闇€瑕佺珛鍗冲悓姝ョ粨鏋滅殑鍦烘櫙锛圵orker 閫氫俊鏄紓姝ョ殑锛?

鎬濊€冧竴涓嬶細濡傛灉浣犵殑浠诲姟鏄?姣忓抚鏇存柊 10 涓璞＄殑浣嶇疆"锛岃繖鏄交閲忕骇璁＄畻锛屼笉闇€瑕?Worker锛涗絾濡傛灉鏄?瀵逛竴寮?4K 鍥惧儚搴旂敤楂樻柉妯＄硦"锛岃繖灏辨槸鍏稿瀷鐨?Worker 閫傜敤鍦烘櫙銆?

---

## 鍩虹閫氫俊锛氭瀯寤烘竻鏅扮殑娑堟伅鍗忚

鐜板湪鎴戣闂浜屼釜闂锛?*濡備綍璁捐涓荤嚎绋嬩笌 Worker 鐨勯€氫俊鍗忚锛?*

涓€涓仴澹殑閫氫俊鍗忚鑷冲皯闇€瑕佸寘鍚細
1. **鍛戒护鏍囪瘑**锛坄cmd`锛夛細鍛婅瘔 Worker 瑕佸仛浠€涔?
2. **璇锋眰 ID**锛坄reqId`锛夛細鍖归厤璇锋眰鍜屽搷搴旓紙鏀寔骞跺彂澶氳姹傦級
3. **鏁版嵁杞借嵎**锛坄payload`锛夛細浠诲姟鎵€闇€鐨勫弬鏁?
4. **鍝嶅簲閫氶亾**锛氭垚鍔熺粨鏋滄垨閿欒淇℃伅

涓嬮潰鏄竴涓渶灏忓彲鐢ㄧ殑鍗忚瀹炵幇锛?

**涓荤嚎绋嬶細鍒涘缓 Worker 骞跺皝瑁呰姹傚嚱鏁?*

```javascript
// main.js
const worker = new Worker('renderer.js', { type: 'module' });

// 灏佽 Promise 椋庢牸鐨勮姹傚嚱鏁?
function request(cmd, payload) {
  return new Promise((resolve, reject) => {
    const reqId = crypto.randomUUID(); // 鐢熸垚鍞竴璇锋眰 ID
    
    // 鐩戝惉 Worker 杩斿洖鐨勬秷鎭?
    const onMessage = (event) => {
      const { type, reqId: id, data, error } = event.data;
      if (id !== reqId) return; // 蹇界暐涓嶅尮閰嶇殑鍝嶅簲
      
      worker.removeEventListener('message', onMessage);
      
      if (type === 'error') {
        reject(new Error(error));
      } else {
        resolve(data);
      }
    };
    
    worker.addEventListener('message', onMessage);
    worker.postMessage({ cmd, reqId, payload });
  });
}

// 浣跨敤绀轰緥
async function init() {
  try {
    await request('init', { width: 800, height: 600 });
    console.log('Worker 鍒濆鍖栨垚鍔?);
    
    const result = await request('draw', { shapes: [...] });
    console.log('缁樺埗瀹屾垚', result);
  } catch (error) {
    console.error('Worker 閿欒:', error);
  }
}
```

**鍏抽敭璁捐鐐?*锛?
- **璇锋眰 ID**锛氭敮鎸佸苟鍙戝涓姹傦紝閬垮厤鍝嶅簲閿欎贡
- **Promise 灏佽**锛氬皢寮傛娑堟伅杞崲涓烘洿鏄撶敤鐨?async/await 椋庢牸
- **閿欒閫氶亾**锛歐orker 鍙戠敓閿欒鏃惰兘姝ｇ‘浼犲洖涓荤嚎绋?

**Worker 绔細鎺ユ敹鍛戒护骞跺洖澶?*

```javascript
// renderer.js
self.onmessage = async (event) => {
  const { cmd, reqId, payload } = event.data;
  
  try {
    if (cmd === 'init') {
      // 鍒濆鍖栭€昏緫
      const { width, height } = payload;
      // ...
      reply(reqId, { status: 'ok' });
    } else if (cmd === 'draw') {
      // 缁樺埗閫昏緫
      const { shapes } = payload;
      // ...
      reply(reqId, { rendered: shapes.length });
    } else {
      replyError(reqId, `鏈煡鍛戒护: ${cmd}`);
    }
  } catch (error) {
    replyError(reqId, error.message);
  }
};

function reply(reqId, data) {
  self.postMessage({ type: 'result', reqId, data });
}

function replyError(reqId, error) {
  self.postMessage({ type: 'error', reqId, error });
}
```

杩欎釜鍗忚宸茬粡瓒冲搴斿澶ч儴鍒嗗満鏅€備絾鏄畠杩樻湁涓€涓棶棰橈細**Worker 濡備綍娓叉煋 Canvas锛?*涓荤嚎绋嬬殑 Canvas 鏃犳硶鐩存帴浼犵粰 Worker锛屽洜涓?DOM 瀵硅薄涓嶅彲浼犻€掋€傝繖灏卞紩鍑轰簡涓嬩竴涓牳蹇冩蹇碉細OffscreenCanvas銆?

---

## OffscreenCanvas锛氬湪 Worker 涓覆鏌撶敾甯?

鐜板湪鎴戣闂涓変釜闂锛?*Worker 鏃犳硶璁块棶 DOM锛屽浣曟覆鏌?Canvas锛?*

绛旀鏄細**OffscreenCanvas**鈥斺€斾竴涓劚绂?DOM 鐨?Canvas 鎺ュ彛锛屽彲浠ュ湪 Worker 涓娇鐢ㄣ€?

### OffscreenCanvas 鐨勪袱绉嶅垱寤烘柟寮?

**鏂瑰紡涓€锛氫富绾跨▼杞Щ鎺у埗鏉冿紙鎺ㄨ崘锛?*

```javascript
// main.js
const canvas = document.querySelector('#myCanvas');
const offscreen = canvas.transferControlToOffscreen(); // 杞Щ鎺у埗鏉?

// 灏?OffscreenCanvas 浣滀负鍙浆绉诲璞′紶缁?Worker
worker.postMessage({ cmd: 'init', canvas: offscreen }, [offscreen]);
```

**閲嶈**锛氳皟鐢?`transferControlToOffscreen()` 鍚庯紝涓荤嚎绋?*澶卞幓浜嗗 Canvas 鐨勭粯鍒舵帶鍒?*锛屾墍鏈夌粯鍒跺繀椤诲湪 Worker 涓畬鎴愩€傝繖鏄竴绉?鎵€鏈夋潈杞Щ"锛屼笉鏄鍒躲€?

**鏂瑰紡浜岋細Worker 鍐呴儴鐩存帴鍒涘缓**

```javascript
// renderer.js
const offscreen = new OffscreenCanvas(800, 600);
const ctx = offscreen.getContext('2d');
```

杩欑鏂瑰紡閫傚悎绾悗鍙版覆鏌擄紙濡傜敓鎴愮紦瀛樺浘鍍忥級锛屼笉闇€瑕佹樉绀哄湪椤甸潰涓娿€?

### 鍦?Worker 涓幏鍙栦笂涓嬫枃骞剁粯鍒?

```javascript
// renderer.js
let ctx, width, height;

self.onmessage = async (event) => {
  const { cmd, reqId, payload, canvas } = event.data;
  
  try {
    if (cmd === 'init') {
      ctx = canvas.getContext('2d'); // 鑾峰彇 2D 涓婁笅鏂?
      width = canvas.width;
      height = canvas.height;
      
      // 缁樺埗涓€涓祴璇曡儗鏅?
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, width, height);
      
      reply(reqId, { status: 'initialized' });
    }
    
    if (cmd === 'draw') {
      const { shapes } = payload;
      renderShapes(shapes);
      reply(reqId, { rendered: shapes.length });
    }
    
    if (cmd === 'resize') {
      width = payload.width;
      height = payload.height;
      ctx.canvas.width = width;
      ctx.canvas.height = height;
      reply(reqId, { status: 'resized' });
    }
  } catch (error) {
    replyError(reqId, error.message);
  }
};

function renderShapes(shapes) {
  ctx.clearRect(0, 0, width, height);
  
  shapes.forEach(shape => {
    ctx.save();
    ctx.translate(shape.x, shape.y);
    ctx.rotate(shape.rotation || 0);
    ctx.fillStyle = shape.fill || '#09f';
    ctx.fillRect(-shape.width / 2, -shape.height / 2, shape.width, shape.height);
    ctx.restore();
  });
}

function reply(reqId, data) {
  self.postMessage({ type: 'result', reqId, data });
}

function replyError(reqId, error) {
  self.postMessage({ type: 'error', reqId, error });
}
```

**鍏抽敭鐐?*锛?
- OffscreenCanvas 鐨勭粯鍒?API 涓庢櫘閫?Canvas 瀹屽叏涓€鑷?
- 涓荤嚎绋嬬湅鍒扮殑娓叉煋缁撴灉鏄?*鑷姩鍚屾**鐨勶紙鏃犻渶鎵嬪姩鍥炰紶锛?
- 璋冩暣灏哄鏃堕渶瑕佸湪 Worker 涓缃?`canvas.width` 鍜?`canvas.height`

鏈夋病鏈夊緢绁炲鐨勬劅瑙夛紵涓荤嚎绋嬬湅鍒扮殑 Canvas 鍐呭锛屽疄闄呮槸鍦?Worker 涓粯鍒剁殑锛屾暣涓繃绋嬩笉浼氶樆濉炵敤鎴蜂氦浜掋€?

### 娴忚鍣ㄦ敮鎸佷笌闄嶇骇鏂规

**鍏煎鎬х幇鐘?*锛?024骞达級锛?
- 鉁?Chrome/Edge锛氬畬鏁存敮鎸?
- 鉁?Firefox锛氬畬鏁存敮鎸?
- 鈿狅笍 Safari锛氶儴鍒嗘敮鎸侊紙闇€妫€鏌ョ増鏈級

**闄嶇骇绛栫暐**锛?

```javascript
// main.js
function initRenderer(canvas) {
  if ('transferControlToOffscreen' in canvas && window.Worker) {
    // 鏀寔 OffscreenCanvas锛屼娇鐢?Worker
    const offscreen = canvas.transferControlToOffscreen();
    const worker = new Worker('renderer.js', { type: 'module' });
    worker.postMessage({ cmd: 'init', canvas: offscreen }, [offscreen]);
    return { type: 'worker', instance: worker };
  } else {
    // 涓嶆敮鎸侊紝闄嶇骇鍒颁富绾跨▼娓叉煋
    const ctx = canvas.getContext('2d');
    return { type: 'main', ctx };
  }
}
```

闄嶇骇鏂规纭繚浜嗗湪涓嶆敮鎸佺殑鐜涓嬶紝搴旂敤浠嶇劧鍙敤锛屽彧鏄€ц兘绋嶅樊銆?

---

## 鍙浆绉诲璞★細闆舵嫹璐濅紶杈撳浘鍍忔暟鎹?

鐜板湪鎴戣闂鍥涗釜闂锛?*濡備綍楂樻晥浼犺緭鍥惧儚鏁版嵁锛?*

榛樿鎯呭喌涓嬶紝閫氳繃 `postMessage` 浼犻€掔殑瀵硅薄浼氳**缁撴瀯鍖栧厠闅?*锛堟繁鎷疯礉锛夛紝杩欏湪浼犺緭澶ч噺鍍忕礌鏁版嵁鏃朵細甯︽潵宸ㄥぇ寮€閿€銆備緥濡傦紝涓€寮?1920脳1080 鐨?RGBA 鍥惧儚闇€瑕佺害 8MB 鍐呭瓨锛屾繁鎷疯礉浼氬鑷存€ц兘鏄捐憲涓嬮檷銆?

瑙ｅ喅鏂规鏄娇鐢?*鍙浆绉诲璞?*锛圱ransferable Objects锛夛紝瀹炵幇**闆舵嫹璐濅紶杈?*銆?

### 鍙浆绉诲璞＄殑宸ヤ綔鍘熺悊

鍙浆绉诲璞＄殑"鎵€鏈夋潈"浠庡彂閫佹柟杞Щ鍒版帴鏀舵柟锛屽師瀵硅薄鍙樹负"detached"锛堜笉鍙敤锛夛紝閬垮厤浜嗗鍒跺紑閿€銆?

**鏀寔鐨勫彲杞Щ瀵硅薄绫诲瀷**锛?
- `ArrayBuffer`锛堝師濮嬪瓧鑺傛暟缁勶級
- `ImageBitmap`锛堜綅鍥惧浘鍍忥級
- `MessagePort`
- `OffscreenCanvas`

### 绀轰緥 1锛氫娇鐢?ImageBitmap 浼犺緭鍥惧儚

```javascript
// main.js
async function sendImageToWorker(canvas) {
  // 浠?Canvas 鍒涘缓 ImageBitmap锛堥浂鎷疯礉锛?
  const bitmap = await createImageBitmap(canvas);
  
  // 浣滀负鍙浆绉诲璞′紶閫掔粰 Worker
  worker.postMessage({ cmd: 'processImage', image: bitmap }, [bitmap]);
  
  // 娉ㄦ剰锛歜itmap 鐜板湪宸蹭笉鍙敤锛堣杞Щ锛?
  console.log(bitmap.width); // 閿欒锛欳annot read properties of detached object
}
```

```javascript
// renderer.js
self.onmessage = async (event) => {
  const { cmd, reqId, image } = event.data;
  
  if (cmd === 'processImage') {
    // 鍦?OffscreenCanvas 涓婄粯鍒跺苟澶勭悊
    const canvas = new OffscreenCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    
    // 搴旂敤婊ら暅...
    applyFilter(ctx);
    
    // 杩斿洖缁撴灉锛堝悓鏍蜂綔涓?ImageBitmap 杞Щ锛?
    const result = canvas.transferToImageBitmap();
    self.postMessage({ type: 'result', reqId, data: result }, [result]);
  }
};
```

**鍏抽敭鐐?*锛?
- `transferToImageBitmap()` 鏂规硶灏?OffscreenCanvas 鐨勫唴瀹硅浆鎹负 ImageBitmap锛屽悓鏃?*娓呯┖鐢诲竷**
- 閫氳繃 `postMessage` 鐨勭浜屼釜鍙傛暟浼犻€掑彲杞Щ瀵硅薄鏁扮粍
- 浼犺緭鍚庡師瀵硅薄绔嬪嵆澶辨晥

### 绀轰緥 2锛氫娇鐢?ArrayBuffer 浼犺緭鍍忕礌鏁版嵁

```javascript
// main.js
const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');
const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

// imageData.data 鏄?Uint8ClampedArray锛屽簳灞傛槸 ArrayBuffer
const buffer = imageData.data.buffer;

worker.postMessage({
  cmd: 'processPixels',
  buffer,
  width: canvas.width,
  height: canvas.height
}, [buffer]); // 杞Щ buffer 鎵€鏈夋潈

// 鐜板湪 buffer 宸茶 detached
console.log(imageData.data.length); // 0锛堝凡鏃犳暟鎹級
```

```javascript
// renderer.js
self.onmessage = (event) => {
  const { cmd, reqId, buffer, width, height } = event.data;
  
  if (cmd === 'processPixels') {
    const pixels = new Uint8ClampedArray(buffer);
    
    // 鐩存帴鎿嶄綔鍍忕礌鏁扮粍锛堝鍙嶈壊锛?
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 255 - pixels[i];     // R
      pixels[i + 1] = 255 - pixels[i + 1]; // G
      pixels[i + 2] = 255 - pixels[i + 2]; // B
      // pixels[i + 3] 鏄?Alpha锛屼繚鎸佷笉鍙?
    }
    
    // 杩斿洖澶勭悊鍚庣殑 buffer
    self.postMessage({ type: 'result', reqId, buffer }, [buffer]);
  }
};
```

```javascript
// main.js锛堟帴鏀剁粨鏋滐級
worker.addEventListener('message', (event) => {
  const { type, reqId, buffer } = event.data;
  
  if (type === 'result') {
    const pixels = new Uint8ClampedArray(buffer);
    const imageData = new ImageData(pixels, width, height);
    ctx.putImageData(imageData, 0, 0);
  }
});
```

**鎬ц兘瀵规瘮**锛?
- 缁撴瀯鍖栧厠闅嗭紙榛樿锛夛細闇€瑕佹繁鎷疯礉鏁翠釜鏁版嵁锛岃€楁椂涓庢暟鎹ぇ灏忔垚姝ｆ瘮
- 鍙浆绉诲璞★細浠呰浆绉绘墍鏈夋潈鎸囬拡锛岃€楁椂鍑犱箮涓洪浂锛圤(1)锛?

瀵逛簬澶у昂瀵稿浘鍍忓鐞嗭紝鍙浆绉诲璞＄殑鎬ц兘浼樺娍闈炲父鏄庢樉銆?

---


---

## 本章小结

本章介绍了 Web Worker 与 Canvas 的基础结合：

**核心概念**：
- Web Worker 并行模型与适用场景
- 消息协议设计
- OffscreenCanvas API 使用

**零拷贝传输**：
- 可转移对象（Transferable Objects）
- ImageBitmap 和 ArrayBuffer 传输
- 性能提升 10-100倍

**浏览器兼容性**：
- 特性检测与降级方案
- Chrome/Edge 全支持
- Firefox 部分支持

在下一章，我们将学习多 Worker 并行加速和典型应用场景。