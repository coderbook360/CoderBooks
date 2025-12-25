---
sidebar_position: 97
title: "实时数据流"
---

# 实时数据流

本章实现实时数据流功能，包括 WebSocket 和轮询。

## WebSocket 封装

### 基础封装

```javascript
import { Observable, Subject, timer, EMPTY } from 'rxjs'
import { 
  retryWhen, 
  delay, 
  tap, 
  switchMap,
  takeUntil,
  share,
  filter,
  map
} from 'rxjs/operators'

function createWebSocket(url) {
  return new Observable(subscriber => {
    const ws = new WebSocket(url)
    
    ws.onopen = () => {
      subscriber.next({ type: 'open' })
    }
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        subscriber.next({ type: 'message', data })
      } catch {
        subscriber.next({ type: 'message', data: event.data })
      }
    }
    
    ws.onerror = (error) => {
      subscriber.error(error)
    }
    
    ws.onclose = (event) => {
      if (event.wasClean) {
        subscriber.complete()
      } else {
        subscriber.error(new Error(`Connection closed: ${event.code}`))
      }
    }
    
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
  })
}
```

### 带重连的 WebSocket

```javascript
function createReconnectingWebSocket(url, options = {}) {
  const {
    maxRetries = 5,
    retryDelay = 1000,
    maxRetryDelay = 30000
  } = options
  
  const messages$ = new Subject()
  const send$ = new Subject()
  const status$ = new BehaviorSubject('disconnected')
  
  let ws = null
  let retryCount = 0
  
  const connect = () => {
    status$.next('connecting')
    
    return createWebSocket(url).pipe(
      tap({
        next: (event) => {
          if (event.type === 'open') {
            status$.next('connected')
            retryCount = 0
            
            // 设置发送通道
            ws = event.target
          } else if (event.type === 'message') {
            messages$.next(event.data)
          }
        },
        error: () => {
          status$.next('disconnected')
        }
      }),
      retryWhen(errors => 
        errors.pipe(
          tap(() => retryCount++),
          filter(() => retryCount <= maxRetries),
          switchMap(() => {
            const delayMs = Math.min(
              retryDelay * Math.pow(2, retryCount - 1),
              maxRetryDelay
            )
            status$.next('reconnecting')
            return timer(delayMs)
          })
        )
      )
    )
  }
  
  // 发送消息
  send$.pipe(
    filter(() => ws && ws.readyState === WebSocket.OPEN)
  ).subscribe(msg => {
    ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg))
  })
  
  return {
    messages$: messages$.asObservable(),
    status$: status$.asObservable(),
    
    connect() {
      return connect()
    },
    
    send(message) {
      send$.next(message)
    },
    
    disconnect() {
      if (ws) {
        ws.close()
      }
      messages$.complete()
      status$.complete()
    }
  }
}
```

### 使用示例

```javascript
const ws = createReconnectingWebSocket('wss://api.example.com/ws')

// 监听状态
ws.status$.subscribe(status => {
  console.log('Connection status:', status)
  updateStatusUI(status)
})

// 监听消息
ws.messages$.subscribe(message => {
  console.log('Received:', message)
  handleMessage(message)
})

// 连接
ws.connect().subscribe()

// 发送消息
ws.send({ type: 'subscribe', channel: 'trades' })

// 断开
// ws.disconnect()
```

## 轮询实现

### 简单轮询

```javascript
function createPolling(fetchFn, interval = 5000) {
  return timer(0, interval).pipe(
    switchMap(() => fetchFn().pipe(
      catchError(err => {
        console.error('Polling error:', err)
        return EMPTY
      })
    )),
    share()
  )
}

// 使用
const data$ = createPolling(
  () => fetch('/api/data').then(r => r.json()),
  3000
)

data$.subscribe(data => {
  updateUI(data)
})
```

### 智能轮询

根据数据变化调整轮询频率：

```javascript
function createSmartPolling(fetchFn, options = {}) {
  const {
    minInterval = 1000,
    maxInterval = 30000,
    backoffFactor = 1.5,
    resetOnChange = true
  } = options
  
  const interval$ = new BehaviorSubject(minInterval)
  const stop$ = new Subject()
  
  let lastData = null
  
  const poll$ = interval$.pipe(
    switchMap(ms => timer(0, ms)),
    takeUntil(stop$),
    switchMap(() => fetchFn().pipe(
      catchError(err => {
        console.error(err)
        return EMPTY
      })
    )),
    tap(data => {
      const dataStr = JSON.stringify(data)
      const lastDataStr = JSON.stringify(lastData)
      
      if (dataStr !== lastDataStr) {
        // 数据变化，重置间隔
        if (resetOnChange) {
          interval$.next(minInterval)
        }
        lastData = data
      } else {
        // 数据未变，增加间隔
        const currentInterval = interval$.getValue()
        const newInterval = Math.min(
          currentInterval * backoffFactor,
          maxInterval
        )
        interval$.next(newInterval)
      }
    }),
    distinctUntilChanged((a, b) => 
      JSON.stringify(a) === JSON.stringify(b)
    ),
    share()
  )
  
  return {
    data$: poll$,
    stop: () => stop$.next(),
    setInterval: (ms) => interval$.next(ms)
  }
}

// 使用
const polling = createSmartPolling(
  () => fetchApi('/api/status'),
  {
    minInterval: 2000,
    maxInterval: 60000
  }
)

polling.data$.subscribe(data => {
  updateStatus(data)
})
```

### 条件轮询

只在满足条件时轮询：

```javascript
function createConditionalPolling(fetchFn, condition$, interval = 5000) {
  return condition$.pipe(
    distinctUntilChanged(),
    switchMap(shouldPoll => {
      if (!shouldPoll) {
        return EMPTY
      }
      
      return timer(0, interval).pipe(
        switchMap(() => fetchFn().pipe(
          catchError(() => EMPTY)
        ))
      )
    }),
    share()
  )
}

// 使用：页面可见时轮询
const pageVisible$ = fromEvent(document, 'visibilitychange').pipe(
  map(() => document.visibilityState === 'visible'),
  startWith(true)
)

const data$ = createConditionalPolling(
  () => fetchApi('/api/updates'),
  pageVisible$,
  5000
)
```

## 实时股票行情

### 数据模型

```javascript
const StockData = {
  symbol: 'string',
  price: 'number',
  change: 'number',
  volume: 'number',
  timestamp: 'number'
}
```

### 行情服务

```javascript
class StockService {
  constructor(wsUrl) {
    this.ws = createReconnectingWebSocket(wsUrl)
    this.subscriptions = new Set()
    this.prices$ = new BehaviorSubject(new Map())
    
    this.init()
  }
  
  init() {
    // 处理消息
    this.ws.messages$.pipe(
      filter(msg => msg.type === 'quote')
    ).subscribe(msg => {
      const current = this.prices$.getValue()
      const updated = new Map(current)
      updated.set(msg.symbol, {
        symbol: msg.symbol,
        price: msg.price,
        change: msg.change,
        volume: msg.volume,
        timestamp: Date.now()
      })
      this.prices$.next(updated)
    })
    
    // 连接
    this.ws.connect().subscribe()
    
    // 重连时重新订阅
    this.ws.status$.pipe(
      filter(s => s === 'connected'),
      skip(1)  // 跳过首次连接
    ).subscribe(() => {
      this.resubscribe()
    })
  }
  
  subscribe(symbol) {
    this.subscriptions.add(symbol)
    this.ws.send({ type: 'subscribe', symbol })
  }
  
  unsubscribe(symbol) {
    this.subscriptions.delete(symbol)
    this.ws.send({ type: 'unsubscribe', symbol })
  }
  
  resubscribe() {
    this.subscriptions.forEach(symbol => {
      this.ws.send({ type: 'subscribe', symbol })
    })
  }
  
  getPrice$(symbol) {
    return this.prices$.pipe(
      map(prices => prices.get(symbol)),
      filter(price => price !== undefined),
      distinctUntilChanged((a, b) => a.price === b.price)
    )
  }
  
  getAllPrices$() {
    return this.prices$.pipe(
      map(prices => Array.from(prices.values()))
    )
  }
  
  disconnect() {
    this.ws.disconnect()
    this.prices$.complete()
  }
}

// 使用
const stockService = new StockService('wss://api.example.com/stocks')

// 订阅股票
stockService.subscribe('AAPL')
stockService.subscribe('GOOGL')
stockService.subscribe('MSFT')

// 监听特定股票
stockService.getPrice$('AAPL').subscribe(data => {
  console.log('AAPL:', data.price)
})

// 监听所有股票
stockService.getAllPrices$().subscribe(prices => {
  updateStockTable(prices)
})
```

## 实时聊天

### 聊天服务

```javascript
class ChatService {
  constructor(wsUrl) {
    this.ws = createReconnectingWebSocket(wsUrl)
    this.messages$ = new ReplaySubject(50)  // 缓存最近 50 条
    this.users$ = new BehaviorSubject([])
    this.typing$ = new Subject()
    
    this.init()
  }
  
  init() {
    this.ws.messages$.subscribe(msg => {
      switch (msg.type) {
        case 'message':
          this.messages$.next({
            id: msg.id,
            user: msg.user,
            text: msg.text,
            timestamp: msg.timestamp
          })
          break
          
        case 'users':
          this.users$.next(msg.users)
          break
          
        case 'typing':
          this.typing$.next({
            user: msg.user,
            isTyping: msg.isTyping
          })
          break
      }
    })
    
    this.ws.connect().subscribe()
  }
  
  sendMessage(text) {
    this.ws.send({
      type: 'message',
      text,
      timestamp: Date.now()
    })
  }
  
  sendTyping(isTyping) {
    this.ws.send({
      type: 'typing',
      isTyping
    })
  }
  
  joinRoom(roomId) {
    this.ws.send({
      type: 'join',
      roomId
    })
  }
  
  leaveRoom(roomId) {
    this.ws.send({
      type: 'leave',
      roomId
    })
  }
  
  // 合并多个用户的输入状态
  getTypingUsers$() {
    const typingUsers = new Map()
    
    return this.typing$.pipe(
      tap(({ user, isTyping }) => {
        if (isTyping) {
          typingUsers.set(user, Date.now())
        } else {
          typingUsers.delete(user)
        }
      }),
      // 自动清除超时的输入状态
      switchMap(() => 
        merge(
          of(null),
          timer(3000)
        )
      ),
      map(() => {
        const now = Date.now()
        // 清除 3 秒前的输入状态
        typingUsers.forEach((time, user) => {
          if (now - time > 3000) {
            typingUsers.delete(user)
          }
        })
        return Array.from(typingUsers.keys())
      }),
      distinctUntilChanged((a, b) => 
        JSON.stringify(a) === JSON.stringify(b)
      )
    )
  }
  
  disconnect() {
    this.ws.disconnect()
  }
}

// 使用
const chat = new ChatService('wss://api.example.com/chat')

// 加入房间
chat.joinRoom('general')

// 监听消息
chat.messages$.subscribe(msg => {
  appendMessage(msg)
})

// 监听输入状态
chat.getTypingUsers$().subscribe(users => {
  if (users.length > 0) {
    showTypingIndicator(`${users.join(', ')} 正在输入...`)
  } else {
    hideTypingIndicator()
  }
})

// 发送消息
chat.sendMessage('Hello!')

// 输入状态
fromEvent(input, 'input').pipe(
  debounceTime(500),
  tap(() => chat.sendTyping(true)),
  switchMap(() => timer(2000)),
  tap(() => chat.sendTyping(false))
).subscribe()
```

## Server-Sent Events

### SSE 封装

```javascript
function createSSE(url) {
  return new Observable(subscriber => {
    const eventSource = new EventSource(url)
    
    eventSource.onmessage = (event) => {
      try {
        subscriber.next(JSON.parse(event.data))
      } catch {
        subscriber.next(event.data)
      }
    }
    
    eventSource.onerror = () => {
      subscriber.error(new Error('SSE connection error'))
    }
    
    return () => {
      eventSource.close()
    }
  }).pipe(
    retryWhen(errors => 
      errors.pipe(
        delay(3000)
      )
    ),
    share()
  )
}

// 使用
const events$ = createSSE('/api/events')

events$.subscribe(event => {
  console.log('Event:', event)
})
```

### 带类型的 SSE

```javascript
function createTypedSSE(url, eventTypes) {
  return new Observable(subscriber => {
    const eventSource = new EventSource(url)
    
    // 监听指定类型
    eventTypes.forEach(type => {
      eventSource.addEventListener(type, (event) => {
        subscriber.next({
          type,
          data: JSON.parse(event.data)
        })
      })
    })
    
    eventSource.onerror = () => {
      subscriber.error(new Error('SSE error'))
    }
    
    return () => eventSource.close()
  }).pipe(
    retryWhen(errors => errors.pipe(delay(3000))),
    share()
  )
}

// 使用
const events$ = createTypedSSE('/api/stream', ['update', 'delete', 'create'])

events$.pipe(
  filter(e => e.type === 'update')
).subscribe(e => {
  handleUpdate(e.data)
})
```

## 本章小结

- WebSocket 封装支持自动重连
- 智能轮询根据数据变化调整频率
- 实时服务使用 Subject 管理状态
- SSE 适合单向服务器推送
- 合理使用 `share` 避免重复连接

下一章实现状态管理模式。
