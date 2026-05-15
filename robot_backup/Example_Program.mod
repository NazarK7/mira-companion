MODULE Example_Program
    !
    !***********************************************************
    !
    ! Module:  Example_Program
    !
    ! Description:
    !   Mira Platform
    !   Example Program to Start the Iterative Process
    !
    ! Version: 1.0.4
    !
    !***********************************************************
    !
    PROC Example()
        !
        VAR robtarget LocPoint:=[[1503.51,-98.64,983.12],[0.0372138,-0.00462322,-0.999248,0.0098652],[-1,-1,-1,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
        !
        MoveJ LocPoint,v100,z0,tool0;
        WaitRob\ZeroSpeed;
        rsStartAcquisition KI_DOUT_START_ACQ,1;
        !
        IF NOT vb_take_with_vision THEN
            !User Alarm
        ENDIF
        !
        IF vb_nullOffset THEN
            !User Alarm
        ENDIF
        !
    ENDPROC


    !
ENDMODULE