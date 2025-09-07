import { errorHandler } from "@/server/helpers/ErrorHandler";
import { NextRequest } from "next/server";
import Follow from "@/server/models/Follow";
import User from "@/server/models/User";
import { ObjectId } from "mongodb";
import CustomError from "@/server/helpers/CustomError";

// Type interfaces
interface FollowRequest {
  followingId: string;
}

interface FollowRecord {
  _id?: string;
  $id?: string;
  followerId: string;
  followingId: string;
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

interface CleanFollowData {
  _id: string;
  followerId: string;
  followingId: string;
  user?: {
    _id: string;
    name: string;
    email: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

// Helper function untuk clean follow data
function cleanFollowData(follow: FollowRecord | { _id?: ObjectId; $id?: ObjectId; followerId: string; followingId: string; createdAt?: Date; updatedAt?: Date }): CleanFollowData {
  const plainObject = JSON.parse(JSON.stringify(follow)) as Record<string, unknown>;
  
  return {
    _id: (plainObject._id as string) || (plainObject.$id as string) || '',
    followerId: plainObject.followerId as string,
    followingId: plainObject.followingId as string,
    user: (plainObject.user as CleanFollowData['user']) || null,
    createdAt: plainObject.createdAt ? new Date(plainObject.createdAt as string) : new Date(),
    updatedAt: plainObject.updatedAt ? new Date(plainObject.updatedAt as string) : new Date()
  };
}

// GET - Get followers or following list
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type'); // 'followers' or 'following'
    
    if (!userId) {
      return Response.json(
        { success: false, message: "User ID is required" },
        { status: 400 }
      );
    }

    if (!type || !['followers', 'following'].includes(type)) {
      return Response.json(
        { success: false, message: "Type must be 'followers' or 'following'" },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await User.where('_id', new ObjectId(userId)).first();
    if (!user) {
      return Response.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Get follow data
    const followsCollection = await Follow.all();
    const allFollows = Array.from(followsCollection) as unknown as FollowRecord[];
    
    let followData: FollowRecord[];
    
    if (type === 'followers') {
      // Users who follow this user
      followData = allFollows.filter((follow: FollowRecord) => 
        follow.followingId === userId
      );
    } else {
      // Users this user is following
      followData = allFollows.filter((follow: FollowRecord) => 
        follow.followerId === userId
      );
    }

    // Populate user data
    const followsWithUser = await Promise.all(followData.map(async (follow: FollowRecord) => {
      const targetUserId = type === 'followers' ? follow.followerId : follow.followingId;
      const targetUser = await User.where('_id', new ObjectId(targetUserId)).first() as UserRecord | null;
      
      const cleanFollow = cleanFollowData(follow);
      cleanFollow.user = targetUser ? {
        _id: (targetUser._id || targetUser.$id || '') as string,
        name: targetUser.name,
        email: targetUser.email
      } : null;
      
      return cleanFollow;
    }));

    return Response.json({
      success: true,
      data: followsWithUser,
      total: followsWithUser.length,
      type: type
    }, { status: 200 });

  } catch (error) {
    console.error("GET Follow Error:", error);
    const { message, status } = errorHandler(error);
    return Response.json({
      success: false,
      message: message || "Failed to fetch follow data"
    }, { status });
  }
}

// POST - Follow/Unfollow user (toggle)
export async function POST(req: NextRequest) {
  try {
    const followerId = req.headers.get("x-user-id");
    
    if (!followerId) {
      return Response.json(
        { success: false, message: "User not authenticated" },
        { status: 401 }
      );
    }

    const body: FollowRequest = await req.json();
    
    if (!body.followingId) {
      return Response.json(
        { success: false, message: "Following user ID is required" },
        { status: 400 }
      );
    }

    // Prevent self-follow
    if (followerId === body.followingId) {
      return Response.json(
        { success: false, message: "Cannot follow yourself" },
        { status: 400 }
      );
    }

    // Verify target user exists
    const targetUser = await User.where('_id', new ObjectId(body.followingId)).first();
    if (!targetUser) {
      return Response.json(
        { success: false, message: "User to follow not found" },
        { status: 404 }
      );
    }

    // Check if already following
    const followsCollection = await Follow.all();
    const allFollows = Array.from(followsCollection) as unknown as FollowRecord[];
    const existingFollow = allFollows.find((follow: FollowRecord) => 
      follow.followerId === followerId && follow.followingId === body.followingId
    );

    if (existingFollow) {
      // Unfollow - remove the follow
      const followId = (existingFollow._id || existingFollow.$id) as string;
      if (followId) {
        await Follow.destroy(followId);
      }

      // Get updated counts
      const updatedFollowsCollection = await Follow.all();
      const updatedFollows = Array.from(updatedFollowsCollection) as unknown as FollowRecord[];
      
      const followersCount = updatedFollows.filter((follow: FollowRecord) => 
        follow.followingId === body.followingId
      ).length;
      
      const followingCount = updatedFollows.filter((follow: FollowRecord) => 
        follow.followerId === followerId
      ).length;

      return Response.json({
        success: true,
        message: "User unfollowed successfully",
        isFollowing: false,
        followersCount,
        followingCount
      }, { status: 200 });

    } else {
      // Follow - create new follow
      const followData = {
        followerId,
        followingId: body.followingId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await Follow.create(followData);

      // Get updated counts
      const updatedFollowsCollection = await Follow.all();
      const updatedFollows = Array.from(updatedFollowsCollection) as unknown as FollowRecord[];
      
      const followersCount = updatedFollows.filter((follow: FollowRecord) => 
        follow.followingId === body.followingId
      ).length;
      
      const followingCount = updatedFollows.filter((follow: FollowRecord) => 
        follow.followerId === followerId
      ).length;

      return Response.json({
        success: true,
        message: "User followed successfully",
        isFollowing: true,
        followersCount,
        followingCount
      }, { status: 201 });
    }

  } catch (error) {
    console.error("POST Follow Error:", error);
    const { message, status } = errorHandler(error);
    return Response.json({
      success: false,
      message: message || "Failed to toggle follow"
    }, { status });
  }
}

// PUT - Check follow status
export async function PUT(req: NextRequest) {
  try {
    const followerId = req.headers.get("x-user-id");
    
    if (!followerId) {
      return Response.json(
        { success: false, message: "User not authenticated" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const followingId = searchParams.get('followingId');
    
    if (!followingId) {
      return Response.json(
        { success: false, message: "Following user ID is required" },
        { status: 400 }
      );
    }

    // Check if following
    const followsCollection = await Follow.all();
    const allFollows = Array.from(followsCollection) as unknown as FollowRecord[];
    const isFollowing = allFollows.some((follow: FollowRecord) => 
      follow.followerId === followerId && follow.followingId === followingId
    );

    // Get user's follow counts
    const followersCount = allFollows.filter((follow: FollowRecord) => 
      follow.followingId === followingId
    ).length;
    
    const followingCount = allFollows.filter((follow: FollowRecord) => 
      follow.followerId === followerId
    ).length;

    return Response.json({
      success: true,
      isFollowing,
      followersCount,
      followingCount
    }, { status: 200 });

  } catch (error) {
    console.error("PUT Follow Check Error:", error);
    const { message, status } = errorHandler(error);
    return Response.json({
      success: false,
      message: message || "Failed to check follow status"
    }, { status });
  }
}
