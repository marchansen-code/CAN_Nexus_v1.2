# Fail2Ban Filter Configuration for CANUSA Nexus
# Save this file as /etc/fail2ban/filter.d/canusa-nexus.conf

[Definition]
failregex = ^.*WARNING \[AUTH\] Failed login attempt from <HOST> for.*$
            ^.*WARNING \[AUTH\] Blocked user login attempt from <HOST> for.*$

ignoreregex =

# Fail2Ban Jail Configuration
# Add this to /etc/fail2ban/jail.local

# [canusa-nexus]
# enabled = true
# port = http,https
# filter = canusa-nexus
# logpath = /path/to/your/app/backend/logs/auth_failures.log
# maxretry = 5
# findtime = 600
# bantime = 3600

# Log file location: /app/backend/logs/auth_failures.log
# Log format: YYYY-MM-DD HH:MM:SS WARNING [AUTH] Failed login attempt from IP for user: EMAIL (reason)

# Example log entries:
# 2026-03-16 08:57:36 WARNING [AUTH] Failed login attempt from 192.168.1.100 for unknown user: attacker@evil.com
# 2026-03-16 08:58:06 WARNING [AUTH] Failed login attempt from 192.168.1.100 for user: valid@user.com (invalid password)
# 2026-03-16 08:59:00 WARNING [AUTH] Blocked user login attempt from 192.168.1.100 for user: blocked@user.com
