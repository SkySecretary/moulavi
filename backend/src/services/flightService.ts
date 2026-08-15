import axios from 'axios';

export class FlightService {
  private static AVIATIONSTACK_API_KEY = process.env.AVIATIONSTACK_API_KEY || '';

  /**
   * Search flights via Aviationstack Live API or mock fallback
   */
  public static async searchFlights(origin: string, destination: string, date: string) {
    if (!this.AVIATIONSTACK_API_KEY) {
      console.log('[FLIGHT SERVICE] AVIATIONSTACK_API_KEY not configured. Returning dynamic mock flights.');
      return this.getMockFlights(origin, destination, date);
    }

    try {
      const response = await axios.get('http://api.aviationstack.com/v1/flights', {
        params: {
          access_key: this.AVIATIONSTACK_API_KEY,
          dep_iata: origin || 'JED',
          arr_iata: destination || 'DXB',
          flight_date: date
        },
        timeout: 8000
      });

      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        console.log(`[FLIGHT SERVICE] Live flights fetched: ${response.data.data.length} items.`);
        return response.data.data.map((f: any) => ({
          carrier: f.airline?.name || 'Saudi Arabian Airlines',
          flightNumber: f.flight?.iata || `${f.airline?.iata || 'SV'}-${f.flight?.number || '300'}`,
          departureTime: f.departure?.scheduled ? new Date(f.departure.scheduled).toISOString().split('T')[1].substring(0, 5) : '08:00',
          arrivalTime: f.arrival?.scheduled ? new Date(f.arrival.scheduled).toISOString().split('T')[1].substring(0, 5) : '11:45',
          price: f.flight?.number ? (400 + (parseInt(f.flight.number, 10) % 600)) : 950 // Baseline calculations
        }));
      }

      return this.getMockFlights(origin, destination, date);
    } catch (err: any) {
      console.error('[FLIGHT SERVICE] Aviationstack API request failed, using fallback:', err.message);
      return this.getMockFlights(origin, destination, date);
    }
  }

  private static getMockFlights(origin: string, destination: string, date: string) {
    return [
      {
        carrier: 'Saudi Arabian Airlines',
        flightNumber: 'SV-320',
        departureTime: '06:30',
        arrivalTime: '09:45',
        price: 920
      },
      {
        carrier: 'Flynas',
        flightNumber: 'XY-204',
        departureTime: '10:15',
        arrivalTime: '13:30',
        price: 650
      },
      {
        carrier: 'Flyadeal',
        flightNumber: 'F3-112',
        departureTime: '16:00',
        arrivalTime: '19:15',
        price: 520
      }
    ];
  }
}
