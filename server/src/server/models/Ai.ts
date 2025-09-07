import z, { ZodError } from "zod";
import CustomError from "../helpers/CustomError";
import { IMongoloquentSchema, IMongoloquentTimestamps, Model } from "mongoloquent";

interface IAiRecommendation extends IMongoloquentSchema, IMongoloquentTimestamps {
  userId?: string;
  location: string;
  category: string;
  budget?: string;
  duration?: string;
  prompt: string;
  response: {
    recommendations: Array<{
      name: string;
      description: string;
      location: string;
      category: string;
      estimatedCost: string;
      rating?: number;
      highlights: string[];
    }>;
    summary: string;
    tips: string[];
  };
  rating?: number;
  feedback?: string;
  isPublic: boolean;
}

export default class AiRecommendation extends Model<IAiRecommendation> {
  public static $schema: IAiRecommendation;
  protected $collection: string = 'ai_recommendations';
}