' StudyPlay: grades from Platonus + schedule with teachers' links from Timetable.
' Double-click: opens the program window (sign-in, connect the site buttons, browser, "Get all").
' "StudyPlay.vbs -Auto <link>" is used by the site buttons: quietly fetches grades,
'   or the schedule when the link is "studyplay-grades:schedule", and hands them to the site.
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
extra = ""
For Each a In WScript.Arguments
  If LCase(a) = "-auto" Then extra = extra & " -Auto"
  If InStr(LCase(a), "studyplay-grades:schedule") = 1 Then extra = extra & " -Schedule"
Next
CreateObject("WScript.Shell").Run "powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & dir & "\grades_app.ps1""" & extra, 0, False