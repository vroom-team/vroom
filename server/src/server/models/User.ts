import bcrypt from "bcryptjs";

import z, { ZodError } from "zod";
import CustomError from "../helpers/CustomError";
import jwt from 'jsonwebtoken'
import { IMongoloquentSchema, IMongoloquentTimestamps, Model } from "mongoloquent";
import Post from "./Post";

export interface IUser extends IMongoloquentSchema, IMongoloquentTimestamps {
  name : string,
  email: string,
  password: string
}


export default class User extends Model<IUser> {
  public static $schema: IUser
  protected $collection: string = 'users'; 

  public post () {
    return this.belongsToMany(Post)
  }
}