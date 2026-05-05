"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";

interface SearchBarProps {
  defaultValue?: string;
  autoFocus?: boolean;
}

const TRENDING = [
  "iPhone 15",
  "gaming mouse",
  "หูฟังบลูทูธ",
  "air fryer",
  "กระเป๋าเป้",
  "นาฬิกา smart watch",
];

export default function SearchBar({
  defaultValue = "",
  autoFocus = false,
}: SearchBarProps) {
  const [query, setQuery] = useState(defaultValue);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    startTransition(() => {
      router.push(`/search/${encodeURIComponent(q)}`);
    });
  }

  function handleTrending(term: string) {
    setQuery(term);
    startTransition(() => {
      router.push(`/search/${encodeURIComponent(term)}`);
    });
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          {/* Search icon */}
          <span className="pl-4 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </span>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาสินค้าจาก Shopee & Lazada..."
            className="flex-1 px-4 py-4 text-gray-800 placeholder-gray-400 bg-transparent outline-none text-base"
            autoFocus={autoFocus}
          />

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="px-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}

          <button
            type="submit"
            disabled={isPending || !query.trim()}
            className="m-2 px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 12 0 12 0v4a8 8 0 00-8 8H4z"
                  />
                </svg>
                ค้นหา...
              </span>
            ) : (
              "ค้นหา"
            )}
          </button>
        </div>
      </form>

      {/* Trending searches */}
      {!defaultValue && (
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          <span className="text-sm text-gray-500">🔥 ยอดนิยม:</span>
          {TRENDING.map((term) => (
            <button
              key={term}
              onClick={() => handleTrending(term)}
              className="text-sm bg-white text-gray-600 border border-gray-200 rounded-full px-3 py-1 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              {term}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
