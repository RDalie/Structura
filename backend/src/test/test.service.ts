import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Test } from './test.schema';

@Injectable()
export class TestService {
  constructor(@InjectModel(Test.name) private testModel: Model<Test>) {}

  async createTestDocument() {
    // create or find something in the Test collection
    return this.testModel.create({ name: 'hello' });
  }
}
