import { IMongoloquentSchema, IMongoloquentTimestamps, Model } from "mongoloquent";

export interface IComment extends IMongoloquentSchema, IMongoloquentTimestamps {
  userId: string;
  postId: string;
  content: string;
}

export default class Comment extends Model<IComment> {
  public static $schema: IComment;
  protected $collection: string = 'comments';
}
