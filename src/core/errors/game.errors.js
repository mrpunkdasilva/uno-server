/**
 * Base class for all game-related errors.
 * Provides a standard structure for error messages and status codes.
 */
export class GameError extends Error {
  /**
   *
   * @param message
   * @param statusCode
   */
  constructor(message, statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error thrown when a requested game cannot be found.
 */
export class GameNotFoundError extends GameError {
  /**
   *
   * @param message
   */
  constructor(message = 'Game not found') {
    super(message, 404);
  }
}

/**
 * Error thrown when an invalid game ID is provided.
 */
export class InvalidGameIdError extends GameError {
  /**
   *
   * @param message
   */
  constructor(message = 'Invalid game ID') {
    super(message, 400);
  }
}

/**
 * Error thrown when an action is attempted on a game that is not active.
 */
export class GameNotActiveError extends GameError {
  /**
   *
   * @param message
   */
  constructor(message = 'Game is not active') {
    super(message, 400);
  }
}

/**
 * Error thrown when an action is attempted on a game that has not started yet.
 */
export class GameHasNotStartedError extends GameError {
  /**
   *
   * @param message
   */
  constructor(message = 'Game has not started yet') {
    super(message, 412);
  }
}

/**
 * Error thrown when an attempt is made to start a game that has already begun.
 */
export class GameAlreadyStartedError extends GameError {
  /**
   *
   * @param message
   */
  constructor(message = 'Game has already started') {
    super(message, 409);
  }
}

/**
 * Error thrown when an action requiring game creator privileges is attempted by another user.
 */
export class NotGameCreatorError extends GameError {
  /**
   *
   * @param message
   */
  constructor(message = 'Only the game creator can perform this action') {
    super(message, 403);
  }
}

/**
 * Error thrown when the minimum number of players required to start a game is not met.
 */
export class MinimumPlayersRequiredError extends GameError {
  /**
   *
   * @param minPlayers
   */
  constructor(minPlayers) {
    super(`Minimum ${minPlayers} players required to start`, 400);
  }
}

/**
 * Error thrown when an action requires all players to be ready, but some are not.
 */
export class NotAllPlayersReadyError extends GameError {
  /**
   *
   * @param message
   */
  constructor(message = 'Not all players are ready') {
    super(message, 400);
  }
}

/**
 * Error thrown when an attempt is made to join a game that is already full.
 */
export class GameFullError extends GameError {
  /**
   *
   * @param message
   */
  constructor(message = 'Game is full') {
    super(message, 400);
  }
}

/**
 * Error thrown when a user attempts to join a game they are already a part of.
 */
export class UserAlreadyInGameError extends GameError {
  /**
   *
   * @param message
   */
  constructor(message = 'User is already in this game') {
    super(message, 409);
  }
}

/**
 * Error thrown when a user attempts to perform an action in a game they are not currently participating in.
 */
export class UserNotInGameError extends GameError {
  /**
   *
   * @param message
   */
  constructor(message = 'You are not in this game') {
    super(message, 404);
  }
}

/**
 * Error thrown when a requested action cannot be performed due to the current game state or other conditions.
 */
export class CannotPerformActionError extends GameError {
  /**
   *
   * @param message
   */
  constructor(message = 'Cannot perform this action now') {
    super(message, 400);
  }
}

/**
 * Error thrown when the current player in a game cannot be determined,
 * often indicating an unexpected internal state or data inconsistency.
 */
export class CouldNotDetermineCurrentPlayerError extends GameError {
  /**
   *
   * @param message
   */
  constructor(message = 'Could not determine current player') {
    super(message, 500); // Internal server error if player index is invalid
  }
}

/**
 * Error thrown when an attempt is made to join a game that is not in a state
 * to accept new players (e.g., already active or has ended).
 */
export class GameNotAcceptingPlayersError extends GameError {
  /**
   *
   * @param message
   */
  constructor(
    message = 'Game is not accepting new players (Already Active or Ended)',
  ) {
    super(message, 400);
  }
}
