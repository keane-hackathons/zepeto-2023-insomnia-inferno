import { Animator, Collider } from 'UnityEngine';
import { RoomData } from 'ZEPETO.Multiplay';
import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import ClientScript, { MultiplayMessageType } from './ClientScript';
import Ground from './Ground';

export default class GroundTrigger extends ZepetoScriptBehaviour {
    public tileBounceAnimator: Animator;

    /* Ground */
    private ground: Ground;

    Start() {
        this.ground = this.GetComponentInParent<Ground>();
    }

    OnTriggerEnter(coll: Collider) {

        //Grab the team id based on the character name (which should be the player ID)
        const myTeam = ClientScript.GetInstance()?.GetTeam(coll.gameObject.name);

        //Grab the ground type id
        const groundType = this.ground.GetType();

        //Create the message to send to the server. 
        const message = new RoomData();
        message.Add("team", myTeam);
        message.Add("groundName", this.transform.parent.name);
        message.Add("groundType", groundType);

        // Only apply to ground that isn't yours. 
        if (groundType != myTeam) {
            const client = ClientScript.GetInstance();
            //Send the message up to the server. 
            client.multiplayRoom.Send(MultiplayMessageType.ChangeGroundColor, message.GetObject());
        }

        this.tileBounceAnimator.SetTrigger("Tile_Bounce");
    }
}