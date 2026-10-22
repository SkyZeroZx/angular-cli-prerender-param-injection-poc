import { Routes } from '@angular/router';
import { HomePage } from './pages/home';
import { ProductPage } from './pages/product';

export const routes: Routes = [
  { path: '', component: HomePage },

  // One prerendered page per row in the products table.
  { path: 'product/:slug', component: ProductPage },

  // Legacy campaign short links, kept alive as prerendered redirects.
  // `redirectTo` is relative, so @angular/ssr resolves it against the parent
  // path after substituting :code with the value from the backend.
  {
    path: 'go/:code',
    children: [{ path: '', redirectTo: 'claimed', pathMatch: 'full' }],
  },
];
