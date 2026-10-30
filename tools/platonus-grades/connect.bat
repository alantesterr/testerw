@echo off
rem Lets the StudyPlay site start the grades program (current Windows user only).
rem Buttons: "Update from Platonus" (grades) and "Update schedule" (Timetable).
rem To undo: run the "disconnect" file.
reg add "HKCU\Software\Classes\studyplay-grades" /ve /d "URL:StudyPlay Grades" /f >nul
reg add "HKCU\Software\Classes\studyplay-grades" /v "URL Protocol" /d "" /f >nul
reg add "HKCU\Software\Classes\studyplay-grades\shell\open\command" /ve /d "\"%SystemRoot%\System32\wscript.exe\" \"%~dp0start.vbs\" -Auto \"%%1\"" /f >nul
echo.
echo   StudyPlay: knopki "Obnovit iz Platonus" i "Obnovit raspisanie" podklyucheny.
echo.
pause