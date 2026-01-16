import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { sign, verify } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const app = new Hono();
const JWT_SECRET = 's3cr3t-k3y-wordstock-pro'; // Khóa bí mật để tạo vé đăng nhập

// 1. Cho phép Frontend (Web của bạn) gọi vào đây
app.use('/*', cors());

// 2. API Đăng ký (Nhận Email + Pass -> Lưu vào DB)
app.post('/register', async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    if (!email || !password) return c.json({ error: 'Thiếu email hoặc mật khẩu' }, 400);

    // Mã hóa mật khẩu (biến 123456 thành chuỗi loằng ngoằng)
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Lưu vào Database
    const { success } = await c.env.DB.prepare(
      'INSERT INTO users (email, password, name) VALUES (?, ?, ?)'
    ).bind(email, hashedPassword, name || 'Student').run();

    if (!success) throw new Error('DB Error');

    return c.json({ message: 'Đăng ký thành công!' }, 201);
  } catch (e) {
    return c.json({ error: 'Email này đã tồn tại!' }, 400);
  }
});

// 3. API Đăng nhập (Nhận Email + Pass -> Trả về Token)
app.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json();

    // Tìm user trong DB
    const user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE email = ?'
    ).bind(email).first();

    if (!user) return c.json({ error: 'Email không tồn tại' }, 401);

    // So sánh mật khẩu
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return c.json({ error: 'Sai mật khẩu' }, 401);

    // Tạo vé đăng nhập (Token)
    const token = sign(
      { id: user.id, email: user.email, name: user.name }, 
      JWT_SECRET
    );

    return c.json({ 
      token, 
      user: { id: user.id, email: user.email, name: user.name } 
    });
  } catch (e) {
    return c.json({ error: 'Lỗi server' }, 500);
  }
});

// PATCH_v2: Auth Middleware & Sync APIs

// Middleware: Kiểm tra đăng nhập tập trung
const authMiddleware = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401);
  
  try {
    const token = authHeader.split(' ')[1];
    const user = verify(token, JWT_SECRET);
    c.set('user', user); // Lưu user vào context
    await next();
  } catch (e) {
    return c.json({ error: 'Invalid Token' }, 403);
  }
};

// 4. API Lấy thông tin User
app.get('/me', authMiddleware, (c) => {
  return c.json({ user: c.get('user') });
});

// 5. API Đồng bộ: Tải dữ liệu lên (Save)
app.post('/sync', authMiddleware, async (c) => {
  const user = c.get('user');
  const { key, data } = await c.req.json(); // key: 'vocab_list', data: [...]

  // Xóa cũ -> Thêm mới (Upsert đơn giản cho D1)
  await c.env.DB.prepare('DELETE FROM user_data WHERE user_id = ? AND key = ?')
    .bind(user.id, key).run();
    
  await c.env.DB.prepare('INSERT INTO user_data (user_id, key, value, updated_at) VALUES (?, ?, ?, ?)')
    .bind(user.id, key, JSON.stringify(data), Date.now()).run();

  return c.json({ success: true });
});

// 6. API Đồng bộ: Tải dữ liệu về (Load)
app.get('/sync/:key', authMiddleware, async (c) => {
  const user = c.get('user');
  const key = c.req.param('key');

  const record = await c.env.DB.prepare('SELECT value FROM user_data WHERE user_id = ? AND key = ?')
    .bind(user.id, key).first();

  if (!record) return c.json({ data: null });
  return c.json({ data: JSON.parse(record.value) });
});

export default app;