' Starts the "My grades" program (grades_app.ps1) without a console window.
' Double-click: opens the program window.
' "start.vbs -Auto <link>" (used by the StudyPlay site buttons): quietly fetches grades,
'   or the schedule when the link is "studyplay-grades:schedule", and hands them to the site.
' "start.vbs -TestTimetable": checks the Timetable sign-in and shows what was found.
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
extra = ""
For Each a In WScript.Arguments
  If LCase(a) = "-auto" Then extra = extra & " -Auto"
  If LCase(a) = "-testtimetable" Then extra = extra & " -TestTimetable"
  If InStr(LCase(a), "studyplay-grades:schedule") = 1 Then extra = extra & " -Schedule"
Next
CreateObject("WScript.Shell").Run "powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & dir & "\grades_app.ps1""" & extra, 0, False