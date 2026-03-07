import mongoose from 'mongoose';
import { ScoreModel } from '../../../src/infra/models/score.model.js';

describe('ScoreModel', () => {
  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should create a score with valid data', async () => {
    const score = new ScoreModel({
      playerId: new mongoose.Types.ObjectId(),
      matchId: 'match-1',
      score: 100,
    });

    await score.validate();

    expect(score.score).toBe(100);
  });

  it('should fail if playerId is missing', async () => {
    const score = new ScoreModel({
      matchId: 'match-1',
      score: 100,
    });

    await expect(score.validate()).rejects.toThrow();
  });

  it('should fail if matchId is missing', async () => {
    const score = new ScoreModel({
      playerId: new mongoose.Types.ObjectId(),
      score: 100,
    });

    await expect(score.validate()).rejects.toThrow();
  });

  it('should fail if score is missing', async () => {
    const score = new ScoreModel({
      playerId: new mongoose.Types.ObjectId(),
      matchId: 'match-1',
    });

    await expect(score.validate()).rejects.toThrow();
  });

  it('should fail if score is negative', async () => {
    const score = new ScoreModel({
      playerId: new mongoose.Types.ObjectId(),
      matchId: 'match-1',
      score: -10,
    });

    await expect(score.validate()).rejects.toThrow();
  });

  it('should support very large scores', async () => {
    const score = new ScoreModel({
      playerId: new mongoose.Types.ObjectId(),
      matchId: 'match-1',
      score: 9999999,
    });

    await score.validate();

    expect(score.score).toBe(9999999);
  });
});
