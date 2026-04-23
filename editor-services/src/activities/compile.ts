import { CompileWorkerModule } from './compile-worker.module';
import { CompilerService } from 'src/compiler-service/compiler.service';
import { NestFactory } from '@nestjs/core';
import { workerData, parentPort } from 'worker_threads';

async function runWorkerThread() {
    console.log('[compile worker] booting application context');
    const app = await NestFactory.createApplicationContext(CompileWorkerModule);
    try {
        console.log('[compile worker] resolving CompilerService');
        const compiler = app.get(CompilerService);
        const activity = workerData;
        console.log('[compile worker] starting compile', { id: activity?.id, name: activity?.name });
        const result = await compiler.compile(activity);
        console.log('[compile worker] compile finished, posting result');
        parentPort.postMessage(result);
    } finally {
        console.log('[compile worker] closing application context');
        await app.close().catch(() => undefined);
        console.log('[compile worker] exiting process');
        process.exit(0);
    }
}

runWorkerThread();
