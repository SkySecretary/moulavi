import { Router, Request, Response } from 'express';
import { QuotationService } from '../services/quotationService';
import { authenticate } from '../middleware/auth';

const router = Router();

// Apply auth middleware to all quotation routes
router.use(authenticate);

// Create Quotation
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const quotation = await QuotationService.createQuotation(req.body, userId);
    res.status(201).json({ success: true, quotation });
  } catch (error: any) {
    console.error('Error creating quotation:', error);
    res.status(400).json({ error: error.message || 'Failed to create quotation' });
  }
});

// List Quotations
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await QuotationService.getQuotations({
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      search: req.query.search as string,
      status: req.query.status as string,
      customerType: req.query.customerType as string,
      partyId: req.query.partyId as string,
    });
    res.json(result);
  } catch (error: any) {
    console.error('Error fetching quotations:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch quotations' });
  }
});

// Get Quotation by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const quotation = await QuotationService.getQuotationById(req.params.id);
    res.json(quotation);
  } catch (error: any) {
    console.error('Error fetching quotation:', error);
    res.status(404).json({ error: error.message || 'Quotation not found' });
  }
});

// Update Quotation
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const quotation = await QuotationService.updateQuotation(req.params.id, req.body, userId);
    res.json({ success: true, quotation });
  } catch (error: any) {
    console.error('Error updating quotation:', error);
    res.status(400).json({ error: error.message || 'Failed to update quotation' });
  }
});

// Delete Quotation
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await QuotationService.deleteQuotation(req.params.id);
    res.json({ success: true, message: 'Quotation deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting quotation:', error);
    res.status(400).json({ error: error.message || 'Failed to delete quotation' });
  }
});

// Duplicate Quotation
router.post('/:id/duplicate', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const duplicate = await QuotationService.duplicateQuotation(req.params.id, userId);
    res.status(201).json({ success: true, quotation: duplicate });
  } catch (error: any) {
    console.error('Error duplicating quotation:', error);
    res.status(400).json({ error: error.message || 'Failed to duplicate quotation' });
  }
});

// Download PDF
router.get('/:id/pdf', async (req: Request, res: Response) => {
  try {
    const hideBreakdown = req.query.hideBreakdown === 'true';
    const { buffer, quotation } = await QuotationService.generatePdf(req.params.id, { hideBreakdown });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="Quotation_${quotation.quotationNumber}.pdf"`
    );
    res.send(buffer);
  } catch (error: any) {
    console.error('Error generating quotation PDF:', error);
    res.status(500).json({ error: error.message || 'Failed to generate PDF' });
  }
});

// Email Quotation PDF
router.post('/:id/email', async (req: Request, res: Response) => {
  try {
    const { to, subject, message } = req.body;
    const result = await QuotationService.sendEmail(req.params.id, { to, subject, message });
    res.json(result);
  } catch (error: any) {
    console.error('Error emailing quotation:', error);
    res.status(400).json({ error: error.message || 'Failed to send email' });
  }
});

// WhatsApp Quotation PDF
router.post('/:id/whatsapp', async (req: Request, res: Response) => {
  try {
    const { to, message } = req.body;
    const result = await QuotationService.sendWhatsApp(req.params.id, { to, message });
    res.json(result);
  } catch (error: any) {
    console.error('Error sending quotation via WhatsApp:', error);
    res.status(400).json({ error: error.message || 'Failed to send WhatsApp message' });
  }
});

// Convert Quotation to Booking
router.post('/:id/convert', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const booking = await QuotationService.convertToBooking(req.params.id, userId, req.body);
    res.status(201).json({
      success: true,
      message: `Quotation successfully converted to booking #${booking.bookingReference}`,
      booking,
    });
  } catch (error: any) {
    console.error('Error converting quotation to booking:', error);
    res.status(400).json({ error: error.message || 'Failed to convert quotation to booking' });
  }
});

export default router;
