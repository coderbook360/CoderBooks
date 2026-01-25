import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Codebooks',
  description: '书籍集合',
  base: '/CoderBooks/',
  outDir: '../../../dist/portal',
  ignoreDeadLinks: true,
  
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: 'Vue3 生态系统', link: '/cs130-vue/' },
      { text: '第二本书', link: '/book2/' }
    ],

    sidebar: [
      {
        text: '欢迎',
        items: [
          { text: '介绍', link: '/' },
          { text: '所有书籍', link: '/books' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/yourusername/codebooks' }
    ],

    footer: {
      message: '基于 VitePress 构建',
      copyright: 'Copyright © 2026'
    }
  }
})
