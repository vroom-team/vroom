import { ITrip } from "../models/Trip";

function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // in meters
}

function calculateDuration(start: Date, end: Date): number {
  return Math.abs(end.getTime() - start.getTime()); // in milliseconds
}

export function calculateTripDistance(trip: ITrip): number {
  if (!trip.startPoint || !trip.endPoint) return 0;
  return haversineDistance(
    trip.startPoint.lat, trip.startPoint.lng,
    trip.endPoint.lat, trip.endPoint.lng
  );
}

export function calculateTripDuration(trip: ITrip): number {
  if (!trip.startTime || !trip.endTime) return 0;
  return calculateDuration(trip.startTime, trip.endTime);
}