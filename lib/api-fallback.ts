import type { RepositoryDataWithUrl } from './types';

type GitHubApiRepo = {
  full_name: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  html_url: string;
};

type GitHubSearchResponse = {
  items: GitHubApiRepo[];
};

const isErrorWithMessage = (error: unknown): error is { message: string } => {
  return typeof error === 'object' && error !== null && 'message' in error;
};

export async function fetchFromGitHubAPI(token?: string): Promise<RepositoryDataWithUrl[]> {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const dateString = oneWeekAgo.toISOString().split('T')[0];

  const query = `created:>${dateString}`;
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=25`;

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'GitHub-Trending-Dashboard',
  };

  if (token) {
    headers.Authorization = `token ${token}`;
  }

  try {
    const response = await fetch(url, { headers });

    if (response.status === 403) {
      const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
      if (rateLimitRemaining === '0') {
        const resetTime = response.headers.get('X-RateLimit-Reset');
        const resetDate = new Date(Number.parseInt(resetTime ?? '0', 10) * 1000);
        throw new Error(`GitHub API rate limit exceeded. Resets at ${resetDate.toISOString()}`);
      }
    }

    if (!response.ok) {
      throw new Error(`GitHub API request failed with status ${response.status}`);
    }

    const data = (await response.json()) as GitHubSearchResponse;

    return data.items.map((repo) => ({
      name: repo.full_name,
      description: repo.description || '',
      stars: repo.stargazers_count,
      language: repo.language || '',
      url: repo.html_url,
    }));
  } catch (error: unknown) {
    const message = isErrorWithMessage(error) ? error.message : 'Unknown error';
    if (message.includes('rate limit')) {
      throw error;
    }
    throw new Error(`Failed to fetch from GitHub API: ${message}`);
  }
}
