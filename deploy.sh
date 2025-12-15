#!/bin/bash

function check_result() {
    if [ $? -ne 0 ]; then
        echo "[ERROR] $1 failed. Exiting."
        exit 1
    fi
    echo "[SUCCESS] $1 succeeded."
}

cd /opt/

sudo git clone https://$1:$2@github.com/danielmazh/domain-monitoring-system.git &>/dev/null
check_result "cloning repository"

cd domain-monitoring-system/

apt update -y &>/dev/null
check_result "updating apt"

apt install python3.12-venv -y &>/dev/null
check_result "installing python3.12-venv"

python3 -m venv venv &>/dev/null
check_result "creating virtual environment"

source venv/bin/activate &>/dev/null
check_result "activating virtual environment"

apt install python3-pip -y &>/dev/null
check_result "installing python3-pip"

pip3 install -r requirements.txt &>/dev/null
check_result "installing requirements"


cat<<EOF>> /opt/domain-monitoring-system/run.sh
#!/bin/bash
# 
source venv/bin/activate &>/dev/null
python3 app.py
EOF

sudo chmod 755 /opt/domain-monitoring-system/run.sh
check_result "creating run.sh script"


cat<<EOF>> domain-monitoring-system.service
[Unit]
Description=My Custom Service
After=network.target

[Service]
WorkingDirectory=/opt/domain-monitoring-system/
ExecStart=/opt/domain-monitoring-system/run.sh
Type=simple
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF

sudo mv domain-monitoring-system.service /etc/systemd/system/
check_result "setting up systemd service"

sudo systemctl daemon-reload
sudo systemctl enable domain-monitoring-system.service
sudo systemctl start domain-monitoring-system.service
sudo systemctl status domain-monitoring-system.service