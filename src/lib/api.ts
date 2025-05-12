import { Headline, HeadlineHistory, PreviewHeadline } from '../types';
import config from '../config';
import { getAdminKey } from './storage';

export interface PublishPreviewResult {
  message: string;
  newHeadlineId: number;
  details: string;
}

export interface DeletePreviewsResult {
  message: string;
}

export type GetHeadlineArgs = { id?: number; game?: number };

export const fetchHeadline = async (args: GetHeadlineArgs): Promise<Headline> => {
  let search = '';
  if (args.id) {
    search = `?id=${args.id}`;
  } else if (args.game) {
    search = `?game=${args.game}`;
  }

  const response = await fetch(`${config.apiUrl}/api/headline${search}`);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("This game doesn't exist. Try a different one.");
    }
    throw new Error('Failed to fetch headline');
  }
  return response.json();
};

export const fetchHistory = async (): Promise<HeadlineHistory[]> => {
  const response = await fetch(`${config.apiUrl}/api/history`);
  if (!response.ok) {
    throw new Error('Failed to fetch history');
  }

  return response.json().then(data => data.headlines);
};

interface GameCompletedData {
  guesses: string[];
}

export const updateGameStats = (
  id: number,
  action: 'game_started' | 'game_completed' | 'article_clicked' | 'shared' | 'reddit_clicked',
  data?: GameCompletedData
) => {
  fetch(`${config.apiUrl}/api/statistics`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, action, data }),
  })
    .then(response => {
      if (!response.ok) {
        console.error('Failed to update game stats:', response.statusText);
      }
    })
    .catch(error => {
      console.error('Error updating game stats:', error);
    });
};

// Convenience functions for specific actions
export const recordGameStarted = (id: number) => updateGameStats(id, 'game_started');

export const recordGameCompleted = (id: number, data: GameCompletedData) =>
  updateGameStats(id, 'game_completed', data);

export const recordArticleClick = (id: number) => updateGameStats(id, 'article_clicked');

export const recordRedditClick = (id: number) => updateGameStats(id, 'reddit_clicked');

export const recordShare = (id: number) => updateGameStats(id, 'shared');

// --- Admin Preview API Functions ---

const getAdminHeaders = () => {
  const adminKey = getAdminKey();
  if (!adminKey) {
    throw new Error('Admin API key is not configured.');
  }

  return { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey };
};

export const fetchPreviewHeadlines = async (): Promise<PreviewHeadline[]> => {
  const response = await fetch(`${config.apiUrl}/api/preview`, {
    method: 'GET',
    headers: getAdminHeaders(),
  });
  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: 'Failed to fetch preview headlines' }));
    throw new Error(errorData.error || `Failed to fetch preview headlines: ${response.statusText}`);
  }
  return response.json();
};

export const publishPreviewHeadline = async (previewId: number): Promise<PublishPreviewResult> => {
  const response = await fetch(`${config.apiUrl}/api/preview`, {
    method: 'POST',
    headers: getAdminHeaders(),
    body: JSON.stringify({ id: previewId }),
  });
  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: 'Failed to publish preview headline' }));
    throw new Error(
      errorData.error || `Failed to publish preview headline: ${response.statusText}`
    );
  }
  return response.json();
};

export const deleteFromPreview = async (previewId?: number): Promise<DeletePreviewsResult> => {
  const body = previewId ? JSON.stringify({ id: previewId }) : undefined;
  const response = await fetch(`${config.apiUrl}/api/preview`, {
    method: 'DELETE',
    headers: getAdminHeaders(),
    body,
  });
  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: 'Failed to delete preview headline' }));
    throw new Error(errorData.error || `Failed to delete preview headline: ${response.statusText}`);
  }
  return response.json();
};
