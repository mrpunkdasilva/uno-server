import { describe, it, expect } from '@jest/globals';
import { getStrategyForCard } from '../../../../../src/core/services/game/card-strategies/strategy.factory.js';
import { DrawTwoStrategy } from '../../../../../src/core/services/game/card-strategies/draw-two-strategy.js';
import { NumberCardStrategy } from '../../../../../src/core/services/game/card-strategies/number-card-strategy.js';
import { ReverseStrategy } from '../../../../../src/core/services/game/card-strategies/reverse-strategy.js';
import { SkipStrategy } from '../../../../../src/core/services/game/card-strategies/skip-strategy.js';
import { WildStrategy } from '../../../../../src/core/services/game/card-strategies/wild-strategy.js';
import { WildDrawFourStrategy } from '../../../../../src/core/services/game/card-strategies/wild-draw-four-strategy.js';

describe('Strategy Factory', () => {
  it('should return NumberCardStrategy for number cards', () => {
    const card = { value: '5', type: 'number' };
    expect(getStrategyForCard(card)).toBe(NumberCardStrategy);
  });

  it('should return NumberCardStrategy for an unknown card value', () => {
    const card = { value: 'unknown', type: 'action' };
    expect(getStrategyForCard(card)).toBe(NumberCardStrategy);
  });

  it('should return SkipStrategy for skip cards', () => {
    const card = { value: 'skip', type: 'action' };
    expect(getStrategyForCard(card)).toBe(SkipStrategy);
  });

  it('should return ReverseStrategy for reverse cards', () => {
    const card = { value: 'reverse', type: 'action' };
    expect(getStrategyForCard(card)).toBe(ReverseStrategy);
  });

  it('should return DrawTwoStrategy for draw_two cards', () => {
    const card = { value: 'draw_two', type: 'action' };
    expect(getStrategyForCard(card)).toBe(DrawTwoStrategy);
  });

  it('should return WildStrategy for wild cards', () => {
    const card = { value: 'wild', type: 'wild' };
    expect(getStrategyForCard(card)).toBe(WildStrategy);
  });

  it('should return WildDrawFourStrategy for wild_draw4 cards', () => {
    const card = { value: 'wild_draw4', type: 'wild' };
    expect(getStrategyForCard(card)).toBe(WildDrawFourStrategy);
  });
});
