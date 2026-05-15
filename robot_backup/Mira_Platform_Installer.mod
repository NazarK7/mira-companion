MODULE Mira_Platform_Installer
    !
    PROC Mira_Installer()
        !
        VAR bool dummy:=FALSE;
        !Create folders
        MakeDir diskhome+"MiraPlatform";
        MakeDir diskhome+"MiraPlatform/RsLog";
        MakeDir diskhome+"MiraPlatform/LocPrograms";
        MakeDir diskhome+"MiraPlatform/Library";
        MakeDir diskhome+"MiraPlatform/UsrConfig";
        !Copying files from usb to robot controller
        CopyFile usbdisk1+"Config.txt",diskhome+"MiraPlatform/UsrConfig/Config.txt";
        CopyFile usbdisk1+"english.txt",diskhome+"MiraPlatform/UsrConfig/english.txt";
        CopyFile usbdisk1+"Italiano.txt",diskhome+"MiraPlatform/UsrConfig/Italiano.txt";
        CopyFile usbdisk1+"VisionTools.txt",diskhome+"MiraPlatform/UsrConfig/VisionTools.txt";
        CopyFile usbdisk1+"tcpconn.sys",diskhome+"MiraPlatform/Library/tcpconn.sys";
        CopyFile usbdisk1+"Mira_Platform_Data.sys",diskhome+"MiraPlatform/Library/Mira_Platform_Data.sys";
        CopyFile usbdisk1+"Mira_Platform_Lib.sys",diskhome+"MiraPlatform/Library/Mira_Platform_Lib.sys";
        CopyFile usbdisk1+"Mira_Platform_Usr.sys",diskhome+"MiraPlatform/Library/Mira_Platform_Usr.sys";
        CopyFile usbdisk1+"Mira_Platform_Installer.mod",diskhome+"MiraPlatform/Library/Mira_Platform_Installer.mod";
        CopyFile usbdisk1+"Mira_Platform_Calib.mod",diskhome+"MiraPlatform/LocPrograms/Mira_Platform_Calib.mod";
        CopyFile usbdisk1+"Example_Program.mod",diskhome+"MiraPlatform/LocPrograms/Example_Program.mod";
        !Load modules
        Load diskhome+"MiraPlatform/Library"\File:="tcpconn.sys";
        Load diskhome+"MiraPlatform/Library"\File:="Mira_Platform_Data.sys";
        Load diskhome+"MiraPlatform/Library"\File:="Mira_Platform_Lib.sys";
        Load diskhome+"MiraPlatform/Library"\File:="Mira_Platform_Usr.sys";
        !Initialize system
        %"Mira_Platform_Lib:Load_Dictionary"%;
        WaitUntil dummy;
    ERROR
        TEST ERRNO
        CASE ERR_FILEACC:
            !Impossible to create folder or wrong path
            TRYNEXT;
        CASE ERR_FILEEXIST:
            !File already exist
            TRYNEXT;
        CASE ERR_FILNOTFND:
            !File not found
            TRYNEXT;
        CASE ERR_IOERROR:
            !Reading file failed
            TRYNEXT;
        CASE ERR_PRGMEMFULL:
            !Memory full, program not loaded
            TRYNEXT;
        CASE ERR_LOADED:
            !Module already loaded
            TRYNEXT;
        CASE ERR_SYNTAX:
            !Sintax errors in module
            TRYNEXT;
        CASE ERR_LINKREF:
            !Fatal link error in module
            TRYNEXT;
        ENDTEST
    ENDPROC

    !
ENDMODULE