import { DiffResult } from '../../domain/entities/Diff';
import { IPanelPort } from '../ports/outbound/IPanelPort';
import {
    PanelState,
    FileInfo,
    CommentInfo,
    AIStatus,
    createInitialPanelState,
} from '../ports/outbound/PanelState';
import { IPanelStateManager } from './IPanelStateManager';

/**
 * Panel state manager implementation
 *
 * Manages UI state and automatically triggers render on changes.
 */
export class PanelStateManager implements IPanelStateManager {
    private state: PanelState;
    private panelPort: IPanelPort | null = null;
    private baselineSet: Set<string> = new Set();

    constructor() {
        this.state = createInitialPanelState();
    }

    /**
     * Set the panel port (called when panel is created)
     */
    setPanelPort(panelPort: IPanelPort): void {
        this.panelPort = panelPort;
        this.render();
    }

    /**
     * Clear the panel port (called when panel is disposed)
     */
    clearPanelPort(): void {
        this.panelPort = null;
    }

    getState(): PanelState {
        return { ...this.state };
    }

    // ===== Session file operations =====

    addSessionFile(file: FileInfo): void {
        const exists = this.state.sessionFiles.some((f) => f.path === file.path);
        if (!exists) {
            this.state = {
                ...this.state,
                sessionFiles: [...this.state.sessionFiles, file],
            };
            this.render();
        }
    }

    removeSessionFile(path: string): void {
        const newFiles = this.state.sessionFiles.filter((f) => f.path !== path);
        if (newFiles.length !== this.state.sessionFiles.length) {
            this.state = {
                ...this.state,
                sessionFiles: newFiles,
                selectedFile: this.state.selectedFile === path ? null : this.state.selectedFile,
                diff: this.state.diff?.file === path ? null : this.state.diff,
            };
            this.render();
        }
    }

    selectFile(path: string | null): void {
        if (this.state.selectedFile !== path) {
            this.state = {
                ...this.state,
                selectedFile: path,
            };
            this.render();
        }
    }

    // ===== Baseline operations =====

    setBaseline(files: FileInfo[]): void {
        this.baselineSet = new Set(files.map((f) => f.path));
        this.state = {
            ...this.state,
            uncommittedFiles: files,
        };
        this.render();
    }

    isInBaseline(path: string): boolean {
        return this.baselineSet.has(path);
    }

    moveToSession(path: string): void {
        if (!this.isInBaseline(path)) return;

        const file = this.state.uncommittedFiles.find((f) => f.path === path);
        if (!file) return;

        this.baselineSet.delete(path);

        this.state = {
            ...this.state,
            uncommittedFiles: this.state.uncommittedFiles.filter((f) => f.path !== path),
            sessionFiles: [...this.state.sessionFiles, file],
        };
        this.render();
    }

    clearBaseline(): void {
        this.baselineSet.clear();
        this.state = {
            ...this.state,
            uncommittedFiles: [],
        };
        this.render();
    }

    // ===== Toggle =====

    toggleShowUncommitted(): void {
        this.state = {
            ...this.state,
            showUncommitted: !this.state.showUncommitted,
        };
        this.render();
    }

    setShowUncommitted(show: boolean): void {
        if (this.state.showUncommitted !== show) {
            this.state = {
                ...this.state,
                showUncommitted: show,
            };
            this.render();
        }
    }

    // ===== Diff operations =====

    showDiff(diff: DiffResult): void {
        this.state = {
            ...this.state,
            diff,
            selectedFile: diff.file,
        };
        this.render();
    }

    clearDiff(): void {
        this.state = {
            ...this.state,
            diff: null,
        };
        this.render();
    }

    // ===== Comment operations =====

    addComment(comment: CommentInfo): void {
        this.state = {
            ...this.state,
            comments: [...this.state.comments, comment],
        };
        this.render();
    }

    removeComment(id: string): void {
        this.state = {
            ...this.state,
            comments: this.state.comments.filter(c => c.id !== id),
        };
        this.render();
    }

    clearComments(): void {
        this.state = {
            ...this.state,
            comments: [],
        };
        this.render();
    }

    // ===== AI status =====

    setAIStatus(status: AIStatus): void {
        this.state = {
            ...this.state,
            aiStatus: status,
        };
        this.render();
    }

    // ===== Reset =====

    reset(): void {
        this.baselineSet.clear();
        this.state = createInitialPanelState();
        this.render();
    }

    // ===== Private =====

    private render(): void {
        if (this.panelPort) {
            this.panelPort.render(this.state);
        }
    }
}
