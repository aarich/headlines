import {
  checkAnswer,
  getNextHint,
  hasAnyHints,
  getNumCharsBeforeClue,
  getNextHintPrompt,
  getNextRevealType,
  calculateScore,
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
};
const ANSWER_LENGTH = MOCK_HEADLINE.correctAnswer.length;

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
      const actions: PlayAction[] = [];
      // For MOCK_HEADLINE.correctAnswer ("missing"), numCharsBeforeClue (expert) is 3.
      expect(getNextRevealType(actions, MOCK_HEADLINE.correctAnswer, true)).toBe('char'); // 0 < 3

      const actionsSomeChars: PlayAction[] = [Hint.CHAR, Hint.CHAR];
      expect(getNextRevealType(actionsSomeChars, MOCK_HEADLINE.correctAnswer, true)).toBe('char'); // 2 < 3
    });

    it('should return "clue" if char hints reached/passed numCharsBeforeClue and clue not taken (expert mode)', () => {
      const numCharsBeforeClueExpert = getNumCharsBeforeClue(MOCK_HEADLINE.correctAnswer, true); // Should be 3

      const actionsReached: PlayAction[] = Array(numCharsBeforeClueExpert).fill(Hint.CHAR);
      expect(getNextRevealType(actionsReached, MOCK_HEADLINE.correctAnswer, true)).toBe('clue');

      const actionsPassed: PlayAction[] = Array(numCharsBeforeClueExpert + 1).fill(Hint.CHAR);
      // Ensure it still offers clue even if somehow chars > numCharsBeforeClue but clue not taken
      expect(getNextRevealType(actionsPassed, MOCK_HEADLINE.correctAnswer, true)).toBe('clue');
    });

    it('should return "clue" if clue not taken (non-expert mode, numCharsBeforeClue is 0)', () => {
      const actions: PlayAction[] = []; // numCharsBeforeClue = 0 for non-expert
      expect(getNextRevealType(actions, MOCK_HEADLINE.correctAnswer, false)).toBe('clue');

      const actionsWithChars: PlayAction[] = [Hint.CHAR];
      expect(getNextRevealType(actionsWithChars, MOCK_HEADLINE.correctAnswer, false)).toBe('clue');
    });

    it('should return "char" if clue is taken and more chars can be revealed (expert mode)', () => {
      const actionsFewChars: PlayAction[] = [Hint.CHAR, Hint.CLUE];
      expect(getNextRevealType(actionsFewChars, MOCK_HEADLINE.correctAnswer, true)).toBe('char'); // 1 < ANSWER_LENGTH

      const numCharsBeforeClueExpert = getNumCharsBeforeClue(MOCK_HEADLINE.correctAnswer, true);
      const actionsAfterClueThreshold: PlayAction[] = [
        ...Array(numCharsBeforeClueExpert).fill(Hint.CHAR),
        Hint.CLUE,
      ];
      expect(getNextRevealType(actionsAfterClueThreshold, MOCK_HEADLINE.correctAnswer, true)).toBe(
        'char'
      ); // numCharsBeforeClueExpert < ANSWER_LENGTH
    });

    it('should return "char" if clue is taken and more chars can be revealed (non-expert mode)', () => {
      const actionsNoChars: PlayAction[] = [Hint.CLUE]; // Clue taken, 0 chars revealed
      expect(getNextRevealType(actionsNoChars, MOCK_HEADLINE.correctAnswer, false)).toBe('char'); // 0 < ANSWER_LENGTH

      const actionsSomeChars: PlayAction[] = [Hint.CLUE, Hint.CHAR, Hint.CHAR]; // Clue taken, 2 chars revealed
      expect(getNextRevealType(actionsSomeChars, MOCK_HEADLINE.correctAnswer, false)).toBe('char'); // 2 < ANSWER_LENGTH
    });

    it('should return undefined if clue is taken and all chars are revealed', () => {
      const actionsAllChars: PlayAction[] = [...Array(ANSWER_LENGTH).fill(Hint.CHAR), Hint.CLUE];
      expect(getNextRevealType(actionsAllChars, MOCK_HEADLINE.correctAnswer, true)).toBe(undefined);
      expect(getNextRevealType(actionsAllChars, MOCK_HEADLINE.correctAnswer, false)).toBe(
        undefined
      );
    });
  });

  describe('getNextHint', () => {
    // For MOCK_HEADLINE.correctAnswer ("missing", length 7):
    // Expert mode: numCharsBeforeClue = 3
    // Non-expert mode: numCharsBeforeClue = 0

    it('should add a char hint if no actions exist and in expert mode', () => {
      const gameState = createMockGameState(); // actions = undefined
      expect(getNextHint(MOCK_HEADLINE, gameState, true)).toEqual([Hint.CHAR]);
    });

    it('should return clue hint if no hints exist and in non-expert mode', () => {
      const gameState = createMockGameState(); // actions = undefined
      expect(getNextHint(MOCK_HEADLINE, gameState, false)).toEqual([Hint.CLUE]);
    });

    it('should increment char hint if next reveal type is char (expert mode, before clue)', () => {
      const gameState = createMockGameState([Hint.CHAR]);
      expect(getNextHint(MOCK_HEADLINE, gameState, true)).toEqual([Hint.CHAR, Hint.CHAR]);
    });

    it('should set clue to true if next reveal type is clue (expert mode)', () => {
      const numChars = getNumCharsBeforeClue(MOCK_HEADLINE.correctAnswer, true);
      const gameStateAtClueThreshold = createMockGameState(Array(numChars).fill(Hint.CHAR));
      expect(getNextHint(MOCK_HEADLINE, gameStateAtClueThreshold, true)).toEqual([
        ...Array(numChars).fill(Hint.CHAR),
        Hint.CLUE,
      ]);
    });

    it('should set clue to true if next reveal type is clue (non-expert mode)', () => {
      const gameStateInitialNonExpert = createMockGameState();
      expect(getNextHint(MOCK_HEADLINE, gameStateInitialNonExpert, false)).toEqual([Hint.CLUE]);
    });

    it('should increment char hint if next reveal type is char (expert mode, after clue)', () => {
      const chars = ANSWER_LENGTH - 1;
      const initialActions = [...Array(chars).fill(Hint.CHAR), Hint.CLUE];
      const gameStateAfterClue = createMockGameState(initialActions);
      const expectedActions = [...initialActions, Hint.CHAR];
      expect(getNextHint(MOCK_HEADLINE, gameStateAfterClue, true)).toEqual(expectedActions);
    });

    it('should increment char hint if next reveal type is char (non-expert mode, after clue)', () => {
      const initialActions = [Hint.CLUE];
      const gameStateAfterClue = createMockGameState(initialActions);
      const expectedActions = [Hint.CLUE, Hint.CHAR];
      expect(getNextHint(MOCK_HEADLINE, gameStateAfterClue, false)).toEqual(expectedActions);
    });

    it('should return current hints if no more hints can be given (expert mode)', () => {
      const allActions = [...Array(ANSWER_LENGTH).fill(Hint.CHAR), Hint.CLUE];
      const gameStateAllHints = createMockGameState(allActions);
      expect(getNextHint(MOCK_HEADLINE, gameStateAllHints, true)).toEqual(allActions);
    });

    it('should return current hints if no more hints can be given (non-expert mode)', () => {
      const allActions = [...Array(ANSWER_LENGTH).fill(Hint.CHAR), Hint.CLUE];
      const state = createMockGameState(allActions);
      expect(getNextHint(MOCK_HEADLINE, state, false)).toEqual(allActions);
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

  describe('getNextHintPrompt', () => {
    it('should prompt for "clue" if no hints and in non-expert mode', () => {
      const gameState = createMockGameState();
      // getNextRevealType(undefined, MOCK_HEADLINE.correctAnswer, false) is 'clue'
      expect(getNextHintPrompt(gameState, MOCK_HEADLINE.correctAnswer, false)).toBe(
        'Reveal a clue about the missing word?'
      );
    });

    it('should return empty string if no hints and in expert mode', () => {
      const gameState = createMockGameState(); // actions = undefined, isExpert = true
      expect(getNextHintPrompt(gameState, MOCK_HEADLINE.correctAnswer, true)).toBe(
        'Reveal the first letter of the missing word?'
      );
    });

    it('should prompt for "first letter" in expert mode if hints={chars:0,clue:false}', () => {
      const gameState = createMockGameState([]);
      // getNextRevealType({chars:0,clue:false}, MOCK_HEADLINE.correctAnswer, true) is 'char'
      expect(getNextHintPrompt(gameState, MOCK_HEADLINE.correctAnswer, true)).toBe(
        'Reveal the first letter of the missing word?'
      );
    });

    it('should prompt for "next letter" if next reveal is char and some char hints exist (expert)', () => {
      const gameState = createMockGameState([Hint.CHAR, Hint.CHAR]); // 2 char hints
      // getNextRevealType({chars:1,clue:false}, MOCK_HEADLINE.correctAnswer, true) is 'char'
      // numCharsRevealed is 2
      // tip should be added
      const expectedPrompt =
        'Reveal the next letter of the missing word?\n\nTip: You can also toggle off "Expert Mode" for a different fun experience!';
      expect(getNextHintPrompt(gameState, MOCK_HEADLINE.correctAnswer, true)).toBe(expectedPrompt);
    });

    it('should prompt for "next letter" if next reveal is char and some char hints exist (non-expert, after clue)', () => {
      const gameState = createMockGameState([Hint.CLUE, Hint.CHAR]);
      // getNextRevealType({chars:1,clue:true}, MOCK_HEADLINE.correctAnswer, false) is 'char'
      expect(getNextHintPrompt(gameState, MOCK_HEADLINE.correctAnswer, false)).toBe(
        'Reveal the next letter of the missing word?'
      );
    });

    it('should prompt for "last letter" if next reveal is char and it is the last char (expert)', () => {
      const actions = [...Array(ANSWER_LENGTH - 1).fill(Hint.CHAR), Hint.CLUE];
      const gameState = createMockGameState(actions);
      // getNextRevealType({chars:ANSWER_LENGTH-1,clue:true}, MOCK_HEADLINE.correctAnswer, true) is 'char'
      // numCharsRevealed is ANSWER_LENGTH - 1
      // tip should be added
      const expectedPrompt = 'Reveal the last letter of the missing word?';
      expect(getNextHintPrompt(gameState, MOCK_HEADLINE.correctAnswer, true)).toBe(expectedPrompt);
    });

    it('should prompt for "last letter" if next reveal is char and it is the last char (non-expert)', () => {
      const actions = [...Array(ANSWER_LENGTH - 1).fill(Hint.CHAR), Hint.CLUE];
      const gameState = createMockGameState(actions);
      // getNextRevealType({chars:ANSWER_LENGTH-1,clue:true}, MOCK_HEADLINE.correctAnswer, false) is 'char'
      expect(getNextHintPrompt(gameState, MOCK_HEADLINE.correctAnswer, false)).toBe(
        'Reveal the last letter of the missing word?'
      );
    });

    it('should prompt for "clue" if next reveal type is clue (expert mode)', () => {
      // getNextRevealType will be 'clue'
      // For MOCK_HEADLINE, numCharsBeforeClue (expert) is 3.
      const numChars = getNumCharsBeforeClue(MOCK_HEADLINE.correctAnswer, true); // Should be 3
      const actions = Array(numChars).fill(Hint.CHAR);
      const gameStateAtClueThreshold = createMockGameState(actions);
      expect(getNextHintPrompt(gameStateAtClueThreshold, MOCK_HEADLINE.correctAnswer, true)).toBe(
        'Reveal a clue about the missing word?'
      );
    });

    it('should return empty string if no more hints can be given', () => {
      const allActions = [...Array(ANSWER_LENGTH).fill(Hint.CHAR), Hint.CLUE];
      const gameStateAllHints = createMockGameState(allActions);
      expect(getNextHintPrompt(gameStateAllHints, MOCK_HEADLINE.correctAnswer, true)).toBe('');
      expect(getNextHintPrompt(gameStateAllHints, MOCK_HEADLINE.correctAnswer, false)).toBe('');
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
      // Penalty = round((2/7)*100) = round(28.57) = 29
      expect(result.charHintPenalty).toBe(29);
      expect(result.overall).toBe(71); // 100 - 29
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

      // charHintPenalty = round((1/7)*100) = 14
      // cluePenalty = 30
      // notExpertPenalty = 10
      // wrongGuessPenalty = 2 * 5 = 10
      // Total penalty = 14 + 30 + 10 + 10 = 64
      // Overall = 100 - 64 = 36

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

      // charHintPenalty = round((4/7)*100) = 57
      // cluePenalty = 30
      // notExpertPenalty = 10
      // wrongGuessPenalty = 10 * 5 = 50
      // Total penalty = 57 + 30 + 10 + 50 = 147
      // Overall = max(100 - 147, 0) = 0

      expect(result.charHintPenalty).toBe(57);
      expect(result.cluePenalty).toBe(30);
      expect(result.notExpertPenalty).toBe(10);
      expect(result.wrongGuessPenalty).toBe(50);
      expect(result.overall).toBe(0);
    });
  });
});
