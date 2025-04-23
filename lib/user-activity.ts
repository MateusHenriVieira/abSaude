import { getFunctions, httpsCallable } from "firebase/functions";
import { collection, doc, addDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { toast } from "@/components/ui/use-toast"; // Import your toast utility
import { MapCoordinates } from './maps-utils';
import { getDeviceMAC } from './device-info';
import { getDeviceIP } from './ip-service';

/**
 * Logs user activity, including login/logout times, device information, IP address, and geolocation.
 * @param userId The ID of the user.
 * @param activityType The type of activity (e.g., "login", "logout").
 * @param userType The type of the user (e.g., "doctor", "nurse", "admin").
 * @param clinicId The clinic ID if applicable.
 * @param subCollection The subcollection name to log the activity into.
 */
export async function logUserActivity(
  userId: string,
  activityType: "login" | "logout",
  userType: "doctor" | "nurse" | "admin" | "receptionist" | "patient",
  clinicId?: string,
  subCollection: string = 'log' // default to 'log' for backward compatibility
) {
  try {
    if (!userId) {
      throw new Error("User ID is required to log activity.");
    }

    // Get device information
    const userAgent = navigator.userAgent || "Unknown";
    const platform = navigator.platform || "Unknown";

    // Obter IP usando o novo serviço
    const ipInfo = await getDeviceIP();

    // Retrieve geolocation with Google Maps compatible format
    let location: MapCoordinates | null = null;
    if (navigator.geolocation) {
      try {
        location = await new Promise<MapCoordinates>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              });
            },
            (error) => {
              console.error("Error retrieving geolocation:", error);
              reject(error);
            }
          );
        });
      } catch (geoError) {
        console.error("Error retrieving geolocation:", geoError);
      }
    } else {
      console.warn("Geolocation is not supported by this browser.");
    }

    // Get device MAC address
    const deviceMAC = await getDeviceMAC();

    // Prepare network info object removing undefined values
    const networkInfo = {
      ...(ipInfo.city && { city: ipInfo.city }),
      ...(ipInfo.region && { region: ipInfo.region }),
      ...(ipInfo.country && { country: ipInfo.country }),
      ...(ipInfo.isp && { isp: ipInfo.isp })
    };

    // Prepare log data with Google Maps compatible coordinates
    const logData = {
      activityType,
      timestamp: serverTimestamp(),
      userAgent,
      platform,
      ipAddress: ipInfo.ip,
      ...(Object.keys(networkInfo).length > 0 && { networkInfo }), // Only include if there's data
      deviceMAC,
      deviceInfo: {
        hardwareId: deviceMAC,
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        language: navigator.language,
        cores: navigator.hardwareConcurrency,
        memory: (navigator as any).deviceMemory || 'unknown',
        screenResolution: `${screen.width}x${screen.height}`,
        colorDepth: screen.colorDepth,
      },
      location,
      googleMapsUrl: location ? `https://www.google.com/maps?q=${location.lat},${location.lng}` : null,
    };

    // Reference to the user's specified subcollection
    const userLogRef = collection(doc(db, "users", userId), subCollection);

    // Add the log entry to the user's subcollection
    await addDoc(userLogRef, logData);

    // If the user is a doctor or nurse, log the activity in the doctors collection as well
    if ((userType === "doctor" || userType === "nurse") && clinicId) {
      const doctorRef = doc(db, "clinics", clinicId, "doctors", userId);
      const doctorDoc = await getDoc(doctorRef);

      if (doctorDoc.exists()) {
        const doctorLogRef = collection(doctorRef, subCollection);
        await addDoc(doctorLogRef, logData);
      } else {
        console.warn(`Doctor document not found for user ${userId} in clinic ${clinicId}`);
      }
    }

    // Show success toast
    toast({
      title: "Success",
      description: `User activity (${activityType}) logged successfully.`,
      variant: "default",
    });

    console.log(`User activity logged: ${activityType} for user ${userId}`);
  } catch (error) {
    // Show error toast
    toast({
      title: "Error",
      description: "Failed to log user activity. Please try again.",
      variant: "destructive",
    });

    console.error("Error logging user activity:", error);
    throw error;
  }
}
