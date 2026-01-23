import { Headline, UserHeadline } from 'types';

export const clamp = (val: number, min: number, max: number): number =>
  Math.max(min, Math.min(val, max));

/**
 * @returns The domain name from a URL, without the "www." prefix or path.
 * If the URL is invalid, the original URL is returned.
 */
export const getDomainFromUrl = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch (e) {
    return url;
  }
};

export const isStandard = (headline: Headline | UserHeadline): headline is Headline =>
  typeof headline.id === 'number';
