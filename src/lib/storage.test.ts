import {
  STORAGE_KEYS,
  getStoredScores,
  saveResult,
  getStoredStats,
  saveStats,
  incrementStat,
  setStarted,
  getStarted,
  getStoredGameState,
  storeGameState,
  getAdminKey,
  storeAdminKey,
} from 'lib/storage';
import { Headline, Score, GameState, Stats, Hint } from 'types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

const MOCK_HEADLINE: Headline = {
  id: 1,
  gameNum: 101,
  headline: 'Mock Headline',
  correctAnswer: 'Answer',
  possibleAnswers: [],
  beforeBlank: 'Mock ',
  afterBlank: ' Headline',
  publishTime: new Date().toISOString(),
  hint: 'A hint',
  articleUrl: 'http://example.com',
  redditUrl: 'http://example.com/reddit',
  createdAt: '2025-07-11 00:01:00',
};

const MOCK_GAME_STATE: GameState = { actions: [Hint.CHAR, 'test'] };

describe('storage.ts', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('getStoredScores', () => {
    it('should return an empty object if no scores are stored', () => {
      expect(getStoredScores()).toEqual({});
    });

    it('should return parsed scores from localStorage', () => {
      const scores: Record<string, Score> = {
        '1': { n: 1, d: Date.now(), g: 0, e: false },
      };
      localStorageMock.setItem(STORAGE_KEYS.SCORES, JSON.stringify(scores));
      expect(getStoredScores()).toEqual(scores);
    });
  });

  describe('saveResult', () => {
    it('should save a new result to localStorage', () => {
      const date = new Date();
      saveResult(MOCK_HEADLINE, date, 2, true);
      const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEYS.SCORES)!);
      expect(stored[MOCK_HEADLINE.id]).toEqual({
        n: MOCK_HEADLINE.gameNum,
        d: date.getTime(),
        g: 2,
        e: true,
      });
    });

    it('should overwrite an existing result', () => {
      const oldDate = new Date(2020, 0, 1);
      saveResult(MOCK_HEADLINE, oldDate, 1, false);
      const newDate = new Date();
      saveResult(MOCK_HEADLINE, newDate, 0, true);
      const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEYS.SCORES)!);
      expect(stored[MOCK_HEADLINE.id]).toEqual({
        n: MOCK_HEADLINE.gameNum,
        d: newDate.getTime(),
        g: 0,
        e: true,
      });
    });
  });

  describe('getStoredStats', () => {
    it('should return an empty object if no stats are stored', () => {
      expect(getStoredStats()).toEqual({});
    });

    it('should return parsed stats from localStorage', () => {
      const stats: Partial<Stats> = { totalPlays: 10 };
      localStorageMock.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
      expect(getStoredStats()).toEqual(stats);
    });
  });

  describe('saveStats', () => {
    it('should save new stats to localStorage', () => {
      const stats: Partial<Stats> = { firstGuessCorrectCount: 5 };
      saveStats(stats);
      const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEYS.STATS)!);
      expect(stored).toEqual(stats);
    });

    it('should merge with existing stats', () => {
      const initialStats: Partial<Stats> = { totalPlays: 10 };
      localStorageMock.setItem(STORAGE_KEYS.STATS, JSON.stringify(initialStats));
      const newStats: Partial<Stats> = { firstGuessCorrectCount: 3 };
      saveStats(newStats);
      const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEYS.STATS)!);
      expect(stored).toEqual({ ...initialStats, ...newStats });
    });
  });

  describe('incrementStat', () => {
    it('should increment a non-existent stat to 1', () => {
      incrementStat('totalPlays');
      const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEYS.STATS)!);
      expect(stored.totalPlays).toBe(1);
    });

    it('should increment an existing stat', () => {
      const initialStats: Partial<Stats> = { totalPlays: 5 };
      localStorageMock.setItem(STORAGE_KEYS.STATS, JSON.stringify(initialStats));
      incrementStat('totalPlays');
      const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEYS.STATS)!);
      expect(stored.totalPlays).toBe(6);
    });
  });

  describe('setStarted and getStarted', () => {
    it('getStarted should return an empty set if nothing is stored', () => {
      expect(getStarted()).toEqual(new Set());
    });

    it('setStarted should add a game ID to localStorage', () => {
      setStarted(10);
      const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEYS.STARTED)!);
      expect(stored.games).toEqual([10]);
      expect(getStarted()).toEqual(new Set([10]));
    });

    it('setStarted should add to an existing set of game IDs', () => {
      localStorageMock.setItem(STORAGE_KEYS.STARTED, JSON.stringify({ games: [5] }));
      setStarted(10);
      const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEYS.STARTED)!);
      expect(stored.games).toEqual(expect.arrayContaining([5, 10]));
      expect(stored.games.length).toBe(2);
      expect(getStarted()).toEqual(new Set([5, 10]));
    });

    it('setStarted should not add a duplicate ID', () => {
      localStorageMock.setItem(STORAGE_KEYS.STARTED, JSON.stringify({ games: [10] }));
      setStarted(10);
      const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEYS.STARTED)!);
      expect(stored.games).toEqual([10]);
      expect(getStarted()).toEqual(new Set([10]));
    });
  });

  describe('getStoredGameState and storeGameState', () => {
    it('getStoredGameState should return undefined if no game states are stored', () => {
      expect(getStoredGameState(1)).toBeUndefined();
    });

    it('getStoredGameState should return undefined if game states are stored but not for the given ID', () => {
      localStorageMock.setItem(STORAGE_KEYS.GAME_STATE, JSON.stringify({ '2': MOCK_GAME_STATE }));
      expect(getStoredGameState(1)).toBeUndefined();
    });

    it('storeGameState should store a new game state', () => {
      storeGameState(1, MOCK_GAME_STATE);
      const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEYS.GAME_STATE)!);
      expect(stored['1']).toEqual(MOCK_GAME_STATE);
      expect(getStoredGameState(1)).toEqual(MOCK_GAME_STATE);
    });

    it('storeGameState should add to existing game states', () => {
      const initialGameState = { '2': { ...MOCK_GAME_STATE, correct: true } };
      localStorageMock.setItem(STORAGE_KEYS.GAME_STATE, JSON.stringify(initialGameState));
      storeGameState(1, MOCK_GAME_STATE);
      const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEYS.GAME_STATE)!);
      expect(stored['1']).toEqual(MOCK_GAME_STATE);
      expect(stored['2']).toEqual(initialGameState['2']);
      expect(getStoredGameState(1)).toEqual(MOCK_GAME_STATE);
      expect(getStoredGameState(2)).toEqual(initialGameState['2']);
    });

    it('storeGameState should overwrite an existing game state for the same ID', () => {
      const oldGameState = { ...MOCK_GAME_STATE, correct: true };
      localStorageMock.setItem(STORAGE_KEYS.GAME_STATE, JSON.stringify({ '1': oldGameState }));
      const newGameState = { ...MOCK_GAME_STATE, actions: [Hint.CHAR, Hint.CHAR, Hint.CLUE] };
      storeGameState(1, newGameState);
      const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEYS.GAME_STATE)!);
      expect(stored['1']).toEqual(newGameState);
      expect(getStoredGameState(1)).toEqual(newGameState);
    });
  });

  describe('GameState Schema Migration', () => {
    // Define interfaces for old game state schemas for clarity in tests
    interface OldGameStateHints {
      hints: { chars?: number; clue?: boolean };
      // no actions, no wrongGuesses
    }
    interface OldGameStateWrongGuesses {
      wrongGuesses: { guess: string }[];
      // no actions, no hints
    }
    interface OldGameStateCombined {
      hints?: { chars?: number; clue?: boolean };
      wrongGuesses?: { guess: string }[];
      // no actions
    }

    describe('getStoredGameState with migration', () => {
      it('should migrate old schema with only char hints', () => {
        const oldState: OldGameStateHints = { hints: { chars: 2 } };
        localStorageMock.setItem(STORAGE_KEYS.GAME_STATE, JSON.stringify({ '1': oldState }));
        const migratedState = getStoredGameState(1);
        expect(migratedState).toEqual({ actions: [Hint.CHAR, Hint.CHAR] });
        // @ts-expect-error
        expect(migratedState?.hints).toBeUndefined();
        // @ts-expect-error
        expect(migratedState?.wrongGuesses).toBeUndefined();
      });

      it('should migrate old schema with only clue hint', () => {
        const oldState: OldGameStateHints = { hints: { clue: true } };
        localStorageMock.setItem(STORAGE_KEYS.GAME_STATE, JSON.stringify({ '1': oldState }));
        const migratedState = getStoredGameState(1);
        expect(migratedState).toEqual({ actions: [Hint.CLUE] });
      });

      it('should migrate old schema with char and clue hints', () => {
        const oldState: OldGameStateHints = { hints: { chars: 1, clue: true } };
        localStorageMock.setItem(STORAGE_KEYS.GAME_STATE, JSON.stringify({ '1': oldState }));
        const migratedState = getStoredGameState(1);
        expect(migratedState).toEqual({ actions: [Hint.CHAR, Hint.CLUE] });
      });

      it('should migrate old schema with only wrong guesses', () => {
        const oldState: OldGameStateWrongGuesses = {
          wrongGuesses: [{ guess: 'a' }, { guess: 'b' }],
        };
        localStorageMock.setItem(STORAGE_KEYS.GAME_STATE, JSON.stringify({ '1': oldState }));
        const migratedState = getStoredGameState(1);
        expect(migratedState).toEqual({ actions: ['a', 'b'] });
      });

      it('should migrate old schema with hints and wrong guesses in correct order', () => {
        const oldState: OldGameStateCombined = {
          hints: { chars: 1, clue: true },
          wrongGuesses: [{ guess: 'c' }],
        };
        localStorageMock.setItem(STORAGE_KEYS.GAME_STATE, JSON.stringify({ '1': oldState }));
        const migratedState = getStoredGameState(1);
        expect(migratedState).toEqual({ actions: [Hint.CHAR, Hint.CLUE, 'c'] });
      });

      it('should handle old schema with hints.chars = 0 and no clue', () => {
        const oldState: OldGameStateHints = { hints: { chars: 0 } };
        localStorageMock.setItem(STORAGE_KEYS.GAME_STATE, JSON.stringify({ '1': oldState }));
        const migratedState = getStoredGameState(1);
        expect(migratedState).toEqual({ actions: [] });
      });

      it('should handle old schema with empty hints object and empty wrongGuesses array', () => {
        const oldState: OldGameStateCombined = { hints: {}, wrongGuesses: [] };
        localStorageMock.setItem(STORAGE_KEYS.GAME_STATE, JSON.stringify({ '1': oldState }));
        const migratedState = getStoredGameState(1);
        expect(migratedState).toEqual({ actions: [] });
      });

      it('should return the gameState as is if no migration needed (no hints or wrongGuesses fields)', () => {
        const modernState = { actions: ['test'], someOtherProp: true };
        localStorageMock.setItem(STORAGE_KEYS.GAME_STATE, JSON.stringify({ '1': modernState }));
        const retrievedState = getStoredGameState(1);
        expect(retrievedState).toEqual(modernState);
      });
    });

    describe('storeGameState with migration of existing states', () => {
      it('should migrate existing old-schema states in localStorage when storing a new state', () => {
        const oldState1: OldGameStateHints = { hints: { chars: 1 } };
        const oldState3: OldGameStateWrongGuesses = { wrongGuesses: [{ guess: 'wg' }] };
        const initialStorage = {
          '1': oldState1,
          '3': oldState3,
        };
        localStorageMock.setItem(STORAGE_KEYS.GAME_STATE, JSON.stringify(initialStorage));

        const newStateForGame2: GameState = { actions: ['newState'] };
        storeGameState(2, newStateForGame2);

        const migratedState1 = getStoredGameState(1);
        const storedState2 = getStoredGameState(2);
        const migratedState3 = getStoredGameState(3);

        expect(migratedState1).toEqual({ actions: [Hint.CHAR] });
        expect(storedState2).toEqual(newStateForGame2);
        expect(migratedState3).toEqual({ actions: ['wg'] });

        // Verify raw storage to see if all are migrated
        const rawStored = JSON.parse(localStorageMock.getItem(STORAGE_KEYS.GAME_STATE)!);
        expect(rawStored['1']).toEqual({ actions: [Hint.CHAR] });
        expect(rawStored['2']).toEqual(newStateForGame2);
        expect(rawStored['3']).toEqual({ actions: ['wg'] });
      });
    });
  });

  describe('getAdminKey and storeAdminKey', () => {
    it('getAdminKey should return undefined if no key is stored', () => {
      expect(getAdminKey()).toBeUndefined();
    });

    it('storeAdminKey should store the key in localStorage', () => {
      const key = 'test-admin-key';
      storeAdminKey(key);
      expect(localStorageMock.getItem(STORAGE_KEYS.ADMIN_KEY)).toBe(key);
    });

    it('getAdminKey should retrieve the stored key', () => {
      const key = 'test-admin-key-retrieved';
      localStorageMock.setItem(STORAGE_KEYS.ADMIN_KEY, key);
      expect(getAdminKey()).toBe(key);
    });

    it('storeAdminKey should overwrite an existing key', () => {
      storeAdminKey('old-key');
      const newKey = 'new-admin-key';
      storeAdminKey(newKey);
      expect(getAdminKey()).toBe(newKey);
    });
  });
});
