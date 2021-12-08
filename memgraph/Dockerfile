FROM memgraph-mage

USER root

# Install Python
RUN apt-get update && apt-get install -y \
    python3-pip \
    python3-setuptools \
    python3-dev \
    && pip3 install -U pip

# Install pip packages
COPY requirements.txt ./
RUN pip3 install -r requirements.txt

# Copy the local query modules
COPY transformations/ /transformations
COPY procedures/ /procedures

USER memgraph
