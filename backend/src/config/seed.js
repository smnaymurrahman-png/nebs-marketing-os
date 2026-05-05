require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('./database');

async function seed() {
  console.log('🌱 Seeding database...');

  const hashedPassword = await bcrypt.hash('Admin@1234', 12);
  const superAdminId = uuidv4();

  try {
    await pool.query(
      `INSERT INTO users (id, full_name, work_email, password, department, role, access_level)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (work_email) DO NOTHING`,
      [superAdminId, 'Super Admin', 'superadmin@nebsit.com', hashedPassword, 'Management', 'Super Administrator', 'super_admin']
    );
    console.log('✅ Super Admin created');
    console.log('   Email: superadmin@nebsit.com');
    console.log('   Password: Admin@1234');

    const adminId = uuidv4();
    const adminPassword = await bcrypt.hash('Admin@1234', 12);
    await pool.query(
      `INSERT INTO users (id, full_name, work_email, password, department, role, access_level)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (work_email) DO NOTHING`,
      [adminId, 'Marketing Manager', 'admin@nebsit.com', adminPassword, 'Management', 'Marketing Manager', 'admin']
    );
    console.log('✅ Admin created');
    console.log('   Email: admin@nebsit.com');
    console.log('   Password: Admin@1234');

    const sampleUsers = [
      { name: 'Alex Designer', email: 'designer@nebsit.com', dept: 'Design', role: 'Graphic Designer' },
      { name: 'Sara Copywriter', email: 'copy@nebsit.com', dept: 'Copywriting', role: 'Copywriter' },
      { name: 'Mike Social', email: 'social@nebsit.com', dept: 'Social Media', role: 'Social Media Manager' },
    ];

    for (const u of sampleUsers) {
      const uid = uuidv4();
      const pw = await bcrypt.hash('User@1234', 12);
      await pool.query(
        `INSERT INTO users (id, full_name, work_email, password, department, role, access_level)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (work_email) DO NOTHING`,
        [uid, u.name, u.email, pw, u.dept, u.role, 'user']
      );
      console.log(`✅ User created: ${u.email} (password: User@1234)`);
    }

    console.log('\n🎉 Seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
}

seed();
