import { IThreadStateRepository } from '../ports/outbound/IThreadStateRepository';
import {
    IManageWhitelistUseCase,
    AddWhitelistPatternInput,
    RemoveWhitelistPatternInput,
    GetWhitelistPatternsInput,
} from '../ports/inbound/IManageWhitelistUseCase';

export class ManageWhitelistUseCase implements IManageWhitelistUseCase {
    constructor(
        private readonly threadStateRepository: IThreadStateRepository
    ) {}

    async addPattern(input: AddWhitelistPatternInput): Promise<void> {
        const { threadId, pattern } = input;

        const threadState = await this.threadStateRepository.findById(threadId);
        if (!threadState) {
            throw new Error(`Thread not found: ${threadId}`);
        }

        threadState.addWhitelistPattern(pattern);
        await this.threadStateRepository.updateWhitelist(
            threadId,
            threadState.whitelistPatterns
        );
    }

    async removePattern(input: RemoveWhitelistPatternInput): Promise<void> {
        const { threadId, pattern } = input;

        const threadState = await this.threadStateRepository.findById(threadId);
        if (!threadState) {
            throw new Error(`Thread not found: ${threadId}`);
        }

        threadState.removeWhitelistPattern(pattern);
        await this.threadStateRepository.updateWhitelist(
            threadId,
            threadState.whitelistPatterns
        );
    }

    async getPatterns(input: GetWhitelistPatternsInput): Promise<string[]> {
        const { threadId } = input;

        const threadState = await this.threadStateRepository.findById(threadId);
        if (!threadState) {
            return [];
        }

        return threadState.whitelistPatterns;
    }
}
