import { jsPDF } from 'jspdf';
// Import autoTable as named export (it's exported as both named and default)
import { autoTable } from 'jspdf-autotable';

// Extend jsPDF type to include autoTable and lastAutoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable?: {
      finalY: number;
    };
  }
}

interface VoucherPdfData {
  voucherNumber: string;
  reservationNumber?: string; // Added for reservation number
  reservationDate: string;
  guestName: string;
  guestMobile: string;
  groupCode: string;
  groupName?: string; // Added for group name
  paxCount: number;
  umrahVisaProvider?: { // Added for Umrah Visa Provider details
    partyName: string;
    address?: string;
    contactNumber?: string;
    whatsappNumber?: string;
    email?: string;
  } | null;
  hotelSchedules: Array<{
    number: number;
    location: string;
    hotelName: string;
    days: number;
    checkIn: string;
    checkOut: string;
    brn?: string[] | null; // Added for BRN
  }>;
  movementDetails: Array<{
    sr: number;
    route: string;
    date: string;
    time: string;
    from: string; // City name
    fromLocation: string; // Specific location (Airport, Hotel, Ziyarat)
    to: string; // City name
    toLocation: string; // Specific location (Airport, Hotel, Ziyarat)
  }>;
  flightDetails: Array<{
    type: string;
    date: string;
    carrier: string;
    number: string;
    from: string;
    to: string;
    etd: string;
    eta: string;
  }>;
}

export function generateVoucherPDF(data: VoucherPdfData): void {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
  });
  const pageWidth = doc.internal.pageSize.getWidth(); // A4 = 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // A4 = 297mm
  const margin = 12;
  const availableWidth = pageWidth - 2 * margin; // 210 - 24 = 186mm available for content
  let yPos = 0;

  // Modern Professional Color Palette
  const primaryColor = [15, 23, 42]; // Deep navy/slate (modern professional)
  const accentColor = [59, 130, 246]; // Bright blue (trustworthy)
  const secondaryColor = [139, 92, 246]; // Purple accent (premium feel)
  const successColor = [34, 197, 94]; // Green (positive)
  const textPrimary = [30, 41, 59]; // Dark slate for text
  const textSecondary = [100, 116, 139]; // Medium gray for secondary text
  const bgLight = [248, 250, 252]; // Very light gray for backgrounds
  const borderColor = [226, 232, 240]; // Light border
  const headerGradientStart = [15, 23, 42]; // Deep navy
  const headerGradientEnd = [30, 58, 138]; // Medium blue

  // Helper function to format date (DD-MM-YYYY)
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return 'N/A';
    }
  };

  // Helper function to format time (HH:MM)
  const formatTime = (timeString: string) => {
    if (!timeString) return 'N/A';
    if (timeString.includes('T')) {
      const timePart = timeString.split('T')[1];
      return timePart ? timePart.slice(0, 5) : 'N/A';
    }
    if (timeString.includes(':')) {
      return timeString.slice(0, 5);
    }
    return 'N/A';
  };

  // Helper to draw gradient (simulated with multiple rectangles)
  const drawGradient = (x: number, y: number, w: number, h: number) => {
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      const ratio = i / steps;
      const r = Math.round(headerGradientStart[0] + (headerGradientEnd[0] - headerGradientStart[0]) * ratio);
      const g = Math.round(headerGradientStart[1] + (headerGradientEnd[1] - headerGradientStart[1]) * ratio);
      const b = Math.round(headerGradientStart[2] + (headerGradientEnd[2] - headerGradientStart[2]) * ratio);
      doc.setFillColor(r, g, b);
      doc.rect(x, y + (h / steps) * i, w, h / steps, 'F');
    }
  };

  // Helper to draw card with shadow effect
  const drawCard = (x: number, y: number, w: number, h: number, radius: number = 4) => {
    // Shadow (offset slightly - using light gray instead of alpha)
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(x + 0.5, y + 0.5, w, h, radius, radius, 'F');
    // Card background
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, w, h, radius, radius, 'FD');
  };

  // ========== MODERN HEADER SECTION ==========
  // Gradient header background
  drawGradient(0, 0, pageWidth, 55);
  
  // Decorative top border
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(0, 0, pageWidth, 2, 'F');

  yPos = 20;

  // Company Name in Header (White Text with better spacing)
  const providerName = data.umrahVisaProvider?.partyName || 'UMRA SERVICES';
  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(providerName.toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
  yPos += 9;

  // Address (White Text, Smaller) with icon
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const address = data.umrahVisaProvider?.address || 'JEDDAH - SAUDI ARABIA';
  doc.text(`📍 ${address.toUpperCase()}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 7;

  // Contact Info (White Text, with better layout)
  doc.setFontSize(9);
  const contactNumber = data.umrahVisaProvider?.contactNumber || data.umrahVisaProvider?.whatsappNumber || '+966 538634100';
  const email = data.umrahVisaProvider?.email || 'info@test.com.sa';
  doc.text(`📞 ${contactNumber}`, pageWidth / 2 - 25, yPos);
  doc.setTextColor(220, 220, 220); // Lighter white for separator
  doc.text('•', pageWidth / 2, yPos);
  doc.setTextColor(255, 255, 255);
  doc.text(`✉ ${email}`, pageWidth / 2 + 25, yPos);
  
  // ========== RESERVATION DETAILS SECTION ==========
  yPos = 65;
  
  // Modern Card Design with shadow
  const cardHeight = 52;
  drawCard(margin, yPos, pageWidth - 2 * margin, cardHeight, 6);
  
  // Accent bar on left (modern gradient effect)
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.roundedRect(margin, yPos, 5, cardHeight, 0, 0, 'F');

  // Card title with icon
  yPos += 10;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('📋 RESERVATION DETAILS', margin + 10, yPos);

  // Divider line under title
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.3);
  doc.line(margin + 10, yPos + 2, pageWidth - margin - 10, yPos + 2);

  // Card content - Modern 3 columns layout with better spacing
  yPos += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  const leftColX = margin + 12;
  const middleColX = margin + 75;
  const rightColX = margin + 138;
  const lineHeight = 7.5;

  // Left Column
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textSecondary[0], textSecondary[1], textSecondary[2]);
  doc.setFontSize(8);
  doc.text('RESERVATION NUMBER', leftColX, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(textPrimary[0], textPrimary[1], textPrimary[2]);
  doc.text(data.reservationNumber || data.voucherNumber || 'N/A', leftColX, yPos + lineHeight);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(textSecondary[0], textSecondary[1], textSecondary[2]);
  doc.text('GUEST NAME', leftColX, yPos + lineHeight * 2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(textPrimary[0], textPrimary[1], textPrimary[2]);
  doc.text(data.guestName || 'N/A', leftColX, yPos + lineHeight * 3);

  // Middle Column
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(textSecondary[0], textSecondary[1], textSecondary[2]);
  doc.text('NUMBER OF PASSENGERS', middleColX, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(textPrimary[0], textPrimary[1], textPrimary[2]);
  doc.text(`ADT: ${data.paxCount} | CHD: 0 | INF: 0 = ${data.paxCount}`, middleColX, yPos + lineHeight);

  // Right Column
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(textSecondary[0], textSecondary[1], textSecondary[2]);
  doc.text('RESERVATION DATE', rightColX, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(textPrimary[0], textPrimary[1], textPrimary[2]);
  doc.text(formatDate(data.reservationDate), rightColX, yPos + lineHeight);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(textSecondary[0], textSecondary[1], textSecondary[2]);
  doc.text('GUEST MOBILE', rightColX, yPos + lineHeight * 2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(textPrimary[0], textPrimary[1], textPrimary[2]);
  doc.text(data.guestMobile || 'N/A', rightColX, yPos + lineHeight * 3);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(textSecondary[0], textSecondary[1], textSecondary[2]);
  doc.text('GROUP CODE', rightColX, yPos + lineHeight * 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(textPrimary[0], textPrimary[1], textPrimary[2]);
  doc.text(data.groupCode || 'N/A', rightColX, yPos + lineHeight * 5);

  yPos = 125;

  // ========== HOTEL SCHEDULES TABLE ==========
  if (data.hotelSchedules && data.hotelSchedules.length > 0) {
    // Modern Section Title with icon
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('🏨 HOTEL SCHEDULES', margin, yPos);
    yPos += 6;

    // Prepare hotel data for autotable
    const hotelRows = data.hotelSchedules.map((hotel) => [
      hotel.number.toString(),
      hotel.location || 'N/A',
      hotel.hotelName || 'N/A',
      hotel.days.toString(),
      formatDate(hotel.checkIn),
      formatDate(hotel.checkOut),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Location', 'Hotel Name', 'Days', 'Check In', 'Check Out']],
      body: hotelRows,
      theme: 'striped',
      tableWidth: availableWidth,
      headStyles: {
        fillColor: [primaryColor[0], primaryColor[1], primaryColor[2]],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'left',
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [textPrimary[0], textPrimary[1], textPrimary[2]],
        overflow: 'linebreak',
      },
      alternateRowStyles: {
        fillColor: [bgLight[0], bgLight[1], bgLight[2]],
      },
      margin: { left: margin, right: margin },
      styles: {
        cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
        lineWidth: 0.2,
        lineColor: [borderColor[0], borderColor[1], borderColor[2]],
        overflow: 'linebreak',
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' }, // #
        1: { cellWidth: 35, halign: 'left' }, // Location
        2: { cellWidth: 50, halign: 'left' }, // Hotel Name
        3: { cellWidth: 20, halign: 'center' }, // Days
        4: { cellWidth: 32, halign: 'left' }, // Check In
        5: { cellWidth: 31, halign: 'left' }, // Check Out (total = 180mm)
      },
    });

    yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 12 : yPos + 50;
  }

  // ========== MOVEMENT DETAILS TABLE ==========
  if (data.movementDetails && data.movementDetails.length > 0) {
    // Modern Section Title with icon
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('🚌 MOVEMENT DETAILS', margin, yPos);
    yPos += 6;

    // Prepare movement data for autotable - Match screenshot format
    // Format: "City, Specific Location" (e.g., "Jeddah, Jeddah Airport" or "Makkah, ROYAL BAKKAH")
    const movementRows = data.movementDetails.map((movement) => [
      movement.sr.toString(),
      movement.route || 'Auto',
      formatDate(movement.date),
      formatTime(movement.time),
      `${movement.from || ''}${movement.fromLocation ? `, ${movement.fromLocation}` : ''}`.trim() || 'N/A',
      `${movement.to || ''}${movement.toLocation ? `, ${movement.toLocation}` : ''}`.trim() || 'N/A',
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Sr', 'Route', 'Date', 'Time', 'From Location', 'To Location']],
      body: movementRows,
      theme: 'striped',
      tableWidth: availableWidth,
      headStyles: {
        fillColor: [primaryColor[0], primaryColor[1], primaryColor[2]],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'left',
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [textPrimary[0], textPrimary[1], textPrimary[2]],
        overflow: 'linebreak',
      },
      alternateRowStyles: {
        fillColor: [bgLight[0], bgLight[1], bgLight[2]],
      },
      margin: { left: margin, right: margin },
      styles: {
        cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
        lineWidth: 0.2,
        lineColor: [borderColor[0], borderColor[1], borderColor[2]],
        overflow: 'linebreak',
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' }, // Sr
        1: { cellWidth: 25, halign: 'center' }, // Route
        2: { cellWidth: 28, halign: 'left' }, // Date
        3: { cellWidth: 22, halign: 'center' }, // Time
        4: { cellWidth: 48, halign: 'left' }, // From Location
        5: { cellWidth: 45, halign: 'left' }, // To Location (total = 180mm)
      },
    });

    yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 12 : yPos + 50;
  }

  // Check if we need a new page for flight details
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = margin + 10;
  }

  // ========== FLIGHT DETAILS TABLE ==========
  if (data.flightDetails && data.flightDetails.length > 0) {
    // Modern Section Title with icon
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('✈️ FLIGHT DETAILS', margin, yPos);
    yPos += 6;

    // Prepare flight data for autotable
    const flightRows = data.flightDetails.map((flight) => [
      flight.type || 'N/A',
      formatDate(flight.date),
      flight.carrier || 'N/A',
      flight.number || 'N/A',
      flight.from || 'N/A',
      flight.to || 'N/A',
      formatTime(flight.etd),
      formatTime(flight.eta),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [
        ['Type', 'Date', 'Carrier', 'Number', 'From', 'To', 'ETD', 'ETA'],
      ],
      body: flightRows,
      theme: 'striped',
      tableWidth: availableWidth,
      headStyles: {
        fillColor: [primaryColor[0], primaryColor[1], primaryColor[2]],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'left',
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: [textPrimary[0], textPrimary[1], textPrimary[2]],
        overflow: 'linebreak',
      },
      alternateRowStyles: {
        fillColor: [bgLight[0], bgLight[1], bgLight[2]],
      },
      margin: { left: margin, right: margin },
      styles: {
        cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
        lineWidth: 0.2,
        lineColor: [borderColor[0], borderColor[1], borderColor[2]],
        overflow: 'linebreak',
      },
      columnStyles: {
        0: { cellWidth: 16, halign: 'center' }, // Type
        1: { cellWidth: 26, halign: 'left' }, // Date
        2: { cellWidth: 18, halign: 'center' }, // Carrier
        3: { cellWidth: 20, halign: 'center' }, // Number
        4: { cellWidth: 28, halign: 'center' }, // From
        5: { cellWidth: 28, halign: 'center' }, // To
        6: { cellWidth: 21, halign: 'center' }, // ETD
        7: { cellWidth: 21, halign: 'center' }, // ETA (total = 178mm)
      },
    });

    yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 12 : yPos + 50;
  }

  // ========== MODERN FOOTER ==========
  const footerY = pageHeight - 18;

  // Footer background with subtle gradient
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.rect(0, footerY - 8, pageWidth, pageHeight - footerY + 8, 'F');

  // Footer divider line (more subtle)
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 6, pageWidth - margin, footerY - 6);

  // Footer text with better styling
  yPos = footerY - 2;
  doc.setFontSize(8);
  doc.setTextColor(textSecondary[0], textSecondary[1], textSecondary[2]);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'Generated by NuSync',
    pageWidth / 2,
    yPos,
    { align: 'center' }
  );

  yPos += 4;
  doc.setFontSize(7);
  // Use lighter gray for secondary footer text
  doc.setTextColor(textSecondary[0] + 20, textSecondary[1] + 20, textSecondary[2] + 20);
  doc.text(
    'This document is system generated. Terms and conditions apply.',
    pageWidth / 2,
    yPos,
    { align: 'center' }
  );

  // ========== SAVE PDF ==========
  const fileName = `Voucher_${data.voucherNumber}_${data.guestName
    .replace(/\s+/g, '_')
    .slice(0, 20)}.pdf`;
  doc.save(fileName);
}
