@echo off

git add .

git commit -m "deploy from HOST at DATE TIME"

git push origin main --force-with-lease
