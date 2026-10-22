import { RenderMode, ServerRoute } from '@angular/ssr';
import { listProductSlugs, listShortlinkCodes } from './cms/cms.server';

// Route parameters come from the backend, as documented:
// https://angular.dev/guide/ssr#prerendering-parameterized-routes
export const serverRoutes: ServerRoute[] = [
  {
    path: 'product/:slug',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => (await listProductSlugs()).map((slug) => ({ slug })),
  },
  {
    path: 'go/:code',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => (await listShortlinkCodes()).map((code) => ({ code })),
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
