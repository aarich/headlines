import React, { createContext, useContext } from 'react';
import { GameState, Headline } from '../types';

const MOCK_HEADLINE: Headline = {
  id: 1,
  headline: 'He was caught "stealing" cars',
  correctAnswer: 'steal',
  possibleAnswers: ['eat', 'paint'],
  afterBlank: 'ing" cars',
  beforeBlank: 'He was caught "',
  articleUrl: 'https://example.com',
  redditUrl: 'https://example.com/reddit',
  gameNum: 1,
  hint: "it's an example",
  publishTime: '2020',
  createdAt: '2025-07-11 00:01:00',
};

type HeadlineContextState = {
  headline: Headline | undefined;
  game: [GameState, React.Dispatch<React.SetStateAction<GameState>>];
};

const HeadlineContext = createContext<HeadlineContextState>({
  headline: undefined,
  game: [{}, () => {}],
});

export const HeadlineProvider: React.FC<{
  state: HeadlineContextState;
  children: React.ReactNode;
}> = ({ state, children }) => {
  return <HeadlineContext.Provider value={state}>{children}</HeadlineContext.Provider>;
};

export const useGameState = () => useContext(HeadlineContext).game;

export const useMaybeHeadline = (): Headline | undefined => useContext(HeadlineContext).headline;

export const useHeadline = (): Headline => {
  const headline = useMaybeHeadline();

  if (process.env.NODE_ENV === 'development') {
    return MOCK_HEADLINE;
  }

  if (!headline) {
    throw new Error('Headline not loaded');
  }
  return headline;
};
