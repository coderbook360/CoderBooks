import { parseAllTocs } from './utils/parseToc.js'

const books = [
  { name: 'reactive', path: '/reactive/', title: 'Vue3 响应式系统', group: '源码解析' },
  { name: 'router', path: '/router/', title: 'Vue Router 路由', group: '源码解析' },
]

const sidebarConfig = parseAllTocs(books)

console.log('Generated sidebar config:')
console.log(JSON.stringify(sidebarConfig, null, 2))
