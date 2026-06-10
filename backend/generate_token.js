const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function run() {
  const user = await prisma.user.findFirst({ where: { role: 'party' } });
  if (!user) {
    console.log("No party user found");
    return;
  }
  
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerified: user.emailVerified,
  };
  
  const token = jwt.sign(payload, 'moulavi-erp-secret-key-1234567890', { expiresIn: '1h' });
  console.log(token);
  
  const party = await prisma.party.findFirst({ where: { userId: user.id } });
  console.log(party.id);
}
run().catch(console.error);
