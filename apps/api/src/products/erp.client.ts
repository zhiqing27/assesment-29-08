import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  ServiceUnavailableException,
} from '@nestjs/common';
import axios, { AxiosError, AxiosInstance } from 'axios';

export interface ErpProduct {
  sku: string;
  name: string;
  price: number;
  stockQuantity: number;
}

type ErpErrorData = { message: string; available: number };

const ERP_ERRORS: Record<number, (e: AxiosError<ErpErrorData>) => never> = {
  404: (e) => { throw new NotFoundException(e.response?.data?.message); },
  422: (e) => { throw new UnprocessableEntityException({
    message: e.response?.data?.message ?? 'Insufficient stock',
    available: e.response?.data?.available,
  }); },
};

@Injectable()
export class ErpClient {
  private readonly http: AxiosInstance = axios.create({
    baseURL: process.env.ERP_URL ?? 'http://localhost:3001',
  });

  constructor() {
    this.http.interceptors.response.use(null, (err: AxiosError<ErpErrorData>) => {
      const handler = ERP_ERRORS[err.response?.status ?? 0];
      if (handler) handler(err);
      throw new ServiceUnavailableException('ERP unavailable');
    });
  }

  async getProduct(sku: string): Promise<ErpProduct> {
    const r = await this.http.get<ErpProduct>(`/erp/products/${sku}`);
    return r.data;
  }

  async reserve(sku: string, quantity: number): Promise<void> {
    await this.http.patch(`/erp/products/${sku}/reserve`, { quantity });
  }
}
