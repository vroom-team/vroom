import { errorHandler } from "@/server/helpers/ErrorHandler";
import Post from "@/server/models/Post";
import Trip from "@/server/models/Trip";
import User from "@/server/models/User";
import { ObjectId } from "mongodb";
import { NextRequest } from "next/server";

export async function GET (req: NextRequest) {
  try {
    const id = req.headers.get('x-user-id') as string

    const user = await User.where('_id', new ObjectId(id)).first()
    if (!user) {
      return Response.json({ message: "User not found" }, { status: 404 })
    }

    // Ambil semua post milik user beserta trip
    const posts = await Post.where('userId', id).all()
    const postsWithTrip = await Promise.all(posts.map(async post => {
      const trip = post.tripId
        ? await Trip.where('_id', new ObjectId(post.tripId)).first()
        : null;
      return { ...post, trip };
    }));
    
    // Hapus password dari response
    const { password, ...userWithoutPassword } = user;
    
    return Response.json({ user: { ...userWithoutPassword, posts: postsWithTrip } }, { status: 200 })
  } catch (err : unknown) {
      const { message, status } = errorHandler(err)
      return Response.json({ message }, { status })
  }
}