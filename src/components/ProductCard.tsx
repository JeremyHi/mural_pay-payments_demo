'use client';

import React from 'react';
import { Product } from '@/lib/types';
import { useCart } from '@/contexts/CartContext';

interface ProductCardProps {
  product: Product;
}

function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();

  const handleAddToCart = () => {
    addItem(product);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col">
      {/* Product image/emoji display */}
      <div className="bg-gradient-to-br from-purple-100 to-indigo-100 p-8 flex items-center justify-center">
        <span className="text-7xl">{product.emoji}</span>
      </div>

      {/* Product details */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          {product.name}
        </h3>
        <p className="text-gray-600 text-sm mb-4 flex-1">
          {product.description}
        </p>

        {/* Price and add to cart */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-purple-700">
              ${product.price.toFixed(2)}
            </span>
            <span className="text-sm text-gray-500 ml-1">USDC</span>
          </div>

          <button
            onClick={handleAddToCart}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>Add</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(ProductCard);
