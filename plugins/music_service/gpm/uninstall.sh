#!/bin/bash

echo "Stop GMusicProxy if still running..."
sudo killall GMusicProxy

echo "Uninstalling GMusicProxy..."
sudo rm -r /data/gmusicproxy-1.0.8

echo "Removing GMusicProxy configuration..."
sudo rm /home/volumio/.config/gmusicproxy.cfg

echo "pluginuninstallend"
