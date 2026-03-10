import ScoreRepository from '../../../src/infra/repositories/score.repository.js';
import { ScoreModel } from '../../../src/infra/models/score.model.js';

jest.mock('../../../src/infra/models/score.model.js');

describe('ScoreRepository', () => {
  let repository;

  beforeEach(() => {
    repository = new ScoreRepository();
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all scores', async () => {
      const mockScores = [{ score: 100 }, { score: 200 }];
      ScoreModel.find.mockResolvedValue(mockScores);

      const result = await repository.findAll();

      expect(ScoreModel.find).toHaveBeenCalled();
      expect(result).toEqual(mockScores);
    });
  });

  describe('findById', () => {
    it('should return a score by ID', async () => {
      const mockScore = { _id: 'id1', score: 100 };
      ScoreModel.findById.mockResolvedValue(mockScore);

      const result = await repository.findById('id1');

      expect(ScoreModel.findById).toHaveBeenCalledWith('id1');
      expect(result).toEqual(mockScore);
    });
  });

  describe('findByPlayerId', () => {
    it('should return scores for a specific player', async () => {
      const mockScores = [{ playerId: 'p1', score: 100 }];
      ScoreModel.find.mockResolvedValue(mockScores);

      const result = await repository.findByPlayerId('p1');

      expect(ScoreModel.find).toHaveBeenCalledWith({ playerId: 'p1' });
      expect(result).toEqual(mockScores);
    });
  });

  describe('findByMatchId', () => {
    it('should return scores for a specific match and populate playerId', async () => {
      const mockScores = [{ matchId: 'm1', score: 100 }];
      const mockPopulate = {
        populate: jest.fn().mockResolvedValue(mockScores),
      };
      ScoreModel.find.mockReturnValue(mockPopulate);

      const result = await repository.findByMatchId('m1');

      expect(ScoreModel.find).toHaveBeenCalledWith({ matchId: 'm1' });
      expect(mockPopulate.populate).toHaveBeenCalledWith(
        'playerId',
        'username',
      );
      expect(result).toEqual(mockScores);
    });
  });

  describe('create', () => {
    it('should create and save a new score', async () => {
      const scoreData = { playerId: 'p1', matchId: 'm1', score: 100 };
      const mockSave = jest
        .fn()
        .mockResolvedValue({ ...scoreData, _id: 'newId' });

      ScoreModel.mockImplementation(() => ({
        save: mockSave,
      }));

      const result = await repository.create(scoreData);

      expect(ScoreModel).toHaveBeenCalledWith(scoreData);
      expect(mockSave).toHaveBeenCalled();
      expect(result).toEqual({ ...scoreData, _id: 'newId' });
    });
  });

  describe('update', () => {
    it('should update a score by ID', async () => {
      const updateData = { score: 150 };
      const mockUpdatedScore = { _id: 'id1', score: 150 };
      ScoreModel.findByIdAndUpdate.mockResolvedValue(mockUpdatedScore);

      const result = await repository.update('id1', updateData);

      expect(ScoreModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'id1',
        { $set: updateData },
        { new: true, runValidators: true },
      );
      expect(result).toEqual(mockUpdatedScore);
    });
  });

  describe('delete', () => {
    it('should delete a score by ID', async () => {
      const mockDeletedScore = { _id: 'id1', score: 100 };
      ScoreModel.findByIdAndDelete.mockResolvedValue(mockDeletedScore);

      const result = await repository.delete('id1');

      expect(ScoreModel.findByIdAndDelete).toHaveBeenCalledWith('id1');
      expect(result).toEqual(mockDeletedScore);
    });
  });

  describe('save', () => {
    it('should save a score instance', async () => {
      const mockScoreInstance = {
        save: jest.fn().mockResolvedValue({ _id: 'id1', score: 100 }),
      };

      const result = await repository.save(mockScoreInstance);

      expect(mockScoreInstance.save).toHaveBeenCalled();
      expect(result).toEqual({ _id: 'id1', score: 100 });
    });
  });
});
