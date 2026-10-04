# NuSync Partner & Developer Booking API Documentation

This document provides a comprehensive integration guide for the **NuSync Umrah Booking API** (`v1`). External systems, CRMs, B2B agency portals, and partner applications can integrate directly with this API to create, validate, and track Umrah Visa bookings of all types—including **Individual Visa**, **Group Visa**, and **Re-Entry Visa**.

---

## 🌐 1. Base URL & Environments

| Environment | Base URL |
|---|---|
| **Production** | `https://umra.moulavi.in/api/v1/external` |
| **Local / Staging** | `http://localhost:5001/api/v1/external` |

*Note: All endpoints are also accessible via alias `/api/v1/bookings`.*

---

## 🔑 2. Authentication

The API supports two authentication tiers:

### Tier 1: Admin Master API Key (For WhatsApp Bots, Internal Automations & 3rd-Party Software)
Pass your Admin Master Key in the `x-api-key` HTTP header:
```http
x-api-key: ns_master_your_admin_master_key_here
```
- **Unrestricted Access:** Bypasses agency-level ticket restrictions (one-way and without-ticket).
- **Multi-Agency Routing:** Specify any target agency via `"partyId": "uuid"` or `"partyCode": "AGN123"` in the request payload, or omit it to create direct in-house bookings (`B2C_DIRECT`).
- **Full Scope:** Admins can query and list bookings across all agencies or filter by `?partyId=...`.

### Tier 2: Partner Agency API Key (Issued & Managed Exclusively by Admin)
Pass an agency API key in the `x-api-key` header:
```http
x-api-key: ns_live_agency_token_here
```
- **Agency Scope:** Bookings created are strictly attributed to the agency owning the token.
- **Admin Issuance:** Agency tokens can only be issued, rotated, or revoked by Admin under **Settings > API Control & Developer Portal**.

### Tier 3: Bearer JWT Token
Pass a standard Bearer token acquired from `/api/auth/login`:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

---

## 🔄 3. Booking Lifecycle & Admin Workflow

When an external system creates a booking request via this API, the system executes the following flow:

```mermaid
flowchart TD
    A["External CRM / App"] -->|"POST /bookings"| B["NuSync Partner API"]
    B -->|"Validate & Assign Ref ID (e.g. UB-261004-001)"| C["Umrah Visa Booking (Status: pending / group_assigned)"]
    C --> D["Instant Admin Portal Visibility"]
    D --> E["1. Group Allocation (/assign-group)"]
    D --> F["2. Trip Operations (/trip-info)"]
    D --> G["3. Voucher Issuance (/services/voucher)"]
    G --> H["Status: voucher_generated (Voucher # assigned)"]
    H --> I["Transport Tafweej & Operational PDF Printing"]
```

---

## 📑 4. API Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/bookings` | **Create Booking Request** (Individual, Group, Re-Entry) |
| `POST` | `/bookings/validate` | **Dry-Run Validation** (Validates payload without database writes) |
| `GET` | `/bookings` | **List Bookings** (Pagination, status, search, date filters) |
| `GET` | `/bookings/:bookingReference` | **Get Single Booking** (Full passenger graph, hotels, flights, voucher) |
| `POST` | `/bookings/:bookingReference/documents` | **Upload Document Attachments** (Passports, Visas, Tickets) |
| `POST` | `/bookings/:bookingReference/cancel` | **Request Cancellation** (For pending bookings) |
| `GET` | `/masters/lookup` | **Master Catalogs** (Hotels, Airports, Transport Routes, Providers) |

---

## 🚀 5. Booking Creation Endpoints (`POST /bookings`)

### Use Case 1: Individual Visa Booking (`visaType: "individual_visa"`)

Used for standard individual bookings (1 to 50 passengers).

#### Request Body
```json
{
  "visaType": "individual_visa",
  "guestName": "Mohammad Farooq",
  "guestMobile": "+919876543210",
  "passengers": [
    {
      "fullName": "Mohammad Farooq",
      "isLeadPassenger": true,
      "passportNumber": "Z9876543",
      "nationality": "IN",
      "gender": "male",
      "dateOfBirth": "1988-05-12",
      "passportExpiry": "2032-11-20",
      "phoneNumber": "+919876543210"
    },
    {
      "fullName": "Ayesha Farooq",
      "isLeadPassenger": false,
      "passportNumber": "Z9876544",
      "nationality": "IN",
      "gender": "female",
      "dateOfBirth": "1992-08-15",
      "passportExpiry": "2033-04-10"
    }
  ],
  "arrivalDate": "2026-11-10",
  "arrivalTime": "14:30",
  "arrivalAirportCode": "JED",
  "arrivalFlightNumber": "SV-742",
  "departureDate": "2026-11-24",
  "departureTime": "19:00",
  "departureAirportCode": "MED",
  "departureFlightNumber": "SV-831",
  "accommodationType": "hotel",
  "hotelBookings": [
    {
      "hotelName": "Al-Olayan Al-Khalil",
      "cityName": "Makkah",
      "checkInDate": "2026-11-10",
      "checkOutDate": "2026-11-17",
      "bedsQuantity": 2
    },
    {
      "hotelName": "Amjad Al-Salam",
      "cityName": "Madinah",
      "checkInDate": "2026-11-17",
      "checkOutDate": "2026-11-24",
      "bedsQuantity": 2
    }
  ]
}
```

---

### Use Case 2: Re-Entry Visa Booking (`visaType: "re_entry"`)

Used for pilgrims or residents re-entering the Kingdom on a previous visa or Iqama stay.

#### Request Body
```json
{
  "visaType": "re_entry",
  "umrahVisaNumber": "6092184910",
  "guestName": "Tariq Mahmood",
  "guestMobile": "+966551122334",
  "passengers": [
    {
      "fullName": "Tariq Mahmood",
      "isLeadPassenger": true,
      "passportNumber": "P4488123",
      "nationality": "PK",
      "gender": "male",
      "dateOfBirth": "1985-03-21",
      "passportExpiry": "2030-05-15",
      "visaNumber": "6092184910"
    }
  ],
  "arrivalDate": "2026-11-05",
  "arrivalTime": "10:00",
  "arrivalAirportCode": "JED",
  "arrivalFlightNumber": "SV-711",
  "departureDate": "2026-11-15",
  "departureTime": "18:00",
  "departureAirportCode": "JED",
  "departureFlightNumber": "SV-712",
  "accommodationType": "iqama",
  "iqamaDetails": {
    "iqamaNumber": "2489012345",
    "iqamaSponserName": "Abdulrahman Al-Ghamdi",
    "sponserDob": "1978-06-14",
    "sponserMobileNumber": "+966509988776",
    "sponserNationalShortAddress": "RRTA2941, Jeddah",
    "sponserNationality": "Saudi Arabia",
    "makkahHotelName": "Iqama Resident Host Makkah"
  }
}
```

---

### Use Case 3: Group Visa Booking (`visaType: "group_visa"`)

Used for large groups pre-assigned with an official Group Code/Number.

#### Request Body
```json
{
  "visaType": "group_visa",
  "groupNumber": "GRP-88992201",
  "groupName": "Al-Badr Group Nov 2026",
  "guestName": "Sheikh Usman Ghani",
  "guestMobile": "+919844556677",
  "passengers": [
    {
      "fullName": "Sheikh Usman Ghani",
      "isLeadPassenger": true,
      "passportNumber": "K1122334",
      "nationality": "IN",
      "gender": "male",
      "dateOfBirth": "1975-01-10",
      "passportExpiry": "2031-09-12"
    },
    {
      "fullName": "Zainab Usman",
      "isLeadPassenger": false,
      "passportNumber": "K1122335",
      "nationality": "IN",
      "gender": "female",
      "dateOfBirth": "1980-04-18",
      "passportExpiry": "2031-10-15"
    }
  ],
  "arrivalDate": "2026-11-12",
  "arrivalTime": "11:20",
  "arrivalAirportCode": "JED",
  "arrivalFlightNumber": "AI-965",
  "departureDate": "2026-11-26",
  "departureTime": "22:15",
  "departureAirportCode": "MED",
  "departureFlightNumber": "AI-966",
  "accommodationType": "hotel",
  "hotelBookings": [
    {
      "hotelName": "fajr alnosk",
      "cityName": "Makkah",
      "checkInDate": "2026-11-12",
      "checkOutDate": "2026-11-19",
      "bedsQuantity": 2
    },
    {
      "hotelName": "DIWAN ALMADINAH HOTEL",
      "cityName": "Madinah",
      "checkInDate": "2026-11-19",
      "checkOutDate": "2026-11-26",
      "bedsQuantity": 2
    }
  ]
}
```

---

## 📦 6. Successful Creation Response (`201 Created`)

```json
{
  "success": true,
  "message": "Booking request created successfully and queued for admin processing.",
  "data": {
    "bookingReference": "UB-261004-001",
    "id": "767d6976-3ffa-4ed4-bcf7-3ccaed2f0f16",
    "status": "pending",
    "visaType": "individual_visa",
    "groupNumber": null,
    "groupName": "Grp-Mohammad",
    "guestName": "Mohammad Farooq",
    "passengerCount": 2,
    "passengers": [
      {
        "id": "60c02df8-9ffd-473a-a5a6-a9fd53021c3e",
        "fullName": "Mohammad Farooq",
        "passportNumber": "Z9876543",
        "nationality": "IN",
        "isLeadPassenger": true
      },
      {
        "id": "af3d8389-47de-40a6-ae6d-42c021f9fc4e",
        "fullName": "Ayesha Farooq",
        "passportNumber": "Z9876544",
        "nationality": "IN",
        "isLeadPassenger": false
      }
    ],
    "submittedAt": "2026-10-04T09:19:47.239Z",
    "party": {
      "id": "26fdabf7-987e-471b-8c37-dc86873c4d71",
      "partyCode": "2",
      "partyName": "NAS HOLIDAYS"
    }
  }
}
```

---

## 🔍 7. Dry-Run Validation (`POST /bookings/validate`)

To test if a payload is valid without writing records to the database, use `/bookings/validate`.

#### Response (`200 OK`)
```json
{
  "success": true,
  "message": "Payload passed all validation checks",
  "errors": [],
  "warnings": []
}
```

#### Response on Errors (`422 Unprocessable Entity`)
```json
{
  "success": false,
  "message": "Payload contains validation errors",
  "errors": [
    "Departure date cannot be earlier than arrival date.",
    "Hotel booking #1: checkInDate and checkOutDate are required."
  ],
  "warnings": []
}
```

---

## 📋 8. List & Filter Bookings (`GET /bookings`)

Query Parameters:
- `page` (number, default: `1`)
- `limit` (number, default: `20`, max: `100`)
- `status` (`pending`, `group_assigned`, `voucher_generated`, `completed`, `cancelled`, `all`)
- `visaType` (`individual_visa`, `group_visa`, `re_entry`, `all`)
- `search` (keyword search on Reference, Group Number, Guest Name, Mobile, Passport Number)
- `fromDate` / `toDate` (`YYYY-MM-DD`)

---

## 🗂️ 9. Master Catalogs Lookup (`GET /masters/lookup`)

Returns all system master data to allow external apps to build dropdown selectors:
- **Airports** (Jeddah `JED`, Madinah `MED`, Riyadh `RUH`, Dammam `DMM`, etc.)
- **Hotels** (Active hotel masters for Makkah and Madinah)
- **Cities** (Makkah, Madinah, Jeddah, Taif, Yanbu, Dammam)
- **Transport Routes & Vehicle Types** (Sedan, Staria, Coaster, Coach Bus)
- **Umrah Visa Providers / Suppliers**

---

## 💻 10. Code Samples

### cURL
```bash
curl -X POST https://umra.moulavi.in/api/v1/external/bookings \
  -H "Content-Type: application/json" \
  -H "x-api-key: ns_live_your_api_key" \
  -d '{ ...json payload... }'
```

### JavaScript (Node.js / Axios)
```javascript
const axios = require('axios');

const response = await axios.post('https://umra.moulavi.in/api/v1/external/bookings', {
  visaType: 'individual_visa',
  guestName: 'Ahmed Khan',
  passengers: [{ fullName: 'Ahmed Khan', passportNumber: 'P1234567', nationality: 'IN' }],
  arrivalDate: '2026-11-10',
  departureDate: '2026-11-20',
  accommodationType: 'hotel',
  hotelBookings: [{ hotelName: 'fajr alnosk', cityName: 'Makkah', checkInDate: '2026-11-10', checkOutDate: '2026-11-20' }]
}, {
  headers: {
    'x-api-key': 'ns_live_your_api_key',
    'Content-Type': 'application/json'
  }
});

console.log('Booking Created:', response.data.data.bookingReference);
```

### Python (Requests)
```python
import requests

url = "https://umra.moulavi.in/api/v1/external/bookings"
headers = {
    "x-api-key": "ns_live_your_api_key",
    "Content-Type": "application/json"
}
payload = {
    "visaType": "individual_visa",
    "guestName": "Ahmed Khan",
    "passengers": [{"fullName": "Ahmed Khan", "passportNumber": "P1234567", "nationality": "IN"}],
    "arrivalDate": "2026-11-10",
    "departureDate": "2026-11-20",
    "accommodationType": "hotel",
    "hotelBookings": [{"hotelName": "fajr alnosk", "cityName": "Makkah", "checkInDate": "2026-11-10", "checkOutDate": "2026-11-20"}]
}

response = requests.post(url, json=payload, headers=headers)
print("Booking Reference:", response.json()["data"]["bookingReference"])
```
