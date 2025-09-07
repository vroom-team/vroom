import { errorHandler } from "@/server/helpers/ErrorHandler";
import { NextRequest } from "next/server";
import Comment from "@/server/models/Comment";
import Post from "@/server/models/Post";
import User from "@/server/models/User";
import { ObjectId } from "mongodb";

// Types
interface CreateCommentRequest {
  postId: string;
  content: string;
}

interface CleanCommentData {
  _id: string;
  userId: string;
  postId: string;
  content: string;
  user: {
    _id: string;
    name: string;
    email: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CommentRecord {
  _id?: string;
  $id?: string;
  userId: string;
  postId: string;
  content: string;
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

// Helper function untuk clean comment data
function cleanCommentData(comment: CommentRecord | { _id?: ObjectId; $id?: ObjectId; userId: string; postId: string; content: string; createdAt?: Date; updatedAt?: Date }): CleanCommentData {
  const plainObject = JSON.parse(JSON.stringify(comment));
  
  return {
    _id: plainObject._id || plainObject.$id,
    userId: plainObject.userId,
    postId: plainObject.postId,
    content: plainObject.content,
    user: plainObject.user,
    createdAt: plainObject.createdAt,
    updatedAt: plainObject.updatedAt
  };
}

// GET - Get comments for a post
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

    // Get all comments for this post
    const commentsCollection = await Comment.all();
    const allComments = Array.from(commentsCollection) as unknown as CommentRecord[];
    const postComments = allComments.filter((comment: CommentRecord) => 
      comment.postId === postId
    );

    // Sort comments by creation date (oldest first for better conversation flow)
    const sortedComments = postComments.sort((a: CommentRecord, b: CommentRecord) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateA - dateB; // Ascending order
    });

    // Populate user data for each comment
    const commentsWithUser = await Promise.all(sortedComments.map(async (comment: CommentRecord) => {
      const user = await User.where('_id', new ObjectId(comment.userId)).first() as UserRecord | null;
      
      const cleanComment = cleanCommentData(comment);
      cleanComment.user = user ? {
        _id: (user as UserRecord)._id || (user as UserRecord).$id || '',
        name: (user as UserRecord).name,
        email: (user as UserRecord).email
      } : null;
      
      return cleanComment;
    }));

    return Response.json({
      success: true,
      data: commentsWithUser,
      total: commentsWithUser.length
    }, { status: 200 });

  } catch (error) {
    console.error("GET Comments Error:", error);
    const { message, status } = errorHandler(error);
    return Response.json({
      success: false,
      message: message || "Failed to fetch comments"
    }, { status });
  }
}

// POST - Create new comment
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    
    if (!userId) {
      return Response.json(
        { success: false, message: "User not authenticated" },
        { status: 401 }
      );
    }

    const body: CreateCommentRequest = await req.json();
    
    if (!body.postId || !body.content) {
      return Response.json(
        { success: false, message: "Post ID and content are required" },
        { status: 400 }
      );
    }

    if (body.content.trim().length === 0) {
      return Response.json(
        { success: false, message: "Comment content cannot be empty" },
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

    // Create new comment
    const commentData = {
      userId,
      postId: body.postId,
      content: body.content.trim(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const savedComment = await Comment.create(commentData);

    // Get user data for response
    const user = await User.where('_id', new ObjectId(userId)).first() as UserRecord | null;
    
    const cleanComment = cleanCommentData(savedComment);
    cleanComment.user = user ? {
      _id: (user as UserRecord)._id || (user as UserRecord).$id || '',
      name: (user as UserRecord).name,
      email: (user as UserRecord).email
    } : null;

    return Response.json({
      success: true,
      message: "Comment created successfully",
      data: cleanComment
    }, { status: 201 });

  } catch (error) {
    console.error("POST Comment Error:", error);
    const { message, status } = errorHandler(error);
    return Response.json({
      success: false,
      message: message || "Failed to create comment"
    }, { status });
  }
}

// DELETE - Delete comment (only by comment owner)
export async function DELETE(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    
    if (!userId) {
      return Response.json(
        { success: false, message: "User not authenticated" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get('commentId');
    
    if (!commentId) {
      return Response.json(
        { success: false, message: "Comment ID is required" },
        { status: 400 }
      );
    }

    try {
      // Find the comment
      const comment = await Comment.find(commentId);
      
      if (!comment) {
        return Response.json(
          { success: false, message: "Comment not found" },
          { status: 404 }
        );
      }

      // Check if user owns the comment
      const commentData = comment as unknown as { userId: string };
      if (commentData.userId !== userId) {
        return Response.json(
          { success: false, message: "Unauthorized to delete this comment" },
          { status: 403 }
        );
      }

      // Delete the comment
      await Comment.destroy(commentId);

      return Response.json({
        success: true,
        message: "Comment deleted successfully"
      }, { status: 200 });

    } catch (error) {
      return Response.json(
        { success: false, message: "Comment not found" },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error("DELETE Comment Error:", error);
    const { message, status } = errorHandler(error);
    return Response.json({
      success: false,
      message: message || "Failed to delete comment"
    }, { status });
  }
}
