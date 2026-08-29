import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';
import { ErpClient } from './erp.client.js';

@Module({
  imports: [HttpModule],
  controllers: [ProductsController],
  providers: [ProductsService, ErpClient],
  exports: [ErpClient],
})
export class ProductsModule {}
