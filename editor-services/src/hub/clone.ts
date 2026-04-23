import { CloneWorkerModule } from './clone-worker.module';
import { CloneService } from './clone.service';
import { NestFactory } from '@nestjs/core';
import { workerData, parentPort } from 'worker_threads';

async function runWorkerThread() {
    console.log('[clone worker] booting application context');
    const app = await NestFactory.createApplicationContext(CloneWorkerModule);
    try {
        console.log('[clone worker] resolving CloneService');
        const genai = app.get(CloneService);
        const inputs = workerData;
        console.log('[clone worker] starting clone', { id: inputs?.id, name: inputs?.name, user: inputs?.user });
        const result = await genai.clone(inputs);
        console.log('[clone worker] clone finished, posting result');
        parentPort.postMessage(result);
    } finally {
        console.log('[clone worker] closing application context');
        await app.close().catch(() => undefined);
        console.log('[clone worker] exiting process');
        process.exit(0);
    }
}

runWorkerThread();
