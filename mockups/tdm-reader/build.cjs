const fs = require('fs');
const path = require('path');
const webpack = require('webpack');

const outputDirectory = path.resolve(__dirname, '..');
const filename = 'systemlink-tdm-reader.html';

webpack({
  mode: 'production',
  entry: path.join(__dirname, 'page.ts'),
  output: { path: outputDirectory, filename: 'tdm-reader-inline.js' },
  resolve: { extensions: ['.ts', '.js'] },
  module: {
    rules: [
      { test: /\.ts$/, exclude: /node_modules/, use: {
        loader: 'swc-loader',
        options: { jsc: { parser: { syntax: 'typescript' }, target: 'es2020' } },
      } },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      { test: /\.scss$/, use: ['style-loader', 'css-loader', 'sass-loader'] },
      { test: /\.(woff2?|ttf|eot|otf|svg|png)$/, type: 'asset/inline' },
      { test: /\.m?js$/, include: /node_modules[\\/]@ni[\\/]/, sideEffects: true, resolve: { fullySpecified: false } },
    ],
  },
  performance: false,
  plugins: [{
    apply(compiler) {
      compiler.hooks.thisCompilation.tap('StandaloneHtml', compilation => {
        compilation.hooks.processAssets.tap(
          { name: 'StandaloneHtml', stage: webpack.Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE },
          () => {
            const script = compilation.getAsset('tdm-reader-inline.js').source.source().toString();
            const template = fs.readFileSync(path.join(__dirname, 'page.html'), 'utf8');
            const notices = Object.keys(compilation.assets)
              .filter(name => name.endsWith('.LICENSE.txt'))
              .map(name => compilation.getAsset(name).source.source().toString());
            notices.push(fs.readFileSync(require.resolve('smart-webcomponents-react/source/modules/smart.querybuilder.js'), 'utf8')
              .split('*/', 1)[0] + '*/');
            const html = template.replace('<!-- INLINE_SCRIPT -->', () =>
              `<script>${script.replace(/<\/script/gi, '<\\/script')}</script>\n` +
              `<script type="text/plain" id="third-party-notices">${notices.join('\n\n').replace(/<\/script/gi, '<\\/script')}</script>`);
            for (const name of Object.keys(compilation.assets)) {
              compilation.deleteAsset(name);
            }
            compilation.emitAsset(filename, new webpack.sources.RawSource(html));
          }
        );
      });
    },
  }],
}, (error, stats) => {
  if (error || stats.hasErrors()) {
    console.error(error || stats.toString({ all: false, errors: true }));
    process.exitCode = 1;
    return;
  }
  console.log(stats.toString({ all: false, warnings: true }));
  console.log(`Created ${path.join(outputDirectory, filename)}`);
});
