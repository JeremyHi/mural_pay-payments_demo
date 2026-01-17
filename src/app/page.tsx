import ProductCard from '@/components/ProductCard';
import { products } from '@/lib/products';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero section */}
      <section className="bg-gradient-to-b from-purple-900 via-purple-800 to-indigo-900 text-white py-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Discover Your Destiny
          </h1>
          <p className="text-xl text-purple-200 max-w-2xl mx-auto">
            Premium fortune cookies with wisdom from across the ages.
            Pay with USDC on Polygon for instant, borderless transactions.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4 text-sm">
            <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
              <span className="text-green-400">●</span>
              <span>USDC on Polygon</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
              <span>Powered by Mural Pay</span>
            </div>
          </div>
        </div>
      </section>

      {/* Product catalog */}
      <section className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
          Choose Your Fortune
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Info section */}
      <section className="bg-gray-100 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">
            How It Works
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-3">1.</div>
              <h4 className="font-medium text-gray-900 mb-2">Add to Cart</h4>
              <p className="text-gray-600 text-sm">
                Browse our collection and add your favorite fortune cookies to your cart.
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">2.</div>
              <h4 className="font-medium text-gray-900 mb-2">Pay with USDC</h4>
              <p className="text-gray-600 text-sm">
                Send USDC from your wallet to our Polygon address. Fast and low fees.
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">3.</div>
              <h4 className="font-medium text-gray-900 mb-2">Receive Your Fortune</h4>
              <p className="text-gray-600 text-sm">
                Once payment is confirmed, your destiny awaits!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm">
            Open Destiny - A Mural Pay Integration Demo
          </p>
          <p className="text-xs mt-2">
            Payments processed on Polygon Amoy Testnet
          </p>
        </div>
      </footer>
    </div>
  );
}
