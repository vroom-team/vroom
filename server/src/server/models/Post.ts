import { IMongoloquentSchema, IMongoloquentTimestamps, Model } from "mongoloquent";
import Trip, { ITrip } from "./Trip";
import User, { IUser } from "./User";

export interface IPost extends IMongoloquentSchema, IMongoloquentTimestamps {
  userId: string;
  tripId: string;
  caption?: string;     
  imageUrls?: string[]; // Tetap optional
  trip?: ITrip;         // Tetap optional (untuk populate/join)
  user?: IUser;           // Tambah untuk populate user data
}

export default class Post extends Model<IPost> {
  public static $schema: IPost;
  protected $collection: string = 'posts';

  public trip () {
    return this.hasOne(Trip)
  }

  public user () {
    return this.hasOne(User)
  }
}