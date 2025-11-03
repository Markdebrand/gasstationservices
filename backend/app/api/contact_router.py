from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr, Field
from typing import List
from sqlalchemy.orm import Session
from app.db.database import get_db


from app.utils.adapters.email_adapter import async_send_email, EmailConfigError


router = APIRouter(prefix="/contact", tags=["contact"])


class ContactForm(BaseModel):
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    phone: str | None = None
    email: EmailStr
    company: str = Field(..., min_length=1)
    country: str = Field(..., min_length=1)
    job_title: str = Field(..., min_length=1)
    employees: str = Field(..., min_length=1)
    industry: str = Field(..., min_length=1)
    subscription: List[str] = Field(default_factory=list)
    geographic: str = Field(..., min_length=1)
    plan: str | None = None


def _compose_body(data: ContactForm) -> str:
    lines = [
        "New contact form submission:",
        "",
        f"Name: {data.first_name} {data.last_name}",
        f"Email: {data.email}",
        f"Phone: {data.phone or '-'}",
        f"Company: {data.company}",
        f"Job Title: {data.job_title}",
        f"Employees: {data.employees}",
        f"Selected plan: {data.plan or '-'}",
        f"Country: {data.country}",
        f"Industry: {data.industry}",
        f"Geographic coverage: {data.geographic}",
        f"Subscription interests: {', '.join(data.subscription) if data.subscription else '-'}",
    ]
    return "\n".join(lines)

def _compose_html(data: ContactForm) -> str:
        # Modern HTML layout with red accent and improved visual hierarchy
        return f"""
        <html>
        <body style='font-family: Arial, sans-serif; background: #f9f9f9; padding: 24px;'>
            <div style='max-width: 560px; margin: auto; background: #fff; border-radius: 14px; box-shadow: 0 3px 18px #0001; padding: 36px 32px 32px 32px; border: 2px solid #dc2626;'>
                <div style='text-align:center;margin-bottom:18px;'>
                    <img src='https://hsotrade.com/Logo-1.png' alt='HSO TRADE' style='height:44px;margin-bottom:8px;'>
                </div>
                <h2 style='color: #dc2626; margin-top: 0; font-size:2em; font-weight:700; text-align:center;'>New Contact Form Submission</h2>
                <table style='width: 100%; border-collapse: collapse; font-size: 15px; margin-top:24px;'>
                    <tr><td style='font-weight: bold; color:#dc2626; padding: 8px 0 8px 0; width:170px;'>Name:</td><td style='padding:8px 0;'>{data.first_name} {data.last_name}</td></tr>
                    <tr><td style='font-weight: bold; color:#dc2626; padding: 8px 0;'>Email:</td><td style='padding:8px 0;'><a href='mailto:{data.email}' style='color:#2563eb;text-decoration:underline;'>{data.email}</a></td></tr>
                    <tr><td style='font-weight: bold; color:#dc2626; padding: 8px 0;'>Phone:</td><td style='padding:8px 0;'>{data.phone or '-'}</td></tr>
                    <tr><td style='font-weight: bold; color:#dc2626; padding: 8px 0;'>Company:</td><td style='padding:8px 0;'>{data.company}</td></tr>
                    <tr><td style='font-weight: bold; color:#dc2626; padding: 8px 0;'>Job Title:</td><td style='padding:8px 0;'>{data.job_title}</td></tr>
                    <tr><td style='font-weight: bold; color:#dc2626; padding: 8px 0;'>Employees:</td><td style='padding:8px 0;'>{data.employees}</td></tr>
                    <tr><td style='font-weight: bold; color:#dc2626; padding: 8px 0;'>Selected plan:</td><td style='padding:8px 0;'>{data.plan or '-'}</td></tr>
                    <tr><td style='font-weight: bold; color:#dc2626; padding: 8px 0;'>Country:</td><td style='padding:8px 0;'>{data.country}</td></tr>
                    <tr><td style='font-weight: bold; color:#dc2626; padding: 8px 0;'>Industry:</td><td style='padding:8px 0;'>{data.industry}</td></tr>
                    <tr><td style='font-weight: bold; color:#dc2626; padding: 8px 0;'>Geographic coverage:</td><td style='padding:8px 0;'>{data.geographic}</td></tr>
                    <tr><td style='font-weight: bold; color:#dc2626; padding: 8px 0;'>Subscription interests:</td><td style='padding:8px 0;'>{', '.join(data.subscription) if data.subscription else '-'}</td></tr>
                </table>
                <div style='margin-top: 32px; color: #888; font-size: 13px; text-align:center;'>
                    <em>Sent from the <span style='color:#dc2626;font-weight:bold;'>HSO Trade</span> web contact form.</em>
                </div>
            </div>
        </body>
        </html>
        """


@router.post("/submit")
async def submit_contact(form: ContactForm, db: Session = Depends(get_db)):
    try:
        # No persistence in DB
        subject = "HSO Trade — Contact form"
        body_text = _compose_body(form)
        body_html = _compose_html(form)
        # Enviar a EMAIL_TO (support@huronsmithoil.com) y CC si está definido
        from app.config import settings as cfg
        recipients = cfg.EMAIL_TO
        cc_list = []
        if hasattr(cfg, "SMTP_CC") and cfg.SMTP_CC:
            # Permitir múltiples correos separados por coma o lista
            if isinstance(cfg.SMTP_CC, (list, tuple)):
                cc_list = list(cfg.SMTP_CC)
            else:
                cc_list = [email.strip() for email in str(cfg.SMTP_CC).split(",") if email.strip()]
        # reply_to: correo del usuario
        # Usar el correo SMTP configurado como remitente (from_email)
        result = await async_send_email(
            subject,
            {"text": body_text, "html": body_html},  # type: ignore[arg-type]
            to=recipients,
            cc=cc_list if cc_list else None,
            reply_to=form.email,
            from_email=cfg.SMTP_USER  # Siempre el usuario SMTP, ej: info@hsotrade.com
        )

        # 3) Enviar también un correo de prueba al usuario que llenó el formulario (no bloquear en caso de error)
        user_mail = {"to": str(form.email), "sent": False, "error": None}
        try:
            user_subject = "HSO Trade — Thank you for contacting us"
            user_body_text = (
                f"Hi {form.first_name},\n\n"
                "Thank you for contacting HSO Trade! We have received your request and our team will get back to you as soon as possible.\n\n"
                "In the meantime, feel free to visit our website to learn more about our services and latest updates.\n\n"
                "If you have any additional questions, just reply to this email and we’ll be happy to help you.\n\n"
                "— HSO Trade Team\n"
                "\n"
                "Terms of Service: https://hsotrade.com/Policy/Terms\n"
                "Privacy Policy: https://hsotrade.com/Policy/Privacy\n"
            )
            user_body_html = f"""
                <div style='background:#fff;border:2px solid #dc2626;border-radius:18px;max-width:520px;margin:32px auto;padding:36px 24px 32px 24px;text-align:center;color:#0f172a;font-family:Arial,sans-serif;box-shadow:0 3px 18px #0001;'>
                    <img src='https://hsotrade.com/Logo-1.png' alt='HSO TRADE' style='height:48px;margin-bottom:18px;'>
                    <h1 style='font-size:2em;font-weight:700;margin:0 0 12px 0;color:#dc2626;'>Thank you for contacting us</h1>
                    <div style='font-size:1.1em;margin-bottom:18px;color:#374151;'>You can trade on it.</div>
                    <div style='font-size:1em;max-width:480px;margin:0 auto 24px auto;color:#334155;'>
                        Thanks for reaching out! We’re taking a look at your message and our team will get back to you as soon as possible.<br><br>
                        In the meantime, you can visit our website to learn more about our services and latest updates.<br><br>
                        <a href='https://hsotrade.com' style='display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:13px 32px;border-radius:10px;font-weight:600;font-size:15px;font-family:Arial,Helvetica,sans-serif;box-shadow:0 3px 10px rgba(220,38,38,0.18);margin-top:8px;'>Go to HSO Trade</a><br><br>
                        If you have any additional questions, just reply to this email and we’ll be happy to help you.
                    </div>
                    <div style='margin-top:32px;font-size:13px;color:#6b7280;'>
                        — HSO Trade Team
                    </div>
                    <div style='margin-top:18px;font-size:12px;color:#6b7280;line-height:1.7;'>
                        By contacting us, you agree to our <a href='https://hsotrade.com/Policy/Terms' style='color:#dc2626;text-decoration:underline;' target='_blank' rel='noopener'>Terms of Service</a> and <a href='https://hsotrade.com/Policy/Privacy' style='color:#dc2626;text-decoration:underline;' target='_blank' rel='noopener'>Privacy Policy</a>.<br>
                        Your information will be handled securely and in accordance with our policies.
                    </div>
                </div>
            """
            await async_send_email(
                user_subject,
                {"text": user_body_text, "html": user_body_html},
                to=[str(form.email)]
            )  # type: ignore[arg-type]
            user_mail["sent"] = True
        except Exception as ue:
                        user_mail["error"] = str(ue)

        return {"ok": True, "recipients": recipients, "smtp_result": result, "userEmail": user_mail}
    except EmailConfigError as e:
        raise HTTPException(status_code=500, detail=f"Email configuration error: {e}")
    except Exception as e:
        # Devuelve el error SMTP completo para depuración
        raise HTTPException(status_code=500, detail=f"Failed to send email: {e}")
