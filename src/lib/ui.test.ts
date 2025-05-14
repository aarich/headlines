import {
  plural,
  timeSince,
  shuffleArray,
  fetchHeadlineBasedOnQueryParameters,
  getResultText,
  shareScore,
} from './ui';
import { GameState, Headline } from '../types';

// Mocks
jest.mock('./api', () => ({
  fetchHeadline: jest.fn(),
  recordShare: jest.fn(),
}));

jest.mock('./game', () => ({
  getNumCharsBeforeClue: jest.fn(),
}));

jest.mock('./storage', () => ({
  getStoredScores: jest.fn(),
}));

// Import mocked functions to allow type checking and spy on them
const mockFetchHeadline = require('./api').fetchHeadline;
const mockRecordShare = require('./api').recordShare;
const mockGetNumCharsBeforeClue = require('./game').getNumCharsBeforeClue;
const mockGetStoredScores = require('./storage').getStoredScores;

// Global object mocks
beforeAll(() => {
  Object.defineProperty(window, 'history', {
    value: { replaceState: jest.fn() },
    writable: true,
  });

  Object.defineProperty(window, 'location', {
    value: { search: '', href: 'http://localhost/' },
    writable: true,
  });

  Object.defineProperty(navigator, 'share', {
    value: jest.fn(),
    writable: true,
  });

  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: jest.fn().mockResolvedValue(undefined) },
    writable: true,
  });
});

const MOCK_HEADLINE: Headline = {
  id: 1,
  headline: 'Mock Headline Here',
  correctAnswer: 'Headline',
  possibleAnswers: ['Rabbit', 'Paper'],
  afterBlank: ' Here',
  beforeBlank: ' Mock ',
  articleUrl: 'https://example.com',
  redditUrl: 'https://example.com/reddit',
  gameNum: 1,
  hint: "i'ts an example",
  publishTime: '2020',
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();

  Object.defineProperty(window, 'location', {
    value: { search: '', href: 'http://localhost/' },
    writable: true,
  });

  (navigator.share as jest.Mock)?.mockClear().mockResolvedValue(undefined);
  (navigator.clipboard.writeText as jest.Mock).mockResolvedValue(undefined);
});

describe('ui.ts', () => {
  describe('plural', () => {
    it('should work with default suffix', () => {
      expect(plural(1, 'item')).toBe('item');
      expect(plural(0, 'item')).toBe('items');
      expect(plural(2, 'item')).toBe('items');
    });

    it('should use custom suffix', () => {
      expect(plural(1, 'box', 'es')).toBe('box');
      expect(plural(2, 'box', 'es')).toBe('boxes');
    });
  });

  describe('timeSince', () => {
    const MOCKED_NOW_DATE = new Date('2023-10-27T12:00:00.000Z');

    const pastDate = (seconds: number): Date => {
      const newDate = new Date(MOCKED_NOW_DATE.getTime());
      newDate.setSeconds(newDate.getSeconds() - seconds);
      return newDate;
    };

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(MOCKED_NOW_DATE);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should work without smallest interval', () => {
      expect(timeSince(pastDate(10))).toBe('10 seconds');
      expect(timeSince(pastDate(1))).toBe('1 second');
      expect(timeSince(pastDate(60 * 2))).toBe('2 minutes');
      expect(timeSince(pastDate(60))).toBe('60 seconds');
      expect(timeSince(pastDate(60 * 60 * 2))).toBe('2 hours');
      expect(timeSince(pastDate(60 * 60 * 24 * 2))).toBe('2 days');
      expect(timeSince(pastDate(60 * 60 * 24 * 30 * 2))).toBe('2 months');
      expect(timeSince(pastDate(60 * 60 * 24 * 365 * 2))).toBe('2 years');
    });

    it('should respect smallestInterval', () => {
      expect(timeSince(pastDate(60 * 0.8), 'm')).toBe('1 minute');
      expect(timeSince(pastDate(60 * 60 * 1.8), 'h')).toBe('2 hours');
    });
  });

  describe('shuffleArray', () => {
    it('should not change the length of the array', () => {
      const array = [1, 2, 3, 4, 5];
      const originalLength = array.length;
      shuffleArray(array);
      expect(array.length).toBe(originalLength);
    });

    it('should contain all original elements after shuffling', () => {
      const originalArray = [1, 'a', true, null, { id: 1 }];
      const arrayToShuffle = [...originalArray];
      shuffleArray(arrayToShuffle);
      originalArray.forEach(element => {
        expect(arrayToShuffle).toContain(element);
      });
      expect(arrayToShuffle.length).toBe(originalArray.length);
    });

    it('should produce a different order (most of the time)', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const originalOrder = JSON.stringify(array);
      let differentOrderFound = false;
      // Run a few times to increase chance of different order
      for (let i = 0; i < 10; i++) {
        const shuffledArray = [...array];
        shuffleArray(shuffledArray);
        if (JSON.stringify(shuffledArray) !== originalOrder) {
          differentOrderFound = true;
          break;
        }
      }
      // This test might rarely fail if it shuffles back to original.
      // For robust testing, one might check against a known shuffle with a seeded RNG.
      // Here, we just expect it's likely different.
      expect(differentOrderFound).toBe(true);
    });
  });

  describe('fetchHeadlineBasedOnQueryParameters', () => {
    beforeEach(() => {
      mockFetchHeadline.mockResolvedValue(MOCK_HEADLINE);
      // Ensure URLSearchParams mock is fresh for each test call within fetchHeadlineBasedOnQueryParameters
      // The global mock for URLSearchParams constructor will be used.
    });

    it('should call fetchHeadline with id if "id" param exists and is valid', async () => {
      window.location.search = '?id=123';
      await fetchHeadlineBasedOnQueryParameters();
      expect(mockFetchHeadline).toHaveBeenCalledWith({ id: 123 });
    });

    it('should call fetchHeadline with game if "game" param exists and is valid', async () => {
      window.location.search = '?game=456';
      await fetchHeadlineBasedOnQueryParameters();
      expect(mockFetchHeadline).toHaveBeenCalledWith({ game: 456 });
    });

    it('should call fetchHeadline with empty args if no relevant params', async () => {
      window.location.search = '?other=789';
      await fetchHeadlineBasedOnQueryParameters();
      expect(mockFetchHeadline).toHaveBeenCalledWith({});
    });

    it('should call fetchHeadline with {id: 0} if "id" param is present but empty string', async () => {
      window.location.search = '?id=';
      await fetchHeadlineBasedOnQueryParameters();
      expect(mockFetchHeadline).toHaveBeenCalledWith({ id: 0 });
    });

    it('should call fetchHeadline with empty args if "id" param is not a number, and modify URL', async () => {
      window.location.search = '?id=abc&test=1';
      // The mockUrlSearchParamsInstance will be set when `new URLSearchParams` is called
      // inside fetchHeadlineBasedOnQueryParameters.

      // We need to ensure our mock URLSearchParams instance is the one being modified.
      // The global mock for the constructor should handle this.
      // The key is that validateNumParameter receives the instance created by fetchHeadlineBasedOnQueryParameters.

      await fetchHeadlineBasedOnQueryParameters();

      expect(mockFetchHeadline).toHaveBeenCalledWith({});
      // validateNumParameter calls delete and replaceState
      expect(window.history.replaceState).toHaveBeenCalledWith({}, '', '?test=1'); // Assuming 'id=abc' was removed
    });

    it('should call fetchHeadline with empty args if "game" param is not a number, and modify URL', async () => {
      window.location.search = '?game=xyz&foo=bar';
      await fetchHeadlineBasedOnQueryParameters();
      expect(mockFetchHeadline).toHaveBeenCalledWith({});
      expect(window.history.replaceState).toHaveBeenCalledWith({}, '', '?foo=bar');
    });

    it('should throw error if both "id" and "game" params exist', async () => {
      window.location.search = '?id=123&game=456';
      await expect(fetchHeadlineBasedOnQueryParameters()).rejects.toThrow(
        "Unsupported URL. Only one of 'id' or 'game' should be provided."
      );
    });
  });

  describe('getShareScoreText', () => {
    beforeEach(() => {
      window.location.href = 'http://localhost/';
      mockGetNumCharsBeforeClue.mockReturnValue(3); // e.g., "Ans" before "wer"
    });

    it('should generate basic share text with no hints and not expert', () => {
      const gameState: GameState = {
        correct: false,
        wrongGuesses: [
          { guess: 'x', timestamp: 1 },
          { guess: 'y', timestamp: 2 },
        ],
      }; // 2 wrong guesses
      const expectedText = `I found the leek: ❌❌🧅\nNo hints! 😎\n\nhttp://localhost/`;
      expect(getResultText(MOCK_HEADLINE, gameState, false)).toBe(expectedText);
    });

    it('should include char hints', () => {
      const gameState: GameState = {
        correct: false,
        wrongGuesses: [],
        hints: { chars: 2, clue: false },
      };
      const expectedText = `I found the leek: 🧅\n💡💡\n\nhttp://localhost/`;
      expect(getResultText(MOCK_HEADLINE, gameState, false)).toBe(expectedText);
    });

    it('should just be the clue in non-expert mode with no characters', () => {
      const gameState: GameState = {
        correct: false,
        wrongGuesses: [],
        hints: { chars: 0, clue: true },
      };
      const expectedText = `I found the leek: 🧅\n🕵\n\nhttp://localhost/`;

      expect(getResultText(MOCK_HEADLINE, gameState, false)).toBe(expectedText);
    });

    it('should include char hints up to clue and clue hint', () => {
      mockGetNumCharsBeforeClue.mockReturnValue(3);
      const gameState: GameState = {
        correct: false,
        wrongGuesses: [],
        hints: { chars: 4, clue: true },
      };

      const expectedText = `I found the leek: 🧅\n💡💡💡🕵💡\nExpert Mode 🤓\n\nhttp://localhost/`;
      expect(getResultText(MOCK_HEADLINE, gameState, true)).toBe(expectedText);
    });

    it('should include char hints up to clue and after clue hint', () => {
      mockGetNumCharsBeforeClue.mockReturnValue(2);
      const gameState: GameState = {
        correct: false,
        wrongGuesses: [],
        hints: { chars: 4, clue: true },
      };

      const expectedText = `I found the leek: 🧅\n💡💡🕵💡💡\nExpert Mode 🤓\n\nhttp://localhost/`;
      expect(getResultText(MOCK_HEADLINE, gameState, true)).toBe(expectedText);
    });

    it('should include expert mode text', () => {
      const gameState: GameState = { wrongGuesses: [{ guess: 'x', timestamp: 1 }], correct: false };
      const expectedText = `I found the leek: ❌🧅\nNo hints! 😎\nExpert Mode 🤓\n\nhttp://localhost/`;
      expect(getResultText(MOCK_HEADLINE, gameState, true)).toBe(expectedText);
    });

    it('should handle all elements combined', () => {
      mockGetNumCharsBeforeClue.mockReturnValue(2);
      const gameState: GameState = {
        correct: false,
        wrongGuesses: [
          { guess: 'x', timestamp: 1 },
          { guess: 'x', timestamp: 1 },
          { guess: 'x', timestamp: 1 },
        ],
        hints: { chars: 3, clue: true },
      };
      const expectedText = `I found the leek: ❌❌❌🧅\n💡💡🕵💡\nExpert Mode 🤓\n\nhttp://localhost/`;
      expect(getResultText(MOCK_HEADLINE, gameState, true)).toBe(expectedText);
    });
  });

  describe('shareScore', () => {
    const mockGameState: GameState = { wrongGuesses: [], correct: false };
    const mockToast = jest.fn();

    beforeEach(() => {
      mockGetStoredScores.mockReturnValue({}); // Default no stored score
      mockGetNumCharsBeforeClue.mockReturnValue(0); // Default for "No hints!" path
      Object.defineProperty(window, 'location', {
        value: { search: '', href: 'http://localhost/' },
        writable: true,
      });
      mockToast.mockClear();
    });

    afterEach(() => {
      // Restore the original implementation or clear spy if it was on the module itself
      jest.restoreAllMocks(); // This will clean up spies created with jest.spyOn
    });

    it('should call recordShare on successful navigator.share', async () => {
      shareScore(MOCK_HEADLINE, mockGameState, false, mockToast, false); // forceCopy should be false
      expect(navigator.share).toHaveBeenCalled();
      await Promise.resolve(); // Ensure promise chain in shareScore resolves
      expect(mockRecordShare).toHaveBeenCalledWith(MOCK_HEADLINE.id);
    });

    it('should log error if navigator.share fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const shareError = new Error('Share failed');
      (navigator.share as jest.Mock).mockRejectedValue(shareError);

      shareScore(MOCK_HEADLINE, mockGameState, false, mockToast, false); // forceCopy should be false
      expect(navigator.share).toHaveBeenCalled();

      // Wait for the promise rejection to be handled
      await new Promise(process.nextTick); // Or await Promise.resolve().then(() => Promise.resolve());

      expect(mockRecordShare).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(shareError);
      consoleSpy.mockRestore();
    });

    it('should use clipboard.writeText if navigator.share is not available', () => {
      Object.defineProperty(navigator, 'share', { value: undefined, writable: true }); // Simulate no share API
      shareScore(MOCK_HEADLINE, mockGameState, false, mockToast, false); // forceCopy should be false to test fallback
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Score copied to clipboard!', 'success');
      Object.defineProperty(navigator, 'share', {
        value: jest.fn().mockResolvedValue(undefined),
        writable: true,
      }); // Restore
    });

    it('should use clipboard.writeText if forceCopy is true', () => {
      shareScore(MOCK_HEADLINE, mockGameState, false, mockToast, true);
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('Score copied to clipboard!', 'success');
      expect(navigator.share).not.toHaveBeenCalled();
    });

    it('should use expert status from stored scores and reflect in share text', () => {
      mockGetStoredScores.mockReturnValue({
        [`${MOCK_HEADLINE.id}`]: { g: 1, h: 0, c: false, t: 100, e: true },
      });
      // isExpertProvided (arg 3) is false, but stored score has e: true, so expert should be true.
      // forceCopy (arg 4) is true.
      const expectedClipboardTextExpert = `I found the leek: 🧅\nNo hints! 😎\nExpert Mode 🤓\n\nhttp://localhost/`;
      shareScore(MOCK_HEADLINE, mockGameState, false, mockToast, true);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expectedClipboardTextExpert);
    });

    it('should use provided expert status if not in stored scores and reflect in share text', () => {
      mockGetStoredScores.mockReturnValue({}); // No stored score for this headline

      // Test with isExpertProvided = true
      const expectedClipboardTextExpert = `I found the leek: 🧅\nNo hints! 😎\nExpert Mode 🤓\n\nhttp://localhost/`;
      shareScore(MOCK_HEADLINE, mockGameState, true, mockToast, true); // isExpert = true, forceCopy true
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expectedClipboardTextExpert);

      // Clear mock for the next call in the same test
      (navigator.clipboard.writeText as jest.Mock).mockClear();

      // Test with isExpertProvided = false
      const expectedClipboardTextNotExpert = `I found the leek: 🧅\nNo hints! 😎\n\nhttp://localhost/`;
      shareScore(MOCK_HEADLINE, mockGameState, false, mockToast, true); // isExpert = false, forceCopy true
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expectedClipboardTextNotExpert);
    });
  });
});
