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

!macro customUnInstall
  MessageBox MB_YESNO|MB_ICONQUESTION "คุณต้องการลบข้อมูลโปรเจกต์ ฐานข้อมูล SQLite และการตั้งค่าทั้งหมดของ Status+ ออกจากเครื่องด้วยหรือไม่?$\r$\n$\r$\n(หากเลือก 'Yes' จะลบข้อมูลใน AppData ทั้งหมด เพื่อเริ่มระบบใหม่แบบว่างเปล่า)$\r$\n(หากเลือก 'No' จะเก็บข้อมูลงานและประวัติทั้งหมดไว้ เผื่อติดตั้งใหม่ในภายหลัง)" /SD IDNO IDNO keep_data IDYES delete_data

  delete_data:
    RMDir /r "$APPDATA\status-plus"
    RMDir /r "$LOCALAPPDATA\status-plus"
    RMDir /r "$APPDATA\Status+"
    RMDir /r "$LOCALAPPDATA\Status+"
    Goto done

  keep_data:
    Goto done

  done:
!macroend
