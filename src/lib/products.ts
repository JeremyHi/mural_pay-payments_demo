import { Product } from './types';

export const products: Product[] = [
  {
    id: 'classic-fortune',
    name: 'Classic Fortune',
    description: 'Traditional wisdom cookie with timeless advice',
    price: 1.99,
    image: '/cookies/classic.png',
    emoji: '🥠',
  },
  {
    id: 'premium-fortune',
    name: 'Premium Fortune',
    description: 'Enhanced predictions with deeper insights',
    price: 3.99,
    image: '/cookies/premium.png',
    emoji: '✨',
  },
  {
    id: 'diamond-fortune',
    name: 'Diamond Fortune',
    description: 'Luxury gold-flaked cookie for the discerning',
    price: 9.99,
    image: '/cookies/diamond.png',
    emoji: '💎',
  },
  {
    id: 'mystery-fortune',
    name: 'Mystery Fortune',
    description: 'Unknown fate awaits... dare to discover?',
    price: 4.99,
    image: '/cookies/mystery.png',
    emoji: '🎭',
  },
  {
    id: 'epic-fortune',
    name: 'Epic Fortune',
    description: 'Legendary prophecies from ancient sages',
    price: 14.99,
    image: '/cookies/epic.png',
    emoji: '🏆',
  },
  {
    id: 'lucky-bundle',
    name: 'Lucky Bundle (3)',
    description: 'Three classic cookies for triple the luck',
    price: 4.99,
    image: '/cookies/bundle.png',
    emoji: '🍀',
  },
  {
    id: 'fortune-box',
    name: 'Fortune Box (6)',
    description: 'Variety pack with mixed fortune types',
    price: 8.99,
    image: '/cookies/box.png',
    emoji: '📦',
  },
  {
    id: 'destiny-chest',
    name: 'Destiny Chest (12)',
    description: 'Ultimate collection for fortune enthusiasts',
    price: 15.99,
    image: '/cookies/chest.png',
    emoji: '🎁',
  },
];

export function getProductById(id: string): Product | undefined {
  return products.find(p => p.id === id);
}
