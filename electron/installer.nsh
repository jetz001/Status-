; Custom NSIS script for Status+
; Provides Repair / Reinstall confirmation when already installed
; Provides dedicated Components Page during uninstall to choose deleting user AppData

!macro customInit
  ; Check if Status+ is already installed in either HKLM or HKCU
  ReadRegStr $R0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "UninstallString"
  ${If} $R0 == ""
    ReadRegStr $R0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "UninstallString"
  ${EndIf}
  ${If} $R0 == ""
    ReadRegStr $R0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Status+" "UninstallString"
  ${EndIf}
  ${If} $R0 == ""
    ReadRegStr $R0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Status+" "UninstallString"
  ${EndIf}

  ${If} $R0 != ""
    MessageBox MB_YESNO|MB_ICONQUESTION "ตรวจพบว่ามีการติดตั้งโปรแกรม Status+ อยู่ในระบบแล้ว$\r$\n$\r$\nคุณต้องการซ่อมแซมระบบและลงทับตัวเดิม [Repair / Reinstall] หรือไม่?" IDYES do_repair IDNO abort_install
    abort_install:
      Quit
    do_repair:
      ; Force terminate any running Status+ instance so files can be cleanly replaced
      nsExec::Exec 'powershell -NoProfile -Command "Stop-Process -Name ''Status*'' -Force -ErrorAction SilentlyContinue"'
  ${EndIf}
!macroend

!macro customUnInstallSection
  Section /o "ลบข้อมูลโปรเจกต์ ฐานข้อมูล SQLite และการตั้งค่าใน AppData (Clean Uninstall)" SecDeleteData
    ; Force stop any running Status process
    nsExec::Exec 'powershell -NoProfile -Command "Stop-Process -Name ''Status*'' -Force -ErrorAction SilentlyContinue"'
    ; Delete AppData directories
    RMDir /r "$APPDATA\status-plus"
    RMDir /r "$LOCALAPPDATA\status-plus"
    RMDir /r "$APPDATA\Status+"
    RMDir /r "$LOCALAPPDATA\Status+"
    nsExec::Exec 'cmd.exe /c for /d %u in (C:\Users\*) do (rd /s /q "%u\AppData\Roaming\status-plus" 2>nul & rd /s /q "%u\AppData\Local\status-plus" 2>nul & rd /s /q "%u\AppData\Roaming\Status+" 2>nul)'
    nsExec::Exec 'powershell -NoProfile -Command "Get-ChildItem ''C:\Users'' -Directory -ErrorAction SilentlyContinue | ForEach-Object { Remove-Item -Path (Join-Path $$_.FullName ''AppData\Roaming\status-plus'') -Recurse -Force -ErrorAction SilentlyContinue; Remove-Item -Path (Join-Path $$_.FullName ''AppData\Local\status-plus'') -Recurse -Force -ErrorAction SilentlyContinue; Remove-Item -Path (Join-Path $$_.FullName ''AppData\Roaming\Status+'') -Recurse -Force -ErrorAction SilentlyContinue }"'
  SectionEnd
!macroend
