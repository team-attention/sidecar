export interface CommentData {
    id: string;
    file: string;
    line: number;
    endLine?: number;
    text: string;
    codeContext: string;
    isSubmitted: boolean;
    timestamp: number;
    threadId?: string;
}

export class Comment {
    readonly id: string;
    readonly file: string;
    readonly line: number;
    readonly endLine?: number;
    readonly text: string;
    readonly codeContext: string;
    private _isSubmitted: boolean;
    readonly timestamp: number;
    readonly threadId?: string;

    constructor(data: CommentData) {
        this.id = data.id;
        this.file = data.file;
        this.line = data.line;
        this.endLine = data.endLine;
        this.text = data.text;
        this.codeContext = data.codeContext;
        this._isSubmitted = data.isSubmitted;
        this.timestamp = data.timestamp;
        this.threadId = data.threadId;
    }

    get isSubmitted(): boolean {
        return this._isSubmitted;
    }

    markAsSubmitted(): void {
        this._isSubmitted = true;
    }

    withText(newText: string): Comment {
        return new Comment({
            id: this.id,
            file: this.file,
            line: this.line,
            endLine: this.endLine,
            text: newText,
            codeContext: this.codeContext,
            isSubmitted: this._isSubmitted,
            timestamp: this.timestamp,
            threadId: this.threadId,
        });
    }

    get lineRange(): string {
        return this.endLine ? `${this.line}-${this.endLine}` : `${this.line}`;
    }

    toData(): CommentData {
        return {
            id: this.id,
            file: this.file,
            line: this.line,
            endLine: this.endLine,
            text: this.text,
            codeContext: this.codeContext,
            isSubmitted: this._isSubmitted,
            timestamp: this.timestamp,
            threadId: this.threadId,
        };
    }

    static create(params: {
        file: string;
        line: number;
        endLine?: number;
        text: string;
        codeContext: string;
        threadId?: string;
    }): Comment {
        return new Comment({
            id: Date.now().toString(),
            file: params.file,
            line: params.line,
            endLine: params.endLine,
            text: params.text,
            codeContext: params.codeContext,
            isSubmitted: false,
            timestamp: Date.now(),
            threadId: params.threadId,
        });
    }
}
