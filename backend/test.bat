@echo off
cd /d "%~dp0"
call C:\Users\admin\apache-maven-3.9.11\bin\mvn.cmd test
pause
