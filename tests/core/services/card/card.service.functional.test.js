import { describe, it, expect, beforeEach } from '@jest/globals';
// Import correct path relative to the test location
import CardService from '../../../../src/core/services/card.service.js';

/*
 * Functional Programming Unit Tests for CardService.
 *
 * This suite validates the application of Monads (Either) and Functors
 * effectively replacing imperative error handling (try/catch) with
 * declarative data flow transformations.
 *
 * Key Concepts Tested:
 * 1. Either Monad: Encapsulates success (Right) or failure (Left) logic.
 * 2. Functor: Safe data transformation using .map().
 */
describe('CardService - Functional Logic', () => {
  let cardService;
  let mockRepository;

  beforeEach(() => {
    // We mock the repository since we are testing pure business logic methods
    // that do not require database access.
    mockRepository = {};
    cardService = new CardService(mockRepository);
  });

  /*
   * Tests for `canPlayCard` method.
   *
   * Verifies the "Either" Monad implementation where:
   * - Right(true) represents a valid move.
   * - Left(string) represents an invalid move with a reason.
   */
  describe('canPlayCard (Using Either Monad)', () => {
    /*
     * Scenario: Matching Colors.
     * The Monad chain should proceed to return Right(true).
     */
    it('should return Right(true) when colors match', () => {
      // Arrange
      const cardToPlay = { color: 'blue', value: '5', type: 'number' };
      const topCard = { color: 'blue', value: '9', type: 'number' };

      // Act
      const result = cardService.canPlayCard(cardToPlay, topCard);

      // Assert: Unwrap the Monad safely
      result.fold(
        (error) => {
          throw new Error(`Should be success, but got error: ${error}`);
        },
        (success) => {
          expect(success).toBe(true);
        },
      );
    });

    /*
     * Scenario: Matching Values.
     * Validates that logic correctly identifies value matches across different colors.
     */
    it('should return Right(true) when values match', () => {
      // Arrange
      const cardToPlay = { color: 'red', value: '7', type: 'number' };
      const topCard = { color: 'green', value: '7', type: 'number' };

      // Act
      const result = cardService.canPlayCard(cardToPlay, topCard);

      // Assert
      result.fold(
        (error) => {
          throw new Error(`Should be success, but got error: ${error}`);
        },
        (success) => {
          expect(success).toBe(true);
        },
      );
    });

    /*
     * Scenario: Special Cards (Wild).
     * Validates the business rule that Wild cards can be played on top of anything.
     */
    it('should return Right(true) for Wild cards', () => {
      // Arrange
      const cardToPlay = { color: 'wild', value: 'wild_draw4', type: 'wild' };
      const topCard = { color: 'yellow', value: '2', type: 'number' };

      // Act
      const result = cardService.canPlayCard(cardToPlay, topCard);

      // Assert
      result.fold(
        (error) => {
          throw new Error(`Should be success, but got error: ${error}`);
        },
        (success) => {
          expect(success).toBe(true);
        },
      );
    });

    /*
     * Scenario: Invalid Move.
     * Verifies that the Monad returns a "Left" side containing the error message,
     * ensuring flow control without throwing exceptions.
     */
    it('should return Left(error) when card cannot be played', () => {
      // Arrange
      const cardToPlay = { color: 'red', value: '5', type: 'number' };
      const topCard = { color: 'blue', value: '9', type: 'number' };

      // Act
      const result = cardService.canPlayCard(cardToPlay, topCard);

      // Assert
      result.fold(
        (error) => {
          expect(error).toBe(
            'The card does not match the color or value of the top card.',
          );
        },
        () => {
          throw new Error('Should have returned Left(error)');
        },
      );
    });
  });

  /*
   * Tests for `formatCardName` method.
   *
   * Verifies "Functor" behavior: applying a function to a value inside a container
   * (the Either) only if the value exists.
   */
  describe('formatCardName (Using Functor)', () => {
    it('should format a valid card correctly', () => {
      const card = { color: 'red', value: 'skip' };
      const result = cardService.formatCardName(card);
      expect(result).toBe('RED skip');
    });

    it('should handle null input safely using Either.fromNullable', () => {
      // Demonstrates safety: No null pointer exception is thrown
      const result = cardService.formatCardName(null);
      expect(result).toBe('Unknown Card');
    });
  });
});
