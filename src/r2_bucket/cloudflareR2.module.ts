import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CloudflareService } from './cloudflare.service';
import { FileValidationPipe } from './pipes/file-validation.pipe';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [CloudflareService, FileValidationPipe],
  exports: [CloudflareService, FileValidationPipe],
})
export class CloudflareR2Module {}
