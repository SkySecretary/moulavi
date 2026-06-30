import { prisma } from '../lib/prisma';

export class InventoryService {
  /**
   * Recalculates available beds for a specific hotel BRN lot
   */
  static async recalculateInventory(hotelId: string, brnNumber: string) {
    try {
      const hotelBookings = await prisma.umrahHotelBooking.findMany({
        where: {
          hotelId,
          booking: {
            isDeleted: false
          }
        },
        include: {
          booking: {
            select: {
              passengerCount: true
            }
          }
        }
      });

      let consumedBeds = 0;
      const targetBrn = brnNumber.trim().toUpperCase();

      for (const hb of hotelBookings) {
        let consumedInBookingRow = 0;
        
        // 1. Check main BRN
        if (hb.brn) {
          const brnList = Array.isArray(hb.brn) ? hb.brn : [hb.brn];
          if (brnList.some((b: any) => String(b).trim().toUpperCase() === targetBrn)) {
            // Use bedsQuantity if set, otherwise fallback to passengerCount
            consumedInBookingRow += (hb as any).bedsQuantity || hb.booking.passengerCount || 0;
          }
        }

        // 2. Check additional sub-BRNs
        if (hb.additionalBrns) {
          const additionalList = (Array.isArray(hb.additionalBrns) ? hb.additionalBrns : []) as any[];
          for (const sub of additionalList) {
            if (sub && sub.brnNumber && String(sub.brnNumber).trim().toUpperCase() === targetBrn) {
              consumedInBookingRow += parseInt(sub.qty, 10) || 0;
            }
          }
        }

        consumedBeds += consumedInBookingRow;
      }

      const inventory = await prisma.hotelInventory.findUnique({
        where: {
          hotelId_brnNumber: {
            hotelId,
            brnNumber
          }
        }
      });

      if (inventory) {
        const availableBeds = Math.max(0, inventory.totalBeds - consumedBeds);
        await prisma.hotelInventory.update({
          where: { id: inventory.id },
          data: { availableBeds }
        });
      }
    } catch (error) {
      console.error(`[INVENTORY SERVICE] Failed to recalculate inventory for hotel ${hotelId}, BRN ${brnNumber}:`, error);
    }
  }

  /**
   * Recalculates all inventories for a given hotel
   */
  static async recalculateAllForHotel(hotelId: string) {
    try {
      const inventories = await prisma.hotelInventory.findMany({
        where: { hotelId }
      });
      for (const inv of inventories) {
        await this.recalculateInventory(hotelId, inv.brnNumber);
      }
    } catch (error) {
      console.error(`[INVENTORY SERVICE] Failed to recalculate all inventories for hotel ${hotelId}:`, error);
    }
  }

  /**
   * Recalculates all inventories in the system
   */
  static async recalculateAll() {
    try {
      const inventories = await prisma.hotelInventory.findMany();
      for (const inv of inventories) {
        await this.recalculateInventory(inv.hotelId, inv.brnNumber);
      }
    } catch (error) {
      console.error(`[INVENTORY SERVICE] Failed to recalculate all inventories:`, error);
    }
  }
}
