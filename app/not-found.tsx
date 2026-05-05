import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
      <div className="text-6xl">🤔</div>
      <h1 className="text-2xl font-bold text-gray-800">ไม่พบหน้าที่ต้องการ</h1>
      <p className="text-gray-500">หน้าที่คุณกำลังหาอาจถูกลบหรือ URL ไม่ถูกต้อง</p>
      <Link
        href="/"
        className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
      >
        กลับหน้าแรก
      </Link>
    </div>
  );
}
