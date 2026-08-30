import { Controller, Post, Body, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service.js';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: { sku: string; quantity: number }) {
    if (!body.sku || !Number.isInteger(body.quantity) || body.quantity < 1) {
      throw new BadRequestException('sku is required and quantity must be a positive integer');
    }
    return this.ordersService.create(body.sku, body.quantity);
  }
}
