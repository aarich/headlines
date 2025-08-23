import {
  checkAnswer,
  hasAnyHints,
  calculateScore,
  isHintAvailable,
  WRONG_GUESS_PENALTY,
  CLUE_PENALTY,
  NON_EXPERT_PENALTY,
} from 'lib/game';
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
  createdAt: '2025-07-11 00:01:00',
};

const createMockGameState = (actions?: PlayAction[]): GameState => ({
  actions,
});

describe('game.ts', () => {
  describe('checkAnswer', () => {
    it('should return true for exact match', () => {
      expect(checkAnswer('answer', 'answer')).toBe(true);
    });

    it('should return true for case-insensitive match', () => {
      expect(checkAnswer('Answer', 'answer')).toBe(true);
      expect(checkAnswer('ANSWER', 'answer')).toBe(true);
    });

    it('should return true for match with leading/trailing spaces', () => {
      expect(checkAnswer(' answer ', 'answer')).toBe(true);
      expect(checkAnswer('  answer', 'answer')).toBe(true);
      expect(checkAnswer('answer  ', 'answer')).toBe(true);
    });

    it('should return true for plural/singular variations', () => {
      expect(checkAnswer('answers', 'answer')).toBe(true);
      expect(checkAnswer('answer', 'answers')).toBe(true);
    });

    it('should return true for common verb tense variations', () => {
      expect(checkAnswer('answering', 'answer')).toBe(true);
      expect(checkAnswer('answer', 'answering')).toBe(true);
      expect(checkAnswer('answered', 'answer')).toBe(true);
      expect(checkAnswer('answer', 'answered')).toBe(true);
      expect(checkAnswer('guide', 'guided')).toBe(true);
      expect(checkAnswer('guided', 'guide')).toBe(true);
    });

    it('should return false for non-match', () => {
      expect(checkAnswer('answr', 'answer')).toBe(false);
      expect(checkAnswer('completelydifferent', 'answer')).toBe(false);
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
    it('should return true if CHAR hint is available (fewer than answer length)', () => {
      const gameState = createMockGameState([Hint.CHAR, Hint.CHAR]);
      expect(isHintAvailable(true, gameState, MOCK_HEADLINE, Hint.CHAR)).toBe(true);
    });

    it('should return false if CHAR hint is not available (equal to answer length)', () => {
      const actions = Array(MOCK_HEADLINE.correctAnswer.length).fill(Hint.CHAR);
      const gameState = createMockGameState(actions);
      expect(isHintAvailable(true, gameState, MOCK_HEADLINE, Hint.CHAR)).toBe(false);
    });

    it('should return false if CLUE hint is present', () => {
      const gameState = createMockGameState([Hint.CLUE]);
      expect(isHintAvailable(true, gameState, MOCK_HEADLINE, Hint.CLUE)).toBe(false);
    });

    it('should return true if CLUE hint is not present', () => {
      const gameState = createMockGameState([Hint.CHAR]);
      expect(isHintAvailable(true, gameState, MOCK_HEADLINE, Hint.CLUE)).toBe(true);
    });

    it('should return false if not expert mode and requesting a char', () => {
      const gameState = createMockGameState([]);
      expect(isHintAvailable(false, gameState, MOCK_HEADLINE, Hint.CHAR)).toBe(false);
    });
  });

  describe('calculateScore', () => {
    const correctAnswer = 'example';
    const headline: Headline = { ...MOCK_HEADLINE, correctAnswer };

    it('should return 100 for perfect score (expert, no hints, no wrong guesses)', () => {
      const gameState: GameState = {};
      const score = { d: 0, g: 0, e: true, n: 1 };
      const result = calculateScore(gameState, score, headline);
      expect(result.overall).toBe(100);
      expect(result.charHintPenalty).toBe(0);
      expect(result.cluePenalty).toBe(0);
      expect(result.notExpertPenalty).toBe(0);
      expect(result.wrongGuessPenalty).toBe(0);
    });

    it('should apply notExpertPenalty', () => {
      const gameState: GameState = {};
      const score = { d: 0, g: 0, e: false, n: 1 }; // Not expert
      const result = calculateScore(gameState, score, headline);
      expect(result.overall).toBe(90); // 100 - 10
      expect(result.notExpertPenalty).toBe(10);
    });

    it('should apply charHintPenalty', () => {
      const gameState: GameState = { actions: [Hint.CHAR, Hint.CHAR] }; // 2 char hints
      const score = { d: 0, g: 0, e: true, n: 1 };
      const result = calculateScore(gameState, score, headline);
      expect(result.charHintPenalty).toBe(34);
      expect(result.overall).toBe(100 - 34);
    });

    it('should apply cluePenalty', () => {
      const gameState: GameState = { actions: [Hint.CLUE] };
      const score = { d: 0, g: 0, e: true, n: 1 };
      const result = calculateScore(gameState, score, headline);
      expect(result.cluePenalty).toBe(CLUE_PENALTY);
      expect(result.overall).toBe(100 - CLUE_PENALTY);
    });

    it('should apply wrongGuessPenalty', () => {
      const gameState: GameState = {};
      const score = { d: 0, g: 3, e: true, n: 1 }; // 3 wrong guesses
      const result = calculateScore(gameState, score, headline);
      expect(result.wrongGuessPenalty).toBe(WRONG_GUESS_PENALTY * 3);
      expect(result.overall).toBe(100 - WRONG_GUESS_PENALTY * 3);
    });

    it('should cap wrongGuessPenalty at 100', () => {
      const gameState: GameState = {};
      const score = { d: 0, g: 50, e: true, n: 1 }; // 50 wrong guesses
      const result = calculateScore(gameState, score, headline);
      expect(result.wrongGuessPenalty).toBe(100);
      expect(result.overall).toBe(0);
    });

    it('should combine all penalties', () => {
      const gameState: GameState = { actions: [Hint.CHAR, Hint.CLUE] }; // 1 char, 1 clue
      const score = { d: 0, g: 2, e: false, n: 1 }; // 2 wrong, not expert
      const result = calculateScore(gameState, score, headline);

      expect(result.charHintPenalty).toBe(17);
      expect(result.cluePenalty).toBe(CLUE_PENALTY);
      expect(result.notExpertPenalty).toBe(NON_EXPERT_PENALTY);
      expect(result.wrongGuessPenalty).toBe(2 * WRONG_GUESS_PENALTY);
      expect(result.overall).toBe(
        100 - 17 - CLUE_PENALTY - NON_EXPERT_PENALTY - 2 * WRONG_GUESS_PENALTY
      );
    });

    it('should clamp overall score at 0 if penalties exceed 100', () => {
      const gameState: GameState = {
        actions: [Hint.CHAR, Hint.CHAR, Hint.CHAR, Hint.CHAR, Hint.CLUE],
      }; // 4 char hints, 1 clue
      const score = { d: 0, g: 20, e: false, n: 1 }; // 10 wrong, not expert
      const result = calculateScore(gameState, score, headline);

      expect(result.charHintPenalty).toBe(68);
      expect(result.cluePenalty).toBe(CLUE_PENALTY);
      expect(result.notExpertPenalty).toBe(NON_EXPERT_PENALTY);
      expect(result.wrongGuessPenalty).toBe(WRONG_GUESS_PENALTY * 20);
      expect(result.overall).toBe(0);
    });
  });
});
