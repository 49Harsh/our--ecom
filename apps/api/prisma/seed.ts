import { PrismaClient, Gender, ProductStatus, CouponType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Admin User ──────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin@123456', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@recom.in' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@recom.in',
      password: adminPassword,
      role: 'ADMIN',
      isVerified: true,
    },
  });
  console.log(`✅ Admin user: ${admin.email}`);

  // ─── Customer User ───────────────────────────────────────────────────────
  const customerPassword = await bcrypt.hash('User@123456', 12);
  const customer = await prisma.user.upsert({
    where: { email: 'customer@recom.in' },
    update: {},
    create: {
      name: 'John Doe',
      email: 'customer@recom.in',
      password: customerPassword,
      role: 'CUSTOMER',
      isVerified: true,
    },
  });
  console.log(`✅ Customer user: ${customer.email}`);

  // ─── Sizes ───────────────────────────────────────────────────────────────
  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '28', '30', '32', '34', '36', '38', 'Free Size'];
  const sizeMap: Record<string, string> = {};
  for (let i = 0; i < sizes.length; i++) {
    const created = await prisma.size.upsert({
      where: { name: sizes[i] },
      update: {},
      create: { name: sizes[i], sortOrder: i },
    });
    sizeMap[sizes[i]] = created.id;
  }
  console.log(`✅ Sizes seeded: ${sizes.length}`);

  // ─── Colors ──────────────────────────────────────────────────────────────
  const colors = [
    { name: 'Black', hexCode: '#000000' },
    { name: 'White', hexCode: '#FFFFFF' },
    { name: 'Navy Blue', hexCode: '#1B3A6B' },
    { name: 'Red', hexCode: '#E53E3E' },
    { name: 'Olive Green', hexCode: '#6B705C' },
    { name: 'Grey', hexCode: '#718096' },
    { name: 'Beige', hexCode: '#D4B896' },
    { name: 'Sky Blue', hexCode: '#87CEEB' },
    { name: 'Maroon', hexCode: '#800000' },
    { name: 'Mustard', hexCode: '#DFAE31' },
  ];
  const colorMap: Record<string, string> = {};
  for (const color of colors) {
    const created = await prisma.color.upsert({
      where: { name: color.name },
      update: {},
      create: color,
    });
    colorMap[color.name] = created.id;
  }
  console.log(`✅ Colors seeded: ${colors.length}`);

  // ─── Categories ───────────────────────────────────────────────────────────
  const parentCategories = [
    { name: 'Men', slug: 'men', sortOrder: 0 },
    { name: 'Women', slug: 'women', sortOrder: 1 },
    { name: 'Kids', slug: 'kids', sortOrder: 2 },
    { name: 'Unisex', slug: 'unisex', sortOrder: 3 },
  ];

  const subCategories = [
    { name: 'T-Shirts', slug: 'men-t-shirts', parentSlug: 'men' },
    { name: 'Shirts', slug: 'men-shirts', parentSlug: 'men' },
    { name: 'Jeans', slug: 'men-jeans', parentSlug: 'men' },
    { name: 'Trousers', slug: 'men-trousers', parentSlug: 'men' },
    { name: 'Dresses', slug: 'women-dresses', parentSlug: 'women' },
    { name: 'Tops', slug: 'women-tops', parentSlug: 'women' },
    { name: 'Kurtas', slug: 'women-kurtas', parentSlug: 'women' },
    { name: 'Hoodies', slug: 'unisex-hoodies', parentSlug: 'unisex' },
    { name: 'Sweatshirts', slug: 'unisex-sweatshirts', parentSlug: 'unisex' },
  ];

  const categoryMap: Record<string, string> = {};
  for (const cat of parentCategories) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { name: cat.name, slug: cat.slug, isActive: true, sortOrder: cat.sortOrder },
    });
    categoryMap[cat.slug] = created.id;
  }

  for (const sub of subCategories) {
    const created = await prisma.category.upsert({
      where: { slug: sub.slug },
      update: {},
      create: { name: sub.name, slug: sub.slug, parentId: categoryMap[sub.parentSlug], isActive: true },
    });
    categoryMap[sub.slug] = created.id;
  }
  console.log(`✅ Categories seeded: ${parentCategories.length + subCategories.length}`);

  // ─── App Settings ──────────────────────────────────────────────────────────
  const settings = [
    { key: 'store_name', value: 'Roshe Store', group: 'general' },
    { key: 'store_email', value: 'support@recom.in', group: 'general' },
    { key: 'store_phone', value: '+91-9999999999', group: 'general' },
    { key: 'currency', value: 'INR', group: 'general' },
    { key: 'gst_rate', value: 5, group: 'tax' },
    { key: 'free_shipping_above', value: 999, group: 'shipping' },
    { key: 'flat_shipping_rate', value: 99, group: 'shipping' },
  ];

  for (const s of settings) {
    await prisma.settings.upsert({
      where: { key: s.key },
      update: { value: s.value as any },
      create: { key: s.key, value: s.value as any, group: s.group },
    });
  }
  console.log(`✅ Settings seeded: ${settings.length}`);

  // ─── Products & Variants ────────────────────────────────────────────────────
  const productsData = [
    {
      title: 'Classic Black Oversized T-Shirt',
      slug: 'classic-black-oversized-t-shirt',
      description: 'An oversized, drop-shoulder t-shirt made of 100% premium heavy cotton (240 GSM). Perfect for everyday streetwear styles.',
      shortDescription: '100% heavy cotton, oversized fit, streetwear basic.',
      sku: 'PRD-M-TS-BLK-001',
      brand: 'Roshe Premium',
      gender: Gender.MALE,
      categorySlug: 'men-t-shirts',
      price: 799.0,
      discountPrice: 599.0,
      costPrice: 250.0,
      weight: 240,
      thumbnail: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
      tags: ['streetwear', 'oversized', 'black t-shirt', 'casual'],
      isFeatured: true,
      isTrending: true,
      isNewArrival: true,
      isBestSeller: true,
      status: ProductStatus.ACTIVE,
      variants: [
        { size: 'S', color: 'Black', stock: 50 },
        { size: 'M', color: 'Black', stock: 80 },
        { size: 'L', color: 'Black', stock: 75 },
        { size: 'XL', color: 'Black', stock: 40 },
      ],
      images: [
        'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&auto=format&fit=crop&q=80',
      ],
    },
    {
      title: 'Minimalist Off-White Linen Shirt',
      slug: 'minimalist-off-white-linen-shirt',
      description: 'A breathable, lightweight linen-blend shirt with a band collar. Ideal for warm summer afternoons and smart-casual evenings.',
      shortDescription: 'Linen blend, band collar, summer essential.',
      sku: 'PRD-M-SH-WHT-001',
      brand: 'Roshe Premium',
      gender: Gender.MALE,
      categorySlug: 'men-shirts',
      price: 1599.0,
      discountPrice: 1299.0,
      costPrice: 550.0,
      weight: 300,
      thumbnail: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop&q=80',
      tags: ['linen', 'shirt', 'summer', 'classic'],
      isFeatured: true,
      isTrending: false,
      isNewArrival: true,
      isBestSeller: false,
      status: ProductStatus.ACTIVE,
      variants: [
        { size: 'M', color: 'White', stock: 35 },
        { size: 'L', color: 'White', stock: 45 },
        { size: 'XL', color: 'White', stock: 20 },
        { size: 'M', color: 'Beige', stock: 25 },
        { size: 'L', color: 'Beige', stock: 30 },
      ],
      images: [
        'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1603252109303-2751441dd157?w=800&auto=format&fit=crop&q=80',
      ],
    },
    {
      title: 'Women Floral Wrap Dress',
      slug: 'women-floral-wrap-dress',
      description: 'V-neck, dynamic wrap around tie-waist floral dress. Gracefully falls above the knees, styled for casual outings or beach days.',
      shortDescription: 'Wrap dress, floral pattern, V-neck.',
      sku: 'PRD-W-DR-RED-001',
      brand: 'Roshe Grace',
      gender: Gender.FEMALE,
      categorySlug: 'women-dresses',
      price: 1999.0,
      discountPrice: 1599.0,
      costPrice: 700.0,
      weight: 350,
      thumbnail: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&auto=format&fit=crop&q=80',
      tags: ['dress', 'floral', 'wrap dress', 'red dress'],
      isFeatured: true,
      isTrending: true,
      isNewArrival: false,
      isBestSeller: true,
      status: ProductStatus.ACTIVE,
      variants: [
        { size: 'XS', color: 'Red', stock: 15 },
        { size: 'S', color: 'Red', stock: 25 },
        { size: 'M', color: 'Red', stock: 30 },
        { size: 'L', color: 'Red', stock: 20 },
      ],
      images: [
        'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1612336307429-8a898d10e223?w=800&auto=format&fit=crop&q=80',
      ],
    },
    {
      title: 'Comfort Grey Knit Cropped Top',
      slug: 'comfort-grey-knit-cropped-top',
      description: 'A cozy knit fabric cropped top in a solid color. Stretchable ribbed knit material with a crew neckline.',
      shortDescription: 'Cozy ribbed knit, crop cut, casual chic.',
      sku: 'PRD-W-TP-GRY-001',
      brand: 'Roshe Grace',
      gender: Gender.FEMALE,
      categorySlug: 'women-tops',
      price: 999.0,
      discountPrice: 799.0,
      costPrice: 320.0,
      weight: 180,
      thumbnail: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80',
      tags: ['knit', 'top', 'cropped', 'grey'],
      isFeatured: false,
      isTrending: true,
      isNewArrival: true,
      isBestSeller: false,
      status: ProductStatus.ACTIVE,
      variants: [
        { size: 'S', color: 'Grey', stock: 40 },
        { size: 'M', color: 'Grey', stock: 50 },
        { size: 'L', color: 'Grey', stock: 35 },
      ],
      images: [
        'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80',
      ],
    },
    {
      title: 'Unisex Heavyweight Sand Hoodie',
      slug: 'unisex-heavyweight-sand-hoodie',
      description: 'A heavyweight (400 GSM) pullover hoodie with a double-lined hood, drop shoulder style, and cozy kangaroo pouch pocket.',
      shortDescription: '400 GSM heavyweight, drop shoulder, double-lined hood.',
      sku: 'PRD-U-HD-SND-001',
      brand: 'Roshe Core',
      gender: Gender.UNISEX,
      categorySlug: 'unisex-hoodies',
      price: 2499.0,
      discountPrice: 1999.0,
      costPrice: 900.0,
      weight: 600,
      thumbnail: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&auto=format&fit=crop&q=80',
      tags: ['hoodie', 'unisex', 'sand', 'cozy', 'winterwear'],
      isFeatured: true,
      isTrending: true,
      isNewArrival: true,
      isBestSeller: true,
      status: ProductStatus.ACTIVE,
      variants: [
        { size: 'S', color: 'Beige', stock: 30 },
        { size: 'M', color: 'Beige', stock: 45 },
        { size: 'L', color: 'Beige', stock: 40 },
        { size: 'XL', color: 'Beige', stock: 25 },
      ],
      images: [
        'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1519985176271-adb1088fa94c?w=800&auto=format&fit=crop&q=80',
      ],
    },
    {
      title: 'Classic Indigo Denim Jeans',
      slug: 'classic-indigo-denim-jeans',
      description: 'Vintage styled dark wash indigo denim jeans. Made with 100% durable cotton denim that conforms to your body shape over time.',
      shortDescription: '100% cotton denim, vintage straight fit.',
      sku: 'PRD-M-JN-IND-001',
      brand: 'Roshe Denim',
      gender: Gender.MALE,
      categorySlug: 'men-jeans',
      price: 2999.0,
      discountPrice: 2299.0,
      costPrice: 1100.0,
      weight: 650,
      thumbnail: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&auto=format&fit=crop&q=80',
      tags: ['jeans', 'denim', 'indigo', 'men clothing'],
      isFeatured: false,
      isTrending: false,
      isNewArrival: false,
      isBestSeller: true,
      status: ProductStatus.ACTIVE,
      variants: [
        { size: '30', color: 'Navy Blue', stock: 20 },
        { size: '32', color: 'Navy Blue', stock: 35 },
        { size: '34', color: 'Navy Blue', stock: 30 },
        { size: '36', color: 'Navy Blue', stock: 15 },
      ],
      images: [
        'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&auto=format&fit=crop&q=80',
      ],
    },
  ];

  for (const prod of productsData) {
    const { categorySlug, variants, images, ...prodFields } = prod;
    
    // Create product
    const createdProduct = await prisma.product.upsert({
      where: { slug: prodFields.slug },
      update: {
        price: prodFields.price,
        discountPrice: prodFields.discountPrice,
        status: prodFields.status,
      },
      create: {
        ...prodFields,
        categoryId: categoryMap[categorySlug],
      },
    });

    // Create product images
    for (let j = 0; j < images.length; j++) {
      await prisma.productImage.create({
        data: {
          productId: createdProduct.id,
          url: images[j],
          sortOrder: j,
        },
      });
    }

    // Create variants and inventory
    for (const v of variants) {
      const sizeId = sizeMap[v.size];
      const colorId = colorMap[v.color];
      
      const variantSku = `${createdProduct.sku}-${v.color.slice(0, 3).toUpperCase()}-${v.size}`;

      const variant = await prisma.productVariant.upsert({
        where: { sku: variantSku },
        update: {},
        create: {
          productId: createdProduct.id,
          sizeId,
          colorId,
          sku: variantSku,
          isActive: true,
        },
      });

      await prisma.inventory.upsert({
        where: { variantId: variant.id },
        update: {
          stock: v.stock,
        },
        create: {
          variantId: variant.id,
          stock: v.stock,
          lowStock: 5,
        },
      });
    }
    
    console.log(`✅ Product & Variants: ${createdProduct.title}`);
  }

  // ─── Coupons ───────────────────────────────────────────────────────────────
  const coupons = [
    { code: 'FIRST50', description: '50% off on your first purchase', type: CouponType.PERCENTAGE, value: 50.0, maxDiscount: 200.0, minOrderAmount: 499.0 },
    { code: 'FLAT150', description: 'Flat 150 off on orders above 1499', type: CouponType.FIXED, value: 150.0, maxDiscount: null, minOrderAmount: 1499.0 },
    { code: 'FREESHIP', description: 'Free shipping on any order', type: CouponType.FREE_SHIPPING, value: 0.0, maxDiscount: null, minOrderAmount: 0.0 },
  ];
  for (const coupon of coupons) {
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: {},
      create: {
        ...coupon,
        isActive: true,
      },
    });
  }
  console.log(`✅ Coupons seeded: ${coupons.length}`);

  console.log('\n🎉 Database seeded successfully!');
  console.log(`\n  Admin Login:\n  Email: admin@recom.in\n  Password: Admin@123456\n`);
  console.log(`  Customer Login:\n  Email: customer@recom.in\n  Password: User@123456\n`);
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
