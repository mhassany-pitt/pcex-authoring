import { AppModule } from '../app.module';
import { CompilerService } from 'src/compiler-service/compiler.service';
import { NestFactory } from '@nestjs/core';
import { workerData, parentPort } from 'worker_threads';

async function runWorkerThread() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const compiler = app.get(CompilerService);
    const activity = workerData;
    const result = await compiler.compile(activity);
    parentPort.postMessage(result);
}

runWorkerThread();