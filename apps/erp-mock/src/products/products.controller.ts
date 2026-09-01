import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { Product } from './product.entity.js';

@Controller('erp/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get(':sku')
  findOne(@Param('sku') sku: string): Promise<Product> {
    return this.productsService.findOne(sku);
  }

  @Patch(':sku/reserve')
  @HttpCode(HttpStatus.OK)
  async reserve(@Param('sku') sku: string, @Body() body: { quantity: number }) {
    const result = await this.productsService.reserve(sku, body.quantity);
    if (!result.success) {
      throw new UnprocessableEntityException({
        message: 'Insufficient stock',
        available: result.available,
      });
    }
    return result;
  }
}
