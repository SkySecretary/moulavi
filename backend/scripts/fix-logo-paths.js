const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixLogoPaths() {
  try {
    console.log('🔍 Searching for parties with absolute logo paths...');
    const parties = await prisma.party.findMany({
      where: {
        logoPath: { contains: 'uploads' }
      }
    });

    console.log(`Found ${parties.length} parties potentially needing fix.`);
    
    for (const party of parties) {
      if (party.logoPath && (party.logoPath.startsWith('/') || party.logoPath.includes('\\'))) {
        const relativePath = party.logoPath.replace(/.*[\/\\]uploads[\/\\]/, 'uploads/');
        if (relativePath !== party.logoPath) {
          console.log(`Updating party ${party.partyName}: ${party.logoPath} -> ${relativePath}`);
          await prisma.party.update({
            where: { id: party.id },
            data: { logoPath: relativePath }
          });
        }
      }
    }

    console.log('🔍 Searching for party documents with absolute paths...');
    const docs = await prisma.partyDocument.findMany({
      where: {
        filePath: { contains: 'uploads' }
      }
    });

    console.log(`Found ${docs.length} party documents potentially needing fix.`);
    
    for (const doc of docs) {
      if (doc.filePath && (doc.filePath.startsWith('/') || doc.filePath.includes('\\'))) {
        const relativePath = doc.filePath.replace(/.*[\/\\]uploads[\/\\]/, 'uploads/');
        if (relativePath !== doc.filePath) {
          console.log(`Updating document ${doc.fileName}: ${doc.filePath} -> ${relativePath}`);
          await prisma.partyDocument.update({
            where: { id: doc.id },
            data: { filePath: relativePath }
          });
        }
      }
    }

    console.log('🔍 Searching for booking documents with absolute paths...');
    const bookingDocs = await prisma.document.findMany({
      where: {
        filePath: { contains: 'uploads' }
      }
    });

    console.log(`Found ${bookingDocs.length} booking documents potentially needing fix.`);
    
    for (const doc of bookingDocs) {
      if (doc.filePath && (doc.filePath.startsWith('/') || doc.filePath.includes('\\'))) {
        const relativePath = doc.filePath.replace(/.*[\/\\]uploads[\/\\]/, 'uploads/');
        if (relativePath !== doc.filePath) {
          console.log(`Updating document ${doc.fileName}: ${doc.filePath} -> ${relativePath}`);
          await prisma.document.update({
            where: { id: doc.id },
            data: { filePath: relativePath }
          });
        }
      }
    }

    console.log('✅ Path cleanup completed!');
  } catch (error) {
    console.error('❌ Error during path cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixLogoPaths();
