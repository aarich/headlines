import { Headline } from '../types';
import config from '../config';

export const fetchHeadline = async (id?: string): Promise<Headline> => {
  const response = await fetch(`${config.apiUrl}/api/get-headline${id ? `?id=${id}` : ''}`);
  if (!response.ok) {
    throw new Error('Failed to fetch headline');
  }
  return response.json();
};

interface GameCompletedData {
  guesses: string[];
}

export const updateGameStats = async (
  id: number,
  action: 'game_started' | 'game_completed' | 'article_clicked' | 'shared' | 'reddit_clicked',
  data?: GameCompletedData
) => {
  const response = await fetch(`${config.apiUrl}/api/update-stat`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, action, data }),
  });

  if (!response.ok) {
    throw new Error('Failed to update game stats');
  }

  return response.json();
};

// Convenience functions for specific actions
export const recordGameStarted = (id: number) => updateGameStats(id, 'game_started');

export const recordGameCompleted = (id: number, data: GameCompletedData) =>
  updateGameStats(id, 'game_completed', data);

export const recordArticleClick = (id: number) => updateGameStats(id, 'article_clicked');

export const recordRedditClick = (id: number) => updateGameStats(id, 'reddit_clicked');

export const recordShare = (id: number) => updateGameStats(id, 'shared');
