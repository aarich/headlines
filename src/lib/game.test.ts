import {
  checkAnswer,
  getNextHint,
  hasAnyHints,
  getNumCharsBeforeClue,
  getNextHintPrompt,
  getNextRevealType,
} from './game';
import { GameState, Headline, GameHints, WrongGuess } from '../types';

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
const ANSWER_LENGTH = MOCK_HEADLINE.correctAnswer.length;

// Helper to create a mock GameState
const createMockGameState = (
  hints?: GameHints,
  correct = false,
  wrongGuesses: WrongGuess[] = []
): GameState => ({ correct, wrongGuesses, hints });

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

  describe('getNumCharsBeforeClue', () => {
    it('should return half the length (up to 3) for expert mode', () => {
      expect(getNumCharsBeforeClue('a', true)).toBe(0); // 1/2 = 0.5
      expect(getNumCharsBeforeClue('word', true)).toBe(2); // 4/2 = 2
      expect(getNumCharsBeforeClue('apple', true)).toBe(2); // 5/2 = 2.5
      expect(getNumCharsBeforeClue('banana', true)).toBe(3); // 6/2 = 3
      expect(getNumCharsBeforeClue('strawberry', true)).toBe(3); // 10/2 = 5, capped at 3
    });

    it('should return 0 for non-expert mode, regardless of word length', () => {
      expect(getNumCharsBeforeClue('a', false)).toBe(0);
      expect(getNumCharsBeforeClue('word', false)).toBe(0);
      expect(getNumCharsBeforeClue('apple', false)).toBe(0);
      expect(getNumCharsBeforeClue('banana', false)).toBe(0);
    });
  });

  describe('getNextRevealType', () => {
    it('should return "clue" if no hints are present and in non-expert mode', () => {
      expect(getNextRevealType(undefined, MOCK_HEADLINE.correctAnswer, false)).toBe('clue');
    });

    it('should return "char" if no hints are present and in expert mode', () => {
      expect(getNextRevealType(undefined, MOCK_HEADLINE.correctAnswer, true)).toBe('char');
    });

    it('should return "char" if char hints are less than numCharsBeforeClue (expert mode)', () => {
      const hints: GameHints = { chars: 0, clue: false };
      // For MOCK_HEADLINE.correctAnswer ("missing"), numCharsBeforeClue (expert) is 3.
      expect(getNextRevealType(hints, MOCK_HEADLINE.correctAnswer, true)).toBe('char'); // 0 < 3

      const hintsSomeChars: GameHints = { chars: 2, clue: false };
      expect(getNextRevealType(hintsSomeChars, MOCK_HEADLINE.correctAnswer, true)).toBe('char'); // 2 < 3
    });

    it('should return "clue" if char hints reached/passed numCharsBeforeClue and clue not taken (expert mode)', () => {
      const numCharsBeforeClueExpert = getNumCharsBeforeClue(MOCK_HEADLINE.correctAnswer, true); // Should be 3

      const hintsReached: GameHints = { chars: numCharsBeforeClueExpert, clue: false };
      expect(getNextRevealType(hintsReached, MOCK_HEADLINE.correctAnswer, true)).toBe('clue');

      const hintsPassed: GameHints = { chars: numCharsBeforeClueExpert + 1, clue: false };
      // Ensure it still offers clue even if somehow chars > numCharsBeforeClue but clue not taken
      expect(getNextRevealType(hintsPassed, MOCK_HEADLINE.correctAnswer, true)).toBe('clue');
    });

    it('should return "clue" if clue not taken (non-expert mode, numCharsBeforeClue is 0)', () => {
      const hints: GameHints = { chars: 0, clue: false }; // numCharsBeforeClue = 0 for non-expert
      expect(getNextRevealType(hints, MOCK_HEADLINE.correctAnswer, false)).toBe('clue');

      const hintsWithChars: GameHints = { chars: 1, clue: false };
      expect(getNextRevealType(hintsWithChars, MOCK_HEADLINE.correctAnswer, false)).toBe('clue');
    });

    it('should return "char" if clue is taken and more chars can be revealed (expert mode)', () => {
      const hintsFewChars: GameHints = { chars: 1, clue: true };
      expect(getNextRevealType(hintsFewChars, MOCK_HEADLINE.correctAnswer, true)).toBe('char'); // 1 < ANSWER_LENGTH

      const numCharsBeforeClueExpert = getNumCharsBeforeClue(MOCK_HEADLINE.correctAnswer, true);
      const hintsAfterClueThreshold: GameHints = { chars: numCharsBeforeClueExpert, clue: true };
      expect(getNextRevealType(hintsAfterClueThreshold, MOCK_HEADLINE.correctAnswer, true)).toBe(
        'char'
      ); // numCharsBeforeClueExpert < ANSWER_LENGTH
    });

    it('should return "char" if clue is taken and more chars can be revealed (non-expert mode)', () => {
      const hintsNoChars: GameHints = { chars: 0, clue: true }; // Clue taken, 0 chars revealed
      expect(getNextRevealType(hintsNoChars, MOCK_HEADLINE.correctAnswer, false)).toBe('char'); // 0 < ANSWER_LENGTH

      const hintsSomeChars: GameHints = { chars: 2, clue: true }; // Clue taken, 2 chars revealed
      expect(getNextRevealType(hintsSomeChars, MOCK_HEADLINE.correctAnswer, false)).toBe('char'); // 2 < ANSWER_LENGTH
    });

    it('should return undefined if clue is taken and all chars are revealed', () => {
      const hintsAllChars: GameHints = { chars: ANSWER_LENGTH, clue: true };
      expect(getNextRevealType(hintsAllChars, MOCK_HEADLINE.correctAnswer, true)).toBe(undefined);
      expect(getNextRevealType(hintsAllChars, MOCK_HEADLINE.correctAnswer, false)).toBe(undefined);
    });
  });

  describe('getNextHint', () => {
    // For MOCK_HEADLINE.correctAnswer ("missing", length 7):
    // Expert mode: numCharsBeforeClue = 3
    // Non-expert mode: numCharsBeforeClue = 0

    it('should return initial hints (no change) if no hints exist and in expert mode', () => {
      const gameState = createMockGameState(); // hints = undefined
      expect(getNextHint(MOCK_HEADLINE, gameState, true)).toEqual({ chars: 1, clue: false });
    });

    it('should return clue hint if no hints exist and in non-expert mode', () => {
      const gameState = createMockGameState(); // hints = undefined
      expect(getNextHint(MOCK_HEADLINE, gameState, false)).toEqual({ chars: 0, clue: true });
    });

    it('should increment char hint if next reveal type is char (expert mode, before clue)', () => {
      const gameState = createMockGameState({ chars: 1, clue: false });
      expect(getNextHint(MOCK_HEADLINE, gameState, true)).toEqual({ chars: 2, clue: false });
    });

    it('should set clue to true if next reveal type is clue (expert mode)', () => {
      const gameStateAtClueThreshold = createMockGameState({
        chars: getNumCharsBeforeClue(MOCK_HEADLINE.correctAnswer, true), // Should be 3
        clue: false,
      });
      expect(getNextHint(MOCK_HEADLINE, gameStateAtClueThreshold, true)).toEqual({
        chars: getNumCharsBeforeClue(MOCK_HEADLINE.correctAnswer, true),
        clue: true,
      });
    });

    it('should set clue to true if next reveal type is clue (non-expert mode)', () => {
      const gameStateInitialNonExpert = createMockGameState({ chars: 0, clue: false });
      expect(getNextHint(MOCK_HEADLINE, gameStateInitialNonExpert, false)).toEqual({
        chars: 0,
        clue: true,
      });
    });

    it('should increment char hint if next reveal type is char (expert mode, after clue)', () => {
      const chars = ANSWER_LENGTH - 1;
      const gameStateAfterClue = createMockGameState({ chars, clue: true });
      expect(getNextHint(MOCK_HEADLINE, gameStateAfterClue, true)).toEqual({
        chars: chars + 1,
        clue: true,
      });
    });

    it('should increment char hint if next reveal type is char (non-expert mode, after clue)', () => {
      const gameStateAfterClue = createMockGameState({ chars: 0, clue: true });
      expect(getNextHint(MOCK_HEADLINE, gameStateAfterClue, false)).toEqual({
        chars: 1,
        clue: true,
      });
    });

    it('should return current hints if no more hints can be given (expert mode)', () => {
      const gameStateAllHints = createMockGameState({ chars: ANSWER_LENGTH, clue: true });
      expect(getNextHint(MOCK_HEADLINE, gameStateAllHints, true)).toEqual({
        chars: ANSWER_LENGTH,
        clue: true,
      });
    });

    it('should return current hints if no more hints can be given (non-expert mode)', () => {
      const state = createMockGameState({
        chars: ANSWER_LENGTH,
        clue: true,
      });
      expect(getNextHint(MOCK_HEADLINE, state, false)).toEqual({
        chars: ANSWER_LENGTH,
        clue: true,
      });
    });
  });

  describe('hasAnyHints', () => {
    it('should return false if no hints are present', () => {
      const gameState = createMockGameState();
      expect(hasAnyHints(gameState)).toBe(false);
    });

    it('should return false if hints object exists but chars is 0 and clue is false', () => {
      const gameState = createMockGameState({ chars: 0, clue: false });
      expect(hasAnyHints(gameState)).toBe(false);
    });

    it('should return true if char hints are present', () => {
      const gameState = createMockGameState({ chars: 1, clue: false });
      expect(hasAnyHints(gameState)).toBe(true);
    });

    it('should return true if clue hint is present', () => {
      const gameState = createMockGameState({ chars: 0, clue: true });
      expect(hasAnyHints(gameState)).toBe(true);
    });

    it('should return true if both char and clue hints are present', () => {
      const gameState = createMockGameState({ chars: 1, clue: true });
      expect(hasAnyHints(gameState)).toBe(true);
    });
  });

  describe('getNextHintPrompt', () => {
    it('should prompt for "clue" if no hints and in non-expert mode', () => {
      const gameState = createMockGameState(); // hints = undefined, isExpert = false
      // getNextRevealType(undefined, MOCK_HEADLINE.correctAnswer, false) is 'clue'
      expect(getNextHintPrompt(gameState, MOCK_HEADLINE.correctAnswer, false)).toBe(
        'Reveal a clue about the missing word?'
      );
    });

    it('should return empty string if no hints and in expert mode', () => {
      const gameState = createMockGameState(); // hints = undefined, isExpert = true
      expect(getNextHintPrompt(gameState, MOCK_HEADLINE.correctAnswer, true)).toBe(
        'Reveal the first letter of the missing word?'
      );
    });

    it('should prompt for "first letter" in expert mode if hints={chars:0,clue:false}', () => {
      const gameState = createMockGameState({ chars: 0, clue: false });
      // getNextRevealType({chars:0,clue:false}, MOCK_HEADLINE.correctAnswer, true) is 'char'
      // !hints.chars is true
      expect(getNextHintPrompt(gameState, MOCK_HEADLINE.correctAnswer, true)).toBe(
        'Reveal the first letter of the missing word?'
      );
    });

    it('should prompt for "next letter" if next reveal is char and some char hints exist (expert)', () => {
      const gameState = createMockGameState({ chars: 1, clue: false });
      // getNextRevealType({chars:1,clue:false}, MOCK_HEADLINE.correctAnswer, true) is 'char'
      // tip should be added
      const expectedPrompt =
        'Reveal the next letter of the missing word?\n\nTip: You can also toggle off "Expert Mode" for a different fun experience!';
      expect(getNextHintPrompt(gameState, MOCK_HEADLINE.correctAnswer, true)).toBe(expectedPrompt);
    });

    it('should prompt for "next letter" if next reveal is char and some char hints exist (non-expert, after clue)', () => {
      const gameState = createMockGameState({ chars: 1, clue: true });
      // getNextRevealType({chars:1,clue:true}, MOCK_HEADLINE.correctAnswer, false) is 'char'
      expect(getNextHintPrompt(gameState, MOCK_HEADLINE.correctAnswer, false)).toBe(
        'Reveal the next letter of the missing word?'
      );
    });

    it('should prompt for "last letter" if next reveal is char and it is the last char (expert)', () => {
      const gameState = createMockGameState({ chars: ANSWER_LENGTH - 1, clue: true });
      // getNextRevealType({chars:ANSWER_LENGTH-1,clue:true}, MOCK_HEADLINE.correctAnswer, true) is 'char'
      // tip should be added
      const expectedPrompt =
        'Reveal the last letter of the missing word?\n\nTip: You can also toggle off "Expert Mode" for a different fun experience!';
      expect(getNextHintPrompt(gameState, MOCK_HEADLINE.correctAnswer, true)).toBe(expectedPrompt);
    });

    it('should prompt for "last letter" if next reveal is char and it is the last char (non-expert)', () => {
      const gameState = createMockGameState({ chars: ANSWER_LENGTH - 1, clue: true });
      // getNextRevealType({chars:ANSWER_LENGTH-1,clue:true}, MOCK_HEADLINE.correctAnswer, false) is 'char'
      expect(getNextHintPrompt(gameState, MOCK_HEADLINE.correctAnswer, false)).toBe(
        'Reveal the last letter of the missing word?'
      );
    });

    it('should prompt for "clue" if next reveal type is clue (expert mode)', () => {
      // getNextRevealType will be 'clue'
      // For MOCK_HEADLINE, numCharsBeforeClue (expert) is 3.
      // Need hints.chars >= numCharsBeforeClueExpert and !hints.clue
      const gameStateAtClueThreshold = createMockGameState({
        chars: getNumCharsBeforeClue(MOCK_HEADLINE.correctAnswer, true), // Should be 3
        clue: false,
      });
      expect(getNextHintPrompt(gameStateAtClueThreshold, MOCK_HEADLINE.correctAnswer, true)).toBe(
        'Reveal a clue about the missing word?'
      );
    });

    it('should return empty string if no more hints can be given', () => {
      const gameStateAllHints = createMockGameState({ chars: ANSWER_LENGTH, clue: true });
      expect(getNextHintPrompt(gameStateAllHints, MOCK_HEADLINE.correctAnswer, true)).toBe('');
      expect(getNextHintPrompt(gameStateAllHints, MOCK_HEADLINE.correctAnswer, false)).toBe('');
    });
  });
});
