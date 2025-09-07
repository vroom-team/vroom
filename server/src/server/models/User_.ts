// import bcrypt from "bcryptjs";
// import { getDb } from "../config/mongodb";
// import z, { ZodError } from "zod";
// import CustomError from "../helpers/CustomError";
// import jwt from 'jsonwebtoken'

// interface IUser {
//   name : string,
//   email: string,
//   password: string
// }

// const userSchema = z.object({
//   name: z.string().min(1, {message: "Name is required"}),
//   email: z.email("Invalid email format"),
//   password: z.string().min(5, {message: "Password lenght minimum is 5"})
// })

// export default class UserUser {
//   static getCollection() {
//     const db = getDb()
//     const collection = db.collection<IUser>('users')

//     return collection
//   }

//   static async createUser(newUser: IUser): Promise<string> {
//     const collection = this.getCollection()
//     userSchema.parse(newUser)

//     const checkUserEmail = await collection.findOne({email: newUser.email})

//     if (checkUserEmail) {
//       throw new CustomError("Username already exists", 400)
//     }

//     newUser.password = bcrypt.hashSync(newUser.password, 10)

//      await collection.insertOne(newUser) 
    
//     return "Success Register"
//   }

//   static async login (email: string, password: string): Promise<string> {
//     const collection = this.getCollection()
//     const loginSchema = z.object({
//       email: z.string().email(),
//       password: z.string()
//     })
//     loginSchema.parse({ email, password })
   
//     const user = await collection.findOne( {email})
//     if (!user) {
//       throw new CustomError("Invalid email/password", 401)
//     }

//     const isPasswordValid = bcrypt.compareSync(password, user.password)

//     if (!isPasswordValid) {
//       throw new CustomError("Invalid email/password", 401)
//     }

//     const token = jwt.sign({id: user._id, email: user.email}, process.env.SECRET_KEY as string)

//     return  token
//   }
// }