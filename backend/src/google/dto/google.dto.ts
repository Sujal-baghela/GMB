import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConnectAccountDto {
  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsUUID()
  workspaceId!: string;
}

export class SyncDto {
  @ApiProperty({ required: false })
  @IsString()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  endDate?: string;
}