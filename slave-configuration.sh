#!/bin/bash

#  general info - 
# $1: Jenkins URL
# $2: Jenkins Secret
# $3: Jenkins Name

# initiate first time - 
# loccated on: /opt/tmp/deploy-jenkins-jnlp.sh
# make sure the correct ip here: /etc/systemd/system/jenkins-agent-jnlp.service
# change the webhook ip: https://github.com/danielmazh/domain-monitoring-system/settings/hooks

apt update -y
apt install default-jre -y

mkdir -p /var/jenkins_home/
cd /var/jenkins_home/
mkdir -p agent/
cd agent/

curl -sO http://$1:8080/jnlpJars/agent.jar

cat<<EOF> /var/jenkins_home/jenkins-agent-jnlp.service
[Unit]
Description=Jenkins Agent JNLP
After=network.target

[Service]
WorkingDirectory=/var/jenkins_home/
ExecStart=java -jar /var/jenkins_home/agent/agent.jar -url http://$1:8080/ -secret $2 -name "$3" -webSocket -workDir "/var/jenkins_home"
Type=simple
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF

sudo mv /var/jenkins_home/jenkins-agent-jnlp.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable jenkins-agent-jnlp.service
sudo systemctl start jenkins-agent-jnlp.service
sudo systemctl status jenkins-agent-jnlp.service