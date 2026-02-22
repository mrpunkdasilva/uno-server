import { z } from 'zod';

/**
 * Validation schema for game history requests.
 * Validates the query parameters of the GET /games/:gameId/history endpoint.
 *
 * @typedef {Object} GetGameHistoryDTO
 * @property {string} gameId - Game ID (required, not empty)
 * @property {number} [limit=50] - Maximum number of records to return (1-100, optional)
 */
const gameHistoryDtoSchema = z.object({
  /**
   * ID of the game to be consulted.
   * @type {string}
   * @required
   */
  gameId: z.string().min(1, 'Game ID cannot be empty'),

  /**
   * Maximum number of records to return.
   * @type {number}
   * @optional
   */
  limit: z.coerce.number().min(1).max(100).default(50).optional(),
});

export default gameHistoryDtoSchema;
