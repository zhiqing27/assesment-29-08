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
import * as productsService_1 from './products.service.js';

@Controller('erp/products')
export class ProductsController {
  constructor(private readonly productsService: productsService_1.ProductsService) {}

  @Get(':sku')
  findOne(@Param('sku') sku: string): productsService_1.Product {
    return this.productsService.findOne(sku);
  }

  @Patch(':sku/reserve')
  @HttpCode(HttpStatus.OK)
  reserve(@Param('sku') sku: string, @Body() body: { quantity: number }) {
    const result = this.productsService.reserve(sku, body.quantity);
    if (!result.success) {
      throw new UnprocessableEntityException({
        message: 'Insufficient stock',
        available: result.available,
      });
    }
    return result;
  }
}
