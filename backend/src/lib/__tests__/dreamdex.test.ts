import { describe, it, expect } from 'vitest';

describe('Backend DreamDEX Level Serialization', () => {
  it('should serialize BigInt or string order book levels accurately', () => {
    interface Level {
      price: bigint | string | number;
      quantity: bigint | string | number;
    }

    function serializeLevels(levels: Level[]) {
      return levels.map((l) => ({
        price: l.price.toString(),
        quantity: l.quantity.toString(),
      }));
    }

    const mockLevels = [
      { price: 580000000000000000n, quantity: 10000000000000000000n },
      { price: '420000000000000000', quantity: '5000000000000000000' },
    ];

    const serialized = serializeLevels(mockLevels);
    expect(serialized).toHaveLength(2);
    expect(serialized[0].price).toBe('580000000000000000');
    expect(serialized[0].quantity).toBe('10000000000000000000');
    expect(serialized[1].price).toBe('420000000000000000');
  });
});
