# vendor/

`ajv.min.js` is Ajv 8.20.0 (MIT, https://ajv.js.org) bundled into one browser script that sets `window.Ajv`.
GLIDE has no build step, so it is committed. It validates layouts against the standalone files in `../schemas/`.

Rebuild (only to upgrade Ajv):

```sh
npm i -D ajv@8
echo "const A=require('ajv');module.exports=A.default||A;" > .ajv-entry.cjs
npx esbuild .ajv-entry.cjs --bundle --minify --format=iife --global-name=__AjvModule --platform=browser \
  --outfile=vendor/ajv.min.js --footer:js="window.Ajv=__AjvModule;"
rm .ajv-entry.cjs
```
