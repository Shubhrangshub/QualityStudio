# WebSocket Service for Real-Time Notifications
# Provides real-time updates to connected clients

import json
import asyncio
from datetime import datetime
from typing import Dict, Set, Optional, Any, List
from fastapi import WebSocket, WebSocketDisconnect
from collections import defaultdict


class ConnectionManager:
    """Manages WebSocket connections and broadcasts"""
    
    def __init__(self):
        # Map of user_id to their WebSocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = defaultdict(set)
        # Map of room/channel to subscribed connections
        self.rooms: Dict[str, Set[WebSocket]] = defaultdict(set)
        # All active connections
        self.all_connections: Set[WebSocket] = set()
    
    async def connect(self, websocket: WebSocket, user_id: Optional[str] = None):
        """Accept and register a new WebSocket connection"""
        await websocket.accept()
        self.all_connections.add(websocket)
        
        if user_id:
            self.active_connections[user_id].add(websocket)
        
        # Subscribe to default room
        self.rooms["global"].add(websocket)
        
        # Send connection confirmation
        await self.send_personal_message(
            websocket,
            {
                "type": "connection",
                "status": "connected",
                "timestamp": datetime.utcnow().isoformat(),
                "user_id": user_id
            }
        )
    
    def disconnect(self, websocket: WebSocket, user_id: Optional[str] = None):
        """Remove a WebSocket connection"""
        self.all_connections.discard(websocket)
        
        if user_id:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        
        # Remove from all rooms
        for room in self.rooms.values():
            room.discard(websocket)
    
    def subscribe_to_room(self, websocket: WebSocket, room: str):
        """Subscribe a connection to a room/channel"""
        self.rooms[room].add(websocket)
    
    def unsubscribe_from_room(self, websocket: WebSocket, room: str):
        """Unsubscribe a connection from a room/channel"""
        self.rooms[room].discard(websocket)
    
    async def send_personal_message(self, websocket: WebSocket, message: dict):
        """Send a message to a specific connection"""
        try:
            await websocket.send_json(message)
        except Exception:
            pass
    
    async def send_to_user(self, user_id: str, message: dict):
        """Send a message to all connections of a specific user"""
        connections = self.active_connections.get(user_id, set())
        for connection in connections.copy():
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection, user_id)
    
    async def broadcast_to_room(self, room: str, message: dict):
        """Broadcast a message to all connections in a room"""
        connections = self.rooms.get(room, set())
        for connection in connections.copy():
            try:
                await connection.send_json(message)
            except Exception:
                connection_to_remove = connection
                for room_connections in self.rooms.values():
                    room_connections.discard(connection_to_remove)
                self.all_connections.discard(connection_to_remove)
    
    async def broadcast_all(self, message: dict):
        """Broadcast a message to all connected clients"""
        for connection in self.all_connections.copy():
            try:
                await connection.send_json(message)
            except Exception:
                self.all_connections.discard(connection)


# Global connection manager instance
manager = ConnectionManager()


# Notification types
class NotificationType:
    DEFECT_CREATED = "defect_created"
    DEFECT_UPDATED = "defect_updated"
    DEFECT_CRITICAL = "defect_critical"
    COMPLAINT_CREATED = "complaint_created"
    COMPLAINT_UPDATED = "complaint_updated"
    RCA_CREATED = "rca_created"
    RCA_COMPLETED = "rca_completed"
    CAPA_CREATED = "capa_created"
    CAPA_OVERDUE = "capa_overdue"
    CAPA_APPROVED = "capa_approved"
    KPI_UPDATE = "kpi_update"
    SYSTEM_ALERT = "system_alert"


async def send_notification(
    notification_type: str,
    title: str,
    message: str,
    data: Optional[dict] = None,
    user_ids: Optional[List[str]] = None,
    room: Optional[str] = None,
    priority: str = "normal"
):
    """
    Send a notification to users.
    
    Args:
        notification_type: Type of notification (use NotificationType constants)
        title: Notification title
        message: Notification message
        data: Additional data to include
        user_ids: List of specific user IDs to notify (None = broadcast)
        room: Room/channel to broadcast to
        priority: Notification priority (low, normal, high, critical)
    """
    notification = {
        "type": "notification",
        "notification_type": notification_type,
        "title": title,
        "message": message,
        "data": data or {},
        "priority": priority,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    if user_ids:
        # Send to specific users
        for user_id in user_ids:
            await manager.send_to_user(user_id, notification)
    elif room:
        # Broadcast to room
        await manager.broadcast_to_room(room, notification)
    else:
        # Broadcast to all
        await manager.broadcast_all(notification)


async def notify_critical_defect(defect_data: dict):
    """Send notification for critical defect"""
    await send_notification(
        NotificationType.DEFECT_CRITICAL,
        "🚨 Critical Defect Alert",
        f"Critical defect reported on {defect_data.get('line', 'Unknown')}",
        data=defect_data,
        priority="critical"
    )


async def notify_defect_created(defect_data: dict):
    """Send notification for new defect"""
    await send_notification(
        NotificationType.DEFECT_CREATED,
        "New Defect Reported",
        f"New {defect_data.get('defectType', 'defect')} on {defect_data.get('line', 'Unknown')}",
        data=defect_data,
        priority="normal"
    )


async def notify_complaint_created(complaint_data: dict):
    """Send notification for new customer complaint"""
    await send_notification(
        NotificationType.COMPLAINT_CREATED,
        "📋 New Customer Complaint",
        f"Complaint from {complaint_data.get('customerName', 'Unknown')}",
        data=complaint_data,
        room="sales"
    )


async def notify_rca_completed(rca_data: dict):
    """Send notification when RCA is completed"""
    await send_notification(
        NotificationType.RCA_COMPLETED,
        "✅ RCA Analysis Completed",
        f"Root cause identified: {rca_data.get('rootCause', 'See details')[:50]}...",
        data=rca_data,
        room="quality_engineers"
    )


async def notify_capa_overdue(capa_data: dict):
    """Send notification for overdue CAPA"""
    await send_notification(
        NotificationType.CAPA_OVERDUE,
        "⏰ CAPA Overdue",
        f"CAPA for defect {capa_data.get('defectTicketId', 'Unknown')} is overdue",
        data=capa_data,
        priority="high"
    )


async def notify_kpi_update(kpi_data: dict):
    """Send notification for KPI updates"""
    await send_notification(
        NotificationType.KPI_UPDATE,
        "📊 KPI Update",
        "Quality metrics have been updated",
        data=kpi_data,
        room="managers"
    )
