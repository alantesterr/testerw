' Starts the "My grades" program (grades_app.ps1) without a console window.
' Double-click: opens the program window.
' "start.vbs -Auto" (used by the StudyPlay site button): fetches grades quietly and hands them to the site.
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
extra = ""
If WScript.Arguments.Count > 0 Then
  If LCase(WScript.Arguments(0)) = "-auto" Then extra = " -Auto"
End If
CreateObject("WScript.Shell").Run "powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & dir & "\grades_app.ps1""" & extra, 0, False
