#!/bin/bash

echo "Installing GMusicProxy dependencies..."
sudo apt-get update
sudo apt-get -y install build-essential unzip python2.7-dev libffi-dev libssl-dev python-setuptools --no-install-recommends

# fix for incompatible pip and requests version, as the repository version is too old
echo "Install current version of pip..."
sudo easy_install pip

echo "Installing GMusicProxy..."
cd /data
wget https://github.com/diraimondo/gmusicproxy/archive/v1.0.8.zip
sudo unzip v1.0.8.zip
rm v1.0.8.zip
cd gmusicproxy-1.0.8
sudo pip install -r requirements.txt

echo "plugininstallend"
