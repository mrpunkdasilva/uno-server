import { Result } from '../../utils/Result.js';
import {
  GameNotAcceptingPlayersError,
  GameFullError,
  UserAlreadyInGameError,
  NotGameCreatorError,
  GameAlreadyStartedError,
  MinimumPlayersRequiredError,
  NotAllPlayersReadyError,
  GameNotActiveError,
  UserNotInGameError,
  CannotPerformActionError,
  GameHasNotStartedError,
  CouldNotDetermineCurrentPlayerError,
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

/**
 * Validates if the user is the creator of the game.
 * @param {string} userId - The user ID to check.
 * @returns {function(object): Result<object, Error>}
 */
export const validateIsCreator = (userId) => (game) =>
  game.creatorId.toString() === userId
    ? Result.success(game)
    : Result.failure(new NotGameCreatorError());

/**
 * Validates if the game has not already started.
 * @param {object} game - The game object.
 * @returns {Result<object, Error>}
 */
export const validateGameNotStarted = (game) =>
  game.status !== GameStatus.ACTIVE
    ? Result.success(game)
    : Result.failure(new GameAlreadyStartedError());

/**
 * Validates if the game has the minimum number of players.
 * @param {object} game - The game object.
 * @returns {Result<object, Error>}
 */
export const validateMinimumPlayers = (game) =>
  game.players.length >= game.minPlayers
    ? Result.success(game)
    : Result.failure(new MinimumPlayersRequiredError(game.minPlayers));

/**
 * Validates if all players in the game are ready.
 * @param {object} game - The game object.
 * @returns {Result<object, Error>}
 */
export const validateAllPlayersReady = (game) => {
  const notReadyPlayers = game.players.filter((player) => !player.ready);
  return notReadyPlayers.length === 0
    ? Result.success(game)
    : Result.failure(new NotAllPlayersReadyError());
};

/**
 * Validates if a user is in the game.
 * @param {string} userId - The user ID to check.
 * @returns {function(object): Result<object, Error>}
 */
export const validateUserInGame = (userId) => (game) =>
  game.players.some((p) => p._id.toString() === userId)
    ? Result.success(game)
    : Result.failure(new UserNotInGameError());

/**
 * Validates if the game is in 'Active' status.
 * @param {object} game - The game object.
 * @returns {Result<object, Error>}
 */
export const validateGameIsActive = (game) =>
  game.status === GameStatus.ACTIVE
    ? Result.success(game)
    : Result.failure(new GameNotActiveError());

/**
 * Validates if the game has started.
 * @param {object} game - The game object.
 * @returns {Result<object, Error>}
 */
export const validateGameHasStarted = (game) =>
  game.status !== GameStatus.WAITING
    ? Result.success(game)
    : Result.failure(new GameHasNotStartedError());

/**
 * Validates if the game has any players.
 * @param {object} game - The game object.
 * @returns {Result<object, Error>}
 */
export const validateGameHasPlayers = (game) =>
  game.players && game.players.length > 0
    ? Result.success(game)
    : Result.failure(new CannotPerformActionError('No players in game'));

/**
 * Validates if the current player is the given user.
 * @param {string} userId - The user ID to check.
 * @returns {function(object): Result<object, Error>}
 */
export const validateIsCurrentPlayer = (userId) => (game) => {
  const currentPlayer = game.players[game.currentPlayerIndex];
  if (!currentPlayer) {
    return Result.failure(new CouldNotDetermineCurrentPlayerError());
  }
  return currentPlayer._id.toString() === userId
    ? Result.success(game)
    : Result.failure(new CannotPerformActionError('It is not your turn.'));
};
