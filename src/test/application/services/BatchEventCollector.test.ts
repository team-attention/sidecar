import * as assert from 'assert';
import {
    BatchEventCollector,
    FileChangeEvent,
    coalesceFileEvents
} from '../../../application/services/BatchEventCollector';

/**
 * Unit tests for BatchEventCollector.
 *
 * Tests the batch event collection and coalescing mechanism.
 */

/** Helper to create a test file change event */
function createEvent(
    fsPath: string,
    type: 'create' | 'change' | 'delete' = 'change',
    timestamp: number = Date.now()
): FileChangeEvent {
    return {
        uri: { fsPath },
        type,
        timestamp,
        source: 'whitelist'
    };
}

suite('BatchEventCollector', () => {
    suite('addEvent', () => {
        test('should collect events without immediate flush', () => {
            const collector = new BatchEventCollector();
            collector.addEvent(createEvent('/file1.ts'));
            assert.strictEqual(collector.pendingCount, 1);
            collector.dispose();
        });

        test('should accumulate multiple events', () => {
            const collector = new BatchEventCollector();
            collector.addEvent(createEvent('/file1.ts'));
            collector.addEvent(createEvent('/file2.ts'));
            assert.strictEqual(collector.pendingCount, 2);
            collector.dispose();
        });
    });

    suite('flush', () => {
        test('should immediately process pending events', async () => {
            const collector = new BatchEventCollector();
            let receivedBatch: FileChangeEvent[] = [];
            collector.onBatchReady(batch => {
                receivedBatch = batch;
            });

            collector.addEvent(createEvent('/file1.ts'));
            await collector.flush();

            assert.strictEqual(receivedBatch.length, 1);
            assert.strictEqual(receivedBatch[0].uri.fsPath, '/file1.ts');
            assert.strictEqual(collector.pendingCount, 0);
            collector.dispose();
        });

        test('should be safe to call with no pending events', async () => {
            const collector = new BatchEventCollector();
            let callCount = 0;
            collector.onBatchReady(() => {
                callCount++;
            });

            await collector.flush();
            assert.strictEqual(callCount, 0);
            collector.dispose();
        });
    });

    suite('cancel', () => {
        test('should clear pending events without firing', () => {
            const collector = new BatchEventCollector();
            let callCount = 0;
            collector.onBatchReady(() => {
                callCount++;
            });

            collector.addEvent(createEvent('/file1.ts'));
            collector.cancel();

            assert.strictEqual(collector.pendingCount, 0);
            assert.strictEqual(callCount, 0);
            collector.dispose();
        });
    });

    suite('dispose', () => {
        test('should cancel pending events on dispose', async () => {
            const collector = new BatchEventCollector();
            let callCount = 0;
            collector.onBatchReady(() => {
                callCount++;
            });

            collector.addEvent(createEvent('/file1.ts'));
            collector.dispose();

            // Wait a bit to ensure timers would have fired
            await new Promise(resolve => setTimeout(resolve, 200));
            assert.strictEqual(callCount, 0);
        });
    });
});

suite('coalesceFileEvents', () => {
    test('should keep latest event per path', () => {
        const events = [
            createEvent('/file1.ts', 'change', 100),
            createEvent('/file1.ts', 'change', 200),
            createEvent('/file1.ts', 'change', 150)
        ];

        const result = coalesceFileEvents(events);

        assert.strictEqual(result.length, 1);
        // Latest in array (not by timestamp)
        assert.strictEqual(result[0].timestamp, 150);
    });

    test('should remove file when delete follows create', () => {
        const events = [
            createEvent('/file1.ts', 'create'),
            createEvent('/file1.ts', 'delete')
        ];

        const result = coalesceFileEvents(events);
        assert.strictEqual(result.length, 0);
    });

    test('should keep different paths separate', () => {
        const events = [
            createEvent('/file1.ts', 'change'),
            createEvent('/file2.ts', 'create'),
            createEvent('/file3.ts', 'delete')
        ];

        const result = coalesceFileEvents(events);
        assert.strictEqual(result.length, 3);
    });

    test('should handle empty array', () => {
        const result = coalesceFileEvents([]);
        assert.strictEqual(result.length, 0);
    });

    test('should handle single event', () => {
        const events = [createEvent('/file1.ts', 'create')];
        const result = coalesceFileEvents(events);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].type, 'create');
    });

    test('should handle delete after modify (keeps delete)', () => {
        const events = [
            createEvent('/file1.ts', 'change'),
            createEvent('/file1.ts', 'delete')
        ];

        const result = coalesceFileEvents(events);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].type, 'delete');
    });

    test('should handle modify after create (keeps modify)', () => {
        const events = [
            createEvent('/file1.ts', 'create'),
            createEvent('/file1.ts', 'change')
        ];

        const result = coalesceFileEvents(events);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].type, 'change');
    });

    test('should handle complex sequence', () => {
        const events = [
            createEvent('/a.ts', 'create'),
            createEvent('/b.ts', 'change'),
            createEvent('/a.ts', 'change'),
            createEvent('/c.ts', 'create'),
            createEvent('/b.ts', 'delete'),
            createEvent('/c.ts', 'delete') // delete after create = nothing
        ];

        const result = coalesceFileEvents(events);

        // a.ts: create -> change = change
        // b.ts: change -> delete = delete
        // c.ts: create -> delete = nothing
        assert.strictEqual(result.length, 2);

        const aFile = result.find(e => e.uri.fsPath === '/a.ts');
        const bFile = result.find(e => e.uri.fsPath === '/b.ts');
        const cFile = result.find(e => e.uri.fsPath === '/c.ts');

        assert.ok(aFile);
        assert.strictEqual(aFile?.type, 'change');
        assert.ok(bFile);
        assert.strictEqual(bFile?.type, 'delete');
        assert.strictEqual(cFile, undefined);
    });
});
