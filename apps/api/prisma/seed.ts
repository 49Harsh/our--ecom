import { PrismaClient } from '@prisma/client';
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

  // ─── Sizes ───────────────────────────────────────────────────────────────
  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '28', '30', '32', '34', '36', '38', 'Free Size'];
  for (let i = 0; i < sizes.length; i++) {
    await prisma.size.upsert({ where: { name: sizes[i] }, update: {}, create: { name: sizes[i], sortOrder: i } });
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
  for (const color of colors) {
    await prisma.color.upsert({ where: { name: color.name }, update: {}, create: color });
  }
  console.log(`✅ Colors seeded: ${colors.length}`);

  // ─── Categories ───────────────────────────────────────────────────────────
  const categories = [
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
  for (const cat of categories) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { name: cat.name, slug: cat.slug, isActive: true, sortOrder: cat.sortOrder },
    });
    categoryMap[cat.slug] = created.id;
  }

  for (const sub of subCategories) {
    await prisma.category.upsert({
      where: { slug: sub.slug },
      update: {},
      create: { name: sub.name, slug: sub.slug, parentId: categoryMap[sub.parentSlug], isActive: true },
    });
  }
  console.log(`✅ Categories seeded: ${categories.length + subCategories.length}`);

  // ─── App Settings ──────────────────────────────────────────────────────────
  const settings = [
    { key: 'store_name', value: 'R-Ecom Store', group: 'general' },
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

  console.log('\n🎉 Database seeded successfully!');
  console.log(`\n  Admin Login:\n  Email: admin@recom.in\n  Password: Admin@123456\n`);
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
