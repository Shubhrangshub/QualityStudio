# User Roles and Permissions System

from enum import Enum
from typing import List, Dict, Set
from pydantic import BaseModel

class Role(str, Enum):
    ADMIN = "admin"
    QUALITY_INSPECTOR = "quality_inspector"
    QUALITY_ENGINEER = "quality_engineer"
    SALES = "sales"
    OPERATOR = "operator"
    VIEWER = "viewer"

class Permission(str, Enum):
    # Customer & Sales
    VIEW_COMPLAINTS = "view_complaints"
    CREATE_COMPLAINTS = "create_complaints"
    EDIT_COMPLAINTS = "edit_complaints"
    DELETE_COMPLAINTS = "delete_complaints"
    
    # Defects
    VIEW_DEFECTS = "view_defects"
    CREATE_DEFECTS = "create_defects"
    EDIT_DEFECTS = "edit_defects"
    DELETE_DEFECTS = "delete_defects"
    
    # RCA
    VIEW_RCA = "view_rca"
    CREATE_RCA = "create_rca"
    EDIT_RCA = "edit_rca"
    DELETE_RCA = "delete_rca"
    
    # CAPA
    VIEW_CAPA = "view_capa"
    CREATE_CAPA = "create_capa"
    EDIT_CAPA = "edit_capa"
    DELETE_CAPA = "delete_capa"
    APPROVE_CAPA = "approve_capa"
    
    # Process Runs
    VIEW_PROCESS_RUNS = "view_process_runs"
    CREATE_PROCESS_RUNS = "create_process_runs"
    EDIT_PROCESS_RUNS = "edit_process_runs"
    DELETE_PROCESS_RUNS = "delete_process_runs"
    
    # Golden Batch
    VIEW_GOLDEN_BATCH = "view_golden_batch"
    CREATE_GOLDEN_BATCH = "create_golden_batch"
    EDIT_GOLDEN_BATCH = "edit_golden_batch"
    DELETE_GOLDEN_BATCH = "delete_golden_batch"
    
    # SOPs
    VIEW_SOPS = "view_sops"
    CREATE_SOPS = "create_sops"
    EDIT_SOPS = "edit_sops"
    DELETE_SOPS = "delete_sops"
    APPROVE_SOPS = "approve_sops"
    
    # Knowledge Base
    VIEW_KNOWLEDGE = "view_knowledge"
    CREATE_KNOWLEDGE = "create_knowledge"
    EDIT_KNOWLEDGE = "edit_knowledge"
    DELETE_KNOWLEDGE = "delete_knowledge"
    
    # Admin
    MANAGE_USERS = "manage_users"
    MANAGE_ROLES = "manage_roles"
    VIEW_ANALYTICS = "view_analytics"
    EXPORT_DATA = "export_data"
    SYSTEM_CONFIG = "system_config"

# Role-Permission Mapping
ROLE_PERMISSIONS: Dict[Role, Set[Permission]] = {
    Role.ADMIN: {
        # Admins have ALL permissions
        *Permission.__members__.values()
    },
    
    Role.QUALITY_INSPECTOR: {
        # View everything, create defects and process runs
        Permission.VIEW_COMPLAINTS,
        Permission.VIEW_DEFECTS,
        Permission.CREATE_DEFECTS,
        Permission.EDIT_DEFECTS,
        Permission.VIEW_RCA,
        Permission.VIEW_CAPA,
        Permission.VIEW_PROCESS_RUNS,
        Permission.CREATE_PROCESS_RUNS,
        Permission.EDIT_PROCESS_RUNS,
        Permission.VIEW_GOLDEN_BATCH,
        Permission.VIEW_SOPS,
        Permission.VIEW_KNOWLEDGE,
        Permission.VIEW_ANALYTICS,
    },
    
    Role.QUALITY_ENGINEER: {
        # Full quality workflow access
        Permission.VIEW_COMPLAINTS,
        Permission.VIEW_DEFECTS,
        Permission.CREATE_DEFECTS,
        Permission.EDIT_DEFECTS,
        Permission.VIEW_RCA,
        Permission.CREATE_RCA,
        Permission.EDIT_RCA,
        Permission.VIEW_CAPA,
        Permission.CREATE_CAPA,
        Permission.EDIT_CAPA,
        Permission.VIEW_PROCESS_RUNS,
        Permission.CREATE_PROCESS_RUNS,
        Permission.EDIT_PROCESS_RUNS,
        Permission.VIEW_GOLDEN_BATCH,
        Permission.CREATE_GOLDEN_BATCH,
        Permission.EDIT_GOLDEN_BATCH,
        Permission.VIEW_SOPS,
        Permission.CREATE_SOPS,
        Permission.EDIT_SOPS,
        Permission.VIEW_KNOWLEDGE,
        Permission.CREATE_KNOWLEDGE,
        Permission.EDIT_KNOWLEDGE,
        Permission.VIEW_ANALYTICS,
        Permission.EXPORT_DATA,
    },
    
    Role.SALES: {
        # Sales team - customer complaints and viewing
        Permission.VIEW_COMPLAINTS,
        Permission.CREATE_COMPLAINTS,
        Permission.EDIT_COMPLAINTS,
        Permission.VIEW_DEFECTS,
        Permission.VIEW_RCA,
        Permission.VIEW_CAPA,
        Permission.VIEW_SOPS,
        Permission.VIEW_KNOWLEDGE,
    },
    
    Role.OPERATOR: {
        # Production operators
        Permission.VIEW_DEFECTS,
        Permission.CREATE_DEFECTS,
        Permission.VIEW_PROCESS_RUNS,
        Permission.CREATE_PROCESS_RUNS,
        Permission.VIEW_GOLDEN_BATCH,
        Permission.VIEW_SOPS,
        Permission.VIEW_KNOWLEDGE,
    },
    
    Role.VIEWER: {
        # Read-only access
        Permission.VIEW_COMPLAINTS,
        Permission.VIEW_DEFECTS,
        Permission.VIEW_RCA,
        Permission.VIEW_CAPA,
        Permission.VIEW_PROCESS_RUNS,
        Permission.VIEW_GOLDEN_BATCH,
        Permission.VIEW_SOPS,
        Permission.VIEW_KNOWLEDGE,
        Permission.VIEW_ANALYTICS,
    }
}

class User(BaseModel):
    id: str
    email: str
    name: str
    role: Role
    is_active: bool = True
    
    def has_permission(self, permission: Permission) -> bool:
        """Check if user has a specific permission"""
        return permission in ROLE_PERMISSIONS.get(self.role, set())
    
    def has_any_permission(self, permissions: List[Permission]) -> bool:
        """Check if user has any of the listed permissions"""
        return any(self.has_permission(p) for p in permissions)
    
    def has_all_permissions(self, permissions: List[Permission]) -> bool:
        """Check if user has all of the listed permissions"""
        return all(self.has_permission(p) for p in permissions)
    
    def get_permissions(self) -> Set[Permission]:
        """Get all permissions for this user's role"""
        return ROLE_PERMISSIONS.get(self.role, set())

def check_permission(user: User, permission: Permission) -> bool:
    """Helper function to check if user has permission"""
    if not user.is_active:
        return False
    return user.has_permission(permission)

# Example usage and role descriptions
ROLE_DESCRIPTIONS = {
    Role.ADMIN: {
        "title": "Administrator",
        "description": "Full system access - can manage all aspects of the application",
        "typical_users": ["IT Admin", "System Administrator", "Quality Manager"]
    },
    Role.QUALITY_INSPECTOR: {
        "title": "Quality Inspector",
        "description": "Can inspect products, report defects, and log process data",
        "typical_users": ["QC Inspector", "Quality Technician", "Production Inspector"]
    },
    Role.QUALITY_ENGINEER: {
        "title": "Quality Engineer",
        "description": "Full quality workflow access - RCA, CAPA, process optimization",
        "typical_users": ["Quality Engineer", "Process Engineer", "Continuous Improvement Lead"]
    },
    Role.SALES: {
        "title": "Sales Representative",
        "description": "Can log customer complaints and view quality data",
        "typical_users": ["Sales Rep", "Account Manager", "Customer Service"]
    },
    Role.OPERATOR: {
        "title": "Production Operator",
        "description": "Can report defects and log process runs during production",
        "typical_users": ["Machine Operator", "Production Worker", "Line Supervisor"]
    },
    Role.VIEWER: {
        "title": "Viewer",
        "description": "Read-only access to view all quality data and reports",
        "typical_users": ["Management", "External Auditor", "Guest"]
    }
}
