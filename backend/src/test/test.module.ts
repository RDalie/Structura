import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestSchema } from './test.schema';
import { TestService } from './test.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Test.name, schema: TestSchema }])],
  providers: [TestService],
})
export class TestModule {}
