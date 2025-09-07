import { IMongoloquentSchema, IMongoloquentTimestamps, Model } from "mongoloquent";

export interface ITripPathPoint {
  lat: number;
  lng: number;
  timestamp: Date;
}

export interface ITrip extends IMongoloquentSchema, IMongoloquentTimestamps {
  userId: string;
  startPoint: { lat: number; lng: number };
  endPoint?: { lat: number; lng: number };
  startTime: Date;
  endTime?: Date;
  path: ITripPathPoint[];
  distance?: number;
  duration?: number;
  isPublic?: boolean;
}

export default class Trip extends Model<ITrip> {
  public static $schema: ITrip
  protected $collection: string = 'trips'; 
}