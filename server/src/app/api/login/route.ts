
import CustomError from "@/server/helpers/CustomError"
import { errorHandler } from "@/server/helpers/ErrorHandler"
import User from "@/server/models/User"
import jwt from 'jsonwebtoken'
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
    try {
    const body = await req.json()

    const user = await User.where('email', body.email).first()

    if (!user) {
      throw new CustomError("Invalid email/password", 401)
    }

    const isPasswordValid = bcrypt.compareSync(body.password, user.password)

    if (!isPasswordValid) {
      throw new CustomError("Invalid email/password", 401)
    }

    const token = jwt.sign({id: user._id, email: user.email}, process.env.SECRET_KEY as string)

    return Response.json({ token }, { status: 200 })
  } catch (err: unknown) {
    const { message, status } = errorHandler(err)
    return Response.json({ message }, { status })
  }
}