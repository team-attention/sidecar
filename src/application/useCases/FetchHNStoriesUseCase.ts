import { HNStory } from '../../domain/entities/HNStory';
import { IHNApiPort } from '../ports/outbound/IHNApiPort';
import { IFetchHNStoriesUseCase, FetchHNStoriesResult } from '../ports/inbound/IFetchHNStoriesUseCase';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const PAGE_SIZE = 20;
const MAX_STORIES = 100; // Maximum total stories to load

export class FetchHNStoriesUseCase implements IFetchHNStoriesUseCase {
  private cachedStories: HNStory[] = [];
  private allStoryIds: number[] = [];
  private lastFetchTime: number = 0;
  private currentOffset: number = 0;

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
        hasMore: this.currentOffset < Math.min(this.allStoryIds.length, MAX_STORIES),
      };
    }

    try {
      // Fetch all story IDs and cache them
      this.allStoryIds = await this.hnApiPort.fetchTopStoryIds();
      const topIds = this.allStoryIds.slice(0, PAGE_SIZE);
      const stories = await this.hnApiPort.fetchStories(topIds);

      stories.sort((a, b) => b.score - a.score);

      this.cachedStories = stories;
      this.lastFetchTime = now;
      this.currentOffset = PAGE_SIZE;

      return {
        stories,
        fromCache: false,
        fetchedAt: now,
        hasMore: this.currentOffset < Math.min(this.allStoryIds.length, MAX_STORIES),
      };
    } catch (error) {
      if (this.cachedStories.length > 0) {
        return {
          stories: this.cachedStories,
          fromCache: true,
          fetchedAt: this.lastFetchTime,
          hasMore: this.currentOffset < Math.min(this.allStoryIds.length, MAX_STORIES),
        };
      }
      throw error;
    }
  }

  async loadMore(): Promise<FetchHNStoriesResult> {
    const maxAllowed = Math.min(this.allStoryIds.length, MAX_STORIES);

    if (this.currentOffset >= maxAllowed) {
      return {
        stories: this.cachedStories,
        fromCache: true,
        fetchedAt: this.lastFetchTime,
        hasMore: false,
      };
    }

    try {
      const nextIds = this.allStoryIds.slice(this.currentOffset, this.currentOffset + PAGE_SIZE);
      const newStories = await this.hnApiPort.fetchStories(nextIds);

      // Append new stories (keep original order, don't re-sort all)
      this.cachedStories = [...this.cachedStories, ...newStories];
      this.currentOffset += PAGE_SIZE;

      return {
        stories: this.cachedStories,
        fromCache: false,
        fetchedAt: this.lastFetchTime,
        hasMore: this.currentOffset < maxAllowed,
      };
    } catch (error) {
      // On error, return current cached stories
      return {
        stories: this.cachedStories,
        fromCache: true,
        fetchedAt: this.lastFetchTime,
        hasMore: this.currentOffset < maxAllowed,
      };
    }
  }

  clearCache(): void {
    this.cachedStories = [];
    this.allStoryIds = [];
    this.lastFetchTime = 0;
    this.currentOffset = 0;
  }
}
