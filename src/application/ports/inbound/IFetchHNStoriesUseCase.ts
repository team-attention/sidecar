import { HNStory } from '../../../domain/entities/HNStory';

export interface FetchHNStoriesResult {
  stories: HNStory[];
  fromCache: boolean;
  fetchedAt: number;
  hasMore: boolean;
}

export interface IFetchHNStoriesUseCase {
  execute(forceRefresh?: boolean): Promise<FetchHNStoriesResult>;
  loadMore(): Promise<FetchHNStoriesResult>;
}
