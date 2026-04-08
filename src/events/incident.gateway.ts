import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
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
}
