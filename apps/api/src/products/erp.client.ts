import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

export interface ErpProduct {
  sku: string;
  name: string;
  price: number;
  stockQuantity: number;
}

@Injectable()
export class ErpClient {
  private readonly baseUrl = process.env.ERP_URL ?? 'http://localhost:3001';

  constructor(private readonly http: HttpService) {}

  async getProduct(sku: string): Promise<ErpProduct> {
    return this.call(() =>
      firstValueFrom(this.http.get<ErpProduct>(`${this.baseUrl}/erp/products/${sku}`)),
    ).then((r) => r.data);
  }

  async reserve(sku: string, quantity: number): Promise<void> {
    await this.call(() =>
      firstValueFrom(
        this.http.patch(`${this.baseUrl}/erp/products/${sku}/reserve`, { quantity }),
      ),
    );
  }

  private async call<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      const e = err as AxiosError<{ message: string; available: number }>;
      const status = e.response?.status;
      if (status === 404) throw new NotFoundException(e.response?.data?.message);
      if (status === 422)
        throw new UnprocessableEntityException({
          message: e.response?.data?.message ?? 'Insufficient stock',
          available: e.response?.data?.available,
        });
      throw new ServiceUnavailableException('ERP unavailable');
    }
  }
}
