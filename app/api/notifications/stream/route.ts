import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getUserFromToken } from '@/lib/auth';
import getPharmacyModel from '@/models/Pharmacy';

export const runtime = 'nodejs';

// Store active connections for SSE
type ActiveConnection = {
  pharmacistId: string;
  controller: ReadableStreamDefaultController;
};

const activeConnections = new Map<string, ActiveConnection>();

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
        activeConnections.set(connectionId, {
          pharmacistId: user._id.toString(),
          controller,
        });

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
  const selectedPharmacyIds = prescription.pharmacistIds || [];
  const targetPharmacistIds = new Set<string>();

  if (selectedPharmacyIds.length > 0) {
    try {
      const PharmacyModel = await getPharmacyModel();
      const matchedPharmacies = await PharmacyModel.find(
        { _id: { $in: selectedPharmacyIds } },
        { pharmacistId: 1 }
      ).lean() as { pharmacistId?: { toString: () => string } }[];

      for (const pharmacy of matchedPharmacies) {
        if (pharmacy.pharmacistId) {
          targetPharmacistIds.add(pharmacy.pharmacistId.toString());
        }
      }
    } catch (error) {
      console.error('Failed to resolve target pharmacists for notification:', error);
    }
  }

  const notification = {
    type: 'new_prescription',
    prescription: {
      id: prescription._id,
      patientName: prescription.patientName,
      location: prescription.location,
      createdAt: prescription.createdAt,
      status: prescription.status,
      selectedPharmacyIds,
    },
  };

  const data = `data: ${JSON.stringify(notification)}\n\n`;

  for (const [connectionId, connection] of activeConnections) {
    const shouldSend =
      targetPharmacistIds.size === 0 || targetPharmacistIds.has(connection.pharmacistId);
    if (!shouldSend) {
      continue;
    }
    try {
      connection.controller.enqueue(encoder.encode(data));
    } catch (error) {
      // Remove broken connections
      activeConnections.delete(connectionId);
      console.error('Failed to deliver notification to active connection:', error);
    }
  }
}
