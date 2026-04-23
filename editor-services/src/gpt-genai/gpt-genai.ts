import { GptGenaiWorkerModule } from './gpt-genai-worker.module';
import { GptGenaiService } from './gpt-genai.service';
import { NestFactory } from '@nestjs/core';
import { workerData, parentPort } from 'worker_threads';

async function runWorkerThread() {
    console.log('[gpt-genai worker] booting application context');
    const app = await NestFactory.createApplicationContext(GptGenaiWorkerModule);
    try {
        console.log('[gpt-genai worker] resolving GptGenaiService');
        const genai = app.get(GptGenaiService);
        const inputs = workerData;
        console.log('[gpt-genai worker] starting generation', { action: inputs?.action, id: inputs?.id, user: inputs?.user });
        const result = await genai.generate(inputs);
        console.log('[gpt-genai worker] generation finished, posting result');
        parentPort.postMessage(result);
    } finally {
        console.log('[gpt-genai worker] closing application context');
        await app.close().catch(() => undefined);
        console.log('[gpt-genai worker] exiting process');
        process.exit(0);
    }
}

runWorkerThread();
