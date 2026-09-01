import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('erp_products')
export class Product {
  @PrimaryColumn()
  sku: string;

  @Column()
  name: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column('int')
  stockQuantity: number;
}
