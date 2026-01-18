# File Upload Service for QualityStudio
# Handles file uploads with local storage (easily configurable for cloud storage)

import os
import uuid
import aiofiles
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import UploadFile, HTTPException

# Configuration
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "/app/uploads")
MAX_FILE_SIZE = int(os.environ.get("MAX_FILE_SIZE", 50 * 1024 * 1024))  # 50MB default
ALLOWED_EXTENSIONS = {
    'images': {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'},
    'documents': {'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv'},
    'all': {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.pdf', '.doc', '.docx', 
            '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.json', '.xml'}
}

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)


def get_file_extension(filename: str) -> str:
    """Get file extension from filename"""
    return os.path.splitext(filename)[1].lower()


def is_allowed_file(filename: str, file_type: str = 'all') -> bool:
    """Check if file extension is allowed"""
    ext = get_file_extension(filename)
    allowed = ALLOWED_EXTENSIONS.get(file_type, ALLOWED_EXTENSIONS['all'])
    return ext in allowed


def generate_unique_filename(original_filename: str) -> str:
    """Generate a unique filename while preserving extension"""
    ext = get_file_extension(original_filename)
    unique_id = str(uuid.uuid4())[:8]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = "".join(c for c in original_filename.rsplit('.', 1)[0] if c.isalnum() or c in '._- ')[:50]
    return f"{safe_name}_{timestamp}_{unique_id}{ext}"


async def save_upload_file(
    file: UploadFile,
    subdirectory: str = "",
    file_type: str = 'all',
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Save an uploaded file to the local filesystem.
    
    Args:
        file: The uploaded file
        subdirectory: Optional subdirectory within uploads folder
        file_type: Type of file for validation ('images', 'documents', 'all')
        user_id: Optional user ID for tracking
    
    Returns:
        Dict with file info including path and URL
    """
    # Validate file
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    if not is_allowed_file(file.filename, file_type):
        raise HTTPException(
            status_code=400, 
            detail=f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS[file_type])}"
        )
    
    # Check file size
    content = await file.read()
    file_size = len(content)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE / (1024*1024):.1f}MB"
        )
    
    # Generate unique filename
    unique_filename = generate_unique_filename(file.filename)
    
    # Create subdirectory if specified
    if subdirectory:
        upload_path = os.path.join(UPLOAD_DIR, subdirectory)
        os.makedirs(upload_path, exist_ok=True)
    else:
        upload_path = UPLOAD_DIR
    
    # Full file path
    file_path = os.path.join(upload_path, unique_filename)
    
    # Save file
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)
    
    # Generate relative URL
    relative_path = os.path.join(subdirectory, unique_filename) if subdirectory else unique_filename
    file_url = f"/uploads/{relative_path}"
    
    return {
        "filename": unique_filename,
        "original_filename": file.filename,
        "file_path": file_path,
        "file_url": file_url,
        "file_size": file_size,
        "content_type": file.content_type,
        "uploaded_at": datetime.utcnow().isoformat(),
        "uploaded_by": user_id
    }


async def save_multiple_files(
    files: List[UploadFile],
    subdirectory: str = "",
    file_type: str = 'all',
    user_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Save multiple uploaded files"""
    results = []
    for file in files:
        try:
            result = await save_upload_file(file, subdirectory, file_type, user_id)
            results.append(result)
        except HTTPException as e:
            results.append({
                "filename": file.filename,
                "error": e.detail,
                "success": False
            })
    return results


async def delete_file(file_path: str) -> bool:
    """Delete a file from storage"""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            return True
        return False
    except Exception as e:
        print(f"Error deleting file: {e}")
        return False


async def get_file_info(file_path: str) -> Optional[Dict[str, Any]]:
    """Get information about a stored file"""
    if not os.path.exists(file_path):
        return None
    
    stat = os.stat(file_path)
    return {
        "file_path": file_path,
        "file_size": stat.st_size,
        "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
        "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        "exists": True
    }


def list_files(subdirectory: str = "") -> List[Dict[str, Any]]:
    """List all files in a directory"""
    path = os.path.join(UPLOAD_DIR, subdirectory) if subdirectory else UPLOAD_DIR
    
    if not os.path.exists(path):
        return []
    
    files = []
    for filename in os.listdir(path):
        file_path = os.path.join(path, filename)
        if os.path.isfile(file_path):
            stat = os.stat(file_path)
            files.append({
                "filename": filename,
                "file_path": file_path,
                "file_size": stat.st_size,
                "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat()
            })
    
    return files
