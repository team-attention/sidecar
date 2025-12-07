import { HNStory } from '../../../domain/entities/HNStory';

export interface FetchHNStoriesResult {
  stories: HNStory[];
  fromCache: boolean;
  fetchedAt: number;
}

export interface IFetchHNStoriesUseCase {
  execute(forceRefresh?: boolean): Promise<FetchHNStoriesResult>;
}
