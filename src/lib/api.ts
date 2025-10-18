import config from 'config';
import { getAdminKey } from 'lib/storage';
import {
  Headline,
  HeadlineHistoryPage,
  PreviewHeadline,
  PreviewHeadlineStatus,
  Suggestion,
} from 'types';

export interface PublishPreviewResult {
  message: string;
  newHeadlineId: number;
  details: string;
}

export interface EditableHeadlineFields {
  headline: string;
  hint: string;
  articleUrl: string;
  redditUrl: string;
  correctAnswer: string;
  publishTime: string;
  possibleAnswers: string[];
  id: number;
}

export interface EditablePreviewHeadlineFields extends Omit<EditableHeadlineFields, 'id'> {
  status: PreviewHeadlineStatus;
  beforeBlank?: string;
  afterBlank?: string;
}

export interface UpdatePreviewResult {
  message: string;
}

export interface UpdateHeadlineResult {
  message: string;
}

export interface CreatePreviewResult {
  id: number;
  message: string;
}

export interface DeletePreviewsResult {
  message: string;
}

export type GetHeadlineArgs = { id?: number; game?: number };

export interface ScriptLogEntry {
  id: number;
  createdDate: string; // ISO 8601 date string e.g., "2023-10-27 14:30:00"
  command: string;
  environment: string;
  message: string;
  status: 'success' | 'failed' | 'completed_early';
}
export type ScriptLogResponse = { logs: ScriptLogEntry[] };

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

export const updateHeadline = async (
  data: EditableHeadlineFields
): Promise<UpdateHeadlineResult> => {
  const response = await fetch(`${config.apiUrl}/api/headline`, {
    method: 'PATCH',
    headers: getAdminHeaders(),
    body: JSON.stringify({ ...data }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to update headline' }));
    throw new Error(errorData.error || `Failed to update headline: ${response.statusText}`);
  }
  return response.json();
};

export async function createSuggestion(
  headlineId: number,
  suggestionText: string
): Promise<{ message: string; id: number }> {
  const response = await fetch(`${config.apiUrl}/api/suggestions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ headlineId, suggestionText }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to create suggestion' }));
    throw new Error(errorData.error || `HTTP error ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

export async function voteForSuggestion(suggestionId: number): Promise<{ message: string }> {
  const response = await fetch(`${config.apiUrl}/api/suggestions?id=${suggestionId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json', // Good practice to include, though PATCH body is empty here
    },
  });
  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: 'Failed to vote for suggestion' }));
    throw new Error(errorData.error || `HTTP error ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

export async function getGameSuggestions(headlineId: number): Promise<Suggestion[]> {
  const response = await fetch(`${config.apiUrl}/api/suggestions?headlineId=${headlineId}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to fetch suggestions' }));
    throw new Error(errorData.error || `HTTP error ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

export interface DeleteScriptLogsResult {
  message: string;
  deletedCount?: number;
}

export const deleteScriptExecutionLogs = async (): Promise<DeleteScriptLogsResult> => {
  const response = await fetch(`${config.apiUrl}/api/logs`, {
    method: 'DELETE',
    headers: getAdminHeaders(),
  });
  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: 'Failed to delete script logs' }));
    throw new Error(errorData.error || `Failed to delete script logs: ${response.statusText}`);
  }
  return response.json();
};

export const fetchScriptExecutionLogs = async (count: number): Promise<ScriptLogResponse> => {
  const response = await fetch(`${config.apiUrl}/api/logs?n=${count}`, {
    method: 'GET',
    headers: getAdminHeaders(),
  });
  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: `Failed to fetch script execution logs: ${response.statusText}` }));
    throw new Error(
      errorData.error || `Failed to fetch script execution logs: ${response.statusText}`
    );
  }
  return response.json();
};

export const fetchHistory = async (page = 1, pageSize = 30): Promise<HeadlineHistoryPage> => {
  const response = await fetch(`${config.apiUrl}/api/history?page=${page}&count=${pageSize}`);
  if (!response.ok) {
    if (response.status === 404) {
      return { page, headlines: [] };
    }
    throw new Error('Failed to fetch history');
  }

  return response
    .json()
    .then(data => data.headlines)
    .then(headlines => ({ page, headlines }));
};

interface GameCompletedData {
  guesses: string[];
}

export const updateGameStats = (
  id: number,
  action: 'game_started' | 'game_completed' | 'article_clicked' | 'shared' | 'reddit_clicked',
  data?: GameCompletedData
) => {
  if (process.env.NODE_ENV === 'development') {
    // Don't log stats in dev mode
    return;
  }

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

export const recordGameCompleted = (id: number, guesses: string[] = []) =>
  updateGameStats(id, 'game_completed', { guesses });

export const recordArticleClick = (id: number) => updateGameStats(id, 'article_clicked');

export const recordRedditClick = (id: number) => updateGameStats(id, 'reddit_clicked');

export const recordShare = (id: number) => updateGameStats(id, 'shared');

export const getAdminHeaders = () => {
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

export const updatePreviewHeadline = async (
  id: number,
  data: EditablePreviewHeadlineFields
): Promise<UpdatePreviewResult> => {
  const { beforeBlank, afterBlank, correctAnswer, headline } = data;
  // Validate that beforeBlank/afterBlank are either both set or neither set
  if ((beforeBlank === undefined) !== (afterBlank === undefined)) {
    throw new Error("'beforeBlank' and 'afterBlank' must be set together.");
  }

  // Validate beforeBlank + answer + afterBlank are correct
  if (beforeBlank !== undefined) {
    const computedHeadline = beforeBlank + correctAnswer + afterBlank;
    if (computedHeadline !== headline) {
      throw new Error(`The computed headline doesn't match:\n${computedHeadline}\n${headline}`);
    }
  }

  const response = await fetch(`${config.apiUrl}/api/preview`, {
    method: 'PATCH',
    headers: getAdminHeaders(),
    body: JSON.stringify({ id, ...data }),
  });
  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: 'Failed to update preview headline' }));
    throw new Error(errorData.error || `Failed to update preview headline: ${response.statusText}`);
  }
  return response.json();
};

export type CreatePreviewHeadlinePayload = Omit<EditablePreviewHeadlineFields, 'status'>;

export const createPreviewHeadline = async (
  data: CreatePreviewHeadlinePayload
): Promise<CreatePreviewResult> => {
  const response = await fetch(`${config.apiUrl}/api/preview`, {
    method: 'POST',
    headers: getAdminHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: 'Failed to create preview headline' }));
    throw new Error(errorData.error || `Failed to create preview headline: ${response.statusText}`);
  }
  return response.json();
};
export const publishPreviewHeadline = async (
  payload: { previewId: number } | { status: PreviewHeadlineStatus }
): Promise<PublishPreviewResult> => {
  const response = await fetch(`${config.apiUrl}/api/headline`, {
    method: 'POST',
    headers: getAdminHeaders(),
    body: JSON.stringify(payload),
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
