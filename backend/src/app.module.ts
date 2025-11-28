import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { HealthModule } from "./health.module";
import { HealthController } from "./health/health.controller";

@Module({
  imports: [ConfigModule.forRoot(), HealthModule],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
