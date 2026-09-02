import { IsInt, Min } from 'class-validator';

export class ReserveProductDto {
  @IsInt()
  @Min(1)
  quantity: number;
}
