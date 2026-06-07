const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearData() {
  try {
    console.log('🧹 Clearing transaction data...');
    
    // Ordered to handle foreign key constraints
    await prisma.voucherMovement.deleteMany({});
    await prisma.voucherHotel.deleteMany({});
    await prisma.voucherFlight.deleteMany({});
    await prisma.voucher.deleteMany({});

    await prisma.document.deleteMany({});
    await prisma.bookingStatusHistory.deleteMany({});
    await prisma.umrahPassenger.deleteMany({});
    await prisma.umrahHotelBooking.deleteMany({});
    await prisma.umrahMovementDetail.deleteMany({});
    await prisma.umrahSponserIqamaDetails.deleteMany({});
    await prisma.umrahTransportBooking.deleteMany({});
    await prisma.umrahTravelDetails.deleteMany({});
    await prisma.umrahVisaBooking.deleteMany({});

    console.log('✅ Transaction data cleared successfully.');
    
    // Try to reset sequences if possible (SQLite specific via raw query)
    try {
      const tables = [
        'voucher_movements', 'voucher_hotels', 'voucher_flights', 'vouchers',
        'umrah_passengers', 'documents', 'booking_status_history', 'umrah_hotel_bookings',
        'umrah_movement_details', 'umrah_sponser_iqama_details', 'umrah_transport_bookings',
        'umrah_travel_details', 'umrah_visa_bookings'
      ];
      for (const table of tables) {
        await prisma.$executeRawUnsafe(`DELETE FROM sqlite_sequence WHERE name='${table}';`);
      }
      console.log('✅ Sequences reset.');
    } catch (e) {
      console.log('⚠️ Could not reset sequences (might not be using auto-increment IDs):', e.message);
    }

  } catch (error) {
    console.error('❌ Error clearing data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearData();
