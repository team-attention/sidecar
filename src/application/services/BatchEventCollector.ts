/**
 * File change event for batch processing.
 */
export interface FileChangeEvent {
    uri: { fsPath: string };
    type: 'create' | 'change' | 'delete';
    timestamp: number;
    source: 'git' | 'whitelist';
}

/**
 * Options for BatchEventCollector.
 */
export interface BatchEventCollectorOptions {
    /** Maximum time to collect events before flush (ms). Default: 100 */
    batchWindowMs?: number;
    /** Idle time after last event before flush (ms). Default: 50 */
    batchIdleMs?: number;
}

/**
 * Callback type for batch ready events.
 */
export type BatchReadyCallback = (events: FileChangeEvent[]) => void;

/**
 * Disposable subscription handle.
 */
export interface Disposable {
    dispose(): void;
}

/**
 * Interface for batch event collector.
 */
export interface IBatchEventCollector extends Disposable {
    /** Add event to current batch */
    addEvent(event: FileChangeEvent): void;

    /** Force immediate flush */
    flush(): Promise<void>;

    /** Cancel pending batch without firing */
    cancel(): void;

    /** Subscribe to batch ready events. Returns disposable to unsubscribe. */
    onBatchReady(callback: BatchReadyCallback): Disposable;

    /** Current pending event count */
    readonly pendingCount: number;
}

/**
 * Batch event collector with dual-timer strategy.
 *
 * - Window timer: Maximum latency guarantee (default: 100ms)
 * - Idle timer: Quick response when events stop (default: 50ms)
 *
 * Whichever timer fires first triggers the batch flush.
 */
export class BatchEventCollector implements IBatchEventCollector {
    private pendingEvents: FileChangeEvent[] = [];
    private windowTimer: NodeJS.Timeout | undefined;
    private idleTimer: NodeJS.Timeout | undefined;
    private listeners: BatchReadyCallback[] = [];

    private readonly batchWindowMs: number;
    private readonly batchIdleMs: number;

    constructor(options: BatchEventCollectorOptions = {}) {
        this.batchWindowMs = options.batchWindowMs ?? 100;
        this.batchIdleMs = options.batchIdleMs ?? 50;
    }

    addEvent(event: FileChangeEvent): void {
        this.pendingEvents.push(event);

        // Start window timer on first event
        if (!this.windowTimer) {
            this.windowTimer = setTimeout(() => this.doFlush(), this.batchWindowMs);
        }

        // Reset idle timer on every event
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
        }
        this.idleTimer = setTimeout(() => this.doFlush(), this.batchIdleMs);
    }

    async flush(): Promise<void> {
        this.doFlush();
    }

    cancel(): void {
        this.clearTimers();
        this.pendingEvents = [];
    }

    onBatchReady(callback: BatchReadyCallback): Disposable {
        this.listeners.push(callback);
        return {
            dispose: () => {
                const index = this.listeners.indexOf(callback);
                if (index >= 0) {
                    this.listeners.splice(index, 1);
                }
            }
        };
    }

    private doFlush(): void {
        this.clearTimers();

        if (this.pendingEvents.length === 0) return;

        const events = this.pendingEvents;
        this.pendingEvents = [];

        // Notify all listeners
        for (const listener of this.listeners) {
            listener(events);
        }
    }

    private clearTimers(): void {
        if (this.windowTimer) {
            clearTimeout(this.windowTimer);
            this.windowTimer = undefined;
        }
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
            this.idleTimer = undefined;
        }
    }

    get pendingCount(): number {
        return this.pendingEvents.length;
    }

    dispose(): void {
        this.cancel();
        this.listeners = [];
    }
}

/**
 * Coalesce file events to keep only the latest event per path.
 * Handles special cases:
 * - Delete after create: removes the file entirely (no event)
 * - Multiple changes: keeps latest event only
 */
export function coalesceFileEvents(events: FileChangeEvent[]): FileChangeEvent[] {
    const latest = new Map<string, FileChangeEvent>();

    for (const event of events) {
        const existing = latest.get(event.uri.fsPath);

        if (existing) {
            // Handle delete after create: result is no event (file never existed)
            if (event.type === 'delete' && existing.type === 'create') {
                latest.delete(event.uri.fsPath);
                continue;
            }
        }

        // Keep latest event for path
        latest.set(event.uri.fsPath, event);
    }

    return Array.from(latest.values());
}
