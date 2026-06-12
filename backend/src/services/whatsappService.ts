import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// WhatsApp configuration constants
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
  console.log(`${logPrefix} Environment Variables:`);
  console.log(`${logPrefix}   - WHATSAPP_API_URL: ${process.env.WHATSAPP_API_URL || 'NOT SET (using default)'}`);
  console.log(`${logPrefix}   - WHATSAPP_IMAGE_API_URL: ${process.env.WHATSAPP_IMAGE_API_URL || 'NOT SET (using default)'}`);
  console.log(`${logPrefix}   - WHATSAPP_API_KEY: ${process.env.WHATSAPP_API_KEY ? 'SET (masked)' : '❌ NOT SET'}`);
  console.log(`${logPrefix}   - WHATSAPP_INSTANCE_ID: ${process.env.WHATSAPP_INSTANCE_ID || '❌ NOT SET'}`);
  console.log(`${logPrefix}   - WHATSAPP_REQUEST_METHOD: ${WHATSAPP_CONFIG.requestMethod} (POST recommended for security)`);
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

  iqamaConfirmation: (name: string) => `
🌙 Greetings from Umra Company, Saudi Arabia 🇸🇦

👨‍👩‍👧 Your family has applied for an Umrah visa through our Indian agent.

✅ Kindly log in to your Absher account and approve the request at the earliest convenience.

🔎 For your reference, please check under "Qabul Services" in your Absher account to view and approve the request.

📞 If you need any assistance, please feel free to contact us anytime.

---

✅ *How to Check Qabul Services in Absher*

1. Log in to [Absher.sa](https://www.absher.sa) → Individual account

2. Go to My Services (خدماتي) → *Inquiries (الاستعلامات)

3. Select General Services (الخدمات العامة)

4. Click Qabul Services (قبول الخدمات)

5. View or Accept (قبول) / Reject (رفض) any pending requests
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
  
  // Return cleaned number
  return cleaned;
};

// Utility function to send WhatsApp message with error handling
const sendWhatsAppMessage = async (to: string, message: string): Promise<void> => {
  const startTime = Date.now();
  const logPrefix = '[WHATSAPP]';
  
  console.log(`${logPrefix} ========== START: Sending WhatsApp Message ==========`);
  console.log(`${logPrefix} Timestamp: ${new Date().toISOString()}`);
  console.log(`${logPrefix} Original Phone Number: ${to}`);
  console.log(`${logPrefix} Message Length: ${message.length} characters`);
  console.log(`${logPrefix} Message Preview: ${message.substring(0, 150)}${message.length > 150 ? '...' : ''}`);

  // Configuration validation
  console.log(`${logPrefix} Checking configuration...`);
  logWhatsAppConfig();
  
  if (!WHATSAPP_CONFIG.apiKey) {
    console.error(`${logPrefix} ❌ ERROR: WhatsApp API key not configured`);
    console.error(`${logPrefix} Environment variable WHATSAPP_API_KEY is missing or empty`);
    console.error(`${logPrefix} Please set WHATSAPP_API_KEY in your environment variables`);
    throw new Error('WhatsApp API key not configured');
  }
  console.log(`${logPrefix} ✓ API Key: ${WHATSAPP_CONFIG.apiKey.substring(0, 10)}...${WHATSAPP_CONFIG.apiKey.substring(WHATSAPP_CONFIG.apiKey.length - 4)} (masked)`);

  if (!WHATSAPP_CONFIG.instanceId) {
    console.error(`${logPrefix} ❌ ERROR: WhatsApp Instance ID not configured`);
    console.error(`${logPrefix} Environment variable WHATSAPP_INSTANCE_ID is missing or empty`);
    console.error(`${logPrefix} Please set WHATSAPP_INSTANCE_ID in your environment variables`);
    throw new Error('WhatsApp Instance ID not configured');
  }
  console.log(`${logPrefix} ✓ Instance ID: ${WHATSAPP_CONFIG.instanceId}`);

  const formattedNumber = formatPhoneNumber(to);
  console.log(`${logPrefix} Formatted Phone Number: ${formattedNumber}`);
  
  const payload = {
    key: WHATSAPP_CONFIG.apiKey,
    to: formattedNumber,
    message: message,
    IsUrgent: false,
    isGroupMsg: false,
    IsFailMessage: false,
    SendingMessageType: '1' // 1 for WhatsApp
  };

  console.log(`${logPrefix} API URL: ${WHATSAPP_CONFIG.apiUrl}`);
  console.log(`${logPrefix} Payload (without API key):`, {
    to: payload.to,
    message: `${message.substring(0, 50)}...`,
    IsUrgent: payload.IsUrgent,
    isGroupMsg: payload.isGroupMsg,
    IsFailMessage: payload.IsFailMessage,
    SendingMessageType: payload.SendingMessageType,
  });

  try {
    console.log(`${logPrefix} Making API request...`);
    console.log(`${logPrefix} Request URL: ${WHATSAPP_CONFIG.apiUrl}`);
    console.log(`${logPrefix} Request Method: ${WHATSAPP_CONFIG.requestMethod}`);
    console.log(`${logPrefix} Request Timeout: 10000ms (10 seconds)`);
    const requestStartTime = Date.now();
    
    // Log full payload structure (with masked API key)
    const logPayload = {
      ...payload,
      key: `${payload.key.substring(0, 10)}...${payload.key.substring(payload.key.length - 4)} (masked)`,
    };
    console.log(`${logPrefix} Full Payload Structure:`, JSON.stringify(logPayload, null, 2));
    
    let response;
    
    if (WHATSAPP_CONFIG.requestMethod === 'GET') {
      // GET request with query parameters
      console.log(`${logPrefix} Using GET method with query parameters`);
      const params = new URLSearchParams();
      Object.entries(payload).forEach(([key, value]) => {
        params.append(key, String(value));
      });
      const urlWithParams = `${WHATSAPP_CONFIG.apiUrl}?${params.toString()}`;
      console.log(`${logPrefix} GET URL (masked key): ${urlWithParams.replace(/key=[^&]+/, 'key=***masked***')}`);
      
      response = await axios.get(urlWithParams, {
        timeout: 10000,
        validateStatus: (status) => status < 500,
      });
    } else {
      // POST request with JSON body (default, more secure)
      console.log(`${logPrefix} Using POST method with JSON body`);
      response = await axios.post(WHATSAPP_CONFIG.apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
        validateStatus: (status) => status < 500,
      });
    }

    const requestDuration = Date.now() - requestStartTime;
    console.log(`${logPrefix} ✓ API Request completed in ${requestDuration}ms`);
    console.log(`${logPrefix} Response Status: ${response.status} ${response.statusText}`);
    console.log(`${logPrefix} Response Headers:`, JSON.stringify(response.headers, null, 2));
    console.log(`${logPrefix} Response Data:`, JSON.stringify(response.data, null, 2));

    // Check if message was sent successfully
    if (response.data.status === 'success' || response.data.ErrorCode === '000') {
      const totalDuration = Date.now() - startTime;
      console.log(`${logPrefix} ✅ SUCCESS: WhatsApp message sent successfully to ${formattedNumber}`);
      console.log(`${logPrefix} Total Duration: ${totalDuration}ms`);
      console.log(`${logPrefix} ========== END: Message Sent Successfully ==========`);
    } else {
      const errorMessage = response.data.ErrorMessage || response.data.message || 'Unknown error';
      console.error(`${logPrefix} ❌ API ERROR: ${errorMessage}`);
      console.error(`${logPrefix} Full Response:`, JSON.stringify(response.data, null, 2));
      console.error(`${logPrefix} ========== END: API Error ==========`);
      throw new Error(`WhatsApp API Error: ${errorMessage}`);
    }
  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    console.error(`${logPrefix} ❌ EXCEPTION: Error sending WhatsApp message`);
    console.error(`${logPrefix} Duration before error: ${totalDuration}ms`);
    console.error(`${logPrefix} Error Type: ${error?.constructor?.name || 'Unknown'}`);
    console.error(`${logPrefix} Error Message: ${error?.message || 'Unknown error'}`);
    console.error(`${logPrefix} Error Stack:`, error?.stack || 'No stack trace available');
    
    if (error?.response) {
      console.error(`${logPrefix} HTTP Status: ${error.response.status} ${error.response.statusText}`);
      console.error(`${logPrefix} Response Data:`, JSON.stringify(error.response.data, null, 2));
      console.error(`${logPrefix} Response Headers:`, JSON.stringify(error.response.headers, null, 2));
    }
    
    if (error?.request) {
      console.error(`${logPrefix} Request was made but no response received`);
      console.error(`${logPrefix} This usually means:`);
      console.error(`${logPrefix}   1. Network connectivity issue`);
      console.error(`${logPrefix}   2. DNS resolution failure`);
      console.error(`${logPrefix}   3. Firewall blocking the request`);
      console.error(`${logPrefix}   4. API endpoint is down`);
      console.error(`${logPrefix} Request Config:`, {
        url: error.config?.url,
        method: error.config?.method,
        timeout: error.config?.timeout,
        baseURL: error.config?.baseURL,
      });
      console.error(`${logPrefix} Request Data:`, error.config?.data ? JSON.stringify(JSON.parse(error.config.data), null, 2) : 'No data');
    }
    
    if (error?.code) {
      console.error(`${logPrefix} Error Code: ${error.code}`);
    }
    
    console.error(`${logPrefix} Formatted Number: ${formattedNumber}`);
    console.error(`${logPrefix} ========== END: Exception ==========`);
    throw new Error(`Failed to send WhatsApp message: ${error?.message || 'Unknown error'}`);
  }
};

// Send credentials WhatsApp message
export const sendCredentialsWhatsApp = async (
  phoneNumber: string,
  name: string,
  email: string,
  password: string
): Promise<void> => {
  console.log('[WHATSAPP] ========== sendCredentialsWhatsApp called ==========');
  console.log('[WHATSAPP] Parameters:', {
    phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 3)}***${phoneNumber.substring(phoneNumber.length - 2)}` : 'null',
    name: name || 'null',
    email: email || 'null',
    password: password ? '***masked***' : 'null',
  });
  
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  console.log('[WHATSAPP] Frontend URL:', frontendUrl);
  
  const message = WHATSAPP_TEMPLATES.credentials(name, email, password, frontendUrl);
  console.log('[WHATSAPP] Message template generated, length:', message.length);
  
  try {
    await sendWhatsAppMessage(phoneNumber, message);
    console.log('[WHATSAPP] ✅ sendCredentialsWhatsApp completed successfully');
  } catch (error: any) {
    console.error('[WHATSAPP] ❌ sendCredentialsWhatsApp failed:', error?.message || 'Unknown error');
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
  console.log('[WHATSAPP] ========== sendServiceConfirmationWhatsApp called ==========');
  console.log('[WHATSAPP] Parameters:', {
    phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 3)}***${phoneNumber.substring(phoneNumber.length - 2)}` : 'null',
    name: name || 'null',
    serviceType: serviceType || 'null',
    bookingId: bookingId || 'null',
  });
  
  const message = WHATSAPP_TEMPLATES.serviceConfirmation(name, serviceType, bookingId);
  console.log('[WHATSAPP] Message template generated, length:', message.length);
  
  try {
    await sendWhatsAppMessage(phoneNumber, message);
    console.log('[WHATSAPP] ✅ sendServiceConfirmationWhatsApp completed successfully');
  } catch (error: any) {
    console.error('[WHATSAPP] ❌ sendServiceConfirmationWhatsApp failed:', error?.message || 'Unknown error');
    throw error;
  }
};

// Send custom WhatsApp message
export const sendCustomWhatsApp = async (
  phoneNumber: string,
  message: string
): Promise<void> => {
  console.log('[WHATSAPP] ========== sendCustomWhatsApp called ==========');
  console.log('[WHATSAPP] Parameters:', {
    phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 3)}***${phoneNumber.substring(phoneNumber.length - 2)}` : 'null',
    messageLength: message?.length || 0,
  });
  
  try {
    await sendWhatsAppMessage(phoneNumber, message);
    console.log('[WHATSAPP] ✅ sendCustomWhatsApp completed successfully');
  } catch (error: any) {
    console.error('[WHATSAPP] ❌ sendCustomWhatsApp failed:', error?.message || 'Unknown error');
    throw error;
  }
};

// Export utility functions
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
  console.log('[WHATSAPP] ========== sendMovementUpdateWhatsApp called ==========');
  console.log('[WHATSAPP] Parameters:', {
    phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 3)}***${phoneNumber.substring(phoneNumber.length - 2)}` : 'null',
    partyName: partyName || 'null',
    voucherNumber: voucherNumber || 'null',
    movementDetails: {
      date: movementDetails.date || 'null',
      time: movementDetails.time || 'null',
      fromLocation: movementDetails.fromLocation || 'null',
      toLocation: movementDetails.toLocation || 'null',
      driverDetails1: movementDetails.driverDetails1 || 'null',
      driverDetails2: movementDetails.driverDetails2 || 'null',
      vehicleNumber: movementDetails.vehicleNumber || 'null',
    },
  });
  
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

  console.log('[WHATSAPP] Message template generated, length:', message.length);
  
  try {
    await sendWhatsAppMessage(phoneNumber, message);
    console.log('[WHATSAPP] ✅ sendMovementUpdateWhatsApp completed successfully');
  } catch (error: any) {
    console.error('[WHATSAPP] ❌ sendMovementUpdateWhatsApp failed:', error?.message || 'Unknown error');
    throw error;
  }
};

// Send iqama confirmation WhatsApp message
export const sendIqamaConfirmationWhatsApp = async (
  phoneNumber: string,
  name: string
): Promise<void> => {
  console.log('[WHATSAPP] ========== sendIqamaConfirmationWhatsApp called ==========');
  console.log('[WHATSAPP] Parameters:', {
    phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 3)}***${phoneNumber.substring(phoneNumber.length - 2)}` : 'null',
    name: name || 'null',
  });

  const message = WHATSAPP_TEMPLATES.iqamaConfirmation(name);
  console.log('[WHATSAPP] Message template generated, length:', message.length);

  try {
    await sendWhatsAppMessage(phoneNumber, message);
    console.log('[WHATSAPP] ✅ sendIqamaConfirmationWhatsApp completed successfully');
  } catch (error: any) {
    console.error('[WHATSAPP] ❌ sendIqamaConfirmationWhatsApp failed:', error?.message || 'Unknown error');
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
  console.log(`${logPrefix} Phone Number: ${phoneNumber ? `${phoneNumber.substring(0, 3)}***${phoneNumber.substring(phoneNumber.length - 2)}` : 'null'}`);
  console.log(`${logPrefix} Image URL: ${imageUrl}`);
  console.log(`${logPrefix} Caption: ${caption || 'No caption'}`);
  console.log(`${logPrefix} Filename: ${filename || 'No filename'}`);

  // Configuration validation
  if (!WHATSAPP_CONFIG.apiKey) {
    throw new Error('WhatsApp API key not configured');
  }

  if (!WHATSAPP_CONFIG.instanceId) {
    throw new Error('WhatsApp Instance ID not configured');
  }

  const formattedNumber = formatPhoneNumber(phoneNumber);
  
  // Build payload according to API documentation
  // API expects: key, to, url, filename (optional), caption (optional)
  const payload: any = {
    key: WHATSAPP_CONFIG.apiKey,
    to: formattedNumber,
    url: imageUrl,
  };

  // Add optional fields only if provided
  if (filename) payload.filename = filename;
  if (caption) payload.caption = caption;

  console.log(`${logPrefix} API URL: ${WHATSAPP_CONFIG.imageApiUrl}`);
  console.log(`${logPrefix} Request Method: ${WHATSAPP_CONFIG.requestMethod}`);
  console.log(`${logPrefix} Payload (masked key):`, {
    ...payload,
    key: `${payload.key.substring(0, 10)}...${payload.key.substring(payload.key.length - 4)} (masked)`,
  });

  try {
    const requestStartTime = Date.now();
    let response;

    if (WHATSAPP_CONFIG.requestMethod === 'GET') {
      const params = new URLSearchParams();
      Object.entries(payload).forEach(([key, value]) => {
        params.append(key, String(value));
      });
      const urlWithParams = `${WHATSAPP_CONFIG.imageApiUrl}?${params.toString()}`;
      console.log(`${logPrefix} GET URL (masked): ${urlWithParams.replace(/key=[^&]+/, 'key=***masked***')}`);
      
      response = await axios.get(urlWithParams, {
        timeout: 30000, // 30 seconds for image uploads
        validateStatus: () => true, // Don't throw on any status, we'll handle it
      });
    } else {
      console.log(`${logPrefix} Making POST request with payload...`);
      response = await axios.post(WHATSAPP_CONFIG.imageApiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 seconds for image uploads
        validateStatus: () => true, // Don't throw on any status, we'll handle it
      });
    }

    const requestDuration = Date.now() - requestStartTime;
    console.log(`${logPrefix} ✓ API Request completed in ${requestDuration}ms`);
    console.log(`${logPrefix} Response Status: ${response.status} ${response.statusText}`);
    console.log(`${logPrefix} Response Headers:`, JSON.stringify(response.headers, null, 2));
    console.log(`${logPrefix} Response Data:`, JSON.stringify(response.data, null, 2));

    // Check for HTTP errors first
    if (response.status >= 500) {
      const errorDetails = response.data ? JSON.stringify(response.data) : 'No response body';
      console.error(`${logPrefix} ❌ HTTP ${response.status} ERROR from API`);
      console.error(`${logPrefix} Response Body: ${errorDetails}`);
      throw new Error(`WhatsApp API returned HTTP ${response.status}: ${errorDetails}`);
    }

    // Check if message was sent successfully
    if (response.data && (response.data.status === 'success' || response.data.ErrorCode === '000')) {
      const totalDuration = Date.now() - startTime;
      console.log(`${logPrefix} ✅ SUCCESS: WhatsApp image sent successfully to ${formattedNumber}`);
      console.log(`${logPrefix} Total Duration: ${totalDuration}ms`);
      console.log(`${logPrefix} ========== END: Image Sent Successfully ==========`);
    } else {
      const errorMessage = response.data?.ErrorMessage || response.data?.message || response.data?.error || 'Unknown error';
      console.error(`${logPrefix} ❌ API ERROR: ${errorMessage}`);
      console.error(`${logPrefix} Full Response:`, JSON.stringify(response.data, null, 2));
      throw new Error(`WhatsApp API Error: ${errorMessage}`);
    }
  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    console.error(`${logPrefix} ❌ EXCEPTION: Error sending WhatsApp image`);
    console.error(`${logPrefix} Duration before error: ${totalDuration}ms`);
    console.error(`${logPrefix} Error Type: ${error?.constructor?.name || 'Unknown'}`);
    console.error(`${logPrefix} Error Message: ${error?.message || 'Unknown error'}`);
    console.error(`${logPrefix} Error Stack:`, error?.stack || 'No stack trace available');
    
    if (error?.response) {
      console.error(`${logPrefix} HTTP Status: ${error.response.status} ${error.response.statusText}`);
      console.error(`${logPrefix} Response Data:`, JSON.stringify(error.response.data, null, 2));
      console.error(`${logPrefix} Response Headers:`, JSON.stringify(error.response.headers, null, 2));
    }
    
    if (error?.request) {
      console.error(`${logPrefix} Request was made but no response received`);
      console.error(`${logPrefix} Request Config:`, {
        url: error.config?.url,
        method: error.config?.method,
        timeout: error.config?.timeout,
      });
    }
    
    if (error?.code) {
      console.error(`${logPrefix} Error Code: ${error.code}`);
    }
    
    console.error(`${logPrefix} Formatted Number: ${formattedNumber}`);
    console.error(`${logPrefix} Image URL: ${imageUrl}`);
    console.error(`${logPrefix} ========== END: Exception ==========`);
    throw new Error(`Failed to send WhatsApp image: ${error?.message || 'Unknown error'}`);
  }
};

// Send bulk WhatsApp messages
export const sendBulkWhatsAppMessages = async (
  messages: Array<{ phoneNumber: string; message: string }>,
  options?: {
    delayBetweenMessages?: number; // milliseconds
    stopOnError?: boolean;
  }
): Promise<{
  total: number;
  successful: number;
  failed: number;
  results: Array<{ phoneNumber: string; success: boolean; error?: string }>;
}> => {
  const logPrefix = '[WHATSAPP-BULK]';
  const delay = options?.delayBetweenMessages || 1000; // Default 1 second delay
  const stopOnError = options?.stopOnError || false;

  console.log(`${logPrefix} ========== START: Bulk WhatsApp Messages ==========`);
  console.log(`${logPrefix} Total Messages: ${messages.length}`);
  console.log(`${logPrefix} Delay Between Messages: ${delay}ms`);
  console.log(`${logPrefix} Stop On Error: ${stopOnError}`);

  const results: Array<{ phoneNumber: string; success: boolean; error?: string }> = [];
  let successful = 0;
  let failed = 0;

  for (let i = 0; i < messages.length; i++) {
    const { phoneNumber, message } = messages[i];
    console.log(`${logPrefix} Processing message ${i + 1}/${messages.length} to ${phoneNumber.substring(0, 3)}***`);

    try {
      await sendWhatsAppMessage(phoneNumber, message);
      results.push({ phoneNumber, success: true });
      successful++;
      console.log(`${logPrefix} ✅ Message ${i + 1} sent successfully`);
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      results.push({ phoneNumber, success: false, error: errorMessage });
      failed++;
      console.error(`${logPrefix} ❌ Message ${i + 1} failed: ${errorMessage}`);

      if (stopOnError) {
        console.error(`${logPrefix} Stopping bulk send due to error (stopOnError=true)`);
        break;
      }
    }

    // Delay between messages (except for the last one)
    if (i < messages.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  const summary = {
    total: messages.length,
    successful,
    failed,
    results,
  };

  console.log(`${logPrefix} ========== END: Bulk Send Complete ==========`);
  console.log(`${logPrefix} Summary:`, summary);

  return summary;
};

