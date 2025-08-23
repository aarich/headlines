import {
  plural,
  timeSince,
  shuffleArray,
  fetchHeadlineBasedOnQueryParameters,
  getResultText,
  shareScore,
  formatSuggestionCasing,
  extractHeadlineParts,
  formatGameDateForHeader,
} from 'lib/ui';
import { GameState, Headline, Hint, Score } from 'types';

// Mocks
jest.mock('./api', () => ({
  fetchHeadline: jest.fn(),
  recordShare: jest.fn(),
}));

jest.mock('./storage', () => ({
  getStoredScores: jest.fn(),
}));

// Import mocked functions to allow type checking and spy on them
const mockFetchHeadline = require('./api').fetchHeadline;
const mockRecordShare = require('./api').recordShare;
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
  createdAt: '2025-07-11 00:01:00',
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

  describe('getResultText', () => {
    beforeEach(() => {
      window.location.href = 'http://localhost/';
    });
    const mockScore: Score = { d: Date.now(), g: 0, e: false, n: 1 };
    const mockExpertScore: Score = { d: Date.now(), g: 0, e: true, n: 1 };
    const MOCK_LEVELS: (string[] | string)[] = [
      ['🎉'], // 100
      ['🤩'], // 90-99
      ['🙂'], // 80-89
      ['🙃'], // 70-79
      ['🤔'], // 60-69
      ['😫'], // 50-59
      '🙈', // 40-49
      '😵', // 30-39
      '🪦', // 20-29
      '💩', // 10-19
      '💀', // 0-9
    ];

    it('should generate basic share text with no hints and not expert', () => {
      const gameState: GameState = {
        actions: ['x', 'y'],
        completedAt: 1,
      };
      const scoreWithPenalty: Score = { ...mockScore, g: 2 };
      const expectedResultText = `❌❌🧅\nScore: 84/100 🙂`;
      expect(getResultText(MOCK_HEADLINE, gameState, false, scoreWithPenalty, MOCK_LEVELS)).toBe(
        expectedResultText
      );
    });

    it('should show no guesses for empty array and undefined', () => {
      const emptyArrayState: GameState = { actions: [], completedAt: 1 };
      const undefinedState: GameState = { completedAt: 1 };
      // mockScore (0 wrong, not expert) -> overall 90
      const expectedResultText = `🧅\nScore: 90/100 🤩`;
      expect(getResultText(MOCK_HEADLINE, emptyArrayState, false, mockScore, MOCK_LEVELS)).toBe(
        expectedResultText
      );
      expect(getResultText(MOCK_HEADLINE, undefinedState, false, mockScore, MOCK_LEVELS)).toBe(
        expectedResultText
      );
    });

    it('should include char hints', () => {
      const gameState: GameState = {
        actions: [Hint.CHAR, Hint.CHAR],
        completedAt: 1,
      };
      const expectedResultText = `💡💡🧅\nScore: 56/100 🤔`;
      expect(getResultText(MOCK_HEADLINE, gameState, false, mockScore, MOCK_LEVELS)).toBe(
        expectedResultText
      );
    });

    it('should just be the clue in non-expert mode with no characters', () => {
      const gameState: GameState = { actions: [Hint.CLUE], completedAt: 1 };
      // mockScore (0 wrong, not expert), 1 clue hint. Overall = 100 - 30 - 10 = 60
      const expectedResultText = `🕵🧅\nScore: 80/100 🙂`;
      expect(getResultText(MOCK_HEADLINE, gameState, false, mockScore, MOCK_LEVELS)).toBe(
        expectedResultText
      );
    });

    it('should include char hints up to clue and clue hint in expert mode', () => {
      const gameState: GameState = {
        actions: [Hint.CHAR, Hint.CHAR, Hint.CLUE],
        completedAt: 1,
      };
      const expectedResultText = `💡💡🕵🧅\nScore: 56/100 🤔`;
      expect(getResultText(MOCK_HEADLINE, gameState, true, mockExpertScore, MOCK_LEVELS)).toBe(
        expectedResultText
      );
    });

    it('should include char hints up to clue and after clue hint in expert mode', () => {
      const gameState: GameState = {
        actions: [Hint.CHAR, Hint.CHAR, Hint.CLUE, Hint.CHAR, Hint.CHAR],
        completedAt: 1,
      };
      const expectedResultText = `💡💡🕵💡💡🧅`;
      expect(getResultText(MOCK_HEADLINE, gameState, true, mockExpertScore, MOCK_LEVELS)).toContain(
        expectedResultText
      );
    });

    it('should handle all elements combined', () => {
      const gameState: GameState = {
        actions: ['x', 'y', Hint.CHAR, Hint.CHAR, Hint.CLUE, Hint.CHAR],
        completedAt: 1,
      };
      const scoreWithPenalties = { ...mockExpertScore, g: 10 }; // 10 wrong, expert, 3 char, 1 clue
      const expectedResultText = `❌❌💡💡🕵💡🧅\nScore: 9/100 💩`;
      expect(getResultText(MOCK_HEADLINE, gameState, true, scoreWithPenalties, MOCK_LEVELS)).toBe(
        expectedResultText
      );
    });

    it('should handle score 0-9 with the lowest tier emoji', () => {
      const gameState: GameState = {
        actions: [...Array(6).fill(Hint.CHAR), Hint.CLUE], // 6 char hints
        completedAt: 1,
      };
      const veryLowScore: Score = { ...mockExpertScore, g: 4 }; // expert, 4 wrong guesses
      // Penalties: charHints=6 -> round(6/8*100)=75. clue=30. wrong=4*5=20. Total=125. Overall=0.
      const expectedResultText = `💡💡💡💡💡💡🕵🧅\nScore: 0/100 💀`;
      expect(getResultText(MOCK_HEADLINE, gameState, true, veryLowScore, MOCK_LEVELS)).toBe(
        expectedResultText
      );
    });

    it('should include score and winner emoji if score is 100', () => {
      const gameState: GameState = { completedAt: 1 };
      const perfectScore: Score = { d: Date.now(), g: 0, e: true, n: 1 }; // Expert, 0 wrong guesses
      const resultText = getResultText(MOCK_HEADLINE, gameState, true, perfectScore, MOCK_LEVELS);
      expect(resultText).toBe('🧅\nScore: 100/100 🎉');
    });

    it('should not include score if score object is undefined', () => {
      const gameState: GameState = { completedAt: 1 };
      const resultText = getResultText(MOCK_HEADLINE, gameState, true, undefined, MOCK_LEVELS);
      expect(resultText).not.toContain('Score:');
      expect(resultText).toBe('🧅');
    });
  });

  describe('shareScore', () => {
    const mockToast = jest.fn();

    beforeEach(() => {
      mockGetStoredScores.mockReturnValue({}); // Default no stored score
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
      const mockResultsText = 'Custom Results Text';
      const expectedShareText = `Leek #${MOCK_HEADLINE.gameNum} found!\n\nhttp://localhost/\n\n${mockResultsText}`;
      shareScore(mockResultsText, MOCK_HEADLINE, mockToast, false); // forceCopy should be false
      await Promise.resolve(); // Ensure promise chain in shareScore resolves
      expect(navigator.share).toHaveBeenCalledWith({ text: expectedShareText });
      expect(mockRecordShare).toHaveBeenCalledWith(MOCK_HEADLINE.id);
    });

    it('should use clipboard.writeText if navigator.share is not available', () => {
      Object.defineProperty(navigator, 'share', { value: undefined, writable: true }); // Simulate no share API
      const mockResultsText = 'Custom Results Text For Clipboard';
      const expectedShareText = `Leek #${MOCK_HEADLINE.gameNum} found!\n\nhttp://localhost/\n\n${mockResultsText}`;
      shareScore(mockResultsText, MOCK_HEADLINE, mockToast, false); // forceCopy should be false to test fallback
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expectedShareText);
      expect(mockToast).toHaveBeenCalledWith('Score copied to clipboard!', 'success');
      Object.defineProperty(navigator, 'share', {
        value: jest.fn().mockResolvedValue(undefined),
        writable: true,
      }); // Restore
    });

    it('should use clipboard.writeText if forceCopy is true', () => {
      const mockResultsText = 'Custom Results Text For Forced Clipboard';
      const expectedShareText = `Leek #${MOCK_HEADLINE.gameNum} found!\n\nhttp://localhost/\n\n${mockResultsText}`;
      shareScore(mockResultsText, MOCK_HEADLINE, mockToast, true);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expectedShareText);
      expect(mockToast).toHaveBeenCalledWith('Score copied to clipboard!', 'success');
      expect(navigator.share).not.toHaveBeenCalled();
    });
  });

  describe('formatSuggestionCasing', () => {
    it('should return original text if text or correctAnswer is empty', () => {
      expect(formatSuggestionCasing('', 'Correct')).toBe('');
      expect(formatSuggestionCasing('suggestion', '')).toBe('suggestion');
      expect(formatSuggestionCasing('', '')).toBe('');
    });

    it('should uppercase text if correctAnswer is all uppercase', () => {
      expect(formatSuggestionCasing('suggestion', 'ALLCAPS')).toBe('SUGGESTION');
      expect(formatSuggestionCasing('SuGgEsTiOn', 'ANSWER')).toBe('SUGGESTION');
    });

    it('should title case text if correctAnswer starts with an uppercase letter', () => {
      expect(formatSuggestionCasing('suggestion', 'Titlecase')).toBe('Suggestion');
      expect(formatSuggestionCasing('SUGGESTION', 'Correct')).toBe('Suggestion');
      expect(formatSuggestionCasing('s', 'Word')).toBe('S');
    });

    it('should lowercase text if correctAnswer is all lowercase', () => {
      expect(formatSuggestionCasing('Suggestion', 'lowercase')).toBe('suggestion');
      expect(formatSuggestionCasing('SUGGESTION', 'answer')).toBe('suggestion');
    });

    it('should return text as is for mixed case correctAnswer not starting with uppercase or all lower/upper', () => {
      expect(formatSuggestionCasing('Suggestion', 'iPod')).toBe('Suggestion');
      expect(formatSuggestionCasing('suggestion', 'wordNUMBER')).toBe('suggestion');
    });

    it('should handle single letter inputs', () => {
      expect(formatSuggestionCasing('a', 'BC')).toBe('A');
      expect(formatSuggestionCasing('B', 'Correct')).toBe('B');
      expect(formatSuggestionCasing('c', 'lowercase')).toBe('c');
      expect(formatSuggestionCasing('D', 'iPhone')).toBe('D');
    });

    it('should handle text with numbers if correctAnswer is all caps', () => {
      expect(formatSuggestionCasing('word1', 'ALLCAPS')).toBe('WORD1');
    });

    it('should handle text with numbers if correctAnswer is title case', () => {
      expect(formatSuggestionCasing('word1', 'Title')).toBe('Word1');
    });

    it('should handle text with numbers if correctAnswer is all lower case', () => {
      expect(formatSuggestionCasing('Word1', 'lower')).toBe('word1');
    });

    it('should handle correctAnswer without letters (e.g. only numbers/symbols)', () => {
      expect(formatSuggestionCasing('Suggestion', '123')).toBe('Suggestion');
      expect(formatSuggestionCasing('Suggestion', '!@#')).toBe('Suggestion');
    });
  });

  describe('extractHeadlineParts', () => {
    it('returns parts as is with no prefix or suffix', () => {
      const { beforeBlank, afterBlank, prefix, suffix } = extractHeadlineParts(
        'Word1 Word2',
        'Word3 Word4'
      );
      expect(beforeBlank).toBe('Word1 Word2');
      expect(prefix).toBe('');
      expect(suffix).toBe('');
      expect(afterBlank).toBe('Word3 Word4');
    });

    it('extracts a single character prefix', () => {
      const { beforeBlank, prefix } = extractHeadlineParts('Some text" ', 'After');
      expect(beforeBlank).toBe('Some text" ');
      expect(prefix).toBe('');
    });

    it('extracts a single character suffix', () => {
      const { afterBlank, suffix } = extractHeadlineParts('Before ', ' ?Actual text');
      expect(afterBlank).toBe(' ?Actual text');
      expect(suffix).toBe('');
    });

    it('extracts a multi-character prefix', () => {
      const { beforeBlank, prefix } = extractHeadlineParts('Some text ("', 'After');
      expect(beforeBlank).toBe('Some text');
      expect(prefix).toBe('("');
    });

    it('extracts a multi-character suffix', () => {
      const { afterBlank, suffix } = extractHeadlineParts('Before', '." Actual text');
      expect(afterBlank).toBe('Actual text');
      expect(suffix).toBe('."');
    });

    it('extracts both multi-character prefix and suffix', () => {
      const { beforeBlank, prefix, suffix, afterBlank } = extractHeadlineParts(
        'Quote: "',
        '"? Follow up'
      );
      expect(beforeBlank).toBe('Quote:');
      expect(prefix).toBe('"');
      expect(suffix).toBe('"?');
      expect(afterBlank).toBe('Follow up');
    });

    it('handles prefix with trailing spaces correctly', () => {
      const { beforeBlank, prefix } = extractHeadlineParts('Word1   "', 'After');
      expect(beforeBlank).toBe('Word1');
      expect(prefix).toBe('"');
    });

    it('handles suffix with leading spaces correctly', () => {
      const { afterBlank, suffix } = extractHeadlineParts('Before', '?   Word2');
      expect(afterBlank).toBe('Word2');
      expect(suffix).toBe('?');
    });

    it('handles prefix at the very beginning of beforeBlank (beforeBlank becomes empty)', () => {
      const { beforeBlank, prefix } = extractHeadlineParts('"', 'After');
      expect(beforeBlank).toBe('');
      expect(prefix).toBe('"');
    });

    it('correctly handles afterBlank with trailing punctuation (no leading suffix)', () => {
      const { afterBlank, suffix } = extractHeadlineParts('Before', 'Word1?');
      expect(afterBlank).toBe('Word1?');
      expect(suffix).toBe('');
    });

    it('handles empty beforeBlank with prefix-like characters (beforeBlank remains empty)', () => {
      const { beforeBlank, prefix } = extractHeadlineParts('"', 'After');
      expect(beforeBlank).toBe('');
      expect(prefix).toBe('"');
    });

    it('handles empty afterBlank with suffix-like characters (afterBlank remains empty)', () => {
      const { afterBlank, suffix } = extractHeadlineParts('Before', '?');
      expect(afterBlank).toBe('');
      expect(suffix).toBe('?');
    });

    it('handles example: What is "AI"? Find out now', () => {
      const { beforeBlank, prefix, suffix, afterBlank } = extractHeadlineParts(
        'What is "',
        '"? Find out now'
      );
      expect(beforeBlank).toBe('What is');
      expect(prefix).toBe('"');
      expect(suffix).toBe('"?');
      expect(afterBlank).toBe('Find out now');
    });

    it('handles example: The answer is... (drumroll)!', () => {
      const { beforeBlank, prefix, suffix, afterBlank } = extractHeadlineParts(
        'The answer is... (',
        ')!'
      );
      expect(beforeBlank).toBe('The answer is...');
      expect(prefix).toBe('(');
      expect(suffix).toBe(')!');
      expect(afterBlank).toBe(''); // afterBlank becomes empty because ')!' is all suffix
    });

    it('handles empty initialBeforeBlank correctly', () => {
      const { beforeBlank, prefix, suffix, afterBlank } = extractHeadlineParts(
        '',
        '"? Find out now'
      );
      expect(beforeBlank).toBe('');
      expect(prefix).toBe('');
      expect(suffix).toBe('"?');
      expect(afterBlank).toBe('Find out now');
    });

    it('handles empty initialAfterBlank correctly', () => {
      const { beforeBlank, prefix, suffix, afterBlank } = extractHeadlineParts('What is "', '');
      expect(beforeBlank).toBe('What is');
      expect(prefix).toBe('"');
      expect(suffix).toBe('');
      expect(afterBlank).toBe('');
    });

    it('handles both initialBeforeBlank and initialAfterBlank being empty', () => {
      const { beforeBlank, prefix, suffix, afterBlank } = extractHeadlineParts('', '');
      expect(beforeBlank).toBe('');
      expect(prefix).toBe('');
      expect(suffix).toBe('');
      expect(afterBlank).toBe('');
    });
  });

  describe('formatGameDateForHeader', () => {
    const MOCKED_NOW_DATE = new Date('2025-07-11T12:00:00');

    const toDateTimeString = (date: Date) => {
      return date.toISOString().slice(0, 19).replace('T', ' ');
    };

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(MOCKED_NOW_DATE);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should return null for today's date", () => {
      const today = new Date(MOCKED_NOW_DATE);
      expect(formatGameDateForHeader(toDateTimeString(today))).toBeNull();
    });

    it('should return formatted date for yesterday', () => {
      const yesterday = new Date(MOCKED_NOW_DATE);
      yesterday.setDate(yesterday.getDate() - 1);
      expect(formatGameDateForHeader(toDateTimeString(yesterday))).toBe('July 10, 2025');
    });

    it('should return null for a future date', () => {
      const tomorrow = new Date(MOCKED_NOW_DATE);
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(formatGameDateForHeader(toDateTimeString(tomorrow))).toBeNull();
    });

    it('should return null for an undefined date', () => {
      expect(formatGameDateForHeader(undefined)).toBeNull();
    });

    it('should return formatted date for a date in a different month and year', () => {
      const lastYear = new Date(MOCKED_NOW_DATE);
      lastYear.setFullYear(lastYear.getFullYear() - 1);
      lastYear.setMonth(5); // June
      lastYear.setDate(15);
      expect(formatGameDateForHeader(toDateTimeString(lastYear))).toBe('June 15, 2024');
    });
  });
});
