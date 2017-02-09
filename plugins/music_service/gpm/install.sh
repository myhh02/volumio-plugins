#!/bin/bash

echo "Installing GMusicProxy dependencies..."
sudo apt-get update
sudo apt-get -y install build-essential unzip python2.7-dev python-pip libffi-dev libssl-dev --no-install-recommends

echo "Installing GMusicProxy..."
cd /data
wget https://github.com/diraimondo/gmusicproxy/archive/v1.0.8.zip
sudo unzip v1.0.8.zip
rm v1.0.8.zip
cd gmusicproxy-1.0.8
sudo pip install -r requirements.txt
# Fix for ImportError: cannot import name InsecureRequestWarning
sudo pip install --upgrade requests

echo "plugininstallend"
