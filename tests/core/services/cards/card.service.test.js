import CardService from '../../../../src/core/services/card.service.js';
import { mockCardDoc } from '../../../../src/mocks/card.mocks.js';

describe('CardService - CRUD', () => {
  let cardService;
  let cardRepositoryMock;

  beforeEach(() => {
    cardRepositoryMock = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByFilters: jest.fn(),
    };

    cardService = new CardService(cardRepositoryMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('CREATE', () => {
    it('deve criar uma nova carta', async () => {
      cardRepositoryMock.create.mockResolvedValue(mockCardDoc);

      const result = await cardService.create({
        color: 'red',
        type: 'number',
        number: 5,
        gameId: 'game-123',
      });

      expect(cardRepositoryMock.create).toHaveBeenCalledTimes(1);
      expect(result).toHaveProperty('id');
      expect(result.color).toBe('red');
      expect(result.type).toBe('number');
    });
  });

  describe('READ', () => {
    it('deve retornar uma carta pelo id', async () => {
      cardRepositoryMock.findById.mockResolvedValue(mockCardDoc);

      const result = await cardService.findById('507f1f77bcf86cd799439011');

      expect(cardRepositoryMock.findById).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
      expect(result.id).toBe('507f1f77bcf86cd799439011');
    });

    it('deve lançar erro se a carta não existir', async () => {
      cardRepositoryMock.findById.mockResolvedValue(null);

      await expect(cardService.findById('id-invalido')).rejects.toThrow(
        'Card not found',
      );
    });
  });

  describe('UPDATE', () => {
    it('deve atualizar uma carta existente', async () => {
      cardRepositoryMock.findById.mockResolvedValue(mockCardDoc);
      cardRepositoryMock.update.mockResolvedValue({
        ...mockCardDoc,
        toObject: jest.fn().mockReturnValue({
          ...mockCardDoc.toObject(),
          color: 'blue',
        }),
      });

      const result = await cardService.update('507f1f77bcf86cd799439011', {
        color: 'blue',
      });

      expect(cardRepositoryMock.findById).toHaveBeenCalled();
      expect(cardRepositoryMock.update).toHaveBeenCalled();
      expect(result.color).toBe('blue');
    });

    it('deve lançar erro ao tentar atualizar carta inexistente', async () => {
      cardRepositoryMock.findById.mockResolvedValue(null);

      await expect(
        cardService.update('id-invalido', { color: 'blue' }),
      ).rejects.toThrow('Card not found');
    });
  });

  describe('DELETE', () => {
    it('deve deletar uma carta existente', async () => {
      cardRepositoryMock.findById.mockResolvedValue(mockCardDoc);
      cardRepositoryMock.delete.mockResolvedValue(mockCardDoc);

      const result = await cardService.delete('507f1f77bcf86cd799439011');

      expect(cardRepositoryMock.findById).toHaveBeenCalled();
      expect(cardRepositoryMock.delete).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
      expect(result).toBe(mockCardDoc);
    });

    it('deve lançar erro ao tentar deletar carta inexistente', async () => {
      cardRepositoryMock.findById.mockResolvedValue(null);

      await expect(cardService.delete('id-invalido')).rejects.toThrow(
        'Card not found',
      );
    });
  });
});
