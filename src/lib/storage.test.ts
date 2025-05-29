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
import { Headline, Score, GameState, Stats, WrongGuess } from 'types';

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
};

const MOCK_GAME_STATE: GameState = {
  wrongGuesses: [{ guess: 'test', timestamp: Date.now() } as WrongGuess],
  hints: { chars: 1, clue: false },
};

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

    it('should handle schema changes (i to n)', () => {
      const oldSchemaScores = {
        // IDs from the hardcoded list in handleScoreSchemaChanges
        '6': { i: 1, d: Date.now(), g: 1, e: true }, // old schema, id 6 maps to gameNum 1
        '19': { i: 6, d: Date.now(), g: 2, e: false }, // old schema, id 19 maps to gameNum 6
        '25': { n: 7, d: Date.now(), g: 0, e: true }, // new schema
        '100': { i: 10, d: Date.now(), g: 0, e: false }, // old schema, id 100 not in mapping list
      };
      localStorageMock.setItem(STORAGE_KEYS.SCORES, JSON.stringify(oldSchemaScores));

      const retrievedScores = getStoredScores();
      expect(retrievedScores['6'].n).toBe(1);
      expect(retrievedScores['19'].n).toBe(6);
      expect(retrievedScores['25'].n).toBe(7);
      expect(retrievedScores['100'].n).toBeUndefined();
      // @ts-expect-error
      expect(retrievedScores['6'].i).toBeUndefined();
      // @ts-expect-error
      expect(retrievedScores['19'].i).toBeUndefined();
      // @ts-expect-error
      expect(retrievedScores['100'].i).toBeUndefined();
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
      const newGameState = { ...MOCK_GAME_STATE, hints: { chars: 2, clue: true } };
      storeGameState(1, newGameState);
      const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEYS.GAME_STATE)!);
      expect(stored['1']).toEqual(newGameState);
      expect(getStoredGameState(1)).toEqual(newGameState);
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

  describe('handleScoreSchemaChanges internal logic', () => {
    // This is implicitly tested by getStoredScores, but direct tests can be useful
    // for complex migrations.
    it('should correctly map known IDs from old schema', () => {
      const scores = {
        '6': { i: 1, d: 123, g: 0, e: false }, // maps to n: 1
        '8': { i: 2, d: 123, g: 0, e: false }, // maps to n: 2
        '20': { i: 7, d: 123, g: 0, e: false }, // maps to n: 7
      };
      localStorageMock.setItem(STORAGE_KEYS.SCORES, JSON.stringify(scores));
      const processed = getStoredScores();
      expect(processed['6'].n).toBe(1);
      // @ts-expect-error
      expect(processed['6'].i).toBeUndefined();
      expect(processed['8'].n).toBe(2);
      // @ts-expect-error
      expect(processed['8'].i).toBeUndefined();
      expect(processed['20'].n).toBe(7);
      // @ts-expect-error
      expect(processed['20'].i).toBeUndefined();
    });

    it('should not add "n" if id is not in the mapping and "i" exists', () => {
      const scores = {
        '99': { i: 10, d: 123, g: 0, e: false }, // 99 is not in the ids list
      };
      localStorageMock.setItem(STORAGE_KEYS.SCORES, JSON.stringify(scores));
      const processed = getStoredScores();
      expect(processed['99'].n).toBeUndefined();
      // @ts-expect-error
      expect(processed['99'].i).toBeUndefined(); // i should still be deleted
    });

    it('should not modify scores already in new schema', () => {
      const scores = {
        '100': { n: 50, d: 123, g: 0, e: false },
      };
      localStorageMock.setItem(STORAGE_KEYS.SCORES, JSON.stringify(scores));
      const processed = getStoredScores();
      expect(processed['100']).toEqual(scores['100']);
    });
  });
});
