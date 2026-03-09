import logger from '../../config/logger.js';
import { GameNotFoundError } from '../../core/errors/game.errors.js';
import mongoose from 'mongoose';

/**
 * Debug Controller
 * Controller para operações de debug e testes
 */
class DebugController {
  /**
   * Inicializa o DebugController com as dependências necessárias
   * @param {Object} gameService - Instância do GameService
   * @param {Object} scoreService - Instância do ScoreService
   */
  constructor(gameService, scoreService) {
    this.gameService = gameService;
    this.scoreService = scoreService;
  }

  /**
   * Acelera o fim do jogo manipulando as mãos dos jogadores
   * Deixa o jogador vencedor com apenas 1 carta jogável e outros jogadores com 5+ cartas
   *
   * @route POST /api/games/:id/debug/accelerate-end
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  async accelerateGameEnd(req, res) {
    try {
      const gameId = req.params.id;
      const { winnerId } = req.body;

      // Validar gameId
      if (!mongoose.Types.ObjectId.isValid(gameId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid game ID format',
        });
      }

      // Validar winnerId
      if (!winnerId) {
        return res.status(400).json({
          success: false,
          message: 'winnerId is required in request body',
        });
      }

      if (!mongoose.Types.ObjectId.isValid(winnerId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid winner ID format',
        });
      }

      logger.info(
        `[DEBUG] Accelerating game end for game ${gameId}, winner: ${winnerId}`,
      );

      // Buscar o jogo
      const Game = mongoose.model('Game');
      const game = await Game.findById(gameId);

      if (!game) {
        throw new GameNotFoundError();
      }

      // Verificar se o jogo está ativo
      if (game.status !== 'Active') {
        return res.status(400).json({
          success: false,
          message: 'Game must be in Active status to accelerate',
          currentStatus: game.status,
        });
      }

      // Verificar se o winnerId existe nos jogadores
      const winnerIndex = game.players.findIndex(
        (p) => p._id.toString() === winnerId,
      );

      if (winnerIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Winner not found in game players',
        });
      }

      // Buscar carta do topo da pilha de descarte
      const topCard =
        game.discardPile && game.discardPile.length > 0
          ? game.discardPile[game.discardPile.length - 1]
          : null;

      if (!topCard) {
        return res.status(400).json({
          success: false,
          message:
            'No cards in discard pile. Cannot determine valid card to give to winner.',
        });
      }

      // Determinar uma carta jogável baseada na carta do topo
      let playableCard;

      // Se a carta do topo for Wild, dar uma carta numérica qualquer
      if (topCard.type === 'wild') {
        playableCard = {
          cardId: `debug_card_${Date.now()}`,
          color: 'red',
          value: '5',
          type: 'number',
        };
      } else {
        // Dar uma carta da mesma cor ou mesmo valor
        playableCard = {
          cardId: `debug_card_${Date.now()}`,
          color: topCard.color,
          value: topCard.value === 'skip' ? '1' : topCard.value,
          type: topCard.type === 'action' ? 'number' : topCard.type,
        };
      }

      // Manipular mãos dos jogadores
      const playersInfo = [];

      for (let i = 0; i < game.players.length; i++) {
        const player = game.players[i];
        const playerId = player._id.toString();

        if (playerId === winnerId) {
          // Vencedor: apenas 1 carta jogável
          game.players[i].hand = [playableCard];

          playersInfo.push({
            playerId: playerId,
            role: 'winner',
            handSize: 1,
            isPlayable: true,
            cards: [playableCard],
          });

          logger.info(`[DEBUG] Winner ${playerId} now has 1 playable card`);
        } else {
          // Outros jogadores: 5 cartas não jogáveis
          const loserHand = [];
          const differentColors = ['blue', 'green', 'yellow', 'red'].filter(
            (c) => c !== topCard.color,
          );

          for (let j = 0; j < 5; j++) {
            const color = differentColors[j % differentColors.length];
            loserHand.push({
              cardId: `debug_card_loser_${playerId}_${j}_${Date.now()}`,
              color: color,
              value: '9',
              type: 'number',
            });
          }

          game.players[i].hand = loserHand;

          playersInfo.push({
            playerId: playerId,
            role: 'loser',
            handSize: 5,
            isPlayable: false,
            cards: loserHand,
          });

          logger.info(
            `[DEBUG] Player ${playerId} now has 5 non-playable cards`,
          );
        }
      }

      // Definir o turno para o vencedor
      game.currentPlayerIndex = winnerIndex;

      // Salvar alterações
      await game.save();

      logger.info(
        `[DEBUG] Game ${gameId} successfully accelerated. Winner ${winnerId} can win in 1-2 turns.`,
      );

      return res.status(200).json({
        success: true,
        message:
          'Game accelerated successfully. Winner can now win in 1-2 turns.',
        data: {
          gameId: gameId,
          turnsToWin: '1-2',
          currentPlayerIndex: winnerIndex,
          currentPlayerId: winnerId,
          topCard: {
            color: topCard.color,
            value: topCard.value,
            type: topCard.type,
          },
          players: playersInfo,
          nextAction:
            'Winner should play their card and declare UNO (if implementing UNO rules) or win immediately',
        },
      });
    } catch (error) {
      logger.error(`[DEBUG] Error accelerating game end: ${error.message}`, {
        stack: error.stack,
      });

      if (error instanceof GameNotFoundError) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to accelerate game end',
        error: error.message,
      });
    }
  }

  /**
   * Remove todas as cartas jogáveis da mão de um jogador
   * Deixa apenas cartas que não podem ser jogadas na vez atual
   *
   * @route POST /api/games/:id/debug/remove-playable-cards
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  async removePlayableCards(req, res) {
    try {
      const gameId = req.params.id;
      const { playerId } = req.body;

      // Validar gameId
      if (!mongoose.Types.ObjectId.isValid(gameId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid game ID format',
        });
      }

      // Validar playerId
      if (!playerId) {
        return res.status(400).json({
          success: false,
          message: 'playerId is required in request body',
        });
      }

      if (!mongoose.Types.ObjectId.isValid(playerId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid player ID format',
        });
      }

      logger.info(
        `[DEBUG] Removing playable cards from player ${playerId} in game ${gameId}`,
      );

      // Buscar o jogo
      const Game = mongoose.model('Game');
      const game = await Game.findById(gameId);

      if (!game) {
        throw new GameNotFoundError();
      }

      // Verificar se o jogo está ativo
      if (game.status !== 'Active') {
        return res.status(400).json({
          success: false,
          message: 'Game must be in Active status',
          currentStatus: game.status,
        });
      }

      // Encontrar o jogador
      const playerIndex = game.players.findIndex(
        (p) => p._id.toString() === playerId,
      );

      if (playerIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Player not found in game',
        });
      }

      // Buscar carta do topo da pilha de descarte
      const topCard =
        game.discardPile && game.discardPile.length > 0
          ? game.discardPile[game.discardPile.length - 1]
          : null;

      if (!topCard) {
        return res.status(400).json({
          success: false,
          message: 'No cards in discard pile. Cannot determine valid cards.',
        });
      }

      const currentHand = game.players[playerIndex].hand;
      const originalHandSize = currentHand.length;

      logger.info(
        `[DEBUG] Player has ${originalHandSize} cards before filtering`,
      );
      logger.info(
        `[DEBUG] Top card: ${topCard.color} ${topCard.value} (${topCard.type})`,
      );

      // Função para verificar se uma carta é jogável
      const isCardPlayable = (card) => {
        // Wild cards sempre são jogáveis
        if (card.type === 'wild') {
          return true;
        }

        // Se a carta do topo for wild, verificar pela cor atual
        if (topCard.type === 'wild') {
          const currentColor = game.currentColor || topCard.color;
          return card.color === currentColor;
        }

        // Mesma cor ou mesmo valor
        return card.color === topCard.color || card.value === topCard.value;
      };

      // Filtrar apenas cartas NÃO jogáveis
      const unplayableCards = currentHand.filter((card) => {
        const playable = isCardPlayable(card);
        logger.info(
          `[DEBUG] Card ${card.color} ${card.value} (${card.type}) - Playable: ${playable}`,
        );
        return !playable;
      });

      // Se não houver cartas não jogáveis, criar algumas
      if (unplayableCards.length === 0) {
        logger.info(
          '[DEBUG] All cards were playable. Creating non-playable cards.',
        );

        const differentColors = ['blue', 'green', 'yellow', 'red'].filter(
          (c) => c !== topCard.color,
        );
        const differentValues = [
          '0',
          '1',
          '2',
          '3',
          '4',
          '5',
          '6',
          '7',
          '8',
          '9',
        ].filter((v) => v !== topCard.value);

        // Criar 3 cartas não jogáveis
        for (let i = 0; i < 3; i++) {
          const color = differentColors[i % differentColors.length];
          const value = differentValues[i % differentValues.length];
          unplayableCards.push({
            cardId: `debug_unplayable_${playerId}_${i}_${Date.now()}`,
            color: color,
            value: value,
            type: 'number',
          });
        }
      }

      // Atualizar a mão do jogador
      game.players[playerIndex].hand = unplayableCards;

      const newHandSize = unplayableCards.length;
      const removedCount = originalHandSize - newHandSize;

      logger.info(
        `[DEBUG] Removed ${removedCount} playable cards. Player now has ${newHandSize} unplayable cards.`,
      );

      // Salvar alterações
      await game.save();

      logger.info(
        `[DEBUG] Successfully removed playable cards from player ${playerId} in game ${gameId}`,
      );

      return res.status(200).json({
        success: true,
        message: 'Playable cards removed successfully',
        data: {
          gameId: gameId,
          playerId: playerId,
          originalHandSize: originalHandSize,
          newHandSize: newHandSize,
          removedCardsCount: removedCount,
          topCard: {
            color: topCard.color,
            value: topCard.value,
            type: topCard.type,
          },
          currentColor: game.currentColor || topCard.color,
          remainingCards: unplayableCards.map((card) => ({
            color: card.color,
            value: card.value,
            type: card.type,
          })),
          nextAction: 'Player must now draw a card',
        },
      });
    } catch (error) {
      logger.error(`[DEBUG] Error removing playable cards: ${error.message}`, {
        stack: error.stack,
      });

      if (error instanceof GameNotFoundError) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to remove playable cards',
        error: error.message,
      });
    }
  }
}

export default DebugController;
