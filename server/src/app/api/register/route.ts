
import { errorHandler } from "@/server/helpers/ErrorHandler";
import User from "@/server/models/User";
import bcrypt from "bcryptjs";
import z, { ZodError } from "zod";

const userSchema = z.object({
  name: z.string().min(1, {message: "Name is required"}),
  email: z.email("Invalid email format"),
  password: z.string().min(5, {message: "Password lenght minimum is 5"})
})

export async function POST(req: Request) {
    try {
       
       const body = await req.json()
       userSchema.parse(body)
       const user = await User.where("email", body.email).first()
       if (user) {
         return Response.json({message: "Email already exists"}, {status: 400})  
       }

       body.password = bcrypt.hashSync(body.password, 10)

       
        const userCreated = await User.create(body)  
        return Response.json({ message: "Register success" }, { status: 201 })        
    } catch (error: unknown) {
        const { message, status } = errorHandler(error)
        return Response.json({ message }, { status })
    }
}