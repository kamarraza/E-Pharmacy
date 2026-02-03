import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getUserFromToken } from '@/lib/auth';

// Store active connections for SSE
const activeConnections = new Map<string, ReadableStreamDefaultController>();

export async function GET(request: NextRequest) {
  await dbConnect();

  try {
    // Verify pharmacist authentication
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return new Response('Unauthorized', { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user || user.role !== 'pharmacist') {
      return new Response('Unauthorized', { status: 401 });
    }

    // Create SSE response
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection message
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode('data: {"type": "connected", "message": "Connected to notification stream"}\n\n'));

        // Store the connection
        const connectionId = `${user._id}-${Date.now()}`;
        activeConnections.set(connectionId, controller);

        // Clean up on disconnect
        request.signal.addEventListener('abort', () => {
          activeConnections.delete(connectionId);
        });
      },
      cancel() {
        // Connection closed
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });
  } catch (error) {
    console.error('Notification stream error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// Function to send notifications to pharmacists
export async function sendNotificationToPharmacists(prescription: {
  _id: string;
  patientName: string;
  location: string;
  createdAt: Date;
  status: string;
  pharmacistIds?: string[];
}) {
  const encoder = new TextEncoder();

  // Get selected pharmacy IDs from prescription
  const selectedPharmacyIds = prescription.pharmacistIds || [];

  if (selectedPharmacyIds.length === 0) {
    // Fallback to broadcasting to all if no specific pharmacies selected
    const notification = {
      type: 'new_prescription',
      prescription: {
        id: prescription._id,
        patientName: prescription.patientName,
        location: prescription.location,
        createdAt: prescription.createdAt,
        status: prescription.status
      }
    };

    const data = `data: ${JSON.stringify(notification)}\n\n`;

    // Send to all active pharmacist connections
    for (const [connectionId, controller] of activeConnections) {
      try {
        controller.enqueue(encoder.encode(data));
      } catch (error) {
        // Remove broken connections
        activeConnections.delete(connectionId);
      }
    }
    return;
  }

  // Send targeted notifications to selected pharmacies
  for (const pharmacyId of selectedPharmacyIds) {
    const notification = {
      type: 'new_prescription',
      prescription: {
        id: prescription._id,
        patientName: prescription.patientName,
        location: prescription.location,
        createdAt: prescription.createdAt,
        status: prescription.status,
        pharmacyId: pharmacyId // Include pharmacy ID for targeted notification
      }
    };

    const data = `data: ${JSON.stringify(notification)}\n\n`;

    // Find connections for this pharmacy's pharmacist
    // Note: In a production system, you'd want to track which pharmacist owns which pharmacy
    // For now, we'll send to all pharmacists (can be optimized later)
    for (const [connectionId, controller] of activeConnections) {
      try {
        controller.enqueue(encoder.encode(data));
      } catch (error) {
        // Remove broken connections
        activeConnections.delete(connectionId);
      }
    }
  }
}