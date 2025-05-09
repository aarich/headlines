import { Headline } from '../types';
import config from '../config';

export const fetchHeadline = async (): Promise<Headline> => {
  const response = await fetch(`${config.apiUrl}/api/get_headline.php`);
  if (!response.ok) {
    throw new Error('Failed to fetch headline');
  }
  return response.json();
};
