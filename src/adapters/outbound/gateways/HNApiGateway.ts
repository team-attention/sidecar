import * as https from 'https';
import { HNStory } from '../../../domain/entities/HNStory';
import { IHNApiPort } from '../../../application/ports/outbound/IHNApiPort';

const HN_API_BASE = 'https://hacker-news.firebaseio.com/v0';
const REQUEST_TIMEOUT = 10000;

export class HNApiGateway implements IHNApiPort {
  private async fetchJson<T>(url: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const request = https.get(url, { timeout: REQUEST_TIMEOUT }, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }

        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(new Error('Invalid JSON response'));
          }
        });
      });

      request.on('error', reject);
      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  async fetchTopStoryIds(): Promise<number[]> {
    const ids = await this.fetchJson<number[]>(`${HN_API_BASE}/topstories.json`);
    return ids || [];
  }

  async fetchStory(id: number): Promise<HNStory | null> {
    try {
      const response = await this.fetchJson<Record<string, unknown>>(
        `${HN_API_BASE}/item/${id}.json`
      );
      if (!response) return null;
      return HNStory.fromApiResponse(response);
    } catch {
      return null;
    }
  }

  async fetchStories(ids: number[]): Promise<HNStory[]> {
    const promises = ids.map(id => this.fetchStory(id));
    const results = await Promise.all(promises);
    return results.filter((story): story is HNStory => story !== null);
  }
}
