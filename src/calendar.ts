import { getAccessToken } from './auth';
import { BaggageEvent } from './types';

export const saveToGoogleCalendar = async (event: BaggageEvent) => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('You must be signed in to save to Google Calendar.');
  }

  if (!event.departureDate) {
    throw new Error('No departure date available to save to calendar.');
  }

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      summary: `Baggage: ${event.providerName} (${event.route})`,
      description: `
Provider: ${event.providerName}
Rute: ${event.route}
Kebijakan: ${event.policy}
Biaya: ${event.pricePerKg}

Alamat Kairo: ${event.addressCairo || 'Tidak Diketahui'}
Alamat Indonesia: ${event.addressIndonesia || 'Tidak Diketahui'}

Hubungi: ${event.phoneNumbers.map((p) => `wa.me/${p}`).join(', ')}
      `.trim(),
      start: {
        date: event.departureDate
      },
      end: {
        date: event.departureDate
      }
    })
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(`Failed to save to Google Calendar: ${errorData.error?.message || res.statusText}`);
  }

  return await res.json();
};
