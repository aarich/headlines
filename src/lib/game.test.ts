import { checkAnswer, hasAnyHints, calculateScore, isHintAvailable } from 'lib/game';
import { GameState, Headline, PlayAction, Hint } from 'types';

const MOCK_HEADLINE: Headline = {
  id: 1,
  gameNum: 5,
  headline: `Mock headline with missing word.`,
  correctAnswer: 'missing',
  possibleAnswers: ['foo', 'bar'],
  beforeBlank: 'Mock headline with ',
  afterBlank: ' word.',
  publishTime: new Date().toISOString(),
  hint: 'A clue for the word.',
  articleUrl: 'http://example.com/article',
  redditUrl: 'http://example.com/reddit',
};

const createMockGameState = (actions?: PlayAction[]): GameState => ({
  actions,
});

describe('game.ts', () => {
  describe('checkAnswer', () => {
    it('should return true for exact match', () => {
      expect(checkAnswer('answer', 'answer', false)).toBe(true);
      expect(checkAnswer('answer', 'answer', true)).toBe(true);
    });

    it('should return false for non-exact match in non-expert mode', () => {
      expect(checkAnswer('Answer', 'answer', false)).toBe(false);
      expect(checkAnswer('answers', 'answer', false)).toBe(false);
    });

    it('should return true for case-insensitive match in expert mode', () => {
      expect(checkAnswer('Answer', 'answer', true)).toBe(true);
      expect(checkAnswer('ANSWER', 'answer', true)).toBe(true);
    });

    it('should return true for match with leading/trailing spaces in expert mode', () => {
      expect(checkAnswer(' answer ', 'answer', true)).toBe(true);
    });

    it('should return true for plural/singular variations in expert mode', () => {
      expect(checkAnswer('answers', 'answer', true)).toBe(true);
      expect(checkAnswer('answer', 'answers', true)).toBe(true);
    });

    it('should return true for common verb tense variations in expert mode', () => {
      expect(checkAnswer('answering', 'answer', true)).toBe(true);
      expect(checkAnswer('answer', 'answering', true)).toBe(true);
      expect(checkAnswer('answered', 'answer', true)).toBe(true);
      expect(checkAnswer('answer', 'answered', true)).toBe(true);
      expect(checkAnswer('guide', 'guided', true)).toBe(true);
      expect(checkAnswer('guided', 'guide', true)).toBe(true);
    });

    it('should return false for non-fuzzy match in expert mode', () => {
      expect(checkAnswer('answr', 'answer', true)).toBe(false);
      expect(checkAnswer('completelydifferent', 'answer', true)).toBe(false);
    });
  });

  describe('hasAnyHints', () => {
    it('should return false if no hints are present', () => {
      const gameState = createMockGameState();
      expect(hasAnyHints(gameState)).toBe(false);
    });

    it('should return false if hints object exists but chars is 0 and clue is false', () => {
      const gameState = createMockGameState([]);
      expect(hasAnyHints(gameState)).toBe(false);
    });

    it('should return true if char hints are present', () => {
      const gameState = createMockGameState([Hint.CHAR]);
      expect(hasAnyHints(gameState)).toBe(true);
    });

    it('should return true if clue hint is present', () => {
      const gameState = createMockGameState([Hint.CLUE]);
      expect(hasAnyHints(gameState)).toBe(true);
    });

    it('should return true if both char and clue hints are present', () => {
      const gameState = createMockGameState([Hint.CHAR, Hint.CLUE]);
      expect(hasAnyHints(gameState)).toBe(true);
    });
  });

  describe('isHintAvailable', () => {
    const headline = MOCK_HEADLINE;
    it('should return true if CHAR hint is available (fewer than answer length)', () => {
      const gameState = createMockGameState([Hint.CHAR, Hint.CHAR]);
      expect(isHintAvailable(false, gameState, headline, Hint.CHAR)).toBe(true);
    });
    it('should return false if CHAR hint is not available (equal to answer length)', () => {
      const actions = Array(headline.correctAnswer.length).fill(Hint.CHAR);
      const gameState = createMockGameState(actions);
      expect(isHintAvailable(false, gameState, headline, Hint.CHAR)).toBe(false);
    });
    it('should return false if CLUE hint is present', () => {
      const gameState = createMockGameState([Hint.CLUE]);
      expect(isHintAvailable(false, gameState, headline, Hint.CLUE)).toBe(false);
    });
    it('should return true if CLUE hint is not present', () => {
      const gameState = createMockGameState([Hint.CHAR]);
      expect(isHintAvailable(false, gameState, headline, Hint.CLUE)).toBe(true);
    });

    it('should return false if expert mode and requesting a char', () => {
      const gameState = createMockGameState([]);
      expect(isHintAvailable(true, gameState, headline, Hint.CHAR)).toBe(false);
    });
    it('should throw error for invalid hint type', () => {
      const gameState = createMockGameState();
      // @ts-expect-error
      expect(() => isHintAvailable(false, gameState, headline, 'invalid')).toThrow(
        'Invalid hint type.'
      );
    });
  });

  describe('calculateScore', () => {
    const correctAnswer = 'example'; // length 7
    const mockHeadline: Headline = {
      ...MOCK_HEADLINE,
      correctAnswer,
    };

    it('should return 100 for perfect score (expert, no hints, no wrong guesses)', () => {
      const gameState: GameState = {};
      const score = { d: 0, g: 0, e: true, n: 1 };
      const result = calculateScore(gameState, score, mockHeadline);
      expect(result.overall).toBe(100);
      expect(result.charHintPenalty).toBe(0);
      expect(result.cluePenalty).toBe(0);
      expect(result.notExpertPenalty).toBe(0);
      expect(result.wrongGuessPenalty).toBe(0);
    });

    it('should apply notExpertPenalty', () => {
      const gameState: GameState = {};
      const score = { d: 0, g: 0, e: false, n: 1 }; // Not expert
      const result = calculateScore(gameState, score, mockHeadline);
      expect(result.overall).toBe(90); // 100 - 10
      expect(result.notExpertPenalty).toBe(10);
    });

    it('should apply charHintPenalty', () => {
      const gameState: GameState = { actions: [Hint.CHAR, Hint.CHAR] }; // 2 char hints
      const score = { d: 0, g: 0, e: true, n: 1 };
      const result = calculateScore(gameState, score, mockHeadline);
      expect(result.charHintPenalty).toBe(28);
      expect(result.overall).toBe(100 - 28);
    });

    it('should apply cluePenalty', () => {
      const gameState: GameState = { actions: [Hint.CLUE] };
      const score = { d: 0, g: 0, e: true, n: 1 };
      const result = calculateScore(gameState, score, mockHeadline);
      expect(result.cluePenalty).toBe(30);
      expect(result.overall).toBe(70); // 100 - 30
    });

    it('should apply wrongGuessPenalty', () => {
      const gameState: GameState = {};
      const score = { d: 0, g: 3, e: true, n: 1 }; // 3 wrong guesses
      const result = calculateScore(gameState, score, mockHeadline);
      expect(result.wrongGuessPenalty).toBe(15); // 3 * 5
      expect(result.overall).toBe(85); // 100 - 15
    });

    it('should cap wrongGuessPenalty at 100 (effectively, but max is based on 20 guesses)', () => {
      const gameState: GameState = {};
      const score = { d: 0, g: 25, e: true, n: 1 }; // 25 wrong guesses
      const result = calculateScore(gameState, score, mockHeadline);
      expect(result.wrongGuessPenalty).toBe(100); // 25 * 5 = 125, capped at 100
      expect(result.overall).toBe(0); // 100 - 100
    });

    it('should combine all penalties', () => {
      const gameState: GameState = { actions: [Hint.CHAR, Hint.CLUE] }; // 1 char, 1 clue
      const score = { d: 0, g: 2, e: false, n: 1 }; // 2 wrong, not expert
      const result = calculateScore(gameState, score, mockHeadline);

      expect(result.charHintPenalty).toBe(14);
      expect(result.cluePenalty).toBe(30);
      expect(result.notExpertPenalty).toBe(10);
      expect(result.wrongGuessPenalty).toBe(10);
      expect(result.overall).toBe(36);
    });

    it('should clamp overall score at 0 if penalties exceed 100', () => {
      const gameState: GameState = {
        actions: [Hint.CHAR, Hint.CHAR, Hint.CHAR, Hint.CHAR, Hint.CLUE],
      }; // 4 char hints, 1 clue
      const score = { d: 0, g: 10, e: false, n: 1 }; // 10 wrong, not expert
      const result = calculateScore(gameState, score, mockHeadline);

      expect(result.charHintPenalty).toBe(56);
      expect(result.cluePenalty).toBe(30);
      expect(result.notExpertPenalty).toBe(10);
      expect(result.wrongGuessPenalty).toBe(50);
      expect(result.overall).toBe(0);
    });
  });
});
