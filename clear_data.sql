-- Clear all transaction data
DELETE FROM voucher_movements;
DELETE FROM voucher_hotels;
DELETE FROM voucher_flights;
DELETE FROM vouchers;

DELETE FROM umrah_passengers;
DELETE FROM documents;
DELETE FROM booking_status_history;
DELETE FROM umrah_hotel_bookings;
DELETE FROM umrah_movement_details;
DELETE FROM umrah_sponser_iqama_details;
DELETE FROM umrah_transport_bookings;
DELETE FROM umrah_travel_details;
DELETE FROM umrah_visa_bookings;

-- Reset auto-increment sequences (SQLite specific)
DELETE FROM sqlite_sequence WHERE name IN (
    'voucher_movements', 'voucher_hotels', 'voucher_flights', 'vouchers',
    'umrah_passengers', 'documents', 'booking_status_history', 'umrah_hotel_bookings',
    'umrah_movement_details', 'umrah_sponser_iqama_details', 'umrah_transport_bookings',
    'umrah_travel_details', 'umrah_visa_bookings'
);

VACUUM;
