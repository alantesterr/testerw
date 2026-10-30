@echo off
rem Checks the Timetable sign-in with the saved password and shows what was found.
start "" "%SystemRoot%\System32\wscript.exe" "%~dp0start.vbs" -TestTimetable