
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from './umrahVisa/shared';
import { fetchSheetData } from '../config/googleSheets';
import { parseDateDDMMYYYY } from '../utils/dateParser';
import { generateBillPDF, BillPdfData } from '../services/billPdfService';
import { sendBillEmail } from '../services/emailService';

const router = Router();

interface SheetRow {
  groupNumber: string;
  groupName: string;
  mutamerName: string;
  mutamerNationality: string;
  passportNumber: string;
  entryDate: string;
  exitDate: string;
  visaNumber: string;
  mofaNumber: string;
}

interface ValidationResult {
  groupNumber: string;
  groupName: string;
  totalPassengers: number;
  updatedPassengers: number;
  pendingPassengers: number;
  isReady: boolean;
  bookingId: string | null;
}

/**
 * Parse sheet row data
 * Expected columns: groupnumber, groupname, mutamer name, mutamer nationality, 
 * passportnumber, entrydate, exitdate, visannumber, mofanumber
 */
function parseSheetRow(row: any[], headers: string[]): SheetRow | null {
  try {
    // Find column indices
    const groupNumberIdx = headers.findIndex(h => h.toLowerCase().includes('groupnumber') || h.toLowerCase().includes('group number'));
    const groupNameIdx = headers.findIndex(h => h.toLowerCase().includes('groupname') || h.toLowerCase().includes('group name'));
    // Prioritize "mutamer name" over generic "name" to avoid matching groupname
    const mutamerNameIdx = headers.findIndex(h => {
      const lower = h.toLowerCase();
      return lower.includes('mutamer name') || (lower.includes('name') && !lower.includes('group'));
    });
    const nationalityIdx = headers.findIndex(h => h.toLowerCase().includes('nationality'));
    const passportIdx = headers.findIndex(h => h.toLowerCase().includes('passport'));
    const entryDateIdx = headers.findIndex(h => h.toLowerCase().includes('entrydate') || h.toLowerCase().includes('entry date'));
    const exitDateIdx = headers.findIndex(h => h.toLowerCase().includes('exitdate') || h.toLowerCase().includes('exit date'));
    const visaNumberIdx = headers.findIndex(h => h.toLowerCase().includes('visannumber') || h.toLowerCase().includes('visa number'));
    const mofaNumberIdx = headers.findIndex(h => h.toLowerCase().includes('mofanumber') || h.toLowerCase().includes('mofa number'));

    // Validate required columns
    if (groupNumberIdx === -1) {
      return null;
    }

    const groupNumber = row[groupNumberIdx]?.toString().trim();
    if (!groupNumber) {
      return null;
    }

    return {
      groupNumber,
      groupName: row[groupNameIdx]?.toString().trim() || '',
      mutamerName: row[mutamerNameIdx]?.toString().trim() || '',
      mutamerNationality: row[nationalityIdx]?.toString().trim() || '',
      passportNumber: row[passportIdx]?.toString().trim() || '',
      entryDate: row[entryDateIdx]?.toString().trim() || '',
      exitDate: row[exitDateIdx]?.toString().trim() || '',
      visaNumber: row[visaNumberIdx]?.toString().trim() || '',
      mofaNumber: row[mofaNumberIdx]?.toString().trim() || '',
    };
  } catch (error) {
    console.error('Error parsing sheet row:', error);
    return null;
  }
}

/**
 * POST /api/umrah-visa/invoice/fetch-from-sheet
 * Fetch data from Google Sheet and update UmrahPassenger records
 */
router.post('/invoice/fetch-from-sheet', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;

    // Only admin/staff can fetch from sheet
    if (user.role === 'party') {
      return res.status(403).json({ error: 'Only admin/staff can fetch from sheet' });
    }

    // Fetch data from Google Sheet
    const rows = await fetchSheetData();
    
    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: 'No data found in the sheet' });
    }

    // First row is headers
    const headers = rows[0].map((h: any) => h.toString().toLowerCase().trim());
    const dataRows = rows.slice(1);

    // Parse sheet rows
    const sheetData: SheetRow[] = [];
    for (const row of dataRows) {
      const parsed = parseSheetRow(row, headers);
      if (parsed) {
        sheetData.push(parsed);
      }
    }

    // Group by groupNumber
    const groupedByGroupNumber = new Map<string, SheetRow[]>();
    for (const row of sheetData) {
      const groupNum = row.groupNumber.trim();
      if (!groupedByGroupNumber.has(groupNum)) {
        groupedByGroupNumber.set(groupNum, []);
      }
      groupedByGroupNumber.get(groupNum)!.push(row);
    }

    // Get all bookings with groupNumbers from sheet (only with status 'bill')
    const groupNumbers = Array.from(groupedByGroupNumber.keys());
    const bookings = await prisma.umrahVisaBooking.findMany({
      where: {
        groupNumber: {
          in: groupNumbers,
        },
        status: 'bill',
        isDeleted: false,
      },
      select: {
        id: true,
        groupNumber: true,
        groupName: true,
        passengerCount: true,
      },
    });

    const bookingMap = new Map<string, typeof bookings[0]>();
    for (const booking of bookings) {
      if (booking.groupNumber) {
        bookingMap.set(booking.groupNumber.trim(), booking);
      }
    }

    const validationResults: ValidationResult[] = [];
    let totalUpdated = 0;
    let totalIgnored = 0;

    // Process each group
    for (const [groupNumber, sheetRows] of groupedByGroupNumber.entries()) {
      const booking = bookingMap.get(groupNumber);

      if (!booking) {
        // Group number not found in system - ignore
        totalIgnored++;
        continue;
      }

      // Get all passengers for this booking
      const passengers = await prisma.umrahPassenger.findMany({
        where: {
          bookingId: booking.id,
          isDeleted: false,
        },
        orderBy: {
          createdAt: 'asc', // Order by creation to match with sheet rows
        },
      });

      const totalPassengers = passengers.length;
      let updatedCount = 0;

      // Update passengers with sheet data (match by order/index)
      for (let i = 0; i < Math.min(passengers.length, sheetRows.length); i++) {
        const passenger = passengers[i];
        const sheetRow = sheetRows[i];

        // Parse dates
        const entryDate = parseDateDDMMYYYY(sheetRow.entryDate);
        const exitDate = parseDateDDMMYYYY(sheetRow.exitDate);

        // Update passenger record
        await prisma.umrahPassenger.update({
          where: { id: passenger.id },
          data: {
            fullName: sheetRow.mutamerName || passenger.fullName,
            nationality: sheetRow.mutamerNationality || passenger.nationality,
            passportNumber: sheetRow.passportNumber || passenger.passportNumber,
            entryDate: entryDate || passenger.entryDate,
            exitDate: exitDate || passenger.exitDate,
            visaNumber: sheetRow.visaNumber || passenger.visaNumber,
            mofaNumber: sheetRow.mofaNumber || passenger.mofaNumber,
          },
        });

        updatedCount++;
        totalUpdated++;
      }

      // Count passengers with visaNumber
      const updatedPassengers = await prisma.umrahPassenger.findMany({
        where: {
          bookingId: booking.id,
          isDeleted: false,
          visaNumber: {
            not: null,
          },
        },
      });

      const pendingCount = totalPassengers - updatedPassengers.length;
      const isReady = pendingCount === 0 && updatedPassengers.length === totalPassengers;

      validationResults.push({
        groupNumber: booking.groupNumber || '',
        groupName: booking.groupName || '',
        totalPassengers,
        updatedPassengers: updatedPassengers.length,
        pendingPassengers: pendingCount,
        isReady,
        bookingId: booking.id,
      });
    }

    res.json({
      success: true,
      message: 'Sheet data fetched and passengers updated successfully',
      summary: {
        totalGroupsProcessed: validationResults.length,
        totalPassengersUpdated: totalUpdated,
        totalGroupsIgnored: totalIgnored,
      },
      results: validationResults,
    });
  } catch (error: any) {
    console.error('Error fetching from sheet:', error);
    res.status(500).json({
      error: 'Failed to fetch from sheet',
      message: error.message,
    });
  }
});

/**
 * POST /api/umrah-visa/invoice/generate-bills
 * Generate bills for ready groups
 */
router.post('/invoice/generate-bills', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;

    // Only admin/staff can generate bills
    if (user.role === 'party') {
      return res.status(403).json({ error: 'Only admin/staff can generate bills' });
    }

    const { bookingIds } = req.body;

    if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
      return res.status(400).json({ error: 'bookingIds array is required' });
    }

    const results: Array<{
      bookingId: string;
      groupNumber: string;
      groupName: string;
      partyName: string;
      success: boolean;
      error?: string;
      pdfBase64?: string;
      fileName?: string;
    }> = [];

    // Process each booking
    for (const bookingId of bookingIds) {
      try {
        // Fetch booking with party, account currency and passengers
        const booking = await prisma.umrahVisaBooking.findUnique({
          where: { id: bookingId, isDeleted: false },
          include: {
            party: {
              include: {
                accountCurrency: true
              }
            },
            passengers: {
              where: { isDeleted: false },
              orderBy: { createdAt: 'asc' },
              select: {
                fullName: true,
                visaNumber: true,
              },
            },
          },
        });

        if (!booking) {
          results.push({
            bookingId,
            groupNumber: 'N/A',
            groupName: 'N/A',
            partyName: 'N/A',
            success: false,
            error: 'Booking not found',
          });
          continue;
        }

        // Validate PricingMaster entry exists
        const pricing = await prisma.pricingMaster.findFirst({
          where: {
            partyId: booking.partyId,
            type: 'umrah',
            isActive: true,
          },
        });

        if (!pricing) {
          results.push({
            bookingId,
            groupNumber: booking.groupNumber || 'N/A',
            groupName: booking.groupName || 'N/A',
            partyName: booking.party.partyName,
            success: false,
            error: `Party "${booking.party.partyName}" does not have an entry in the pricing master`,
          });
          continue;
        }

        // Prepare passenger data
        const passengers = booking.passengers.map((p) => ({
          name: p.fullName,
          visaNumber: p.visaNumber || 'N/A',
        }));

        // Calculate amount (price per passenger * passenger count)
        const pricePerPassengerINR = Number(pricing.price);
        const totalAmountINR = pricePerPassengerINR * booking.passengerCount;

        // Convert to party's account currency if needed
        let totalAmountDisplay = totalAmountINR;
        const currency = booking.party.accountCurrency;
        
        if (currency && currency.currencyCode !== 'INR' && currency.exchangeRate > 0) {
          totalAmountDisplay = totalAmountINR / currency.exchangeRate;
        }

        // Generate PDF
        const billData: BillPdfData = {
          partyName: booking.party.partyName,
          groupNumber: booking.groupNumber || 'N/A',
          groupName: booking.groupName || 'N/A',
          passengerCount: booking.passengerCount,
          passengers,
          amount: totalAmountDisplay,
          currencyCode: currency?.currencyCode || 'INR',
          currencySymbol: currency?.symbol || '₹',
        };

        const pdfBuffer = await generateBillPDF(billData);

        // Send email
        if (booking.party.email) {
          try {
            await sendBillEmail(
              booking.party.email,
              booking.party.partyName,
              booking.groupNumber || 'N/A',
              booking.groupName || 'N/A',
              pdfBuffer
            );
          } catch (emailError: any) {
            console.error(`Failed to send email for booking ${bookingId}:`, emailError);
            // Continue even if email fails
          }
        }

        // Update booking status to completed
        await prisma.umrahVisaBooking.update({
          where: { id: bookingId },
          data: {
            status: 'booking_success',
            billGeneratedAt: new Date(),
            billGeneratedBy: user.id,
          },
        });

        // Convert PDF to base64 for download
        const pdfBase64 = pdfBuffer.toString('base64');
        const fileName = `Bill_${booking.groupNumber || bookingId}_${(booking.groupName || '').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

        results.push({
          bookingId,
          groupNumber: booking.groupNumber || 'N/A',
          groupName: booking.groupName || 'N/A',
          partyName: booking.party.partyName,
          success: true,
          pdfBase64,
          fileName,
        });
      } catch (error: any) {
        console.error(`Error processing booking ${bookingId}:`, error);
        results.push({
          bookingId,
          groupNumber: 'N/A',
          groupName: 'N/A',
          partyName: 'N/A',
          success: false,
          error: error.message || 'Failed to generate bill',
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const errorCount = results.filter((r) => !r.success).length;

    res.json({
      success: true,
      message: `Generated ${successCount} bills successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      summary: {
        total: results.length,
        success: successCount,
        errors: errorCount,
      },
      results,
    });
  } catch (error: any) {
    console.error('Error generating bills:', error);
    res.status(500).json({
      error: 'Failed to generate bills',
      message: error.message,
    });
  }
});

/**
 * POST /api/umrah-visa/:bookingId/generate-bill
 * Generate a single bill for a booking
 */
router.post('/:bookingId/generate-bill', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const user = (req as any).user;

    // Only admin/staff can generate bills
    if (user.role === 'party') {
      return res.status(403).json({ error: 'Only admin/staff can generate bills' });
    }

    // Fetch booking with party, account currency and passengers
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId, isDeleted: false },
      include: {
        party: {
          include: {
            accountCurrency: true
          }
        },
        passengers: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'asc' },
          select: {
            fullName: true,
            visaNumber: true,
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Validate PricingMaster entry exists
    const pricing = await prisma.pricingMaster.findFirst({
      where: {
        partyId: booking.partyId,
        type: 'umrah',
        isActive: true,
      },
    });

    if (!pricing) {
      return res.status(400).json({ error: `Party "${booking.party.partyName}" does not have an entry in the pricing master` });
    }

    // Prepare passenger data
    const passengers = booking.passengers.map((p) => ({
      name: p.fullName,
      visaNumber: p.visaNumber || 'N/A',
    }));

    // Calculate amount (price per passenger * passenger count)
    const pricePerPassengerINR = Number(pricing.price);
    const totalAmountINR = pricePerPassengerINR * booking.passengerCount;

    // Convert to party's account currency if needed
    let totalAmountDisplay = totalAmountINR;
    const currency = booking.party.accountCurrency;
    
    if (currency && currency.currencyCode !== 'INR' && currency.exchangeRate > 0) {
      totalAmountDisplay = totalAmountINR / currency.exchangeRate;
    }

    // Generate PDF
    const billData: BillPdfData = {
      partyName: booking.party.partyName,
      groupNumber: booking.groupNumber || 'N/A',
      groupName: booking.groupName || 'N/A',
      passengerCount: booking.passengerCount,
      passengers,
      amount: totalAmountDisplay,
      currencyCode: currency?.currencyCode || 'INR',
      currencySymbol: currency?.symbol || '₹',
    };

    const pdfBuffer = await generateBillPDF(billData);

    // Send email
    if (booking.party.email) {
      try {
        await sendBillEmail(
          booking.party.email,
          booking.party.partyName,
          booking.groupNumber || 'N/A',
          booking.groupName || 'N/A',
          pdfBuffer
        );
      } catch (emailError: any) {
        console.error(`Failed to send email for booking ${bookingId}:`, emailError);
        // Continue even if email fails
      }
    }

    // Update booking status to completed
    await prisma.umrahVisaBooking.update({
      where: { id: bookingId },
      data: {
        status: 'booking_success',
        billGeneratedAt: new Date(),
        billGeneratedBy: user.id,
      },
    });

    // Send PDF
    const fileName = `Bill_${booking.groupNumber || bookingId}_${(booking.groupName || '').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length.toString());
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error(`Error generating bill for booking ${req.params.bookingId}:`, error);
    res.status(500).json({
      error: 'Failed to generate bill',
      message: error.message,
    });
  }
});

export default router;
