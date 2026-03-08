import * as cheerio from 'cheerio';
import type { RepositoryData } from './types';

export async function scrapeTrendingRepos(): Promise<RepositoryData[]> {
  const response = await fetch('https://github.com/trending', {
    headers: {
      'User-Agent': 'GitHub-Trending-Dashboard/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Scraping failed: Failed to fetch trending page: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const repositories: RepositoryData[] = [];

  $('article.Box-row').each((_, element) => {
    const $article = $(element);
    const repoLink = $article.find('h2 a').attr('href');
    const name = repoLink ? repoLink.replace(/^\//, '').trim() : '';

    if (!name) {
      return;
    }

    const description = $article.find('p.col-9').text().trim() || '';
    const starsText = $article
      .find('span.d-inline-block.float-sm-right')
      .filter((_, el) => {
        const svg = $(el).find('svg');
        return svg.attr('aria-label')?.includes('star') || svg.hasClass('octicon-star');
      })
      .text()
      .trim();
    const parsedStars = starsText ? Number.parseInt(starsText.replace(/,/g, ''), 10) : 0;
    const language = $article.find('span[itemprop="programmingLanguage"]').text().trim() || '';

    repositories.push({
      name,
      description,
      stars: Number.isNaN(parsedStars) ? 0 : parsedStars,
      language,
    });
  });

  if (repositories.length === 0) {
    throw new Error('Scraping failed: No repositories found - HTML structure may have changed');
  }

  return repositories;
}
