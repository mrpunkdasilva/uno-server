/**
 * @fileoverview End-to-End (E2E) tests for Game Ending and Score Calculation.
 *
 * This test simulates a complete game flow up to the final turn, forces a "near-win" state,
 * and verifies that playing the final card triggers the end-game sequence
 * and correctly calculates the opponent's remaining card points.
 */

import {
  setupTestEnvironment,
  teardownTestEnvironment,
  clearDatabase,
  makeRequest,
  createTestPlayer,
  loginPlayer,
  createTestGame,
} from './setup.js';
import Game from '../../src/infra/models/game.model.js';
import { ScoreModel } from '../../src/infra/models/score.model.js';

describe('E2E: Game Ending and Final Scores (Task 5)', () => {
  let playerA, playerB, tokenA, tokenB, gameId;

  beforeAll(async () => {
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  beforeEach(async () => {
    await clearDatabase();

    // --- ARRANGE: Setup Players and Game ---

    // 1. Create and authenticate Player A (The intended winner)
    const playerARes = await createTestPlayer({
      username: `winner_${Date.now()}`,
      email: `winner_${Date.now()}@test.com`,
      password: 'Test@123',
    });
    playerA = playerARes.data?.player || playerARes.data;
    const loginARes = await loginPlayer(playerA.email, 'Test@123');
    tokenA = loginARes.data.accessToken || loginARes.data.token;

    // 2. Create and authenticate Player B (The intended loser)
    const playerBRes = await createTestPlayer({
      username: `loser_${Date.now()}`,
      email: `loser_${Date.now()}@test.com`,
      password: 'Test@123',
    });
    playerB = playerBRes.data?.player || playerBRes.data;
    const loginBRes = await loginPlayer(playerB.email, 'Test@123');
    tokenB = loginBRes.data.accessToken || loginBRes.data.token;

    // 3. Create the game and handle the joining process
    const gameRes = await createTestGame(tokenA);
    gameId = gameRes.data.game_id || gameRes.data.id || gameRes.data._id;

    await makeRequest('GET', `/api/games/${gameId}/join`, { token: tokenB });
    await makeRequest('GET', `/api/games/${gameId}/ready`, { token: tokenA });
    await makeRequest('GET', `/api/games/${gameId}/ready`, { token: tokenB });

    // 4. Start the game
    await makeRequest('GET', `/api/games/${gameId}/start`, { token: tokenA });

    // 5. Force a "Near-Win" state directly in the database to bypass gameplay loop
    const game = await Game.findById(gameId).exec();

    // Force the turn to be Player A's
    game.currentPlayerIndex = 0;

    // Set a red card on top of the discard pile
    game.discardPile = [
      {
        cardId: 'discard-top',
        color: 'red',
        value: '0',
        type: 'number',
      },
    ];

    // Give Player A exactly 1 winning card that matches the discard pile
    game.players[0].hand = [
      {
        cardId: 'winning-card',
        color: 'red',
        value: '5',
        type: 'number',
      },
    ];

    // Give Player B specific cards to test the exact score calculation
    // Action card (+2) = 20 points
    // Number card (8) = 8 points
    // Expected total score for the winner = 28 points
    game.players[1].hand = [
      {
        cardId: 'loser-card-1',
        color: 'blue',
        value: 'draw_two',
        type: 'action',
      },
      { cardId: 'loser-card-2', color: 'green', value: '8', type: 'number' },
    ];

    await game.save();
  });

  /**
   * Test Case: Verifies that playing the last card successfully transitions
   * the game to an 'Ended' state and properly calculates/stores the final score.
   */
  it('should end the game, declare a winner, and calculate final scores after the last card is played', async () => {
    // --- ACT: Execute the final move ---

    // Player A plays their only remaining card
    const response = await makeRequest('POST', `/api/games/${gameId}/play`, {
      token: tokenA,
      body: { cardId: 'winning-card' },
    });

    // --- ASSERT: Verify the outcomes ---

    // Verification 1: API Response should indicate the game has ended
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.gameEnded).toBe(true);

    // Verification 2: Game State in the Database
    const updatedGame = await Game.findById(gameId).exec();
    expect(updatedGame.status).toBe('Ended'); // Status must transition to Ended
    expect(updatedGame.winnerId.toString()).toBe(playerA.id); // Player A must be declared the winner
    expect(updatedGame.players[0].hand.length).toBe(0); // Winner's hand must be empty

    // Verification 3: Score Calculation and Persistence
    // Retrieve the saved score for the winner in this specific match
    const finalScore = await ScoreModel.findOne({
      matchId: gameId,
      playerId: playerA.id,
    }).exec();

    expect(finalScore).toBeDefined();
    expect(finalScore).not.toBeNull();

    // The score should exactly match the sum of Player B's remaining cards (20 + 8 = 28)
    expect(finalScore.score).toBe(28);
  });
});
