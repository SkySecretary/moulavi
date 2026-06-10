const fs = require('fs');

async function test() {
  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ4MzRlZDljLTI1OGEtNGY2NS05NGI4LTRhN2I3YjdjZDRhNiIsImVtYWlsIjoiYXdhZG5hamlscEBnbWFpbC5jb20iLCJuYW1lIjoiUUFXQUZJTCIsInJvbGUiOiJwYXJ0eSIsImVtYWlsVmVyaWZpZWQiOmZhbHNlLCJpYXQiOjE3ODExMTQyMzEsImV4cCI6MTc4MTExNzgzMX0.cYHEW6Wzma9SYVvnE5-OuhV34kKl_EYDaumBW_TfL2g";
  const partyId = "339f8afa-2cd5-4739-90f8-37a1f6cc6159";

  const locRes = await fetch('http://localhost:5001/api/location-masters', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const locData = await locRes.json();
  const airportId = locData.locationMasters?.find(l => l.locationType === 'AIRPORT')?.id || "test-id";
  const cityId = locData.locationMasters?.find(l => l.locationType === 'HOTEL')?.cityId || "test-city-id";
  const hotelId = locData.locationMasters?.find(l => l.locationType === 'HOTEL')?.id || "test-hotel-id";

  const formData = new FormData();
  formData.append('partyId', partyId);
  formData.append('step1', JSON.stringify({ bookingMode: 'travel_details' }));
  formData.append('step2', JSON.stringify({
    arrivalDate: "2026-06-15",
    arrivalTime: "10:00",
    arrivalAirportId: airportId,
    arrivalFlightNumber: "SV-123",
    departureDate: "2026-06-25",
    departureTime: "15:00",
    departureAirportId: airportId,
    departureFlightNumber: "SV-456",
    passengerCount: 2
  }));
  formData.append('step3', JSON.stringify({
    accommodationType: 'hotel',
    hotelBookings: []
  }));

  const res = await fetch('http://localhost:5001/api/umrah-visa/create-booking', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  console.log('Create Status:', res.status);
  const data = await res.json();
  console.log('Create Response:', data);
}
test();