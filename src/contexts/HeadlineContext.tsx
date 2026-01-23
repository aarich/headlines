import React, { createContext, useContext } from 'react';
import { GameState, Headline, UserHeadline } from '../types';

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

const MOCK_USER_HEADLINE: UserHeadline = {
  id: 'abcdef',
  headline: 'He was caught "stealing" cars',
  beforeBlank: 'He was caught "',
  afterBlank: 'ing" cars',
  correctAnswer: 'steal',
  hint: "it's an example",
  articleUrl: undefined,
  publishTime: undefined,
  createdAt: '2025-07-11 00:01:00',
  updatedAt: '2025-07-11 00:01:00',
};

type HeadlineContextState = {
  headline: Headline | UserHeadline | undefined;
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

export const useMaybeHeadline = (): Headline | UserHeadline | undefined => {
  const { headline } = useContext(HeadlineContext);

  // simulate loading the mock headline
  if (process.env.NODE_ENV === 'development' && headline) {
    if (process.env.REACT_APP_USE_MOCK_HEADLINE === 'true') {
      return MOCK_HEADLINE;
    } else if (process.env.REACT_APP_USE_MOCK_USER_HEADLINE === 'true') {
      return MOCK_USER_HEADLINE;
    }
  }

  return headline;
};

export const useHeadline = (): Headline | UserHeadline => {
  const headline = useMaybeHeadline();

  if (!headline) {
    throw new Error('Headline not loaded');
  }
  return headline;
};
