export interface IUpsertRoommatePreference {
  budgetMin: number;
  budgetMax: number;
  preferredArea?: string;
  moveInDate?: Date;
  lifestyleTags?: string[];
  bio?: string;
}

export interface IMatchResult {
  tenantId: string;
  name: string;
  contactNumber: string | null;
  matchScore: number;
  budgetOverlap: { min: number; max: number } | null;
  sharedLifestyleTags: string[];
  sameArea: boolean;
  preference: {
    budgetMin: number;
    budgetMax: number;
    preferredArea: string | null;
    moveInDate: Date | null;
    bio: string | null;
  };
}
