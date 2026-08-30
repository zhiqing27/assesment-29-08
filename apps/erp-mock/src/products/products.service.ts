import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity.js';

const SEED: Partial<Product>[] = [
  { sku: 'SKU-001', name: 'Wireless Mouse',      price: 29.99, stockQuantity: 50 },
  { sku: 'SKU-002', name: 'Mechanical Keyboard', price: 89.99, stockQuantity: 15 },
  { sku: 'SKU-003', name: 'USB-C Hub',           price: 49.99, stockQuantity: 0  },
  { sku: 'SKU-004', name: 'Monitor Stand',        price: 39.99, stockQuantity: 8  },
];

@Injectable()
export class ProductsService implements OnModuleInit {
  constructor(
    @InjectRepository(Product) private readonly repo: Repository<Product>,
  ) {}

  async onModuleInit() {
    const count = await this.repo.count();
    if (count === 0) await this.repo.save(SEED);
  }

  async findOne(sku: string): Promise<Product> {
    const product = await this.repo.findOneBy({ sku });
    if (!product) throw new NotFoundException(`SKU ${sku} not found`);
    return product;
  }

  async reserve(sku: string, quantity: number): Promise<{ success: boolean; available: number }> {
    const product = await this.repo.findOneBy({ sku });
    if (!product) throw new NotFoundException(`SKU ${sku} not found`);
    if (product.stockQuantity < quantity) {
      return { success: false, available: product.stockQuantity };
    }
    product.stockQuantity -= quantity;
    await this.repo.save(product);
    return { success: true, available: product.stockQuantity };
  }
}
