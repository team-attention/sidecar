export interface HNStoryData {
  id: number;
  title: string;
  url: string | null;
  score: number;
  descendants: number;
  by: string;
  time: number;
}

export class HNStory {
  readonly id: number;
  readonly title: string;
  readonly url: string | null;
  readonly score: number;
  readonly descendants: number;
  readonly by: string;
  readonly time: number;

  constructor(data: HNStoryData) {
    this.id = data.id;
    this.title = data.title;
    this.url = data.url;
    this.score = data.score;
    this.descendants = data.descendants;
    this.by = data.by;
    this.time = data.time;
  }

  get domain(): string | null {
    if (!this.url) return null;
    try {
      const urlObj = new URL(this.url);
      return urlObj.hostname.replace(/^www\./, '');
    } catch {
      return null;
    }
  }

  get discussionUrl(): string {
    return `https://news.ycombinator.com/item?id=${this.id}`;
  }

  get timeAgo(): string {
    const seconds = Math.floor(Date.now() / 1000) - this.time;
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  toData(): HNStoryData {
    return {
      id: this.id,
      title: this.title,
      url: this.url,
      score: this.score,
      descendants: this.descendants,
      by: this.by,
      time: this.time,
    };
  }

  static fromApiResponse(response: Record<string, unknown>): HNStory | null {
    if (
      typeof response.id !== 'number' ||
      typeof response.title !== 'string' ||
      typeof response.score !== 'number' ||
      typeof response.by !== 'string' ||
      typeof response.time !== 'number'
    ) {
      return null;
    }

    return new HNStory({
      id: response.id,
      title: response.title,
      url: typeof response.url === 'string' ? response.url : null,
      score: response.score,
      descendants: typeof response.descendants === 'number' ? response.descendants : 0,
      by: response.by,
      time: response.time,
    });
  }
}
