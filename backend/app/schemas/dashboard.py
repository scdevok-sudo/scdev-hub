from pydantic import BaseModel

from app.schemas.time_log import TimeLogOut


class DashboardOut(BaseModel):
    hours_this_month: float
    estimated_payout: float
    active_projects: int
    pending_tasks: int
    recent_logs: list[TimeLogOut] = []
