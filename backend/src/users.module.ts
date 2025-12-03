import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma.module';
import { UsersService } from './user.service';

@Module({
  imports: [PrismaModule],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
