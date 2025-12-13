import * as vscode from 'vscode';
import { SessionContext } from '../../../application/ports/outbound/SessionContext';
import { ThreadListWebviewProvider, CreateThreadOptions } from '../ui/ThreadListWebviewProvider';
import { SidecarPanelAdapter } from '../ui/SidecarPanelAdapter';
import { ITerminalPort } from '../../../application/ports/outbound/ITerminalPort';
import { ICreateThreadUseCase, IsolationMode } from '../../../application/ports/inbound/ICreateThreadUseCase';

export class ThreadListController {
    private webviewProvider: ThreadListWebviewProvider | undefined;
    private selectedThreadId: string | null = null; // null = "All Agents"
    private disposables: vscode.Disposable[] = [];

    constructor(
        private readonly getSessions: () => Map<string, SessionContext>,
        private readonly terminalGateway: ITerminalPort,
        private readonly createThreadUseCase?: ICreateThreadUseCase,
        private readonly attachSidecar?: (terminalId: string) => Promise<void>
    ) {}

    activate(context: vscode.ExtensionContext): void {
        // Create webview provider
        this.webviewProvider = new ThreadListWebviewProvider(
            context.extensionUri,
            this.getSessions,
            (id) => this.selectThread(id),
            (options) => this.createThreadFromInput(options)
        );

        // Register webview view provider
        const registration = vscode.window.registerWebviewViewProvider(
            ThreadListWebviewProvider.viewType,
            this.webviewProvider
        );
        context.subscriptions.push(registration);
        this.disposables.push(registration);

        // Register select command
        this.disposables.push(
            vscode.commands.registerCommand('sidecar.selectThread', (id: string) => {
                this.selectThread(id);
            })
        );

        // Set context for keyboard shortcut
        this.updateContextKey();
    }

    /**
     * Select a thread by ID.
     */
    selectThread(id: string): void {
        const sessions = this.getSessions();
        const context = sessions.get(id);

        if (!context) {
            return;
        }

        this.selectedThreadId = id;
        this.webviewProvider?.setSelectedId(id);

        // Set agent info
        const metadata = context.session.agentMetadata;
        if (metadata) {
            context.stateManager.setAgentInfo({
                name: metadata.name,
                status: metadata.status
            });
        }

        // Show terminal for this session
        this.terminalGateway.showTerminal(id);

        // Show panel for this session
        const panel = SidecarPanelAdapter.getPanel(id);
        if (panel) {
            panel.show();
        }
    }

    /**
     * Get currently selected thread ID.
     */
    getSelectedThreadId(): string | null {
        return this.selectedThreadId;
    }

    /**
     * Cycle to next thread.
     */
    cycleToNextThread(): void {
        const sessions = this.getSessions();
        const sessionIds = Array.from(sessions.keys());

        if (sessionIds.length === 0) {
            return;
        }

        const currentIndex = this.selectedThreadId
            ? sessionIds.indexOf(this.selectedThreadId)
            : -1;
        const nextIndex = (currentIndex + 1) % sessionIds.length;

        this.selectThread(sessionIds[nextIndex]);
    }

    /**
     * Refresh thread list.
     * Call when sessions change.
     */
    refresh(): void {
        this.webviewProvider?.refresh();
        this.updateContextKey();
    }

    /**
     * Create a thread from webview input.
     */
    private async createThreadFromInput(options: CreateThreadOptions): Promise<void> {
        if (!this.createThreadUseCase) {
            vscode.window.showErrorMessage('Create thread use case not available');
            return;
        }

        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        try {
            const result = await this.createThreadUseCase.execute({
                name: options.name.trim(),
                isolationMode: options.isolationMode,
                branchName: options.branchName?.trim(),
                workspaceRoot,
            });

            // Auto-attach Sidecar to the new terminal
            if (this.attachSidecar) {
                await this.attachSidecar(result.threadState.terminalId);
            }

            // Refresh and select new thread
            this.refresh();
            this.selectThread(result.threadState.terminalId);

            vscode.window.showInformationMessage(`Agent "${options.name.trim()}" created`);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to create agent: ${message}`);
        }
    }

    /**
     * Create a new agent thread with interactive quick pick flow.
     */
    async createThread(): Promise<void> {
        if (!this.createThreadUseCase) {
            vscode.window.showErrorMessage('Create thread use case not available');
            return;
        }

        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        // Step 1: Name input
        const name = await vscode.window.showInputBox({
            prompt: 'Enter agent name',
            placeHolder: 'fix-login-bug',
            validateInput: (value) => value.trim() ? null : 'Name is required',
        });
        if (!name) return;

        // Step 2: Isolation mode
        const isolationPick = await vscode.window.showQuickPick([
            { label: 'Current workspace', description: 'No isolation', mode: 'none' as IsolationMode },
            { label: 'New branch', description: 'Create a new git branch', mode: 'branch' as IsolationMode },
            { label: 'New worktree', description: 'Recommended for parallel work', mode: 'worktree' as IsolationMode },
        ], {
            placeHolder: 'Select isolation mode',
        });
        if (!isolationPick) return;

        // Step 3: Branch name (if needed)
        let branchName: string | undefined;
        if (isolationPick.mode !== 'none') {
            branchName = await vscode.window.showInputBox({
                prompt: 'Branch name',
                value: name.trim(),
                placeHolder: name.trim(),
            });
            if (branchName === undefined) return;
        }

        // Execute
        try {
            const result = await this.createThreadUseCase.execute({
                name: name.trim(),
                isolationMode: isolationPick.mode,
                branchName: branchName?.trim(),
                workspaceRoot,
            });

            // Auto-attach Sidecar to the new terminal
            if (this.attachSidecar) {
                await this.attachSidecar(result.threadState.terminalId);
            }

            // Refresh and select new thread
            this.refresh();
            this.selectThread(result.threadState.terminalId);

            vscode.window.showInformationMessage(`Agent "${name.trim()}" created`);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to create agent: ${message}`);
        }
    }

    /**
     * Get workspace root folder path.
     */
    private getWorkspaceRoot(): string | undefined {
        return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    }

    /**
     * Update context key for keyboard shortcut condition.
     */
    private updateContextKey(): void {
        const sessions = this.getSessions();
        vscode.commands.executeCommand(
            'setContext',
            'sidecar.hasMultipleThreads',
            sessions.size > 1
        );
    }

    dispose(): void {
        for (const d of this.disposables) {
            d.dispose();
        }
    }
}
