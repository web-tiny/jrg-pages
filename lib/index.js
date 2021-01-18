const { 
  src,
  dest,
  parallel,
  series,
  watch
} = require("gulp");
// 统一管理gulp插件
const loadPlugins = require("gulp-load-plugins");
const plugins = loadPlugins();
// 热更新
const browseSync = require("browser-sync");
const bs = browseSync.create();
const del = require("del");
const cwd = process.cwd();

/**
 * 常用插件:
 * gulp-sass 
 * gulp-babel @babel/core @babel/preset-env
 * gulp-swig 
 * gulp-imagemin 
 * del 
 * gulp-load-plugins 
 * browser-sync 
 * gulp-useref 
 * gulp-htmlmin  // 压缩html
 * gulp-uglify // 压缩js
 * gulp-if 
 * gulp-clean-css // 压缩css
 */

let config = {
  build: {
    src: "src",
    dist: "dist",
    templates: "templates",
    public: "public",
    paths: {
      styles: "assets/styles/*.scss",
      scripts: "assets/scripts/*.js",
      pages: "*.html",
      images: "assets/images/**",
      fonts: "assets/fonts/**"
    }
  }
}

try {
  const loadConfig = require(`${cwd}/pages.config.js`);
  config = Object.assign({}, config, loadConfig);
} catch (error) {
  console.log(error)
}
const { build } = config; 
const { 
  paths,
  dist, 
  templates, 
  public 
} = build;
const { styles, scripts, pages, images, fonts } = paths;

const style = () => {
  return src(
    styles,  
    {
      sourcemaps: true, 
      base: build.src,
      cwd: build.src
    })
    .pipe(plugins.sass({ outputStyle:"expanded" }))
    .pipe(dest(templates))
    .pipe(bs.reload({ stream: true }))
} 

const script = () => {
  return src(scripts, { base: build.src, cwd: build.src })
    .pipe(plugins.babel({ presets: [require("@babel/preset-env")] }))
    .pipe(dest(templates))
    .pipe(bs.reload({ stream: true }))
}

const page = () => {
  return src(pages, { base: build.src, cwd: build.src })
    .pipe(plugins.swig({ data: config.data, defaults: { cache: false } }))
    .pipe(dest(templates))
    .pipe(bs.reload({ stream: true }))
}

// image, font, build下的文件,直接拷贝到dist目录,不用temp作为中转
const image = () => {
  return src(images, { base: build.src, cwd: build.src })
    .pipe(plugins.imagemin())
    .pipe(dest(dist))
}

const font = () => {
  return src(fonts, { base: build.src, cwd: build.src })
    .pipe(plugins.imagemin())
    .pipe(dest(dist))
}

// public下的文件直接拷贝过去
const extra = () => {
  return src(
    "**", 
    { 
      base: public, 
      cwd: public 
    })
    .pipe(dest(dist))
}

const clean = () => {
  return del([dist, templates]);
}

const useref = () => {
  return src(
    pages, 
    { 
      base: templates, 
      cwd: templates 
    })
    .pipe(plugins.useref({ searchPath: [templates, "."] }))
    // 压缩处理js, html, css
    .pipe(plugins.if(/\.js$/, plugins.uglify()))
    .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
    .pipe(plugins.if(/\.html$/, plugins.htmlmin({
      collapseWhitespace: true,
      minifyCSS: true,
      minifyJS: true
    })))
    .pipe(dest(dist))
}

const serve = () => {
  // 监听文件的变化, 两个参数,第一个参数是文件路径,第二个参数处理任务的函数
  watch(styles,{ cwd: build.src }, style)
  watch(scripts, { cwd: build.src }, script)
  watch(pages,{ cwd: build.src }, page)
  watch([
    images,
    fonts
  ], { cwd: build.src },  bs.reload)
  watch("**",{ cwd: public }, bs.reload)

  bs.init({
    notify: false,
    port: 8888,
    server: {
      baseDir: [templates, dist, public],
      routes: {
        "/node_modules": "node_modules"
      }
    }
  })
}

const compile = parallel(style, script, page);

const builds = series(
  clean, 
  parallel(
    series(compile, useref), 
    image, 
    font, 
    extra
  )
);

const dev = series(compile, serve)

module.exports = {
  clean,
  builds,
  dev,
}