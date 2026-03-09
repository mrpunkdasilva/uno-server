import {
  fetchAllAndMapToDto,
  fetchByIdAndMapToDto,
  updateAndMapToDto,
  deleteByIdAndReturn,
  fetchById,
  saveEntityAndReturnCustomResponse,
  saveAndMapToDto,
  fetchWithCustomQuery,
} from '../../../src/core/utils/service.utils.js';

describe('service.utils', () => {
  let mockRepository;
  let mockLogger;
  let mockDtoSchema;

  beforeEach(() => {
    mockRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      save: jest.fn(),
    };
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };
    mockDtoSchema = {
      parse: jest.fn((data) => data),
    };
  });

  describe('fetchAllAndMapToDto', () => {
    it('should fetch and map entities', async () => {
      const items = [{ id: 1 }, { id: 2 }];
      mockRepository.findAll.mockResolvedValue(items);

      const result = await fetchAllAndMapToDto(
        mockRepository,
        mockDtoSchema,
        mockLogger,
        'test',
      ).toResult();

      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual(items);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should log error on failure', async () => {
      const error = new Error('Database error');
      mockRepository.findAll.mockRejectedValue(error);

      const result = await fetchAllAndMapToDto(
        mockRepository,
        mockDtoSchema,
        mockLogger,
        'test',
      ).toResult();

      expect(result.isFailure).toBe(true);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Database error'),
      );
    });
  });

  describe('fetchByIdAndMapToDto', () => {
    class NotFoundError extends Error {
      constructor(message) {
        super(message);
        this.name = 'NotFoundError';
      }
    }
    const notFoundError = new NotFoundError('Not found');

    it('should fetch and map single entity', async () => {
      const entity = { _id: 'id1', name: 'test' };
      mockRepository.findById.mockResolvedValue(entity);

      const result = await fetchByIdAndMapToDto(
        mockRepository,
        'id1',
        mockDtoSchema,
        mockLogger,
        'test',
        notFoundError,
      ).toResult();

      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual(entity);
    });

    it('should handle not found error', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await fetchByIdAndMapToDto(
        mockRepository,
        'id1',
        mockDtoSchema,
        mockLogger,
        'test',
        notFoundError,
      ).toResult();

      expect(result.isFailure).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should handle generic error', async () => {
      mockRepository.findById.mockRejectedValue(new Error('Random error'));

      const result = await fetchByIdAndMapToDto(
        mockRepository,
        'id1',
        mockDtoSchema,
        mockLogger,
        'test',
        notFoundError,
      ).toResult();

      expect(result.isFailure).toBe(true);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('updateAndMapToDto', () => {
    class UpdateNotFoundError extends Error {
      constructor(message) {
        super(message);
        this.name = 'UpdateNotFoundError';
      }
    }
    const notFoundError = new UpdateNotFoundError('Not found');
    const inputSchema = { parse: jest.fn((d) => d) };

    it('should update and map entity', async () => {
      const updated = { _id: 'id1', name: 'updated' };
      mockRepository.update.mockResolvedValue(updated);

      const result = await updateAndMapToDto(
        mockRepository,
        'id1',
        { name: 'updated' },
        inputSchema,
        mockDtoSchema,
        mockLogger,
        'test',
        notFoundError,
      ).toResult();

      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual(updated);
    });

    it('should handle not found during update', async () => {
      mockRepository.update.mockResolvedValue(null);

      const result = await updateAndMapToDto(
        mockRepository,
        'id1',
        { name: 'updated' },
        inputSchema,
        mockDtoSchema,
        mockLogger,
        'test',
        notFoundError,
      ).toResult();

      expect(result.isFailure).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should handle generic error during update', async () => {
      mockRepository.update.mockRejectedValue(new Error('Update failed'));

      const result = await updateAndMapToDto(
        mockRepository,
        'id1',
        { name: 'updated' },
        inputSchema,
        mockDtoSchema,
        mockLogger,
        'test',
        notFoundError,
      ).toResult();

      expect(result.isFailure).toBe(true);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('deleteByIdAndReturn', () => {
    class DeleteNotFoundError extends Error {
      constructor(message) {
        super(message);
        this.name = 'DeleteNotFoundError';
      }
    }
    const notFoundError = new DeleteNotFoundError('Not found');

    it('should delete and return entity', async () => {
      const entity = { _id: 'id1' };
      mockRepository.findById.mockResolvedValue(entity);
      mockRepository.delete.mockResolvedValue(entity);

      const result = await deleteByIdAndReturn(
        mockRepository,
        'id1',
        mockLogger,
        'test',
        notFoundError,
      ).toResult();

      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual(entity);
      expect(mockRepository.delete).toHaveBeenCalledWith('id1');
    });

    it('should handle not found during delete', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await deleteByIdAndReturn(
        mockRepository,
        'id1',
        mockLogger,
        'test',
        notFoundError,
      ).toResult();

      expect(result.isFailure).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should handle generic error during delete', async () => {
      mockRepository.findById.mockRejectedValue(new Error('Delete error'));

      const result = await deleteByIdAndReturn(
        mockRepository,
        'id1',
        mockLogger,
        'test',
        notFoundError,
      ).toResult();

      expect(result.isFailure).toBe(true);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('fetchById', () => {
    it('should fetch entity', async () => {
      const entity = { id: 1 };
      mockRepository.findById.mockResolvedValue(entity);

      const result = await fetchById(
        mockRepository,
        1,
        mockLogger,
        'test',
        new Error(),
      ).toResult();

      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(entity);
    });

    it('should fail if not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await fetchById(
        mockRepository,
        1,
        mockLogger,
        'test',
        new Error('Not found'),
      ).toResult();

      expect(result.isFailure).toBe(true);
      expect(result.error.message).toBe('Not found');
    });
  });

  describe('saveEntityAndReturnCustomResponse', () => {
    it('should save and return custom response', async () => {
      const entity = { id: 1 };
      const builder = (e) => ({ wrapped: e });
      mockRepository.save.mockResolvedValue(entity);

      const result = await saveEntityAndReturnCustomResponse(
        mockRepository,
        entity,
        builder,
      ).toResult();

      expect(result.isSuccess).toBe(true);
      expect(result.value.isSuccess).toBe(true); // Result inside Result
      expect(result.value.value).toEqual({ wrapped: entity });
    });
  });

  describe('saveAndMapToDto', () => {
    it('should save and map to DTO', async () => {
      const entity = { id: 1 };
      mockRepository.save.mockResolvedValue(entity);

      const result = await saveAndMapToDto(
        mockRepository,
        entity,
        mockDtoSchema,
        mockLogger,
        'Saved successfully',
      );

      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual(entity);
      expect(mockLogger.info).toHaveBeenCalledWith('Saved successfully');
    });
  });

  describe('fetchWithCustomQuery', () => {
    it('should fetch with custom query', async () => {
      const entity = { id: 1 };
      const queryFn = jest.fn().mockResolvedValue(entity);

      const result = await fetchWithCustomQuery({
        queryFn,
        logger: mockLogger,
        logMessage: 'Custom query',
        notFoundError: new Error('Not found'),
      }).toResult();

      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(entity);
    });

    it('should fail if custom query returns null', async () => {
      const queryFn = jest.fn().mockResolvedValue(null);

      const result = await fetchWithCustomQuery({
        queryFn,
        logger: mockLogger,
        logMessage: 'Custom query',
        notFoundError: new Error('Not found'),
      }).toResult();

      expect(result.isFailure).toBe(true);
      expect(result.error.message).toBe('Not found');
    });
  });
});
