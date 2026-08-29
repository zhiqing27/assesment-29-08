import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErpClient } from '../products/erp.client.js';
import { Order } from './order.entity.js';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    private readonly erp: ErpClient,
  ) {}

  async create(sku: string, quantity: number): Promise<Order> {
    await this.erp.reserve(sku, quantity);
    const order = this.orders.create({ sku, quantity });
    return this.orders.save(order);
  }
}
