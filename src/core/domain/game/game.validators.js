import { Result } from '../../utils/Result.js';
import {
  GameNotAcceptingPlayersError,
  GameFullError,
  UserAlreadyInGameError,
} from '../../errors/game.errors.js';
import { GameStatus } from '../../enums/game.enum.js';

/**
 * Validates if the game is in 'Waiting' status.
 * @param {object} game - The game object.
 * @returns {Result<object, Error>}
 */
export const validateGameIsWaiting = (game) =>
  game.status === GameStatus.WAITING
    ? Result.success(game)
    : Result.failure(new GameNotAcceptingPlayersError());

/**
 * Validates if the game is not full.
 * @param {object} game - The game object.
 * @returns {Result<object, Error>}
 */
export const validateGameNotFull = (game) =>
  game.players.length < game.maxPlayers
    ? Result.success(game)
    : Result.failure(new GameFullError());

/**
 * Returns a function that validates if a user is not already in the game.
 * @param {string} userId - The user ID to check.
 * @returns {function(object): Result<object, Error>}
 */
export const validateUserNotInGame = (userId) => (game) =>
  !game.players.some((p) => p._id.toString() === userId)
    ? Result.success(game)
    : Result.failure(new UserAlreadyInGameError());
