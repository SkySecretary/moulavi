const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function resetAdmin() {
  try {
    console.log('Resetting admin user password...');
    
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    
    const admin = await prisma.user.upsert({
      where: { email: 'admin@moulavi.com' },
      update: {
        password: hashedPassword,
        isActive: true,
        role: 'admin'
      },
      create: {
        name: 'System Admin',
        email: 'admin@moulavi.com',
        password: hashedPassword,
        role: 'admin',
        isActive: true
      }
    });
    
    console.log('✅ Admin user reset successfully!');
    console.log('Email: admin@moulavi.com');
    console.log('Password: Admin@123');
    console.log('User ID:', admin.id);
    
  } catch (error) {
    console.error('❌ Error resetting admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdmin();
