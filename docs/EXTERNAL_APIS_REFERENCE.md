# External APIs Reference Guide

This document preserves the API contracts, request/response payloads, authentication headers, and cURL commands discovered and verified in active operational use.

---

## 1. Saudi Ministry / Masar Nusuk Platform

### A. Export Mutamers Report
Retrieves mutamer passenger records based on filter criteria (e.g. entry date, visa status).

* **Method:** `POST`
* **URL:** `https://masar.nusuk.sa/umrah/reports_apis/api/Reports/ExportData?exportDataType=1&reportType=1`
* **Required Headers:**
  * `accept`: `application/json, text/plain, */*`
  * `accept-language`: `en`
  * `activeentityid`: `525375` (or agent entity ID)
  * `activeentitytypeid`: `32` (or agent type ID)
  * `authorization`: `Bearer <NUSUK_JWT_TOKEN>`
  * `content-type`: `application/json`
  * `entity-id`: `525375`
  * `x-lang`: `en`
  * `referer`: `https://masar.nusuk.sa/umrah/reports/mutamers-report`

* **Request Body:**
```json
{
  "limit": 1000000,
  "offset": 0,
  "filterList": [
    {
      "propertyName": "entryDate",
      "operation": "day_equal",
      "propertyValue": "24/06/2026"
    }
  ],
  "sortColumn": null,
  "sortCriteria": []
}
```

* **cURL Template:**
```bash
curl -X POST "https://masar.nusuk.sa/umrah/reports_apis/api/Reports/ExportData?exportDataType=1&reportType=1" \
  -H "accept: application/json, text/plain, */*" \
  -H "accept-language: en" \
  -H "activeentityid: 525375" \
  -H "activeentitytypeid: 32" \
  -H "authorization: Bearer <NUSUK_TOKEN>" \
  -H "content-type: application/json" \
  -H "entity-id: 525375" \
  -H "x-lang: en" \
  -H "referer: https://masar.nusuk.sa/umrah/reports/mutamers-report" \
  -d '{"limit":1000000,"offset":0,"filterList":[{"propertyName":"entryDate","operation":"day_equal","propertyValue":"24/06/2026"}],"sortColumn":null,"sortCriteria":[]}'
```

---

### B. Submit Mutamer Personal & Contact Information
Submits individual mutamer pilgrim registration to the Nusuk system.

* **Method:** `POST`
* **URL:** `https://masar.nusuk.sa/umrah/groups_apis/api/Mutamer/SubmitPersonalAndContactInfos`
* **Required Headers:**
  * `accept`: `application/json, text/plain, */*`
  * `accept-language`: `en`
  * `activeentityid`: `719133`
  * `activeentitytypeid`: `52`
  * `authorization`: `Bearer <NUSUK_JWT_TOKEN>`
  * `contractid`: `230195`
  * `entity-id`: `719133`
  * `x-lang`: `en`
  * `content-type`: `application/json`

* **Request Body Schema:**
```json
{
  "id": "<GROUP_OR_MUTAMER_ID_HASH>",
  "firstName": { "en": "FIRST_NAME", "ar": "الاسم_الأول" },
  "secondName": { "en": null, "ar": null },
  "thirdName": { "en": null, "ar": null },
  "familyName": { "en": "FAMILY_NAME", "ar": "اسم_العائلة" },
  "martialStatusId": 2,
  "birthDate": "YYYY-MM-DD",
  "profession": "PROFESSION_TEXT",
  "gender": 1,
  "personalPictureId": "<ENCRYPTED_PICTURE_ID>",
  "personalPicture": {
    "id": "<PICTURE_ID>",
    "fileName": "photo.jpg",
    "fileExtension": ".jpg",
    "mimeType": "image/jpeg",
    "fileSize": 8168,
    "type": 0
  },
  "residencyPictureId": null,
  "residencyPicture": null,
  "residencyNumber": null,
  "residencyExpirationDate": null,
  "vaccinationPictureId": "<ENCRYPTED_VACCINATION_ID>",
  "vaccinationPicture": {
    "fileName": "vaccination.jpeg",
    "fileSize": 168035,
    "id": "<VACCINATION_ID>",
    "fileExtension": ".jpeg",
    "showDelete": true
  },
  "email": "user@example.com",
  "phone": { "countryCode": 91, "phoneNumber": "9004481414" },
  "mobileCountryKey": 91,
  "mobileNo": "9004481414",
  "postalCode": "671121",
  "poBox": "671121",
  "birthCountryId": 91,
  "birthCityName": "INDS"
}
```

---

## 2. UmrahBus Invoicing Gateway

Submits billing and passenger invoice batches to the UmrahBus platform.

* **Method:** `POST`
* **URL:** `https://report.umrabus.com/api/passport/upload-invoices`
* **Header:** `Content-Type: application/json`
* **Request Body:**
```json
[
  {
    "partyID": 2,
    "remarks": "Voucher No",
    "qty": 10,
    "rate": 500,
    "amt": 5000,
    "visaFileDetailID": 1,
    "typ": 2,
    "umrahCompanyID": 442,
    "groupCode": "UMR001",
    "cost": 200,
    "costAmt": 2000,
    "umrahType": 1
  }
]
```

* **cURL Template:**
```bash
curl -X POST https://report.umrabus.com/api/passport/upload-invoices \
  -H "Content-Type: application/json" \
  -d '[
    {
      "partyID": 2,
      "remarks": "Voucher No",
      "qty": 10,
      "rate": 500,
      "amt": 5000,
      "visaFileDetailID": 1,
      "typ": 2,
      "umrahCompanyID": 442,
      "groupCode": "UMR001",
      "cost": 200,
      "costAmt": 2000,
      "umrahType": 1
    }
  ]'
```

---

## 3. LinalaPro WhatsApp Cloud API

Enterprise WhatsApp Cloud API gateway integration for transactional alerts and status updates.

* **Base URL:** `https://wa.linalapro.com`
* **Headers:**
  * `X-API-Key: <API_KEY>`
  * `X-API-Secret: <API_SECRET>`
  * `X-Channel-Id: <CHANNEL_UUID>`
  * `Content-Type: application/json`

### Template Message Dispatch
* **Endpoint:** `POST /api/v1/messages/template`
```json
{
  "to": "966509179792",
  "templateName": "ecom_payment_status_alert",
  "language": "en_US",
  "components": [
    {
      "type": "body",
      "parameters": [
        { "type": "text", "text": "Customer Name" },
        { "type": "text", "text": "Confirmed" }
      ]
    }
  ]
}
```

### Direct Message Dispatch
* **Endpoint:** `POST /api/v1/messages`
```bash
curl -X POST https://wa.linalapro.com/api/v1/messages \
  -H "X-API-Key: <API_KEY>" \
  -H "X-API-Secret: <API_SECRET>" \
  -H "X-Channel-Id: <CHANNEL_ID>" \
  -H "Content-Type: application/json" \
  -d '{ "to": "+919633348491", "message": "Your booking confirmation details..." }'
```

---

## 4. WizWat WhatsApp Gateway

Alternative QR-based and token-based WhatsApp dispatch service.

* **Base URL:** `https://app.wizwat.com`
* **Endpoints:**
  * `POST /api/qr/rest/send_message`
  * `POST /api/v1/send-message?token=<JWT>`

* **Payload:**
```json
{
  "messageType": "text",
  "requestType": "POST",
  "token": "<JWT_TOKEN>",
  "from": "97334599814",
  "to": "919633348491",
  "text": "Your Umrah booking confirmation"
}
```

* **cURL Template:**
```bash
curl -X POST "https://app.wizwat.com/api/qr/rest/send_message" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "token": "<TOKEN>",
    "from": "97334599814",
    "to": "919633348491",
    "messageType": "text",
    "requestType": "POST",
    "text": "Test message"
  }'
```

---

## 5. ZeptoMail (Zoho Transactional Email)

Transactional email dispatch for booking invoices and status changes.

* **Base URL:** `https://api.zeptomail.in`
* **Endpoint:** `POST /v1.1/email`
* **Required Header:** `Authorization: Zoho-enczapikey <KEY>`
* **Payload:**
```json
{
  "from": { "address": "noreply@linalapro.com" },
  "to": [
    { "email_address": { "address": "awad@linalapro.com", "name": "Awad" } }
  ],
  "subject": "Booking Confirmation",
  "htmlbody": "<div><b>Your booking has been confirmed successfully.</b></div>"
}
```
