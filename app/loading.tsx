export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col items-center gap-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-shopee animate-pulse" />
        <div className="w-8 h-8 rounded-full bg-lazada animate-pulse delay-150" />
      </div>
      <p className="text-gray-500 animate-pulse">กำลังค้นหาสินค้า...</p>
    </div>
  );
}
