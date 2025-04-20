import { Module, Logger, Global } from '@nestjs/common'
import { AppModule } from '../src/app.module'

/**
 * Special module for E2E testing that overrides critical dependencies
 */
@Global()
@Module({
  imports: [AppModule],
  providers: [
    {
      provide: Logger,
      useValue: new Logger('E2ETest'),
    },
  ],
  exports: [Logger],
})
export class TestModule {}
