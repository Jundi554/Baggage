export interface BaggageEvent {
  id: string;
  providerName: string;
  route: string;
  policy: string;
  pricePerKg: string | number;
  phoneNumbers: string[];
  departureDate: string | null; // ISO format: YYYY-MM-DD
  addressCairo?: string;
  addressIndonesia?: string;
  createdAt: string; // ISO format
  isCompleted?: boolean;
}
