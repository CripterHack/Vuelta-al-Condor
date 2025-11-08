module.exports = {
  plugins: [
    require('autoprefixer')({
      overrideBrowserslist: ['>0.5%', 'last 2 versions', 'Firefox ESR', 'not dead'],
      grid: true
    }),
    require('cssnano')({ preset: 'default' })
  ]
};