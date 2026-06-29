'use client';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Google Business Profile Manager
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Manage your business presence across all Google platforms
          </p>
          <div className="space-x-4">
            <a
              href="/login"
              className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
            >
              Sign In
            </a>
            <a
              href="/register"
              className="inline-block px-6 py-3 bg-white text-primary-600 border-2 border-primary-600 rounded-lg hover:bg-primary-50 transition"
            >
              Sign Up
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
