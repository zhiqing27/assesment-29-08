import { Injectable, NotFoundException } from '@nestjs/common';

export interface Product {
  sku: string;
  name: string;
  price: number;
  stockQuantity: number;
}

@Injectable()
export class ProductsService {
  private readonly catalogue = new Map<string, Product>([
    ['SKU-001', { sku: 'SKU-001', name: 'Wireless Mouse', price: 29.99, stockQuantity: 50 }],
    ['SKU-002', { sku: 'SKU-002', name: 'Mechanical Keyboard', price: 89.99, stockQuantity: 15 }],
    ['SKU-003', { sku: 'SKU-003', name: 'USB-C Hub', price: 49.99, stockQuantity: 0 }],
    ['SKU-004', { sku: 'SKU-004', name: 'Monitor Stand', price: 39.99, stockQuantity: 8 }],
  ]);

  findOne(sku: string): Product {
    const product = this.catalogue.get(sku);
    if (!product) throw new NotFoundException(`SKU ${sku} not found`);
    return { ...product };
  }

  reserve(sku: string, quantity: number): { success: boolean; available: number } {
    const product = this.catalogue.get(sku);
    if (!product) throw new NotFoundException(`SKU ${sku} not found`);
    if (product.stockQuantity < quantity) {
      return { success: false, available: product.stockQuantity };
    }
    product.stockQuantity -= quantity;
    return { success: true, available: product.stockQuantity };
  }
}
