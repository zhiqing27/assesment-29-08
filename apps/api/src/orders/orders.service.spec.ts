import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnprocessableEntityException } from '@nestjs/common';
import { OrdersService } from './orders.service.js';

const mockRepo = {
  create: vi.fn((data) => data),
  save: vi.fn((data) => Promise.resolve({ id: 'uuid-1', ...data })),
};

const mockErp = {
  reserve: vi.fn(),
};

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OrdersService(mockRepo as any, mockErp as any);
  });

  it('creates an order when ERP reserve succeeds', async () => {
    mockErp.reserve.mockResolvedValue(undefined);
    const order = await service.create('SKU-001', 3);
    expect(order).toMatchObject({ sku: 'SKU-001', quantity: 3 });
    expect(mockErp.reserve).toHaveBeenCalledWith('SKU-001', 3);
    expect(mockRepo.save).toHaveBeenCalled();
  });

  it('propagates 422 from ERP and does not save the order', async () => {
    mockErp.reserve.mockRejectedValue(new UnprocessableEntityException('Insufficient stock'));
    await expect(service.create('SKU-001', 9999)).rejects.toThrow(UnprocessableEntityException);
    expect(mockRepo.save).not.toHaveBeenCalled();
  });
});
