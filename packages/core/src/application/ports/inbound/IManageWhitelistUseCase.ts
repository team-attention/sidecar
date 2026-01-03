export interface AddWhitelistPatternInput {
    threadId: string;
    pattern: string;
}

export interface RemoveWhitelistPatternInput {
    threadId: string;
    pattern: string;
}

export interface GetWhitelistPatternsInput {
    threadId: string;
}

export interface IManageWhitelistUseCase {
    addPattern(input: AddWhitelistPatternInput): Promise<void>;
    removePattern(input: RemoveWhitelistPatternInput): Promise<void>;
    getPatterns(input: GetWhitelistPatternsInput): Promise<string[]>;
}
