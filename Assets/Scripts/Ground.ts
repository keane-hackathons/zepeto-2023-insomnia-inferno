import { MeshRenderer } from 'UnityEngine';
import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import GroundManager from './GroundManager';


enum GroundType { None, Red, Purple }

export default class Ground extends ZepetoScriptBehaviour {
    public renderer: MeshRenderer;
    public groundType: GroundType = GroundType.None;
    
    SetType(groundType: GroundType) {
        // Apply the corresponding material based on the ground type. 
        switch (groundType) {
            case GroundType.None:
                this.renderer.material = GroundManager.GetInstance().materialNone;
                break;
            case GroundType.Red:
                this.renderer.material = GroundManager.GetInstance().materialRed;
                break;
            case GroundType.Purple:
                this.renderer.material = GroundManager.GetInstance().materialPurple;
                break;
        }
  
        // Apply type
        this.groundType = groundType;
    }
    
    GetType() {
        return this.groundType;
    }

}