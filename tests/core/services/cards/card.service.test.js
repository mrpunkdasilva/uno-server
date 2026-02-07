import CardService from '../../../../src/core/services/card.service.js';
import { mockCardDoc } from '../../../../src/mocks/card.mocks.js';

// Mock do schema DTO
jest.mock('../../../../src/presentation/dtos/cardResponse.dto.js', () => ({
  parse: jest.fn().mockImplementation((data) => ({
    ...data,
    id: data._id ? data._id.toString() : data.id,
    _id: undefined,
  })),
}));

describe('CardService - CRUD', () => {
  let cardService;
  let cardRepositoryMock;

  beforeEach(() => {
    // Configurar todos os métodos do repositório mock
    cardRepositoryMock = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByFilters: jest.fn(),
      initializeGameDeck: jest.fn(),
      getCardsByGame: jest.fn(),
      drawCardFromDeck: jest.fn(),
      discardCard: jest.fn(),
      countByFilters: jest.fn(),
    };

    cardService = new CardService(cardRepositoryMock);
    jest.clearAllMocks();
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

  describe('initializeGameDeck', () => {
    it('deve inicializar um deck para um jogo', async () => {
      const gameId = 'game-123';
      const mockCard1 = {
        ...mockCardDoc,
        toObject: () => ({ ...mockCardDoc.toObject(), _id: 'card1' }),
      };
      const mockCard2 = {
        ...mockCardDoc,
        toObject: () => ({
          ...mockCardDoc.toObject(),
          _id: 'card2',
          color: 'blue',
        }),
      };

      cardRepositoryMock.initializeGameDeck.mockResolvedValue([
        mockCard1,
        mockCard2,
      ]);

      const result = await cardService.initializeGameDeck(gameId);

      expect(cardRepositoryMock.initializeGameDeck).toHaveBeenCalledWith(
        gameId,
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id');
      expect(result[1]).toHaveProperty('id');
    });

    it('deve retornar array vazio quando não há cartas', async () => {
      cardRepositoryMock.initializeGameDeck.mockResolvedValue([]);

      const result = await cardService.initializeGameDeck('game-123');

      expect(result).toEqual([]);
    });
  });

  describe('getCardsByGame', () => {
    it('deve retornar cartas de um jogo com filtros', async () => {
      const gameId = 'game-123';
      const filters = { isInDeck: true };

      const mockDeckCards = [
        {
          ...mockCardDoc,
          toObject: () => ({ ...mockCardDoc.toObject(), _id: 'card1' }),
        },
        {
          ...mockCardDoc,
          toObject: () => ({
            ...mockCardDoc.toObject(),
            _id: 'card2',
            type: 'skip',
          }),
        },
      ];

      cardRepositoryMock.getCardsByGame.mockResolvedValue(mockDeckCards);

      const result = await cardService.getCardsByGame(gameId, filters);

      expect(cardRepositoryMock.getCardsByGame).toHaveBeenCalledWith(
        gameId,
        filters,
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id');
      expect(result[1]).toHaveProperty('id');
    });

    it('deve retornar array vazio quando não há cartas no jogo', async () => {
      cardRepositoryMock.getCardsByGame.mockResolvedValue([]);

      const result = await cardService.getCardsByGame('game-123');

      expect(result).toEqual([]);
    });
  });

  describe('drawCard', () => {
    it('deve comprar uma carta do deck', async () => {
      const gameId = 'game-123';
      cardRepositoryMock.drawCardFromDeck.mockResolvedValue(mockCardDoc);

      const result = await cardService.drawCard(gameId);

      expect(cardRepositoryMock.drawCardFromDeck).toHaveBeenCalledWith(gameId);
      expect(result).toHaveProperty('id');
      expect(result.id).toBe(mockCardDoc._id);
    });

    it('deve lançar erro quando não há cartas para comprar', async () => {
      cardRepositoryMock.drawCardFromDeck.mockResolvedValue(null);

      await expect(cardService.drawCard('game-123')).rejects.toThrow(
        'No cards available to draw',
      );
    });
  });

  describe('discardCard', () => {
    it('deve descartar uma carta', async () => {
      const cardId = '507f1f77bcf86cd799439011';
      const mockDiscardedCard = {
        ...mockCardDoc,
        toObject: jest.fn().mockReturnValue({
          ...mockCardDoc.toObject(),
          isDiscarded: true,
        }),
      };

      cardRepositoryMock.discardCard.mockResolvedValue(mockDiscardedCard);

      const result = await cardService.discardCard(cardId);

      expect(cardRepositoryMock.discardCard).toHaveBeenCalledWith(cardId);
      expect(result).toHaveProperty('id');
      expect(result.id).toBe(mockCardDoc._id);
    });

    it('deve lançar erro ao tentar descartar carta inexistente', async () => {
      cardRepositoryMock.discardCard.mockResolvedValue(null);

      await expect(cardService.discardCard('id-invalido')).rejects.toThrow(
        'Card not found',
      );
    });
  });

  describe('findAll', () => {
    it('deve retornar todas as cartas com filtros', async () => {
      const filters = { color: 'red' };
      cardRepositoryMock.findByFilters.mockResolvedValue([mockCardDoc]);

      const result = await cardService.findAll(filters);

      expect(cardRepositoryMock.findByFilters).toHaveBeenCalledWith(filters);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id');
    });

    it('deve retornar array vazio quando não há cartas', async () => {
      cardRepositoryMock.findByFilters.mockResolvedValue([]);

      const result = await cardService.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('countCards', () => {
    it('deve contar cartas com filtros', async () => {
      const filters = { gameId: 'game-123' };
      cardRepositoryMock.countByFilters.mockResolvedValue(5);

      const result = await cardService.countCards(filters);

      expect(cardRepositoryMock.countByFilters).toHaveBeenCalledWith(filters);
      expect(result).toBe(5);
    });

    it('deve retornar 0 quando não há cartas correspondentes', async () => {
      cardRepositoryMock.countByFilters.mockResolvedValue(0);

      const result = await cardService.countCards({ gameId: 'game-456' });

      expect(result).toBe(0);
    });
  });

  // TESTES DE BORDA E ERRO
  describe('Edge Cases and Error Handling', () => {
    it('deve lidar com erro no repositório durante criação', async () => {
      const error = new Error('Database error');
      cardRepositoryMock.create.mockRejectedValue(error);

      await expect(cardService.create({})).rejects.toThrow('Database error');
    });

    it('deve manter imutabilidade dos dados de entrada', async () => {
      const originalData = { color: 'red', type: 'number', number: 5 };
      const dataCopy = { ...originalData };

      cardRepositoryMock.create.mockResolvedValue(mockCardDoc);

      await cardService.create(originalData);

      expect(originalData).toEqual(dataCopy);
    });

    it('deve converter ObjectId para string no DTO', async () => {
      const cardWithObjectId = {
        ...mockCardDoc,
        _id: { toString: () => '507f1f77bcf86cd799439011' },
      };

      cardRepositoryMock.findById.mockResolvedValue(cardWithObjectId);

      const result = await cardService.findById('507f1f77bcf86cd799439011');

      expect(result).toHaveProperty('id');
    });
  });
});
