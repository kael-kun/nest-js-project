import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

interface AuthenticatedSocket extends Socket {
  user?: {
    userId: string;
  };
}

interface LocationUpdatePayload {
  incident_id: string;
  user_type: 'RESPONDER' | 'REPORTER';
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'responder',
})
export class IncidentGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(IncidentGateway.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private supabase: SupabaseService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.query.token as string;

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });

      const email = payload.username;
      this.logger.log(`Responder ${email} connected`);
      this.logger.log(payload);

      // Fetch user's active organization
      const { data: orgMember } = await this.supabase.client
        .from('users')
        .select('id, email')
        .eq('email', email)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();
      const userId = orgMember?.id;
      if (!orgMember) {
        this.logger.warn(`No active org user for email ${email}`);
        client.disconnect();
        return;
      }

      client.user = {
        userId,
      };

      // Auto-join org room
      const roomName = `org:${orgMember.id}`;
      client.join(roomName);
      this.logger.log(
        `Responder ${userId} connected and joined room ${roomName}`,
      );
    } catch (error) {
      this.logger.error(`Authentication failed: ${error}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(
      `Responder ${client.user?.userId ?? client.id} disconnected`,
    );
  }

  @SubscribeMessage('join_org_room')
  handleJoinOrgRoom(client: AuthenticatedSocket, orgId: string): string {
    const roomName = `org:${orgId}`;
    client.join(roomName);
    this.logger.log(`Client ${client.user?.userId} joined room ${roomName}`);
    return `Joined room: ${roomName}`;
  }

  @SubscribeMessage('leave_org_room')
  handleLeaveOrgRoom(client: AuthenticatedSocket, orgId: string): string {
    const roomName = `org:${orgId}`;
    client.leave(roomName);
    this.logger.log(`Client ${client.user?.userId} left room ${roomName}`);
    return `Left room: ${roomName}`;
  }

  /**
   * Broadcast a new incident signal to all responders.
   * Frontend should call GET /incidents to refresh the list.
   */
  broadcastNewIncident() {
    this.server.emit('NEW_INCIDENT');
    this.logger.log('Broadcasted NEW_INCIDENT signal to all responders');
  }

  /**
   * Broadcast incident status update to org room.
   */
  broadcastIncidentStatusUpdate(
    incidentId: string,
    status: string,
    orgId: string,
  ) {
    this.server.to(`org:${orgId}`).emit('incident_status_updated', {
      incident_id: incidentId,
      status,
      updated_at: new Date().toISOString(),
    });
    this.logger.log(
      `Broadcasted status update for ${incidentId} to org ${orgId}`,
    );
  }

  // ─── Real-time location tracking ─────────────────────────────────────────

  /**
   * Join the tracking room for a specific incident.
   * Both the responder and the reporter call this after a dispatch is created.
   * Room name: `incident:{incidentId}:tracking`
   *
   * Emit: join_tracking_room
   * Data: { incident_id: string }
   */
  @SubscribeMessage('join_tracking_room')
  handleJoinTrackingRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { incident_id: string },
  ): string {
    const room = `incident:${data.incident_id}:tracking`;
    client.join(room);
    this.logger.log(
      `User ${client.user?.userId} joined tracking room ${room}`,
    );

    // Notify others in the room that a new participant joined
    client.to(room).emit('tracking_participant_joined', {
      user_id: client.user?.userId,
      incident_id: data.incident_id,
      joined_at: new Date().toISOString(),
    });

    return `Joined tracking room: ${room}`;
  }

  /**
   * Leave the tracking room for a specific incident.
   *
   * Emit: leave_tracking_room
   * Data: { incident_id: string }
   */
  @SubscribeMessage('leave_tracking_room')
  handleLeaveTrackingRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { incident_id: string },
  ): string {
    const room = `incident:${data.incident_id}:tracking`;
    client.leave(room);
    this.logger.log(
      `User ${client.user?.userId} left tracking room ${room}`,
    );

    client.to(room).emit('tracking_participant_left', {
      user_id: client.user?.userId,
      incident_id: data.incident_id,
      left_at: new Date().toISOString(),
    });

    return `Left tracking room: ${room}`;
  }

  /**
   * Receive a location update from a client (responder or reporter) and
   * broadcast it to all other participants in the tracking room.
   * Also persists the update to the `location_updates` table (fire-and-forget).
   *
   * Emit: update_location
   * Data: LocationUpdatePayload
   */
  @SubscribeMessage('update_location')
  async handleLocationUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: LocationUpdatePayload,
  ): Promise<void> {
    const userId = client.user?.userId;
    if (!userId) return;

    const room = `incident:${payload.incident_id}:tracking`;
    const timestamp = new Date().toISOString();

    // Broadcast to all OTHER participants in the tracking room
    client.to(room).emit('location_update', {
      user_id: userId,
      user_type: payload.user_type,
      incident_id: payload.incident_id,
      latitude: payload.latitude,
      longitude: payload.longitude,
      accuracy: payload.accuracy,
      heading: payload.heading,
      speed: payload.speed,
      timestamp,
    });

    // Persist to location_updates table (fire-and-forget)
    void this.supabase.client.from('location_updates').insert({
      incident_id: payload.incident_id,
      user_id: userId,
      user_type: payload.user_type,
      location: `SRID=4326;POINT(${payload.longitude} ${payload.latitude})`,
      accuracy: payload.accuracy ?? null,
      heading: payload.heading ?? null,
      speed: payload.speed ?? null,
    });
  }

  /**
   * Broadcast to all participants in a tracking room that tracking has ended
   * (e.g., incident resolved or dispatch completed).
   */
  broadcastTrackingEnded(incidentId: string) {
    const room = `incident:${incidentId}:tracking`;
    this.server.to(room).emit('tracking_ended', {
      incident_id: incidentId,
      ended_at: new Date().toISOString(),
    });
    this.logger.log(`Broadcasted tracking_ended for incident ${incidentId}`);
  }
}
