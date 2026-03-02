@echo off
echo ========================================
echo Running Backend Tests with Java 17
echo ========================================

REM Find Java 17 installation
set JAVA17_HOME=
if exist "C:\Program Files\Eclipse Adoptium\jdk-17" set JAVA17_HOME=C:\Program Files\Eclipse Adoptium\jdk-17
if exist "C:\Program Files\Java\jdk-17" set JAVA17_HOME=C:\Program Files\Java\jdk-17
if exist "C:\Program Files\Microsoft\jdk-17" set JAVA17_HOME=C:\Program Files\Microsoft\jdk-17

if "%JAVA17_HOME%"=="" (
    echo ERROR: Java 17 not found!
    echo Please install Java 17 from: https://adoptium.net/temurin/releases/?version=17
    echo.
    echo Current Java version:
    java -version
    pause
    exit /b 1
)

echo Using Java 17 from: %JAVA17_HOME%
echo.

REM Set JAVA_HOME and PATH for this session only
set JAVA_HOME=%JAVA17_HOME%
set PATH=%JAVA_HOME%\bin;%PATH%

REM Verify Java version
echo Verifying Java version:
java -version
echo.

REM Run Maven tests
echo Running tests...
echo.
mvn clean test

pause
