export type Status = 'RENTED' | 'RESERVED' | 'ACTIVE';

export interface Pricing {
  rent?: number;
  service_fee?: number;
  full_deposit?: number;
  maintainance?: number;
  total_monthly?: number;
  deposit_months?: number;
}

export interface PropertyImage {
  title?: string;
  image_url?: string;
  large_url?: string;
  medium_url?: string;
  is_primary?: boolean;
  is_ai_generated?: boolean;
}

export interface Property {
  id: string;
  property_code?: string;
  description?: string;
  seo_description?: string;
  short_id?: string;
  floor?: number;
  total_floors?: number;
  locality?: string;
  street?: string;
  society?: string;
  society_id?: string;
  title?: string;
  latitude?: number;
  longitude?: number;
  facing?: string;
  tier?: number;
  rating?: number;
  poc?: { name?: string; phone?: string; email?: string };
  amenities?: Array<{ name?: string } | string>;
  features?: Array<{ label?: string } | string>;
  available_from?: number | string;
  bathrooms?: number;
  bedrooms?: number;
  balconies?: number;
  balconyFacing?: string;
  bhk?: string;
  floor_plan?: string;
  floorplanMap?: unknown;
  images?: PropertyImage[];
  ai_imagined?: PropertyImage[];
  preview_assets?: unknown;
  rent?: number;
  total_rent?: number;
  inactive_reason?: string | null;
  is_featured?: boolean;
  is_sponsored?: boolean;
  nearbyPlaces?: Array<{ name?: string; type?: string; distance?: number }>;
  photoTours?: unknown;
  pricing?: Pricing;
  rented_at?: number | string | null;
  marketing_started_at?: number | string | null;
  shortlisted_by?: unknown;
  visits_booked?: number;
  square_feet?: number;
  status?: Status;
  vibeMetrics?: Record<string, number> | null;
  video_url?: string;
  visitTimes?: unknown[];
  rooms?: Array<{ name?: string; type?: string; size?: string | number }>;
  createdAt?: string;
  updatedAt?: string;
  _categories?: string[];
}

export interface SnapshotMeta {
  generated_at_utc: string;
  version_timestamp: string;
  raw_file?: string;
  collated_file?: string;
  counts: {
    rented: number;
    listings: number;
    perfect: number;
    unique_properties: number;
  };
  summary_quick?: {
    listings_rent_median?: number | null;
    listings_rent_mean?: number | null;
    rented_rent_median?: number | null;
    rented_rent_mean?: number | null;
  };
}

export interface SectionSummary {
  count: number;
  by_locality: Record<string, number>;
  by_society: Record<string, number>;
  by_bhk: Record<string, number>;
  by_facing: Record<string, number>;
  by_tier: Record<string, number>;
  by_status: Record<string, number>;
  rent: { count: number; min?: number; max?: number; mean?: number; median?: number };
  total_rent: { count: number; min?: number; max?: number; mean?: number; median?: number };
  square_feet: { count: number; min?: number; max?: number; mean?: number; median?: number };
  rating: { count: number; min?: number; max?: number; mean?: number; median?: number };
  bedrooms: { count: number; min?: number; max?: number; mean?: number; median?: number };
  bathrooms: { count: number; min?: number; max?: number; mean?: number; median?: number };
}

export interface CollatedSnapshot {
  metadata: {
    generated_at_utc: string;
    version_timestamp: string;
    sources: Record<string, string>;
    api_meta: Record<string, unknown>;
    counts: {
      rented: number;
      listings: number;
      perfect: number;
      unique_properties: number;
    };
    overlap: Record<string, number | boolean>;
    schema_fields: string[];
    notes: string[];
  };
  summary: {
    rented: SectionSummary;
    listings: SectionSummary;
    perfect: SectionSummary;
    all_unique: SectionSummary;
  };
  properties: Property[];
}

export interface IndexFile {
  runs: SnapshotMeta[];
}

export type Theme = 'light' | 'dark';

export interface FilterState {
  status: 'ALL' | Status;
  tier: string;
  bhk: string;
  locality: string;
  q: string;
}

export interface InterestState {
  RENTED: number;
  RESERVED: number;
  ACTIVE: number;
}

export interface GroupCalc {
  count: number;
  avgRent: number | null;           // listed rent (homeowner-quoted) — same paid by tenant
  tenantRevenue: number;            // sum of listed rent — flows tenant→Helium→owner (net 0)
  ownerPayout: number;              // = tenantRevenue (Helium pays owner regardless of occupancy)
  heliumServiceFee: number;         // 4% retainer paid by homeowner to Helium (recurring)
  heliumBrokerage: number;          // 1 month rent paid by tenant to Helium (one-time per tenancy)
  heliumRevenue: number;            // alias of heliumServiceFee for older code paths
  monthlyRevenue: number;           // alias of tenantRevenue
  avgDays: number | null;
  avgVisits: number | null;
  avgDeposit: number | null;
  oneMonthRent: number;             // 1 month of listed rent (used as tenant security deposit)
  loan: number;                     // FinTree borrowing: full_deposit minus tenant security if any
  monthlyInterest: number;          // loan × rate% / 12 — paid out of service fee
  netRentImpact: number;            // 0 when occupied, −ownerPayout when vacant
  profit: number;                   // heliumServiceFee + netRentImpact − monthlyInterest
  interestRate: number;
}