from .auth import auth_route
from .bill import bill_route
from .expense import expense_route
from .income import income_route
from .loan import loan_route
from .stats import stats_route

__app_include__ = [expense_route, income_route, stats_route, bill_route, auth_route, loan_route]
