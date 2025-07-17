import React, { createContext, useContext } from 'react';
import { GameState, Headline } from '../types';

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
  if (!headline) {
    throw new Error('Headline not loaded');
  }
  return headline;
};
