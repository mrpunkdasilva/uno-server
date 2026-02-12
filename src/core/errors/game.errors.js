// src/core/errors/game.errors.js

/**
 *
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
 *
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
 *
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
 *
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
 *
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
 *
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
 *
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
 *
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
 *
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
 *
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
 *
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
 *
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
 *
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
 *
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
 *
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
