export const plural = (count: number, singular: string, suffix = 's'): string =>
  `${singular}${count === 1 ? '' : suffix}`;
