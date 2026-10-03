import axios from 'axios';
import dotenv from 'dotenv';
import prisma from '../lib/prisma';

dotenv.config();

// WhatsApp configuration constants (legacy)
const WHATSAPP_CONFIG = {
  apiUrl: process.env.WHATSAPP_API_URL || 'https://wa.smsidea.com/api/v1/sendMessage',
  imageApiUrl: process.env.WHATSAPP_IMAGE_API_URL || 'https://wa.smsidea.com/api/v1/sendImage',
  apiKey: process.env.WHATSAPP_API_KEY,
  instanceId: process.env.WHATSAPP_INSTANCE_ID,
  requestMethod: (process.env.WHATSAPP_REQUEST_METHOD || 'POST').toUpperCase(), // POST or GET
} as const;

// Debug function to log full configuration (masked)
const logWhatsAppConfig = () => {
  const logPrefix = '[WHATSAPP-CONFIG]';
  console.log(`${logPrefix} ========== WhatsApp Configuration Check ==========`);
  console.log(`${logPrefix} API URL: ${WHATSAPP_CONFIG.apiUrl}`);
  console.log(`${logPrefix} API Key: ${WHATSAPP_CONFIG.apiKey ? `${WHATSAPP_CONFIG.apiKey.substring(0, 10)}...${WHATSAPP_CONFIG.apiKey.substring(WHATSAPP_CONFIG.apiKey.length - 4)} (masked)` : '❌ NOT SET'}`);
  console.log(`${logPrefix} Instance ID: ${WHATSAPP_CONFIG.instanceId || '❌ NOT SET'}`);
  console.log(`${logPrefix} ==================================================`);
};

// WhatsApp message templates
const WHATSAPP_TEMPLATES = {
  credentials: (name: string, email: string, password: string, frontendUrl: string) => `
🔐 *MOULAVI ERP - Account Credentials*

Dear ${name},

Welcome to NuSync! Your account has been successfully created.

📧 *Email:* ${email}
🔑 *Password:* ${password}

⚠️ *Security Notice:* Please change your password after your first login.

🌐 *Login Link:* ${frontendUrl}/

📞 *Support:* Info@moulavi.com
📱 *Phone:* +91-XXX-XXX-XXXX

Thank you for choosing NuSync!
  `.trim(),

  serviceConfirmation: (name: string, serviceType: string, bookingId: string) => `
✅ *MOULAVI ERP - Service Request Confirmation*

Dear ${name},

Your ${serviceType} service request has been successfully submitted!

📋 *Booking ID:* ${bookingId}
📅 *Submitted:* ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}

📊 *Status:* Under Review
⏰ *Processing Time:* 24-48 hours

🔄 *What happens next?*
✓ Document verification
✓ Processing updates
✓ Final confirmation
✓ Support assistance

📞 *Need Help?*
📧 Email: Info@moulavi.com
📱 Phone: +91-XXX-XXX-XXXX

Thank you for choosing NuSync!
  `.trim(),

  iqamaConfirmation: (name: string, bookingDetails?: { passengerCount?: number; passengers?: string[]; bookingReference?: string; groupNumber?: string; }) => {
    const groupCode = bookingDetails?.groupNumber || 'N/A';
    const bookingRef = bookingDetails?.bookingReference || 'N/A';

    return `
🌙 Greetings from Umra Company, Saudi Arabia 🇸🇦

Dear *${name}*,

Your family has applied for an Umrah Visa under your Iqama sponsorship.

🧾 *Booking Group Code:* ${groupCode}

🔖 *Booking Reference:* ${bookingRef}

✅ *Action Required:*

Please log in to your Absher account and approve the pending request at your earliest convenience so that we can proceed with issuing the Umrah visas.

📲 *Steps to Approve:*

1️⃣ Log in to Absher (Individual Account)
2️⃣ Go to My Services (خدماتي)
3️⃣ Select Inquiries (الاستعلامات)
4️⃣ Open General Services (الخدمات العامة)
5️⃣ Tap Qabul Services (قبول الخدمات)
6️⃣ Review the pending request and click Accept (قبول)

📞 If you need any assistance, please contact your travel agency.

🤲 Thank you for your prompt cooperation.
    `.trim();
  },

  packageExpired: (hostName: string, hostIqamaNo: string, pilgrimDetails: string) => `
🏢 NUSUK - OFFICIAL SYSTEM UPDATE 🏢

Dear ${hostName},
(Host Iqama No.: ${hostIqamaNo})

Our records indicate that your hosted pilgrim's Umrah visa program duration has expired. An immediate system update is required through your Absher account to maintain compliance.

👤 Pilgrim Details:
${pilgrimDetails}

⚠️ IMPORTANT NOTICE:
Please confirm the return date to synchronize the system. Failure to proceed (or replying NO) may result in restrictions or delays for your future Umrah visa issuances.

➡️ To authorize this update, please reply to this message with: YES
  `.trim(),
} as const;

// Utility function to format phone number
const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Add country code if not present (assuming India +91)
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }
  
  // If already has country code, return as is
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return cleaned;
  }
  
  return cleaned;
};

// Default Cloud API Template names
const DEFAULT_CLOUD_TEMPLATES: Record<string, string> = {
  credentials: 'account_credentials',
  service_confirmation: 'service_confirmation',
  movement_update: 'movement_update',
  driver_update: 'driver_details_update',
  iqama_confirmation: 'absher_approval_request',
  package_expired: 'package_expired_alert',
  custom: 'hello_world',
};

// Utility function to interpolate placeholders in custom message templates
export const interpolateWhatsAppTemplate = (templateText: string, data?: Record<string, any>): string => {
  if (!data || !templateText) return templateText || '';
  let result = templateText;
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`\\{${key}\\}`, 'gi');
    result = result.replace(regex, String(value ?? ''));
  }
  return result;
};

// Resolve the active WhatsApp channel for a specific use case
const getChannelForUseCase = async (useCase: string) => {
  try {
    const mapping = await prisma.whatsappUseCaseMapping.findUnique({
      where: { useCase },
      include: { channel: true }
    });
    
    if (mapping && mapping.channel && mapping.channel.isActive) {
      return { channel: mapping.channel, mapping };
    }
  } catch (err) {
    console.error(`[WHATSAPP] Error resolving channel for usecase '${useCase}':`, err);
  }
  return null;
};

// Find any active fallback channel
const getFallbackChannel = async () => {
  try {
    const channel = await prisma.whatsappChannel.findFirst({
      where: { isActive: true }
    });
    return channel;
  } catch (err) {
    console.error('[WHATSAPP] Error finding fallback channel:', err);
  }
  return null;
};

const sendWhatsAppMessage = async (
  to: string, 
  message: string, 
  useCase: string = 'custom',
  dynamicData?: Record<string, any>
): Promise<void> => {
  const startTime = Date.now();
  const logPrefix = `[WHATSAPP-${useCase.toUpperCase()}]`;

  console.log(`${logPrefix} ========== START: Sending WhatsApp Message ==========`);
  console.log(`${logPrefix} Timestamp: ${new Date().toISOString()}`);
  console.log(`${logPrefix} Original Recipient: ${to}`);

  // Check if mapping exists and is disabled
  let mapping: any = null;
  try {
    mapping = await prisma.whatsappUseCaseMapping.findUnique({
      where: { useCase },
      include: { channel: true }
    });
    if (mapping && !mapping.isActive) {
      console.log(`${logPrefix} Notification for use case '${useCase}' is explicitly disabled in settings. Skipping dispatch.`);
      return;
    }
  } catch (err) {
    console.error(`${logPrefix} Error checking mapping status:`, err);
  }

  const isGroupId = to.includes('@');
  const formattedNumber = isGroupId ? to : formatPhoneNumber(to);
  console.log(`${logPrefix} Formatted Recipient: ${formattedNumber}`);
  
  // Resolve channel configuration
  let channel = mapping?.channel && mapping.channel.isActive ? mapping.channel : null;
  if (!channel) {
    console.log(`${logPrefix} No specific channel mapped/active for use case '${useCase}'. Looking for fallback active channel...`);
    channel = await getFallbackChannel();
  }

  // If a channel from database is resolved, dispatch via Linalapro Multichannel API
  if (channel) {
    console.log(`${logPrefix} Using Database Channel Profile: ${channel.name} (${channel.id}) [Cloud API: ${channel.isCloudApi}]`);
    
    // Clean phone number (Linalapro expects format like +911234567890 or +1234567890)
    let linalaNumber = formattedNumber;
    if (!isGroupId) {
      const cleanNumber = formattedNumber.replace(/\D/g, '');
      linalaNumber = cleanNumber.startsWith('+') ? cleanNumber : `+${cleanNumber}`;
    }
    
    const headers = {
      'x-api-key': channel.apiKey.trim(),
      'x-api-secret': channel.apiSecret.trim(),
      'x-channel-id': channel.channelId.trim(),
      'Content-Type': 'application/json',
    };

    const isCloudApi = mapping?.isCloudApi !== null && mapping?.isCloudApi !== undefined
      ? mapping.isCloudApi
      : channel.isCloudApi;

    let targetUrl: string;
    let payload: any;

    if (isCloudApi) {
      // Cloud API Template dispatch format
      const templateName = mapping?.templateName ? mapping.templateName.trim() : (DEFAULT_CLOUD_TEMPLATES[useCase] || 'hello_world');
      const language = mapping?.language ? mapping.language.trim() : 'en_US';
      targetUrl = `${channel.baseUrl.trim().replace(/\/$/, '')}/messages/template`;
      payload = {
        to: linalaNumber,
        templateName,
        language,
      };
      console.log(`${logPrefix} Mode: Cloud API Template (${templateName}, lang: ${language})`);
    } else {
      // Standard QR Code / Text message format
      let finalMessage = message;
      if (mapping?.customMessage && dynamicData) {
        finalMessage = interpolateWhatsAppTemplate(mapping.customMessage, dynamicData);
      }
      targetUrl = `${channel.baseUrl.trim().replace(/\/$/, '')}/messages`;
      payload = {
        to: linalaNumber,
        message: finalMessage,
      };
      console.log(`${logPrefix} Mode: QR Code / Text message (${finalMessage.length} chars)`);
    }
    
    console.log(`${logPrefix} Request URL: ${targetUrl}`);
    console.log(`${logPrefix} Request Headers (masked): x-api-key: ${channel.apiKey.substring(0, 5)}..., x-channel-id: ${channel.channelId}`);
    console.log(`${logPrefix} Request Payload:`, JSON.stringify(payload));

    try {
      const response = await axios.post(targetUrl, payload, {
        headers,
        timeout: 15000,
      });

      const duration = Date.now() - startTime;
      console.log(`${logPrefix} ✓ API Request completed in ${duration}ms`);
      console.log(`${logPrefix} Response Status: ${response.status} ${response.statusText}`);
      console.log(`${logPrefix} Response Data:`, JSON.stringify(response.data));

      if (response.status === 200 || response.status === 201 || response.data?.success || response.data?.status === 'success') {
        console.log(`${logPrefix} ✅ SUCCESS: WhatsApp message sent successfully to ${linalaNumber}`);
        console.log(`${logPrefix} ========== END: Message Sent Successfully ==========`);
        return;
      } else {
        throw new Error(response.data?.message || response.data?.error || 'API returned non-success response');
      }
    } catch (error: any) {
      console.error(`${logPrefix} ❌ Linalapro API request failed:`, error?.message);
      if (error?.response) {
        console.error(`${logPrefix} Response Data:`, JSON.stringify(error.response.data));
      }
      throw new Error(`Multichannel API Error: ${error?.message || 'Unknown error'}`);
    }
  }

  // Fallback to legacy SMSIdea configuration
  console.log(`${logPrefix} No database channels configured. Falling back to legacy .env SMSIdea configuration...`);
  logWhatsAppConfig();
  
  if (!WHATSAPP_CONFIG.apiKey) {
    console.error(`${logPrefix} ❌ ERROR: Legacy WhatsApp API key not configured`);
    throw new Error('WhatsApp API key not configured');
  }

  if (!WHATSAPP_CONFIG.instanceId) {
    console.error(`${logPrefix} ❌ ERROR: Legacy WhatsApp Instance ID not configured`);
    throw new Error('WhatsApp Instance ID not configured');
  }

  const payload = {
    key: WHATSAPP_CONFIG.apiKey,
    to: formattedNumber,
    message: message,
    IsUrgent: false,
    isGroupMsg: isGroupId,
    IsFailMessage: false,
    SendingMessageType: '1'
  };

  try {
    let response;
    if (WHATSAPP_CONFIG.requestMethod === 'GET') {
      const params = new URLSearchParams();
      Object.entries(payload).forEach(([key, value]) => {
        params.append(key, String(value));
      });
      const urlWithParams = `${WHATSAPP_CONFIG.apiUrl}?${params.toString()}`;
      
      response = await axios.get(urlWithParams, {
        timeout: 10000,
        validateStatus: (status) => status < 500,
      });
    } else {
      response = await axios.post(WHATSAPP_CONFIG.apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
        validateStatus: (status) => status < 500,
      });
    }

    const requestDuration = Date.now() - startTime;
    console.log(`${logPrefix} ✓ Legacy API Request completed in ${requestDuration}ms`);
    console.log(`${logPrefix} Response Status: ${response.status} ${response.statusText}`);

    if (response.data.status === 'success' || response.data.ErrorCode === '000') {
      console.log(`${logPrefix} ✅ SUCCESS: WhatsApp message sent successfully to ${formattedNumber} via legacy API`);
      console.log(`${logPrefix} ========== END: Message Sent Successfully ==========`);
    } else {
      const errorMessage = response.data.ErrorMessage || response.data.message || 'Unknown error';
      throw new Error(`Legacy WhatsApp API Error: ${errorMessage}`);
    }
  } catch (error: any) {
    console.error(`${logPrefix} ❌ Legacy Exception:`, error?.message);
    throw error;
  }
};

// Send credentials WhatsApp message
export const sendCredentialsWhatsApp = async (
  phoneNumber: string,
  name: string,
  email: string,
  password: string
): Promise<void> => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const message = WHATSAPP_TEMPLATES.credentials(name, email, password, frontendUrl);
  
  try {
    await sendWhatsAppMessage(phoneNumber, message, 'credentials', {
      name,
      email,
      password,
      frontendUrl,
    });
  } catch (error: any) {
    console.error('[WHATSAPP] sendCredentialsWhatsApp failed:', error?.message);
    throw error;
  }
};

// Send service confirmation WhatsApp message
export const sendServiceConfirmationWhatsApp = async (
  phoneNumber: string,
  name: string,
  serviceType: string,
  bookingId: string
): Promise<void> => {
  const message = WHATSAPP_TEMPLATES.serviceConfirmation(name, serviceType, bookingId);
  
  try {
    await sendWhatsAppMessage(phoneNumber, message, 'service_confirmation', {
      name,
      serviceType,
      bookingId,
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    });
  } catch (error: any) {
    console.error('[WHATSAPP] sendServiceConfirmationWhatsApp failed:', error?.message);
    throw error;
  }
};

// Send custom WhatsApp message
export const sendCustomWhatsApp = async (
  phoneNumber: string,
  message: string,
  dynamicData?: Record<string, any>
): Promise<void> => {
  try {
    await sendWhatsAppMessage(phoneNumber, message, 'custom', dynamicData);
  } catch (error: any) {
    console.error('[WHATSAPP] sendCustomWhatsApp failed:', error?.message);
    throw error;
  }
};

// Send movement update WhatsApp message
export const sendMovementUpdateWhatsApp = async (
  phoneNumber: string,
  partyName: string,
  voucherNumber: string,
  movementDetails: {
    date: string;
    time: string;
    fromLocation: string;
    toLocation: string;
    driverDetails1: string;
    driverDetails2: string;
    vehicleNumber: string;
  }
): Promise<void> => {
  const message = `🚗 *Movement Update - Voucher ${voucherNumber}*

Dear ${partyName},

Your movement details have been updated:

📅 *Date:* ${movementDetails.date}
⏰ *Time:* ${movementDetails.time || 'N/A'}
📍 *From:* ${movementDetails.fromLocation || 'N/A'}
📍 *To:* ${movementDetails.toLocation || 'N/A'}
👤 *Driver 1:* ${movementDetails.driverDetails1 || 'N/A'}
👤 *Driver 2:* ${movementDetails.driverDetails2 || 'N/A'}
🚗 *Vehicle Number:* ${movementDetails.vehicleNumber || 'N/A'}

Thank you for choosing our services!`;

  try {
    await sendWhatsAppMessage(phoneNumber, message, 'movement_update', {
      partyName,
      name: partyName,
      voucherNumber,
      date: movementDetails.date,
      time: movementDetails.time || 'N/A',
      fromLocation: movementDetails.fromLocation || 'N/A',
      toLocation: movementDetails.toLocation || 'N/A',
      driverDetails1: movementDetails.driverDetails1 || 'N/A',
      driverDetails2: movementDetails.driverDetails2 || 'N/A',
      vehicleNumber: movementDetails.vehicleNumber || 'N/A',
    });
  } catch (error: any) {
    console.error('[WHATSAPP] sendMovementUpdateWhatsApp failed:', error?.message);
    throw error;
  }
};

// Send iqama confirmation WhatsApp message
export const sendIqamaConfirmationWhatsApp = async (
  phoneNumber: string,
  name: string,
  bookingDetails?: { passengerCount?: number; passengers?: string[]; bookingReference?: string; groupNumber?: string; }
): Promise<void> => {
  const message = WHATSAPP_TEMPLATES.iqamaConfirmation(name, bookingDetails);

  try {
    await sendWhatsAppMessage(phoneNumber, message, 'iqama_confirmation', {
      name,
      groupCode: bookingDetails?.groupNumber || 'N/A',
      groupNumber: bookingDetails?.groupNumber || 'N/A',
      bookingRef: bookingDetails?.bookingReference || 'N/A',
      bookingReference: bookingDetails?.bookingReference || 'N/A',
      passengerCount: bookingDetails?.passengerCount || 0,
    });
  } catch (error: any) {
    console.error('[WHATSAPP] sendIqamaConfirmationWhatsApp failed:', error?.message);
    throw error;
  }
};

// Send package expired WhatsApp message
export const sendPackageExpiredWhatsApp = async (
  phoneNumber: string,
  hostName: string,
  hostIqamaNo: string,
  pilgrimDetails: string
): Promise<void> => {
  const message = WHATSAPP_TEMPLATES.packageExpired(hostName, hostIqamaNo, pilgrimDetails);

  try {
    await sendWhatsAppMessage(phoneNumber, message, 'package_expired', {
      hostName,
      name: hostName,
      hostIqamaNo,
      pilgrimDetails,
    });
  } catch (error: any) {
    console.error('[WHATSAPP] sendPackageExpiredWhatsApp failed:', error?.message);
    throw error;
  }
};

// Send driver update WhatsApp message
export const sendDriverUpdateWhatsApp = async (
  phoneNumber: string,
  data: {
    voucherNumber: string;
    agencyName: string;
    routeName: string;
    date: string;
    reportingTime: string;
    driverName: string;
    driverMobile: string;
    transportCompany: string;
  }
): Promise<void> => {
  const company = data.transportCompany?.trim();
  const welcomeHeader = company ? `*Welcome to ${company}*\n═══════════════════` : `═══════════════════`;
  const signatureFooter = company ? `*${company}*\n*Powered by NuSync*` : `*Powered by NuSync*`;

  const message = `${welcomeHeader}
🔹 *Voucher No:* ${data.voucherNumber}
🏢 *Agency*:
${data.agencyName}

🛣️ *Route:* ${data.routeName}

📅 *Service Date:* ${data.date}
🕗 *Reporting Time:* ${data.reportingTime}

👨✈️ *Driver:* ${data.driverName}
📞 *Mobile:* ${data.driverMobile}

═══════════════════
⚠️ *TRAVEL GUIDELINES*
📍 *Before Pickup*
Please contact the driver in advance and send
• Hotel Name
• Hotel Location

✈️ *Airport Arrivals*
🚌 Vehicle waiting time:
⏳ Maximum *2 Hours* after flight landing.

🏙️ *City Transfers*
🚌 Vehicle waiting time:
⏳ Maximum *1 Hour*.

🕌 *Makkah & Madinah Ziyarat*
🕖 Pickup: *07:00 – 08:00 AM*
🕣 Departure: *08:30 AM Sharp*

❗ Guests not present at departure time will be marked as *NO SHOW*.

🔄 *Booking Amendments*
Any changes or cancellations must be requested at least *48 Hours* before the scheduled service.
════════════════
🤲 We wish you a safe and blessed journey.

${signatureFooter}`.trim();

  try {
    await sendWhatsAppMessage(phoneNumber, message, 'driver_update', {
      voucherNumber: data.voucherNumber,
      agencyName: data.agencyName,
      name: data.agencyName,
      routeName: data.routeName,
      date: data.date,
      reportingTime: data.reportingTime,
      driverName: data.driverName,
      driverMobile: data.driverMobile,
      transportCompany: data.transportCompany,
    });
  } catch (error: any) {
    console.error('[WHATSAPP] sendDriverUpdateWhatsApp failed:', error?.message);
    throw error;
  }
};

// Send WhatsApp image message
export const sendWhatsAppImage = async (
  phoneNumber: string,
  imageUrl: string,
  caption?: string,
  filename?: string
): Promise<void> => {
  const startTime = Date.now();
  const logPrefix = '[WHATSAPP-IMAGE]';
  
  console.log(`${logPrefix} ========== START: Sending WhatsApp Image ==========`);
  console.log(`${logPrefix} Timestamp: ${new Date().toISOString()}`);
  console.log(`${logPrefix} Phone Number: ${phoneNumber}`);
  console.log(`${logPrefix} Image URL: ${imageUrl}`);
  console.log(`${logPrefix} Caption: ${caption || 'No caption'}`);

  // Resolve channel profile
  let channel = await getChannelForUseCase('custom');
  if (!channel) {
    channel = await getFallbackChannel();
  }

  // If we have a multichannel profile configured, we send as text (caption + URL)
  if (channel) {
    console.log(`${logPrefix} Using Multichannel API for Image. Sending as text with link...`);
    const message = caption ? `${caption}\n\n${imageUrl}` : imageUrl;
    await sendWhatsAppMessage(phoneNumber, message, 'custom');
    return;
  }

  // Fallback to legacy SMSIdea image sending
  console.log(`${logPrefix} No database channels configured. Falling back to legacy SMSIdea Image API...`);
  if (!WHATSAPP_CONFIG.apiKey) {
    throw new Error('WhatsApp API key not configured');
  }

  const formattedNumber = formatPhoneNumber(phoneNumber);
  const payload: any = {
    key: WHATSAPP_CONFIG.apiKey,
    to: formattedNumber,
    url: imageUrl,
  };

  if (filename) payload.filename = filename;
  if (caption) payload.caption = caption;

  try {
    let response;
    if (WHATSAPP_CONFIG.requestMethod === 'GET') {
      const params = new URLSearchParams();
      Object.entries(payload).forEach(([key, value]) => {
        params.append(key, String(value));
      });
      const urlWithParams = `${WHATSAPP_CONFIG.imageApiUrl}?${params.toString()}`;
      response = await axios.get(urlWithParams, { timeout: 30000 });
    } else {
      response = await axios.post(WHATSAPP_CONFIG.imageApiUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      });
    }

    if (response.data && (response.data.status === 'success' || response.data.ErrorCode === '000')) {
      console.log(`${logPrefix} ✅ SUCCESS: WhatsApp image sent successfully via legacy API`);
    } else {
      const errorMessage = response.data?.ErrorMessage || response.data?.message || 'Unknown error';
      throw new Error(`Legacy WhatsApp Image API Error: ${errorMessage}`);
    }
  } catch (error: any) {
    console.error(`${logPrefix} ❌ Legacy Exception:`, error?.message);
    throw error;
  }
};

// Send bulk WhatsApp messages
export const sendBulkWhatsAppMessages = async (
  messages: Array<{ phoneNumber: string; message: string }>,
  options?: {
    delayBetweenMessages?: number;
    stopOnError?: boolean;
    useCase?: string;
  }
): Promise<{
  total: number;
  successful: number;
  failed: number;
  results: Array<{ phoneNumber: string; success: boolean; error?: string }>;
}> => {
  const logPrefix = '[WHATSAPP-BULK]';
  const delay = options?.delayBetweenMessages || 1000;
  const stopOnError = options?.stopOnError || false;
  const useCase = options?.useCase || 'custom';

  console.log(`${logPrefix} ========== START: Bulk WhatsApp Messages ==========`);
  console.log(`${logPrefix} Total Messages: ${messages.length}`);
  console.log(`${logPrefix} Delay: ${delay}ms, Use Case: ${useCase}`);

  const results: Array<{ phoneNumber: string; success: boolean; error?: string }> = [];
  let successful = 0;
  let failed = 0;

  for (let i = 0; i < messages.length; i++) {
    const { phoneNumber, message } = messages[i];
    try {
      await sendWhatsAppMessage(phoneNumber, message, useCase);
      results.push({ phoneNumber, success: true });
      successful++;
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      results.push({ phoneNumber, success: false, error: errorMessage });
      failed++;
      if (stopOnError) break;
    }

    if (i < messages.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return { total: messages.length, successful, failed, results };
};
