import { ThreadState } from '../../../domain/entities/ThreadState';

export interface IThreadStateRepository {
    save(state: ThreadState): Promise<void>;
    findAll(): Promise<ThreadState[]>;
    findById(threadId: string): Promise<ThreadState | null>;
    findByTerminalId(terminalId: string): Promise<ThreadState | null>;
    delete(threadId: string): Promise<boolean>;
    updateWhitelist(threadId: string, patterns: string[]): Promise<void>;
}
