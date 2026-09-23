const { defineConfig } = require('@vue/cli-service')
const proxy = Object.fromEntries(['/api', '/image', '/video', '/voice', '/file', '/data'].map(prefix => [prefix, {
  target: process.env.CHATLOG_PROXY_TARGET || 'http://127.0.0.1:5030',
  changeOrigin: true,
  ws: prefix === '/api'
}]))
module.exports = defineConfig({
  transpileDependencies: true,
  devServer: { port: 8080, host: '0.0.0.0', open: true, proxy },
  // History routing needs an absolute base; set /chatlog/ for a subdirectory.
  publicPath: process.env.VUE_APP_PUBLIC_PATH || '/',
  outputDir: 'dist',
  assetsDir: 'static',
  chainWebpack: config => {
    config.plugin('html').tap(args => { args[0].title = 'Chatlog · 我的聊天档案'; return args })
  },
  css: { extract: process.env.NODE_ENV === 'production', sourceMap: false },
  configureWebpack: { optimization: { minimize: process.env.NODE_ENV === 'production' } }
})
