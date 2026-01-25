import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '第二本书',
  description: '这是第二本书的描述',
  base: '/CoderBooks/book2/',
  outDir: '../../../dist/book2',
  
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '教程', link: '/tutorial/' }
    ],

    sidebar: [
      {
        text: '教程',
        items: [
          { text: '介绍', link: '/tutorial/' },
          { text: '基础知识', link: '/tutorial/basics' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com' }
    ],

    footer: {
      message: '基于 VitePress 构建',
      copyright: 'Copyright © 2026'
    }
  }
})
