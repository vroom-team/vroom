import { errorHandler } from "@/server/helpers/ErrorHandler";
import { NextRequest } from "next/server";
import Like, { ILike } from "@/server/models/Like";
import Post from "@/server/models/Post";
import User from "@/server/models/User";
import { ObjectId } from "mongodb";

// Types
interface ToggleLikeRequest {
  postId: string;
}

interface CleanLikeData {
  _id: string;
  userId: string;
  postId: string;
  user: {
    _id: string;
    name: string;
    email: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

interface LikeRecord {
  _id?: string;
  $id?: string;
  userId: string;
  postId: string;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: unknown;
}

interface UserRecord {
  _id?: string;
  $id?: string;
  name: string;
  email: string;
  [key: string]: unknown;
}

// Helper function untuk clean like data
function cleanLikeData(like: LikeRecord | { _id?: ObjectId; $id?: ObjectId; userId: string; postId: string; createdAt?: Date; updatedAt?: Date }): CleanLikeData {
  const plainObject = JSON.parse(JSON.stringify(like));
  
  return {
    _id: plainObject._id || plainObject.$id,
    userId: plainObject.userId,
    postId: plainObject.postId,
    user: plainObject.user,
    createdAt: plainObject.createdAt,
    updatedAt: plainObject.updatedAt
  };
}

// GET - Get likes for a post
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('postId');
    
    if (!postId) {
      return Response.json(
        { success: false, message: "Post ID is required" },
        { status: 400 }
      );
    }

    // Verify post exists
    const post = await Post.where('_id', new ObjectId(postId)).first();
    if (!post) {
      return Response.json(
        { success: false, message: "Post not found" },
        { status: 404 }
      );
    }

    // Get all likes for this post
    const likesCollection = await Like.all();
    const allLikes = Array.from(likesCollection) as unknown as LikeRecord[];
    const postLikes = allLikes.filter((like: LikeRecord) => 
      like.postId === postId
    );

    // Populate user data for each like
    const likesWithUser = await Promise.all(postLikes.map(async (like: LikeRecord) => {
      const user = await User.where('_id', new ObjectId(like.userId)).first() as UserRecord | null;
      
      const cleanLike = cleanLikeData(like);
      cleanLike.user = user ? {
        _id: (user as UserRecord)._id || (user as UserRecord).$id || '',
        name: (user as UserRecord).name,
        email: (user as UserRecord).email
      } : null;
      
      return cleanLike;
    }));

    return Response.json({
      success: true,
      data: likesWithUser,
      total: likesWithUser.length,
      likeCount: likesWithUser.length
    }, { status: 200 });

  } catch (error) {
    console.error("GET Likes Error:", error);
    const { message, status } = errorHandler(error);
    return Response.json({
      success: false,
      message: message || "Failed to fetch likes"
    }, { status });
  }
}

// POST - Toggle like (like/unlike)
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    
    if (!userId) {
      return Response.json(
        { success: false, message: "User not authenticated" },
        { status: 401 }
      );
    }

    const body: ToggleLikeRequest = await req.json();
    
    if (!body.postId) {
      return Response.json(
        { success: false, message: "Post ID is required" },
        { status: 400 }
      );
    }

    // Verify post exists
    const post = await Post.where('_id', new ObjectId(body.postId)).first();
    if (!post) {
      return Response.json(
        { success: false, message: "Post not found" },
        { status: 404 }
      );
    }

    // Check if user already liked this post
    const likesCollection = await Like.all();
    const allLikes = Array.from(likesCollection) as unknown as LikeRecord[];
    const existingLike = allLikes.find((like: LikeRecord) => 
      like.userId === userId && like.postId === body.postId
    );

    if (existingLike) {
      // Unlike - remove the like
      const likeId = (existingLike as LikeRecord)._id || (existingLike as LikeRecord).$id;
      if (likeId) {
        await Like.destroy(likeId);
      }

      // Get updated like count
      const updatedLikesCollection = await Like.all();
      const updatedLikes = Array.from(updatedLikesCollection) as unknown as LikeRecord[];
      const currentLikes = updatedLikes.filter((like: LikeRecord) => 
        like.postId === body.postId
      );

      return Response.json({
        success: true,
        message: "Post unliked successfully",
        isLiked: false,
        likeCount: currentLikes.length
      }, { status: 200 });

    } else {
      // Like - create new like
      const likeData = {
        userId,
        postId: body.postId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await Like.create(likeData);

      // Get updated like count
      const updatedLikesCollection = await Like.all();
      const updatedLikes = Array.from(updatedLikesCollection) as unknown as LikeRecord[];
      const currentLikes = updatedLikes.filter((like: LikeRecord) => 
        like.postId === body.postId
      );

      return Response.json({
        success: true,
        message: "Post liked successfully",
        isLiked: true,
        likeCount: currentLikes.length
      }, { status: 201 });
    }

  } catch (error) {
    console.error("POST Like Error:", error);
    const { message, status } = errorHandler(error);
    return Response.json({
      success: false,
      message: message || "Failed to toggle like"
    }, { status });
  }
}

// PUT - Check if user liked a post
export async function PUT(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    
    if (!userId) {
      return Response.json(
        { success: false, message: "User not authenticated" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('postId');
    
    if (!postId) {
      return Response.json(
        { success: false, message: "Post ID is required" },
        { status: 400 }
      );
    }

    // Check if user liked this post
    const likesCollection = await Like.all();
    const allLikes = Array.from(likesCollection) as unknown as LikeRecord[];
    const userLike = allLikes.find((like: LikeRecord) => 
      like.userId === userId && like.postId === postId
    );

    // Get total like count for this post
    const postLikes = allLikes.filter((like: LikeRecord) => 
      like.postId === postId
    );

    return Response.json({
      success: true,
      isLiked: !!userLike,
      likeCount: postLikes.length
    }, { status: 200 });

  } catch (error) {
    console.error("PUT Like Check Error:", error);
    const { message, status } = errorHandler(error);
    return Response.json({
      success: false,
      message: message || "Failed to check like status"
    }, { status });
  }
}
