import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { MongoModule } from './infrastructure/mongodb/mongo.module';
import { TestModule } from './test/test.module';
import { GraphModule } from './infrastructure/neo4j/graph.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        PORT: Joi.number().port().default(3000),
        // Restrict CORS origins to absolute http/https URLs to avoid unsafe schemes.
        CORS_ORIGIN: Joi.string()
          .uri({ scheme: ['http', 'https'] })
          .optional(),
        MONGO_URI: Joi.string()
          .uri({ scheme: ['mongodb', 'mongodb+srv'] })
          .default('mongodb://127.0.0.1:27017/structura'),
      }).options({ abortEarly: false }),
    }),
    HealthModule,
    PrismaModule,
    UsersModule,
    // Default to local Docker compose Mongo (port 27017, DB "structura") and allow override via env.
    MongoModule,
    TestModule,
    GraphModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
