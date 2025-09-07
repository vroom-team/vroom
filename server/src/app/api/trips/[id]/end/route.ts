import { errorHandler } from "@/server/helpers/ErrorHandler";
import CustomError from "@/server/helpers/CustomError";
import Trip from "@/server/models/Trip";
import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { calculateTripDistance, calculateTripDuration } from "@/server/helpers/Calculator";

export async function PATCH(req: NextRequest, params: { params: Promise<{ id: string }> }) {
  try {
    const userId = req.headers.get('x-user-id') as string;
    const {id} = await params.params
    if (!userId) {
      throw new CustomError("Unauthorized", 401);
    }

    const body = await req.json();
    const { endPoint, isPublic } = body;

    if (!endPoint || !endPoint.lat || !endPoint.lng) {
      throw new CustomError("End point coordinates are required", 400);
    }

    const trip = await Trip.where('_id', new ObjectId(id)).first();

    if (!trip) {
      throw new CustomError("Trip not found", 404);
    }

    trip.endPoint = endPoint;
    trip.endTime = new Date();
    trip.isPublic = isPublic || false;

    // Calculate distance and duration
    trip.distance = calculateTripDistance(trip);
    trip.duration = calculateTripDuration(trip);

    // Add end point to path
    trip.path.push({
      lat: endPoint.lat,
      lng: endPoint.lng,
      timestamp: new Date()
    });

    await Trip.where('_id', trip._id).update({path: trip.path, endPoint: trip.endPoint, endTime: trip.endTime, isPublic: trip.isPublic, distance: trip.distance, duration: trip.duration})

    return Response.json({ 
      message: "Trip ended successfully",
      trip 
    }, { status: 200 });

  } catch (err: unknown) {
    const { message, status } = errorHandler(err);
    return Response.json({ message }, { status });
  }
}