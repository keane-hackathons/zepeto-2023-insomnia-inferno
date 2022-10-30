import { GameObject, Material, Transform } from 'UnityEngine';
import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import Ground from './Ground';

export default class GroundManager extends ZepetoScriptBehaviour {
  //Static instance variable. 
  private static instance: GroundManager;

	//Grab Ground Manager if it exists and cache the instance. 
  static GetInstance(): GroundManager {
      if (!GroundManager.instance) {
          const targetObj = GameObject.Find("Ground Manager");
          if (targetObj) GroundManager.instance = targetObj.GetComponent<GroundManager>();
      }
      return GroundManager.instance;
  } 

  /* Ground Materials */
    public materialNone: Material;
    public materialRed: Material;
    public materialPurple: Material;
    
    /* Ground */
    //Parant objec that contains all the ground object. 
    public groundListGameObject: Transform;

    //Private cached instance of all of the ground objects. (Will be filled by InitializeGround() during runtime. )
    public groundList: Ground[] = [];

    Awake() {
        this.InitializeGround();
    }
      
    private InitializeGround() {
      this.groundList = [];
      
      // Grab the ground component instances and cache them to our array. 
      for (let i = 0; i < this.groundListGameObject.childCount; i++) {
          let ground : Ground = this.groundListGameObject.GetChild(i).GetComponent<Ground>();
        //Change the naming scheme to "Ground_x" for later server code. 
          ground.gameObject.name = `Ground_${i}`;
          this.groundList[i] = ground;
      }
    }

    ResetGround() {
        //Set to None
        this.groundList.forEach(g => g.SetType(0));
    }

}