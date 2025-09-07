import { IMongoloquentSchema, IMongoloquentTimestamps, Model } from "mongoloquent";

// Interface untuk Wishlist item
export interface IWishlist extends IMongoloquentSchema, IMongoloquentTimestamps {
  userId: string;
  isVisited: boolean;
  source: {
    // Data dari AI recommendation
    name: string;
    description: string;
    location: string;
    category: string;
    estimatedCost: string;
    rating: number;
    highlights: string[];
    // Reference ke AI recommendation ID jika diperlukan
    aiRecommendationId?: string;
  };
}

export default class Wishlist extends Model<IWishlist> {
  public static $schema: IWishlist;
  protected $collection: string = 'wishlists';
}
