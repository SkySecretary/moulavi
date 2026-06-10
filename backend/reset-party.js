const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function reset() {
  const hash = await bcrypt.hash('password123', 10);
  await prisma.user.updateMany({
    where: { email: 'awadnajilp@gmail.com' },
    data: { password: hash }
  });
  console.log('Password reset to password123');
}
reset();