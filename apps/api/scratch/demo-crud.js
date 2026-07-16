const http = require('http');

const API_HOST = 'localhost';
const API_PORT = 4000;
const API_PREFIX = '/api/v1';

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : '';
    
    const headers = {
      'Content-Type': 'application/json',
    };
    if (body) {
      headers['Content-Length'] = Buffer.byteLength(dataString);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: API_PREFIX + path,
      method: method.toUpperCase(),
      headers: headers
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        let parsed = responseBody;
        try {
          if (responseBody) parsed = JSON.parse(responseBody);
        } catch (e) {}

        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, data: parsed });
        } else {
          reject({ status: res.statusCode, data: parsed });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(dataString);
    }
    req.end();
  });
}

async function runDemo() {
  console.log('🚀 Starting E2E CRUD Demo against Backend APIs (using native http)...\n');

  const id = Math.floor(Math.random() * 10000);
  const catSlug = `accessories-${id}`;
  const prodSku = `ACC-STRAP-${id}`;
  const prodTitle = `Leather Smart Watch Strap ${id}`;

  try {
    // 1. Authenticate as Admin
    console.log('🔑 Logging in as Admin...');
    const loginRes = await request('post', '/auth/login', {
      email: 'admin@recom.in',
      password: 'Admin@123456',
    });
    
    const token = loginRes.data.data.accessToken;
    console.log('✅ Admin authenticated successfully!');
    console.log(`Token acquired: ${token.slice(0, 15)}...\n`);

    // 2. Create (POST) a Category
    console.log(`📁 Creating a new Category (slug: ${catSlug})...`);
    const categoryData = {
      name: `Smart Accessories ${id}`,
      slug: catSlug,
      description: 'Watches, belts, and luxury smart accessories.',
    };
    const catCreateRes = await request('post', '/categories', categoryData, token);
    const categoryId = catCreateRes.data.data.id;
    console.log('✅ Category created:', catCreateRes.data.data);
    console.log(`Category ID: ${categoryId}\n`);

    // 3. Update (PATCH) the Category
    console.log('📁 Updating the Category...');
    const categoryUpdateData = {
      description: 'Updated: Watches, premium belts, and luxury smart accessories.',
    };
    const catUpdateRes = await request('patch', `/categories/${categoryId}`, categoryUpdateData, token);
    console.log('✅ Category updated:', catUpdateRes.data.data);
    console.log(`New description: ${catUpdateRes.data.data.description}\n`);

    // 4. Create (POST) a Product inside this Category
    console.log(`👕 Creating a new Product (title: "${prodTitle}", sku: ${prodSku})...`);
    const productData = {
      title: prodTitle,
      description: 'Genuine leather strap compatible with all modern smart watches.',
      price: 1299.0,
      discountPrice: 999.0,
      categoryId: categoryId,
      sku: prodSku,
      brand: 'R-ECOM Premium',
      status: 'ACTIVE',
      tags: ['leather', 'accessory', 'strap'],
    };
    const prodCreateRes = await request('post', '/products', productData, token);
    const productId = prodCreateRes.data.data.id;
    console.log('✅ Product created:', prodCreateRes.data.data);
    console.log(`Product ID: ${productId}\n`);

    // 5. Update (PATCH) the Product
    console.log('👕 Updating the Product...');
    const productUpdateData = {
      price: 1199.0,
      discountPrice: 899.0,
      shortDescription: 'Premium top-grain leather smart watch strap.',
    };
    const prodUpdateRes = await request('patch', `/products/${productId}`, productUpdateData, token);
    console.log('✅ Product updated:', prodUpdateRes.data.data);
    console.log(`New Price: ${prodUpdateRes.data.data.price}, Discount: ${prodUpdateRes.data.data.discountPrice}\n`);

    // 5.5 Reassign product category before soft-deleting the product, to avoid category deletion guard conflict
    console.log('🔄 Reassigning product category to a parent category to bypass deletion guard...');
    
    // Let's get parent categories to pick one
    const categoriesRes = await request('get', '/categories');
    const categoriesList = categoriesRes.data.data.data || categoriesRes.data.data;
    const fallbackCategory = categoriesList.find(c => c.slug === 'unisex');
    
    if (fallbackCategory) {
      console.log(`Moving product to fallback category: ${fallbackCategory.name} (${fallbackCategory.id})`);
      await request('patch', `/products/${productId}`, { categoryId: fallbackCategory.id }, token);
      console.log('✅ Product moved successfully!\n');
    } else {
      console.log('⚠️ Fallback category "unisex" not found. Skipping category move.\n');
    }

    // 6. Delete (DELETE) the Product (soft-delete)
    console.log('🗑️ Archiving/Deleting the Product...');
    const prodDeleteRes = await request('delete', `/products/${productId}`, null, token);
    console.log('✅ Product deletion response:', prodDeleteRes.data.data);
    console.log(`Message: ${prodDeleteRes.data.data.message}\n`);

    // 7. Delete (DELETE) the Category
    console.log('🗑️ Deleting the Category...');
    const catDeleteRes = await request('delete', `/categories/${categoryId}`, null, token);
    console.log('✅ Category deletion response:', catDeleteRes.data.data);
    console.log(`Message: ${catDeleteRes.data.data?.message || 'Category deleted successfully'}\n`);

    console.log('🎉 E2E CRUD Demo finished successfully with 0 errors!');
  } catch (error) {
    console.error('❌ E2E CRUD Demo failed:');
    if (error.status) {
      console.error(`Status: ${error.status}`);
      console.error('Error Details:', error.data);
    } else {
      console.error(error);
    }
  }
}

runDemo();
