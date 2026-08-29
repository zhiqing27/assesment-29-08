import { Injectable } from '@nestjs/common';
import { ErpClient } from './erp.client.js';

@Injectable()
export class ProductsService {
  constructor(private readonly erp: ErpClient) {}

  async findOne(sku: string) {
    const product = await this.erp.getProduct(sku);
    return { ...product, availability: product.stockQuantity > 0 };
  }
}
