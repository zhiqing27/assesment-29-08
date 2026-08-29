import { Controller, Get, Param } from '@nestjs/common';
import { ProductsService } from './products.service.js';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get(':sku')
  findOne(@Param('sku') sku: string) {
    return this.productsService.findOne(sku);
  }
}
