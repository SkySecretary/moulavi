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

      if (response.data && response.data.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
        console.log(`[FLIGHT SERVICE] Live flights fetched: ${response.data.data.length} items.`);
        
        let routeMultiplier = 1.0;
        const isEuropeOrUS = ['LHR', 'LGW', 'CDG', 'FRA', 'JFK', 'LAX', 'ORD', 'YYZ', 'SFO', 'IAD'].includes(origin.toUpperCase());
        const isAsia = ['DEL', 'BOM', 'BLR', 'MAA', 'HYD', 'CCJ', 'COK', 'KHI', 'LHE', 'ISB', 'DAC', 'CGK', 'KUL', 'SIN'].includes(origin.toUpperCase());
        const isGulf = ['DXB', 'AUH', 'SHJ', 'DOH', 'MCT', 'KWI', 'BAH'].includes(origin.toUpperCase());

        if (isEuropeOrUS) routeMultiplier = 2.4;
        else if (isAsia) routeMultiplier = 1.6;
        else if (isGulf) routeMultiplier = 0.8;

        return response.data.data.map((f: any, index: number) => {
          const basePrice = f.airline?.name?.includes('Emirates') || f.airline?.name?.includes('Qatar') ? 1600 : 1100;
          let price = Math.round(basePrice * routeMultiplier);
          const flightNumVal = f.flight?.number ? parseInt(f.flight.number, 10) : index;
          price = Math.max(450, price + ((flightNumVal % 20) * 15) - 150);

          return {
            carrier: f.airline?.name || 'Saudi Arabian Airlines',
            flightNumber: f.flight?.iata || `${f.airline?.iata || 'SV'}-${f.flight?.number || '300'}`,
            departureTime: f.departure?.scheduled ? new Date(f.departure.scheduled).toISOString().split('T')[1].substring(0, 5) : '08:00',
            arrivalTime: f.arrival?.scheduled ? new Date(f.arrival.scheduled).toISOString().split('T')[1].substring(0, 5) : '11:45',
            price: price
          };
        });
      }

      return this.getMockFlights(origin, destination, date);
    } catch (err: any) {
      console.error('[FLIGHT SERVICE] Aviationstack API request failed, using fallback:', err.message);
      return this.getMockFlights(origin, destination, date);
    }
  }

  private static getMockFlights(origin: string, destination: string, date: string) {
    const orig = (origin || 'LHR').toUpperCase();
    
    const carriers = [
      { code: 'SV', name: 'Saudi Arabian Airlines', basePrice: 1200 },
      { code: 'XY', name: 'Flynas', basePrice: 750 },
      { code: 'EK', name: 'Emirates', basePrice: 1600 },
      { code: 'QR', name: 'Qatar Airways', basePrice: 1550 },
      { code: 'GF', name: 'Gulf Air', basePrice: 1100 },
      { code: 'WY', name: 'Oman Air', basePrice: 1050 },
      { code: 'EY', name: 'Etihad Airways', basePrice: 1400 },
      { code: 'FZ', name: 'flydubai', basePrice: 850 },
      { code: 'KU', name: 'Kuwait Airways', basePrice: 1000 },
      { code: 'MS', name: 'EgyptAir', basePrice: 900 }
    ];

    let routeMultiplier = 1.0;
    const isEuropeOrUS = ['LHR', 'LGW', 'CDG', 'FRA', 'JFK', 'LAX', 'ORD', 'YYZ', 'SFO', 'IAD'].includes(orig);
    const isAsia = ['DEL', 'BOM', 'BLR', 'MAA', 'HYD', 'CCJ', 'COK', 'KHI', 'LHE', 'ISB', 'DAC', 'CGK', 'KUL', 'SIN'].includes(orig);
    const isGulf = ['DXB', 'AUH', 'SHJ', 'DOH', 'MCT', 'KWI', 'BAH'].includes(orig);

    if (isEuropeOrUS) {
      routeMultiplier = 2.4;
    } else if (isAsia) {
      routeMultiplier = 1.6;
    } else if (isGulf) {
      routeMultiplier = 0.8;
    }

    const schedules = [
      { dep: '03:15', arr: '07:45', flightNumOffset: 12 },
      { dep: '07:30', arr: '11:15', flightNumOffset: 45 },
      { dep: '11:00', arr: '15:20', flightNumOffset: 88 },
      { dep: '14:45', arr: '19:00', flightNumOffset: 124 },
      { dep: '18:15', arr: '22:30', flightNumOffset: 201 },
      { dep: '22:00', arr: '02:15', flightNumOffset: 310 }
    ];

    let dateSeed = 0;
    if (date) {
      for (let i = 0; i < date.length; i++) {
        dateSeed += date.charCodeAt(i);
      }
    }

    return schedules.map((sch, index) => {
      const carrier = carriers[(index + dateSeed) % carriers.length];
      let price = Math.round(carrier.basePrice * routeMultiplier);
      const variation = ((index * 35) + (dateSeed % 15) * 10) - 100;
      price = Math.max(450, price + variation);

      return {
        carrier: carrier.name,
        flightNumber: `${carrier.code}-${sch.flightNumOffset + (dateSeed % 90)}`,
        departureTime: sch.dep,
        arrivalTime: sch.arr,
        price: price
      };
    });
  }
}
