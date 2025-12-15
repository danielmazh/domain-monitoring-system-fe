FROM python:3.12-slim
RUN mkdir /opt/domain-monitoring-system
COPY . /opt/domain-monitoring-system

WORKDIR /opt/domain-monitoring-system

RUN cd /opt/domain-monitoring-system/
RUN pip3 install -r requirements.txt

CMD ["python3", "app.py"]