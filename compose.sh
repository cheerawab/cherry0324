#!/bin/bash
docker-compose down --remove-orphans
docker-compose build
docker-compose up -d
echo compose Done!