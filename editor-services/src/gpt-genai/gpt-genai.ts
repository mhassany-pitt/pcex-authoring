import { AppModule } from '../app.module';
import { GptGenaiService } from './gpt-genai.service';
import { NestFactory } from '@nestjs/core';
import { workerData, parentPort } from 'worker_threads';

async function runWorkerThread() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const genai = app.get(GptGenaiService);
    const inputs = workerData;
    const result = await genai.generate(inputs);
    parentPort.postMessage(result);
}

runWorkerThread();