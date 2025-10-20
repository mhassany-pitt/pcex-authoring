import { AppModule } from '../app.module';
import { CloneService } from './clone.service';
import { NestFactory } from '@nestjs/core';
import { workerData, parentPort } from 'worker_threads';

async function runWorkerThread() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const genai = app.get(CloneService);
    const inputs = workerData;
    const result = await genai.clone(inputs);
    parentPort.postMessage(result);
}

runWorkerThread();