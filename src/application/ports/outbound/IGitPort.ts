export type FileStatus = 'added' | 'modified' | 'deleted';

export interface IGitPort {
    getDiff(workspaceRoot: string, relativePath: string): Promise<string>;
    isGitRepository(workspaceRoot: string): Promise<boolean>;
    getUncommittedFiles(workspaceRoot: string): Promise<string[]>;
    getFileStatus(workspaceRoot: string, relativePath: string): Promise<FileStatus>;
    getUncommittedFilesWithStatus(workspaceRoot: string): Promise<Array<{ path: string; status: FileStatus }>>;
    getCurrentBranch(workspaceRoot: string): Promise<string>;
    createBranch(name: string, workspaceRoot: string): Promise<void>;
    createWorktree(path: string, branch: string, workspaceRoot: string): Promise<void>;
    getWorktreeRoot(workspaceRoot: string): Promise<string | null>;
}
