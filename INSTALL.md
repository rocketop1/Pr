# Prism Installation Guide

## Prerequisites Installation

### Install Redis
```bash
# For Ubuntu/Debian
sudo apt update
sudo apt install redis-server

# For CentOS/RHEL
sudo dnf install epel-release
sudo dnf install redis

# Start and enable Redis
sudo systemctl start redis
sudo systemctl enable redis
```

### Install Bun
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Reload shell configuration to use Bun
source ~/.bashrc
```

## Prism Installation

1. Clone the repository:
```bash
git clone https://github.com/PrismFOSS/Prism
cd Prism
```

2. Install dependencies:
```bash
npm install
```

3. Create configuration file:
```bash
cp example_config.toml config.toml
```

4. Configure your `config.toml` file

## Create Systemd Service

1. Create a systemd service file:
```bash
sudo nano /etc/systemd/system/prism.service
```

2. Add the following content:
```ini
[Unit]
Description=Prism
After=network.target redis.service

[Service]
Type=simple
User=prism
Group=prism
WorkingDirectory=/path/to/your/prism
ExecStart=/root/.bun/bin/bun run app.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=prism

[Install]
WantedBy=multi-user.target
```

3. Create user and set permissions:
```bash
# Create user and group
sudo useradd -r -s /bin/false prism

# Set ownership
sudo chown -R prism:prism /path/to/your/prism
```

4. Enable and start the service:
```bash
# Reload systemd daemon
sudo systemctl daemon-reload

# Enable Prism to start on boot
sudo systemctl enable prism

# Start Prism
sudo systemctl start prism

# Check status
sudo systemctl status prism
```

## Verify Installation

1. Check if Redis is running:
```bash
sudo systemctl status redis
```

2. Check if Prism is running:
```bash
sudo systemctl status prism
```

3. Monitor logs:
```bash
sudo journalctl -u prism -f
```

## Required: Edit your Wings configuration

**Before deploying Prism, you must configure each node's Wings configuration!**

1. On each node, edit the Wings configuration file (usually at `/etc/pterodactyl/config.yml`)
2. Locate the `allowed-origins` section
3. Change:
   ```yaml
   allowed-origins: []
   ```
   to either:
   ```yaml
   allowed-origins: ['*']  # recommended for simplicity
   ```
   or:
   ```yaml
   allowed-origins: ['https://your-dashboard-domain.com']  # more restrictive option
   ```

## Troubleshooting

1. If the service fails to start:
   - Check logs: `sudo journalctl -u prism -n 50`
   - Verify permissions: `ls -la /path/to/your/prism`
   - Ensure Redis is running: `sudo systemctl status redis`

2. If you can't connect to the dashboard:
   - Verify the service is running: `sudo systemctl status prism`
   - Check your Nginx configuration
   - Verify your firewall settings: `sudo ufw status`