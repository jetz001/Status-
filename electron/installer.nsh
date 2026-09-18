; Custom NSIS script for Status+
; Provides Repair / Reinstall confirmation when already installed

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
