# Email Notification Service for QualityStudio
# Sends email alerts for quality events

import os
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import List, Optional, Dict, Any
from dotenv import load_dotenv

load_dotenv()

# Email Configuration
SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
EMAIL_FROM = os.environ.get("EMAIL_FROM", "noreply@qualitystudio.com")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "QualityStudio")

# Email templates
TEMPLATES = {
    "critical_defect": {
        "subject": "🚨 CRITICAL DEFECT ALERT - {ticket_id}",
        "body": """
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0;">🚨 Critical Defect Alert</h1>
            </div>
            <div style="padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb;">
                <p><strong>Ticket ID:</strong> {ticket_id}</p>
                <p><strong>Defect Type:</strong> {defect_type}</p>
                <p><strong>Line:</strong> {line}</p>
                <p><strong>Description:</strong> {description}</p>
                <p><strong>Reported At:</strong> {reported_at}</p>
                <p><strong>Reported By:</strong> {reported_by}</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb;">
                <p style="color: #dc2626; font-weight: bold;">⚠️ Immediate action required!</p>
                <a href="{app_url}/DefectIntake?id={ticket_id}" 
                   style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 6px; margin-top: 10px;">
                    View Defect Details
                </a>
            </div>
            <div style="padding: 15px; background: #1f2937; color: #9ca3af; text-align: center; border-radius: 0 0 8px 8px;">
                <small>QualityStudio - Quality Management System</small>
            </div>
        </body>
        </html>
        """
    },
    "capa_overdue": {
        "subject": "⏰ CAPA Overdue Alert - {capa_id}",
        "body": """
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #f59e0b; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0;">⏰ CAPA Overdue</h1>
            </div>
            <div style="padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb;">
                <p><strong>CAPA ID:</strong> {capa_id}</p>
                <p><strong>Related Defect:</strong> {defect_id}</p>
                <p><strong>Due Date:</strong> {due_date}</p>
                <p><strong>Days Overdue:</strong> {days_overdue}</p>
                <p><strong>Assigned To:</strong> {assigned_to}</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb;">
                <p style="color: #f59e0b;">Please complete the CAPA actions or update the timeline.</p>
                <a href="{app_url}/CAPAWorkspace?id={capa_id}" 
                   style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 6px; margin-top: 10px;">
                    View CAPA Details
                </a>
            </div>
            <div style="padding: 15px; background: #1f2937; color: #9ca3af; text-align: center; border-radius: 0 0 8px 8px;">
                <small>QualityStudio - Quality Management System</small>
            </div>
        </body>
        </html>
        """
    },
    "complaint_received": {
        "subject": "📋 New Customer Complaint - {ticket_number}",
        "body": """
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0;">📋 New Customer Complaint</h1>
            </div>
            <div style="padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb;">
                <p><strong>Ticket Number:</strong> {ticket_number}</p>
                <p><strong>Customer:</strong> {customer_name}</p>
                <p><strong>Product Type:</strong> {product_type}</p>
                <p><strong>Severity:</strong> {severity}</p>
                <p><strong>Description:</strong> {description}</p>
                <p><strong>Logged At:</strong> {logged_at}</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb;">
                <a href="{app_url}/SalesComplaintLog?id={complaint_id}" 
                   style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 6px; margin-top: 10px;">
                    View Complaint Details
                </a>
            </div>
            <div style="padding: 15px; background: #1f2937; color: #9ca3af; text-align: center; border-radius: 0 0 8px 8px;">
                <small>QualityStudio - Quality Management System</small>
            </div>
        </body>
        </html>
        """
    },
    "rca_completed": {
        "subject": "✅ RCA Completed - {defect_id}",
        "body": """
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0;">✅ RCA Analysis Completed</h1>
            </div>
            <div style="padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb;">
                <p><strong>Defect ID:</strong> {defect_id}</p>
                <p><strong>Root Cause:</strong> {root_cause}</p>
                <p><strong>Analysis Type:</strong> {analysis_type}</p>
                <p><strong>Completed By:</strong> {completed_by}</p>
                <p><strong>Completed At:</strong> {completed_at}</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb;">
                <p style="color: #10b981;">Next step: Create CAPA plan based on this RCA.</p>
                <a href="{app_url}/RCAStudio?id={rca_id}" 
                   style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 6px; margin-top: 10px;">
                    View RCA Details
                </a>
            </div>
            <div style="padding: 15px; background: #1f2937; color: #9ca3af; text-align: center; border-radius: 0 0 8px 8px;">
                <small>QualityStudio - Quality Management System</small>
            </div>
        </body>
        </html>
        """
    },
    "daily_summary": {
        "subject": "📊 QualityStudio Daily Summary - {date}",
        "body": """
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1f2937; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0;">📊 Daily Quality Summary</h1>
                <p style="margin: 5px 0 0 0; opacity: 0.8;">{date}</p>
            </div>
            <div style="padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb;">
                <h3 style="color: #1f2937;">Today's Overview</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">New Defects</td>
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">{new_defects}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">Open Defects</td>
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">{open_defects}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">Closed Defects</td>
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">{closed_defects}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">Customer Complaints</td>
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">{complaints}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">Overdue CAPAs</td>
                        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: #dc2626;">{overdue_capas}</td>
                    </tr>
                </table>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                <h3 style="color: #1f2937;">KPIs</h3>
                <p><strong>Cpk Average:</strong> {cpk_avg}</p>
                <p><strong>First Pass Yield:</strong> {fpy}%</p>
                <a href="{app_url}/Dashboard" 
                   style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 6px; margin-top: 10px;">
                    View Full Dashboard
                </a>
            </div>
            <div style="padding: 15px; background: #1f2937; color: #9ca3af; text-align: center; border-radius: 0 0 8px 8px;">
                <small>QualityStudio - Quality Management System</small>
            </div>
        </body>
        </html>
        """
    }
}


class EmailService:
    """Email notification service"""
    
    def __init__(self):
        self.smtp_host = SMTP_HOST
        self.smtp_port = SMTP_PORT
        self.smtp_user = SMTP_USER
        self.smtp_password = SMTP_PASSWORD
        self.email_from = EMAIL_FROM
        self.email_from_name = EMAIL_FROM_NAME
        self.enabled = bool(SMTP_USER and SMTP_PASSWORD)
    
    async def send_email(
        self,
        to_emails: List[str],
        subject: str,
        body_html: str,
        body_text: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send an email to one or more recipients.
        
        Args:
            to_emails: List of recipient email addresses
            subject: Email subject
            body_html: HTML body content
            body_text: Plain text body (optional)
        
        Returns:
            Dict with success status and details
        """
        if not self.enabled:
            return {
                "success": False,
                "error": "Email service not configured. Set SMTP_USER and SMTP_PASSWORD.",
                "simulated": True
            }
        
        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.email_from_name} <{self.email_from}>"
            message["To"] = ", ".join(to_emails)
            
            # Add plain text version
            if body_text:
                text_part = MIMEText(body_text, "plain")
                message.attach(text_part)
            
            # Add HTML version
            html_part = MIMEText(body_html, "html")
            message.attach(html_part)
            
            # Send email
            async with aiosmtplib.SMTP(
                hostname=self.smtp_host,
                port=self.smtp_port,
                use_tls=False,
                start_tls=True
            ) as smtp:
                await smtp.login(self.smtp_user, self.smtp_password)
                await smtp.send_message(message)
            
            return {
                "success": True,
                "sent_to": to_emails,
                "sent_at": datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "sent_to": to_emails
            }
    
    async def send_template_email(
        self,
        to_emails: List[str],
        template_name: str,
        variables: Dict[str, Any],
        app_url: str = "https://qualitystudio.com"
    ) -> Dict[str, Any]:
        """
        Send an email using a predefined template.
        
        Args:
            to_emails: List of recipient email addresses
            template_name: Name of the template to use
            variables: Variables to substitute in the template
            app_url: Base URL of the application
        
        Returns:
            Dict with success status and details
        """
        if template_name not in TEMPLATES:
            return {
                "success": False,
                "error": f"Template '{template_name}' not found"
            }
        
        template = TEMPLATES[template_name]
        variables["app_url"] = app_url
        
        try:
            subject = template["subject"].format(**variables)
            body_html = template["body"].format(**variables)
        except KeyError as e:
            return {
                "success": False,
                "error": f"Missing template variable: {e}"
            }
        
        return await self.send_email(to_emails, subject, body_html)
    
    async def send_critical_defect_alert(
        self,
        to_emails: List[str],
        ticket_id: str,
        defect_type: str,
        line: str,
        description: str,
        reported_by: str,
        app_url: str = "https://qualitystudio.com"
    ) -> Dict[str, Any]:
        """Send critical defect alert email"""
        return await self.send_template_email(
            to_emails,
            "critical_defect",
            {
                "ticket_id": ticket_id,
                "defect_type": defect_type,
                "line": line,
                "description": description,
                "reported_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
                "reported_by": reported_by
            },
            app_url
        )
    
    async def send_capa_overdue_alert(
        self,
        to_emails: List[str],
        capa_id: str,
        defect_id: str,
        due_date: str,
        days_overdue: int,
        assigned_to: str,
        app_url: str = "https://qualitystudio.com"
    ) -> Dict[str, Any]:
        """Send CAPA overdue alert email"""
        return await self.send_template_email(
            to_emails,
            "capa_overdue",
            {
                "capa_id": capa_id,
                "defect_id": defect_id,
                "due_date": due_date,
                "days_overdue": days_overdue,
                "assigned_to": assigned_to
            },
            app_url
        )
    
    async def send_complaint_notification(
        self,
        to_emails: List[str],
        complaint_id: str,
        ticket_number: str,
        customer_name: str,
        product_type: str,
        severity: str,
        description: str,
        app_url: str = "https://qualitystudio.com"
    ) -> Dict[str, Any]:
        """Send new complaint notification email"""
        return await self.send_template_email(
            to_emails,
            "complaint_received",
            {
                "complaint_id": complaint_id,
                "ticket_number": ticket_number,
                "customer_name": customer_name,
                "product_type": product_type,
                "severity": severity,
                "description": description,
                "logged_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
            },
            app_url
        )


# Global email service instance
email_service = EmailService()
