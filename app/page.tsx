import SearchBar from "@/components/SearchBar";

const FEATURED_CATEGORIES = [
  { icon: "📱", label: "สมาร์ทโฟน", query: "smartphone" },
  { icon: "💻", label: "แล็ปท็อป", query: "laptop" },
  { icon: "🎧", label: "หูฟัง", query: "headphones" },
  { icon: "⌚", label: "นาฬิกา Smart", query: "smart watch" },
  { icon: "🍳", label: "หม้อทอด", query: "air fryer" },
  { icon: "🎮", label: "เกมมิ่ง", query: "gaming mouse" },
  { icon: "👜", label: "กระเป๋า", query: "กระเป๋า" },
  { icon: "🏋️", label: "อุปกรณ์ออกกำลังกาย", query: "fitness equipment" }
];
export default function HomePage() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero */}
      <section className="w-full bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="max-w-4xl mx-auto px-4 py-20 sm:py-28 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 leading-tight">
            เปรียบเทียบราคา
            <br />
            <span className="text-yellow-300">Shopee & Lazada</span>
            <br />
            ในที่เดียว
          </h1>
          <p className="text-blue-100 text-lg mb-10 max-w-lg mx-auto">
            ค้นหาสินค้าและดูราคาจากทั้งสองแพลตฟอร์มพร้อมกัน หาของถูกที่สุดได้เลย
          </p>
          <SearchBar autoFocus />
        </div>
      </section>

      {/* Platform comparison badges */}
      <section className="w-full max-w-5xl mx-auto px-4 -mt-6 mb-8">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-shopee-light border border-shopee/20 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-shopee flex items-center justify-center text-white font-extrabold text-lg">
              S
            </div>
            <div>
              <p className="font-bold text-shopee">Shopee Thailand</p>
              <p className="text-sm text-gray-500">shopee.co.th</p>
            </div>
          </div>
          <div className="bg-lazada-light border border-lazada/20 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-lazada flex items-center justify-center text-white font-extrabold text-lg">
              L
            </div>
            <div>
              <p className="font-bold text-lazada">Lazada Thailand</p>
              <p className="text-sm text-gray-500">lazada.co.th</p>
            </div>
          </div>
        </div>
      </section>

      {/* Category shortcuts */}
      <section className="w-full max-w-5xl mx-auto px-4 mb-16">
        <h2 className="text-xl font-bold text-gray-700 mb-5">หมวดหมู่ยอดนิยม</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {FEATURED_CATEGORIES.map((cat) => (
            <a
              key={cat.query}
              href={`/search/${encodeURIComponent(cat.query)}`}
              className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
            >
              <span className="text-3xl group-hover:scale-110 transition-transform">
                {cat.icon}
              </span>
              <span className="text-sm font-medium text-gray-700 text-center">
                {cat.label}
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="w-full bg-white border-t border-gray-100 py-14">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-10">วิธีใช้งาน</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                icon: "🔍",
                title: "ค้นหาสินค้า",
                desc: "พิมพ์ชื่อสินค้าที่ต้องการในช่องค้นหา",
              },
              {
                step: "2",
                icon: "📊",
                title: "เปรียบเทียบราคา",
                desc: "ดูราคาจาก Shopee และ Lazada พร้อมกันในหน้าเดียว",
              },
              {
                step: "3",
                icon: "🛒",
                title: "ซื้อในราคาถูกที่สุด",
                desc: "คลิก 'ดูสินค้า' เพื่อไปยังหน้าสินค้าในราคาที่ดีที่สุด",
              },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-2xl">
                  {item.icon}
                </div>
                <h3 className="font-bold text-gray-800">{item.title}</h3>
                <p className="text-sm text-gray-500 max-w-xs">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
