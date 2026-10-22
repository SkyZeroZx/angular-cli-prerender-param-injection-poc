/**
 * The application's data layer, read at prerender time.
 *
 * This is the pattern the Angular docs prescribe for `getPrerenderParams()`:
 *
 *   async getPrerenderParams() {
 *     const dataService = inject(PostService);
 *     const ids = await dataService.getIds();
 *     return ids.map((id) => ({ id }));
 *   }
 *
 * The values are rows from the backend, not source code.
 */

export async function listProductSlugs(): Promise<string[]> {
  const rows = (await (
    await fetch('http://localhost:4300/api/products')
  ).json()) as { slug: string }[];

  return rows.map((row) => row.slug);
}

export async function listShortlinkCodes(): Promise<string[]> {
  const rows = (await (
    await fetch('http://localhost:4300/api/shortlinks')
  ).json()) as { code: string }[];

  return rows.map((row) => row.code);
}
