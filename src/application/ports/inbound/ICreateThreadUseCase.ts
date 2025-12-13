import { ThreadState } from '../../../domain/entities/ThreadState';

export type IsolationMode = 'none' | 'branch' | 'worktree';

export interface CreateThreadInput {
    name: string;
    isolationMode: IsolationMode;
    branchName?: string;
    workspaceRoot: string;
}

export interface CreateThreadOutput {
    threadState: ThreadState;
}

export interface ICreateThreadUseCase {
    execute(input: CreateThreadInput): Promise<CreateThreadOutput>;
}
