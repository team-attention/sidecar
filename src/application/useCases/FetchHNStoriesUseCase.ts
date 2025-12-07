import { HNStory } from '../../domain/entities/HNStory';
import { IHNApiPort } from '../ports/outbound/IHNApiPort';
import { IFetchHNStoriesUseCase, FetchHNStoriesResult } from '../ports/inbound/IFetchHNStoriesUseCase';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_STORIES = 20;

export class FetchHNStoriesUseCase implements IFetchHNStoriesUseCase {
  private cachedStories: HNStory[] = [];
  private lastFetchTime: number = 0;

  constructor(private readonly hnApiPort: IHNApiPort) {}

  async execute(forceRefresh: boolean = false): Promise<FetchHNStoriesResult> {
    const now = Date.now();
    const cacheAge = now - this.lastFetchTime;
    const isCacheValid = cacheAge < CACHE_TTL_MS && this.cachedStories.length > 0;

    if (isCacheValid && !forceRefresh) {
      return {
        stories: this.cachedStories,
        fromCache: true,
        fetchedAt: this.lastFetchTime,
      };
    }

    try {
      const storyIds = await this.hnApiPort.fetchTopStoryIds();
      const topIds = storyIds.slice(0, MAX_STORIES);
      const stories = await this.hnApiPort.fetchStories(topIds);

      stories.sort((a, b) => b.score - a.score);

      this.cachedStories = stories;
      this.lastFetchTime = now;

      return {
        stories,
        fromCache: false,
        fetchedAt: now,
      };
    } catch (error) {
      if (this.cachedStories.length > 0) {
        return {
          stories: this.cachedStories,
          fromCache: true,
          fetchedAt: this.lastFetchTime,
        };
      }
      throw error;
    }
  }

  clearCache(): void {
    this.cachedStories = [];
    this.lastFetchTime = 0;
  }
}
