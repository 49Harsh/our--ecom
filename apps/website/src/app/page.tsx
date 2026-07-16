export default function HomePage() {
  return (
    <div className="container-site py-20 text-center">
      <h1 className="font-serif text-5xl font-bold text-black mb-4">
        New Collection
      </h1>
      <p className="text-gray-500 text-lg mb-8">
        Discover premium clothing crafted for the modern Indian wardrobe.
      </p>
      <div className="flex gap-4 justify-center">
        <a href="/shop" className="btn btn-primary">Shop Now</a>
        <a href="/shop?sort=newest" className="btn btn-outline">New Arrivals</a>
      </div>
    </div>
  );
}
