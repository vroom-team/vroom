import { IMongoloquentSchema, IMongoloquentTimestamps, Model } from "mongoloquent";

export interface ILike extends IMongoloquentSchema, IMongoloquentTimestamps {
  userId: string;
  postId: string;
}

export default class Like extends Model<ILike> {
  public static $schema: ILike;
  protected $collection: string = 'likes';
}
