export interface ITerminalPort {
    sendText(terminalId: string, text: string): void;
    showTerminal(terminalId: string): void;
    createTerminal(name: string, cwd?: string): Promise<string>;
}
