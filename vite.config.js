const path = require('path')
const { defineConfig } = require('vite')

module.exports = defineConfig({
  build: {
    minify: 'terser',
    lib: {
      entry: path.resolve(__dirname, 'src/index.js'),
      name: 'divv',
      fileName: format => format === 'es' ? 'divv.js' : `divv.${format}.js`
    }
  }
})