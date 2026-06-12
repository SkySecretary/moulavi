# WhatsApp Messaging Testing Guide

This guide will help you test all WhatsApp messaging functionality in your DigitalOcean droplet using Coolify.

## Prerequisites

1. **Environment Variables Setup**
   Ensure these are set in your Coolify environment:
   - `WHATSAPP_API_KEY` - Your WhatsApp API key (Required)
   - `WHATSAPP_INSTANCE_ID` - Your WhatsApp instance ID (Required)
   - `WHATSAPP_API_URL` - (Optional) Default: `https://wa.smsidea.com/api/v1/sendMessage`
   - `WHATSAPP_IMAGE_API_URL` - (Optional) Default: `https://wa.smsidea.com/api/v1/sendImage`
   - `WHATSAPP_REQUEST_METHOD` - (Optional) `POST` (default, recommended) or `GET`
   - `FRONTEND_URL` - Your frontend URL (for credential messages)

2. **Access to Backend Logs**
   - In Coolify, go to your backend service
   - Click on "Logs" tab to view real-time logs
   - Keep this open while testing to see debug output

## Testing Methods

### Method 1: Using the Test Endpoint (Recommended)

#### A. Simple Custom Message Test

**Endpoint:** `POST /api/auth/test-whatsapp`

**Authentication:** Required (Admin only)

**Request:**
```bash
curl -X POST https://your-domain.com/api/auth/test-whatsapp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "phoneNumber": "919876543210",
    "message": "Test message from NuSync"
  }'
```

**Or using Postman/Thunder Client:**
- URL: `POST https://your-domain.com/api/auth/test-whatsapp`
- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer YOUR_ADMIN_TOKEN`
- Body (JSON):
```json
{
  "phoneNumber": "919876543210",
  "message": "Test message from NuSync"
}
```

#### B. Test Different Message Types

You can test different WhatsApp message templates by setting the `testType` parameter:

**1. Credentials Template:**
```json
{
  "phoneNumber": "919876543210",
  "testType": "credentials"
}
```

**2. Service Confirmation Template:**
```json
{
  "phoneNumber": "919876543210",
  "testType": "service-confirmation"
}
```

**3. Movement Update Template:**
```json
{
  "phoneNumber": "919876543210",
  "testType": "movement-update"
}
```

**4. Iqama Confirmation Template:**
```json
{
  "phoneNumber": "919876543210",
  "testType": "iqama-confirmation"
}
```

**5. Custom Message:**
```json
{
  "phoneNumber": "919876543210",
  "testType": "custom",
  "message": "Your custom message here"
}
```

#### C. Test WhatsApp Image

**Endpoint:** `POST /api/auth/test-whatsapp-image`

```bash
curl -X POST https://your-domain.com/api/auth/test-whatsapp-image \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "phoneNumber": "919876543210",
    "imageUrl": "https://example.com/image.jpg",
    "caption": "Test image caption",
    "filename": "test-image.jpg"
  }'
```

**Request Body:**
- `phoneNumber` (required) - Recipient phone number
- `imageUrl` (required) - Publicly accessible image URL
- `caption` (optional) - Image caption text
- `filename` (optional) - Filename for the image

#### D. Test Bulk WhatsApp Messages

**Endpoint:** `POST /api/auth/test-whatsapp-bulk`

```bash
curl -X POST https://your-domain.com/api/auth/test-whatsapp-bulk \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "messages": [
      {
        "phoneNumber": "919876543210",
        "message": "Test message 1"
      },
      {
        "phoneNumber": "919876543211",
        "message": "Test message 2"
      }
    ],
    "delayBetweenMessages": 2000,
    "stopOnError": false
  }'
```

**Request Body:**
- `messages` (required) - Array of objects with `phoneNumber` and `message`
- `delayBetweenMessages` (optional) - Delay in milliseconds (default: 1000ms)
- `stopOnError` (optional) - Stop sending if one fails (default: false)

**Response:**
```json
{
  "total": 2,
  "successful": 2,
  "failed": 0,
  "results": [
    { "phoneNumber": "919876543210", "success": true },
    { "phoneNumber": "919876543211", "success": true }
  ]
}
```

#### E. Comprehensive Test (All Message Types)

**Endpoint:** `POST /api/auth/test-whatsapp-all`

This endpoint tests ALL WhatsApp message types in sequence:

```bash
curl -X POST https://your-domain.com/api/auth/test-whatsapp-all \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "phoneNumber": "919876543210"
  }'
```

**Response:**
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "phoneNumber": "919***10",
  "tests": {
    "custom": { "success": true, "message": "Sent successfully" },
    "credentials": { "success": true, "message": "Sent successfully" },
    "service-confirmation": { "success": true, "message": "Sent successfully" },
    "movement-update": { "success": true, "message": "Sent successfully" },
    "iqama-confirmation": { "success": true, "message": "Sent successfully" }
  },
  "summary": {
    "total": 5,
    "successful": 5,
    "failed": 0
  }
}
```

### Method 2: Testing Through Application Features

#### 1. Test Credentials WhatsApp
- Create a new party/user through the admin panel
- Check the "Create login account" option
- Provide a WhatsApp number
- After creation, check logs and verify message was sent

#### 2. Test Service Confirmation WhatsApp
- Submit a new Umrah Visa booking as a party
- The system should automatically send a confirmation WhatsApp
- Check logs for `[WHATSAPP] sendServiceConfirmationWhatsApp`

#### 3. Test Movement Update WhatsApp
- Go to Voucher management
- Update movement details for a voucher
- Click "Notify Movement Update"
- Check logs for `[WHATSAPP] sendMovementUpdateWhatsApp`

#### 4. Test Iqama Confirmation WhatsApp
- Process an Umrah Visa booking that requires Iqama confirmation
- Trigger the Iqama confirmation workflow
- Check logs for `[WHATSAPP] sendIqamaConfirmationWhatsApp`

## Understanding the Debug Logs

When you test WhatsApp messaging, you'll see detailed logs in Coolify. Here's what to look for:

### Success Logs (✅)
```
[WHATSAPP] ========== START: Sending WhatsApp Message ==========
[WHATSAPP] Timestamp: 2024-01-15T10:30:00.000Z
[WHATSAPP] Original Phone Number: 919876543210
[WHATSAPP] Message Length: 150 characters
[WHATSAPP] Checking configuration...
[WHATSAPP-CONFIG] ========== WhatsApp Configuration Check ==========
[WHATSAPP-CONFIG] API URL: https://wa.smsidea.com/api/v1/sendMessage
[WHATSAPP-CONFIG] API Key: abc123xyz...masked (masked)
[WHATSAPP-CONFIG] Instance ID: INSTANCE123
[WHATSAPP] ✓ API Key: abc123xyz...masked (masked)
[WHATSAPP] ✓ Instance ID: INSTANCE123
[WHATSAPP] Formatted Phone Number: 919876543210
[WHATSAPP] Making API request...
[WHATSAPP] ✓ API Request completed in 250ms
[WHATSAPP] Response Status: 200 OK
[WHATSAPP] ✅ SUCCESS: WhatsApp message sent successfully to 919876543210
[WHATSAPP] ========== END: Message Sent Successfully ==========
```

### Error Logs (❌)

**Configuration Error:**
```
[WHATSAPP] ❌ ERROR: WhatsApp API key not configured
[WHATSAPP] Environment variable WHATSAPP_API_KEY is missing or empty
```

**Network Error:**
```
[WHATSAPP] ❌ EXCEPTION: Error sending WhatsApp message
[WHATSAPP] Error Type: AxiosError
[WHATSAPP] Error Message: timeout of 10000ms exceeded
[WHATSAPP] Request was made but no response received
```

**API Error:**
```
[WHATSAPP] ❌ API ERROR: Invalid phone number
[WHATSAPP] Full Response: { "status": "error", "message": "Invalid phone number" }
```

## Common Issues and Solutions

### Issue 1: "WhatsApp API key not configured"
**Solution:**
1. Go to Coolify → Your Backend Service → Environment Variables
2. Add `WHATSAPP_API_KEY` with your API key value
3. Add `WHATSAPP_INSTANCE_ID` with your instance ID
4. Restart the service

### Issue 2: "Request was made but no response received"
**Possible Causes:**
- Network connectivity issue from droplet
- Firewall blocking outbound requests
- DNS resolution failure
- API endpoint is down

**Solution:**
1. Check if your droplet can reach the internet:
   ```bash
   curl -I https://wa.smsidea.com
   ```
2. Check firewall rules in DigitalOcean
3. Verify API endpoint is accessible
4. Check DNS resolution:
   ```bash
   nslookup wa.smsidea.com
   ```

### Issue 3: "Invalid phone number"
**Solution:**
- Ensure phone number is in correct format
- For India: Use `91` followed by 10 digits (e.g., `919876543210`)
- Remove all spaces, dashes, and special characters
- Don't include `+` sign

### Issue 4: "API Error: [error message]"
**Solution:**
- Check the full error response in logs
- Verify your API key and instance ID are correct
- Check if your WhatsApp API account has sufficient credits
- Verify the phone number is registered on WhatsApp

### Issue 5: Messages not being received
**Solution:**
1. Verify the phone number is correct
2. Check if the number has WhatsApp installed
3. Verify the number hasn't blocked your WhatsApp Business account
4. Check API response in logs - it might show success but message not delivered

### Issue 6: GET vs POST Request Method
**Solution:**
- The API supports both GET and POST requests
- POST is recommended (more secure, API key in body not URL)
- To use GET, set `WHATSAPP_REQUEST_METHOD=GET` in environment variables
- Default is POST (more secure)

### Issue 7: Image sending fails
**Solution:**
1. Ensure image URL is publicly accessible (not behind authentication)
2. Verify image URL is valid and returns image content
3. Check image format is supported (JPG, PNG, etc.)
4. Verify `WHATSAPP_IMAGE_API_URL` is set correctly
5. Check image size limits from your API provider

## Phone Number Format

The system automatically formats phone numbers:
- Input: `+91 90044 81414` → Output: `919876543210`
- Input: `9876543210` → Output: `919876543210` (adds 91 prefix)
- Input: `919876543210` → Output: `919876543210` (keeps as is)

## Testing Checklist

- [ ] Environment variables are set in Coolify
- [ ] Backend service is running
- [ ] Can access test endpoint with admin token
- [ ] Test custom message works
- [ ] Test credentials template works
- [ ] Test service confirmation template works
- [ ] Test movement update template works
- [ ] Test iqama confirmation template works
- [ ] Test image sending works
- [ ] Test bulk messaging works
- [ ] Comprehensive test (all types) works
- [ ] Logs show detailed debug information
- [ ] Messages are actually received on WhatsApp
- [ ] GET vs POST method works (if using GET)

## Getting Admin Token for Testing

1. Login to your application as admin
2. Open browser DevTools (F12)
3. Go to Application/Storage → Local Storage
4. Find `accessToken` key
5. Copy the token value
6. Use it in your API requests as: `Authorization: Bearer YOUR_TOKEN`

## Viewing Logs in Coolify

1. Go to your Coolify dashboard
2. Select your backend service
3. Click on "Logs" tab
4. Filter by `[WHATSAPP]` to see only WhatsApp-related logs
5. Logs update in real-time

## Next Steps After Testing

Once all tests pass:
1. Remove or comment out excessive debug logs if needed (optional)
2. Monitor production logs for any issues
3. Set up alerts for WhatsApp failures if needed
4. Document any custom configurations

## Support

If you encounter issues:
1. Check the logs first - they contain detailed error information
2. Verify environment variables are set correctly
3. Test network connectivity from the droplet
4. Contact your WhatsApp API provider if API errors persist

---

**Note:** All WhatsApp messages include detailed logging. Check your Coolify logs for comprehensive debug information when testing.

