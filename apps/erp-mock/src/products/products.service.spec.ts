import { describe, it, expect, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service.js';

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(() => {
    service = new ProductsService();
  });

  it('returns product for known SKU', () => {
    const p = service.findOne('SKU-001');
    expect(p.sku).toBe('SKU-001');
    expect(p.name).toBeDefined();
  });

  it('throws NotFoundException for unknown SKU', () => {
    expect(() => service.findOne('NOPE')).toThrow(NotFoundException);
  });

  it('decrements stock on successful reserve', () => {
    const before = service.findOne('SKU-001').stockQuantity;
    const result = service.reserve('SKU-001', 5);
    expect(result.success).toBe(true);
    expect(service.findOne('SKU-001').stockQuantity).toBe(before - 5);
  });

  it('returns success:false and does not decrement when stock is insufficient', () => {
    const before = service.findOne('SKU-002').stockQuantity;
    const result = service.reserve('SKU-002', 9999);
    expect(result.success).toBe(false);
    expect(result.available).toBe(before);
    expect(service.findOne('SKU-002').stockQuantity).toBe(before);
  });

  it('throws NotFoundException when reserving unknown SKU', () => {
    expect(() => service.reserve('NOPE', 1)).toThrow(NotFoundException);
  });
});
