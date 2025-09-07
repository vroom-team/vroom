import { errorHandler } from "@/server/helpers/ErrorHandler";
import CustomError from "@/server/helpers/CustomError";
import { NextRequest } from "next/server";
import Trip from "@/server/models/Trip";

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') as string;
    if (!userId) {
      throw new CustomError("Unauthorized", 401);
    }

    const body = await req.json();
    const { startPoint } = body;

    if (!startPoint || !startPoint.lat || !startPoint.lng) {
      throw new CustomError("Start point coordinates are required", 400);
    }

    const trip = await Trip.create({
      userId,
      startPoint,
      startTime: new Date(),
      path: [{
        lat: startPoint.lat,
        lng: startPoint.lng,
        timestamp: new Date()
      }]
    });


    return Response.json({ 
      message: "Trip started successfully",
      trip 
    }, { status: 201 });

  } catch (err: unknown) {
    const { message, status } = errorHandler(err);
    return Response.json({ message }, { status });
  }
}

// export async function GET(req: NextRequest) {
//   try {
//     const userId = req.headers.get('x-user-id') as string;
//     if (!userId) {
//       throw new CustomError("Unauthorized", 401);
//     }

//     const { searchParams } = new URL(req.url);
//     const isPublic = searchParams.get('public');
    
//     let query: any = {};
    
//     if (isPublic === 'true') {
//       query.isPublic = true;
//     } else {
//       query.userId = userId;
//     }

//     const trips = await Trip.find(query)
//       .populate('userId', 'name email')
//       .sort({ createdAt: -1 });

//     return Response.json({ trips }, { status: 200 });

//   } catch (err: unknown) {
//     const { message, status } = errorHandler(err);
//     return Response.json({ message }, { status });
//   }
// }