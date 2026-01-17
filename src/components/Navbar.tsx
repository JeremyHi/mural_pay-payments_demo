'use client';

import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { useCallback } from 'react';

export default function Navbar() {
  const { itemCount, setIsCartOpen } = useCart();

  const handleOpenCart = useCallback(() => {
    setIsCartOpen(true);
  }, [setIsCartOpen]);

  return (
    <nav className="bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and brand */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl">🥠</span>
            <span className="text-xl font-bold tracking-tight">Open Destiny</span>
          </Link>

          {/* Navigation links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className="text-purple-200 hover:text-white transition-colors"
            >
              Shop
            </Link>
            <Link
              href="/merchant"
              className="text-purple-200 hover:text-white transition-colors"
            >
              Merchant
            </Link>
          </div>

          {/* Cart button */}
          <button
            onClick={handleOpenCart}
            className="relative p-2 rounded-full hover:bg-purple-700/50 transition-colors"
            aria-label="Open cart"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>

            {/* Item count badge */}
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-yellow-400 text-purple-900 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="md:hidden border-t border-purple-700/50">
        <div className="flex justify-around py-2">
          <Link
            href="/"
            className="text-purple-200 hover:text-white transition-colors text-sm"
          >
            Shop
          </Link>
          <Link
            href="/merchant"
            className="text-purple-200 hover:text-white transition-colors text-sm"
          >
            Merchant
          </Link>
        </div>
      </div>
    </nav>
  );
}
