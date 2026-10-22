import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-product',
  template: `
    <h1>Product</h1>
    <!-- Angular's template layer escapes this value correctly. -->
    <p>slug: {{ slug }}</p>
  `,
})
export class ProductPage {
  protected readonly slug = inject(ActivatedRoute).snapshot.paramMap.get('slug') ?? '';
}
