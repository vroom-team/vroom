import { IMongoloquentSchema, IMongoloquentTimestamps, Model } from "mongoloquent";
import { ObjectId } from "mongodb";

export interface IFollow extends IMongoloquentSchema, IMongoloquentTimestamps {
  followerId: string;     // User yang melakukan follow
  followingId: string;    // User yang di-follow
}

export default class Follow extends Model<IFollow> {
  public static $schema: IFollow;
  protected $collection: string = 'follows';
}
