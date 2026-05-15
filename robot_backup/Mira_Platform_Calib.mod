MODULE Mira_Platform_Calib
    !
    !***********************************************************
    !
    ! Module:  Mira_Platform_Calib
    !
    ! Description:
    !   Mira Platform
    !   Program to Calibrate and Check the calibration
    !
    ! Version: 1.0.4
    !
    !***********************************************************
    !
    PERS tooldata CamNoTool:=[TRUE,[[0,0,0],[1,0,0,0]],[43.1,[-126.5,-95.1,86.4],[1,0,0,0],0,0,1.706]];
    !
    !Euler ZYZ
    !
    VAR num ZYZ_rZ1;
    VAR num ZYZ_rY;
    VAR num ZYZ_rZ2;
    !
    PROC Camera_Calib()
        !
        !Calib Position
        !
        VAR robtarget pCalib1:=[[1227.53,1502.73,735.27],[0.127076,-0.0342972,0.988669,-0.0721781],[0,-1,0,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
        VAR robtarget pCalib2:=[[2636.86,989.60,603.84],[0.0381502,0.905414,-0.38453,-0.175803],[0,0,-2,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
        VAR robtarget pCalib3:=[[1142.86,1016.13,663.94],[0.175836,-0.0565023,0.982405,0.0277442],[0,-1,0,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
        VAR robtarget pCalib4:=[[2473.40,814.06,889.13],[0.20417,-0.964762,0.162828,0.032191],[0,0,-2,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
        VAR robtarget pCalib5:=[[1105.38,1163.83,605.95],[0.206906,-0.342704,0.911437,-0.095013],[0,-1,0,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
        VAR robtarget pCalib6:=[[2071.53,1236.85,954.85],[0.0432872,-0.987006,-0.125654,-0.0903088],[0,0,-2,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
        VAR robtarget pCalib7:=[[2050.37,1084.24,839.66],[0.257237,0.546316,-0.794547,-0.0637414],[0,0,-1,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
        VAR robtarget pCalib8:=[[2378.01,1102.82,756.43],[0.23727,-0.885374,-0.397479,0.0427253],[0,0,-3,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
        VAR robtarget pCalib9:=[[2079.63,1102.96,745.62],[0.154493,0.844343,-0.513047,6.38525E-05],[0,-1,-1,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
        VAR robtarget pCalib10:=[[1970.98,525.71,579.00],[0.241966,-0.709188,0.65601,0.0903139],[0,0,-2,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
        VAR robtarget pCalib11:=[[2012.96,1190.01,940.39],[0.0988611,-0.109432,-0.988954,0.014857],[0,0,0,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
        VAR robtarget pCalib12:=[[2251.69,448.30,342.71],[0.2136,-0.844383,0.411801,0.26798],[0,0,-2,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
        VAR robtarget pCalib13:=[[2019.91,1147.23,830.30],[0.128703,0.017721,-0.984108,0.121048],[0,-1,0,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
        VAR robtarget pCalib14:=[[1996.04,1187.83,890.72],[0.00270668,-0.984815,0.12738,-0.117924],[0,-1,-2,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
        VAR robtarget pCalib15:=[[1764.64,447.29,482.98],[0.0684845,-0.417954,0.834146,0.353306],[0,0,-1,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
        VAR robtarget pCalib16:=[[1921.86,1283.19,775.12],[0.121532,0.965359,0.195473,0.122889],[0,-1,-2,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
        VAR robtarget pCalib17:=[[2490.79,551.45,360.19],[0.179382,-0.808406,0.482995,0.284636],[0,0,-2,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
        VAR robtarget pCalib18:=[[1767.01,753.53,660.14],[0.213144,-0.75289,0.622604,0.00955414],[0,0,-2,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
        VAR robtarget pCalib19:=[[2100.05,1270.10,948.46],[0.0516894,-0.992903,-0.0990728,-0.0407076],[0,0,-2,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
        VAR robtarget pCalib20:=[[2127.19,727.74,676.41],[0.0391581,0.706984,-0.679955,-0.190529],[0,0,-1,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
        !
        IF rs_connection_status_check()=FALSE THEN
            rs_reconnection;
        ENDIF
        !
        Stop;
        !
        MoveJ pCalib1,v100,fine,CamNoTool;
        WaitTime 1;
        rsSetDataToSendCalib KI_DOUT_START_ACQ,5000,0;
        rs_write_into_socket;
        rsResetCW 5000;
        Stop;
        !
        MoveJ pCalib2,v100,fine,CamNoTool;
        WaitTime 1;
        rsSetDataToSendCalib KI_DOUT_START_ACQ,5000,0;
        rs_write_into_socket;
        rsResetCW 5000;
        Stop;
        !
        MoveJ pCalib3,v100,fine,CamNoTool;
        WaitTime 1;
        rsSetDataToSendCalib KI_DOUT_START_ACQ,5000,0;
        rs_write_into_socket;
        rsResetCW 5000;
        Stop;
        !
        MoveJ pCalib4,v100,fine,CamNoTool;
        WaitTime 1;
        rsSetDataToSendCalib KI_DOUT_START_ACQ,5000,0;
        rs_write_into_socket;
        rsResetCW 5000;
        Stop;
        !
        MoveJ pCalib5,v100,fine,CamNoTool;
        WaitTime 1;
        rsSetDataToSendCalib KI_DOUT_START_ACQ,5000,0;
        rs_write_into_socket;
        rsResetCW 5000;
        Stop;
        !
        MoveJ pCalib6,v100,fine,CamNoTool;
        WaitTime 1;
        rsSetDataToSendCalib KI_DOUT_START_ACQ,5000,0;
        rs_write_into_socket;
        rsResetCW 5000;
        Stop;
        !
        MoveJ pCalib7,v100,fine,CamNoTool;
        WaitTime 1;
        rsSetDataToSendCalib KI_DOUT_START_ACQ,5000,0;
        rs_write_into_socket;
        rsResetCW 5000;
        Stop;
        !
        MoveJ pCalib8,v100,fine,CamNoTool;
        WaitTime 1;
        rsSetDataToSendCalib KI_DOUT_START_ACQ,5000,0;
        rs_write_into_socket;
        rsResetCW 5000;
        Stop;
        !
        MoveJ pCalib9,v100,fine,CamNoTool;
        WaitTime 1;
        rsSetDataToSendCalib KI_DOUT_START_ACQ,5000,0;
        rs_write_into_socket;
        rsResetCW 5000;
        Stop;
        !
        MoveJ pCalib10,v100,fine,CamNoTool;
        WaitTime 1;
        rsSetDataToSendCalib KI_DOUT_START_ACQ,5000,0;
        rs_write_into_socket;
        rsResetCW 5000;
        Stop;
        !
        MoveJ pCalib11,v100,fine,CamNoTool;
        WaitTime 1;
        rsSetDataToSendCalib KI_DOUT_START_ACQ,5000,0;
        rs_write_into_socket;
        rsResetCW 5000;
        Stop;
        !
        MoveJ pCalib12,v100,fine,CamNoTool;
        WaitTime 1;
        rsSetDataToSendCalib KI_DOUT_START_ACQ,5000,0;
        rs_write_into_socket;
        rsResetCW 5000;
        Stop;
        !
        MoveJ pCalib13,v100,fine,CamNoTool;
        WaitTime 1;
        rsSetDataToSendCalib KI_DOUT_START_ACQ,5000,0;
        rs_write_into_socket;
        rsResetCW 5000;
        Stop;
        !
        MoveJ pCalib14,v100,fine,CamNoTool;
        WaitTime 1;
        EulerZYZ(pCalib14.rot);
        rsSetDataToSendCalib KI_DOUT_START_ACQ,5000,0;
        rs_write_into_socket;
        rsResetCW 5000;
        Stop;
        !
        MoveJ pCalib15,v100,fine,CamNoTool;
        WaitTime 1;
        rsSetDataToSendCalib KI_DOUT_START_ACQ,5000,0;
        rs_write_into_socket;
        rsResetCW 5000;
        Stop;
        !
        MoveJ pCalib16,v100,fine,CamNoTool;
        WaitTime 1;
        rsSetDataToSendCalib KI_DOUT_START_ACQ,5000,0;
        rs_write_into_socket;
        rsResetCW 5000;
        Stop;
        !
        MoveJ pCalib17,v100,fine,CamNoTool;
        WaitTime 1;
        rsSetDataToSendCalib KI_DOUT_START_ACQ,5000,0;
        rs_write_into_socket;
        rsResetCW 5000;
        Stop;
        !
        MoveJ pCalib18,v100,fine,CamNoTool;
        WaitTime 1;
        rsSetDataToSendCalib KI_DOUT_START_ACQ,5000,0;
        rs_write_into_socket;
        rsResetCW 5000;
        Stop;
        !
        MoveJ pCalib19,v100,fine,CamNoTool;
        WaitTime 1;
        rsSetDataToSendCalib KI_DOUT_START_ACQ,5000,0;
        rs_write_into_socket;
        rsResetCW 5000;
        Stop;
        !
        MoveJ pCalib20,v100,fine,CamNoTool;
        WaitTime 1;
        rsSetDataToSendCalib KI_DOUT_START_ACQ,5000,0;
        rs_write_into_socket;
        rsResetCW 5000;
        Stop;
        !
        rs_Log TRUE,"INFO",73;
        !
    ENDPROC

    !
    PROC rsSetDataToSendCalib(num Command,num ModelID,num payload)
        !
        MiraActPosToSend:=CRobT(\Tool:=tool0\WObj:=wobj0);
        !
        EulerZYZ(MiraActPosToSend.rot);
        !
        IF Command<>0 THEN
            MiraSendData.CW:=pow(2,Command-1);
        ELSE
            MiraSendData.CW:=Command;
        ENDIF
        MiraSendData.ID:=ModelID;
        MiraSendData.X:=round(MiraActPosToSend.trans.x*1000);
        MiraSendData.Y:=round(MiraActPosToSend.trans.y*1000);
        MiraSendData.Z:=round(MiraActPosToSend.trans.z*1000);
        MiraSendData.rX:=round(ZYZ_rZ1)*1000;
        MiraSendData.rY:=round(ZYZ_rY)*1000;
        MiraSendData.rZ:=round(ZYZ_rZ2)*1000;
        MiraSendData.Payload:=payload;
        !
        rs_Debug("Rbt To Mira");
        !
    ENDPROC

    !
    PROC ru_SetMasterTool()
        !
        VAR num MiraVisionMasterTool_X;
        VAR num MiraVisionMasterTool_Y;
        VAR num MiraVisionMasterTool_Z;
        VAR num MiraVisionMasterTool_rZ1;
        VAR num MiraVisionMasterTool_rY;
        VAR num MiraVisionMasterTool_rZ2;
        !
        MiraVisionMasterTool_X:=-530.163;
        MiraVisionMasterTool_Y:=18.6214;
        MiraVisionMasterTool_Z:=335.565;
        MiraVisionMasterTool_rZ1:=-0.187798;
        MiraVisionMasterTool_rY:=18.0108;
        MiraVisionMasterTool_rZ2:=-90.6763;
        !
        MiraVisionMasterTool.tframe.trans.x:=MiraVisionMasterTool_X;
        MiraVisionMasterTool.tframe.trans.y:=MiraVisionMasterTool_Y;
        MiraVisionMasterTool.tframe.trans.z:=MiraVisionMasterTool_Z;
        MiraVisionMasterTool.tframe.rot:=OrientZYZ(MiraVisionMasterTool_rZ1,MiraVisionMasterTool_rY,MiraVisionMasterTool_rZ2);
        !
    ENDPROC

    !
    PROC ru_CheckMasterTool()
        !
        VAR num dev_X;
        VAR num dev_Y;
        VAR num dev_Z;
        VAR num dev_rZ1;
        VAR num dev_rY;
        VAR num dev_rZ2;
        VAR num dev_rX;
        VAR num dev_rZ;
        VAR orient temp;
        VAR robtarget pTest:=[[-1137.61,2171.79,2952.97],[0.501285,-0.864326,0.0201993,-0.0352955],[0,0,-1,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
        !
        !Calibration tool verification
        dev_X:=0;
        dev_Y:=0;
        dev_Z:=0;
        dev_rZ1:=0;
        dev_rY:=0;
        dev_rZ2:=0;
        !
        temp:=OrientZYZ(dev_rZ1,dev_rY,dev_rZ2);
        !
        MoveJ RelTool(pTest,dev_X,dev_Y,dev_Z,\Rx:=MiraZYX_rX,\Ry:=MiraZYX_rY,\Rz:=MiraZYX_rZ),v500,z0,MiraVisionMasterTool;
        MoveJ pTest, v500, z0, MiraVisionMasterTool;
        !
        WaitUntil FALSE;
        !
        !Job tool verification
        dev_X:=0;
        dev_Y:=0;
        dev_Z:=0;
        dev_rX:=0;
        dev_rY:=0;
        dev_rZ:=0;
        !
        MoveJ RelTool(pTest,dev_X,dev_Y,dev_Z,\Rx:=dev_rX,\Ry:=dev_rY,\Rz:=dev_rZ),v500,z0,MiraVisionTool;
        !
        Stop;
        !
        MoveJ pTest, v500, z0, MiraVisionTool;
        !
        !
        !
        !
    ENDPROC

    !
    PROC EulerZYZ(orient ao_Orient)
        !
        !###########################################
        !Convert Quaternions to EulerZYX
        !###########################################
        !
        !Quaternions
        ![q1,q2,q3,q4]
        VAR num q1;
        VAR num q2;
        VAR num q3;
        VAR num q4;
        !
        !Matrix
        ![r11,r12,r13]
        ![r21,r22,r23]
        ![r31,r32,r33]
        VAR num r11;
        VAR num r12;
        VAR num r13;
        VAR num r21;
        VAR num r22;
        VAR num r23;
        VAR num r31;
        VAR num r32;
        VAR num r33;
        !
        !Assign quaternions
        q1:=ao_Orient.q2;
        q2:=ao_Orient.q3;
        q3:=ao_Orient.q4;
        q4:=ao_Orient.q1;
        !
        !Calculate Matrix
        r11:=(2*(pow(q1,2)+pow(q4,2)))-1;
        r12:=-2*((q3*q4)-(q1*q2));
        r13:=2*((q2*q4)+(q1*q3));
        r21:=2*((q3*q4)+(q1*q2));
        r22:=((2*(pow(q1,2)+pow(q3,2)))-1)*(-1);
        r23:=2*((q2*q3)-(q1*q4));
        r31:=-2*((q2*q4)-(q1*q3));
        r32:=2*((q2*q3)+(q1*q4));
        r33:=round(((2*(pow(q1,2)+pow(q2,2)))-1)*(-1)\Dec:=4);
        !
        !Calculate Euler ZYZ
        IF r33<1 THEN
            IF r33>-1 THEN
                ZYZ_rZ1:=ATan2(r23,r13);
                ZYZ_rY:=ACos(r33);
                ZYZ_rZ2:=ATan2(r32,-r31);
            ELSE
                ZYZ_rZ1:=-ATan2(r21,r22);
                ZYZ_rY:=180;
                ZYZ_rZ2:=0;
            ENDIF
        ELSE
            ZYZ_rZ1:=ATan2(r21,r22);
            ZYZ_rY:=0;
            ZYZ_rZ2:=0;
        ENDIF
        !
        !Calculate Euler ZYX
        MiraZYX_rZ:=EulerZYX(\Z,ao_Orient);
        MiraZYX_rY:=EulerZYX(\Y,ao_Orient);
        MiraZYX_rX:=EulerZYX(\X,ao_Orient);
        !
    ENDPROC

    !
ENDMODULE