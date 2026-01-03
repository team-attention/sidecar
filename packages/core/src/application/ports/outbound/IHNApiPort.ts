import { HNStory } from '../../../domain/entities/HNStory';

export interface IHNApiPort {
  fetchTopStoryIds(): Promise<number[]>;
  fetchStory(id: number): Promise<HNStory | null>;
  fetchStories(ids: number[]): Promise<HNStory[]>;
}
