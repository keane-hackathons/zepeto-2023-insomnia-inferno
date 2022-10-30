import { transform } from 'typescript';
import { GameObject, Quaternion, Vector3, WaitForSeconds, Transform } from 'UnityEngine';
import { CharacterState, SpawnInfo, ZepetoCharacter, ZepetoPlayers } from 'ZEPETO.Character.Controller';
import { Room } from 'ZEPETO.Multiplay';
import { Player, State } from 'ZEPETO.Multiplay.Schema';
import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import { WorldService, ZepetoWorldMultiplay } from 'ZEPETO.World';
import Ground from './Ground';
import GroundManager from './GroundManager';

export enum MultiplayMessageType {
  
    // When position is synced
    CharacterTransform = "CharacterTransform",

    // For Animation states
    CharacterState = "CharacterState",

    //Ground
    ChangeGroundColor = "ChangeGroundColor",
    ChangeGroundColorReceive = "ChangeGroundColorReceive",

    //Game States
    Waiting = "Waiting",

    GameReady = "GameReady",

    GameStart = "GameStart",

    GameFinish = "GameFinish",

    Result = "Result"
}

//Transform position data
export type MultiplayMessageCharacterTransform = {
    positionX: number,
    positionY: number,
    positionZ: number,
}

//Character state data
export type MultiplayMessageCharacterState = {

    //state id number for translation to enum. 
    characterState: number
}

export type MultiplayMessageChangeGroundColor = {
    //Ground Color ID
    groundType: number,
    //The Team it belongs to
    team: number,
    //Triggered Ground Name. 
    groundName: string,
}

type GameTeamInfo = {
    character: ZepetoCharacter,
    team: number
}

export default class ClientScript extends ZepetoScriptBehaviour {
    private static instance: ClientScript;
  
    static GetInstance(): ClientScript {
        if (!ClientScript.instance) {
            const targetObj = GameObject.Find("Client");
            if (targetObj) ClientScript.instance = targetObj.GetComponent<ClientScript>();
        }
        return ClientScript.instance;
    }

    
    public multiplay: ZepetoWorldMultiplay;

    public multiplayRoom: Room;

    //Map of the players coming from the multiplay server. 
    private multiplayPlayers: Map<string, Player> = new Map<string, Player>();

    public gameTeamList: Map<string, GameTeamInfo> = new Map<string, GameTeamInfo>();


    public spawnLocation: GameObject;

    public objZepetoPlayers: ZepetoPlayers;
    
    Start() {    
        //Cache the room in the Callback when the server creates a room object. 
        this.multiplay.RoomCreated += (room: Room) => {
            this.multiplayRoom = room;
        };

        //Callback for when the room is joined. 
        this.multiplay.RoomJoined += (room: Room) => {
            //Called each time the room state variables are altered
            room.OnStateChange += this.OnStateChange;

            this.multiplayRoom.AddMessageHandler(MultiplayMessageType.ChangeGroundColorReceive, (message: MultiplayMessageChangeGroundColor) => {
                //Cache the ground manager
                const groundManager = GroundManager.GetInstance();

                //Parse the ground index by spliting the ground name (ground_x) and spliting by the "_" to convert to a number. 
                const groundNumber = Number(message.groundName.split("_")[1]);

                //Grab the corresponding ground object based on the parsed id. 
                const ground: Ground = groundManager?.groundList[groundNumber].GetComponent<Ground>();

                // CHange the ground color 
                ground?.SetType(message.team);
            });

            this.multiplayRoom.AddMessageHandler(MultiplayMessageType.Waiting, (message => {
                // Reset Positions and tiles. 
                this.ResetGame();
            
                // Enable Character Control
                this.OnOffCharacterControl(true);
            }));

            this.multiplayRoom.AddMessageHandler(MultiplayMessageType.GameReady, (message => {
                // Reset Positions and tiles. 
                this.ResetGame();
            
                // Disable Character control
                this.OnOffCharacterControl(false);
            }));

            this.multiplayRoom.AddMessageHandler(MultiplayMessageType.GameStart, (message => {
                // Reset Positions and tiles. 
                this.ResetGame();
            
                // Enable Character Control
                this.OnOffCharacterControl(true);
            }));

            this.multiplayRoom.AddMessageHandler(MultiplayMessageType.GameFinish, (message => {

                // Disable Character Control 
                this.OnOffCharacterControl(false);
            }));

            this.multiplayRoom.AddMessageHandler(MultiplayMessageType.Result, (message => {

            }));
        }
    }

    private OnStateChange(state: State, isFirst: boolean) {
        // Called for the first state change only
        if (isFirst) {
            // Apply sync logic for player if they already exist. 
            state.players.ForEach((userId, player) => { this.OnPlayerAdd(player, userId) });

            // Register Player Add/Remove events 
            state.players.add_OnAdd((player, userId) => { this.OnPlayerAdd(player, userId) });
            state.players.add_OnRemove((player, userId) => { this.OnPlayerRemove(player, userId) });
            state.timer.add_OnChange(() => { this.OnCounterChange(state.timer.value) });

            this.InitializeCharacter(state);
        }
    }

    private OnPlayerAdd(player: Player, userId: string) {
        if (this.multiplayPlayers.has(userId)) return;

        // Cache the player to our map 
        this.multiplayPlayers.set(userId, player);
      
        //Create spawn info for our new character. 
        const spawnInfo = new SpawnInfo();
        const position = this.spawnLocation.transform.position;
        spawnInfo.position = position;
        spawnInfo.rotation = Quaternion.identity;
      
        // If the added player id matches the world service id, we know this is the local player. 
        const isLocal = WorldService.userId === userId;
      
        // Instantiate character with the above settings. 
        ZepetoPlayers.instance.CreatePlayerWithUserId(userId, userId, spawnInfo, isLocal);
    }
    
    private OnPlayerRemove(player: Player, userId: string) {
        if (!this.multiplayPlayers.has(userId)) return;
        ZepetoPlayers.instance.RemovePlayer(userId);
    }

    private InitializeCharacter(state: State) {
        // Callback when the localplayer is fully loaded into the scene.
        ZepetoPlayers.instance.OnAddedLocalPlayer.AddListener(() => {
            // cache the player and userIds
            const zepetoPlayer = ZepetoPlayers.instance.LocalPlayer.zepetoPlayer;
            const userId = WorldService.userId;

            // Change the character's name to the userID
            zepetoPlayer.character.name = userId;

            // Send a message to the server every time the character state is altered. 
            zepetoPlayer.character.OnChangedState.AddListener((current, previous) => {
                this.SendMessageCharacterState(current);
            });

            // Check the character transform positions every 0.1 seconds and update. 
            this.StartCoroutine(this.SendMessageCharacterTransformLoop(0.1));
        });

        // Callback when the player is fully loaded into the scene. 
        ZepetoPlayers.instance.OnAddedPlayer.AddListener((userId: string) => {
            //Cache the player by userId
            const zepetoPlayer = ZepetoPlayers.instance.GetPlayer(userId);

            // Set the character object's name to the userId
            zepetoPlayer.character.name = userId;

            //Grab the player instance from the server schema map based on the userId
            const player: Player = this.multiplayRoom.State.players.get_Item(userId);

            // Add to the OnChange Schema Type Callback Message
            player.position.OnChange += () => {

                // Only sync for everyone but the local player
                if (zepetoPlayer.isLocalPlayer == false) {

                    // Cache the postion values. 
                    const x = player.position.x;
                    const y = player.position.y;
                    const z = player.position.z;
                    const position = new Vector3(x, y, z);

                    // Directly apply the server position if the position deviates past a certain range (Handle sync issues)
                    if (Vector3.Distance(position, zepetoPlayer.character.transform.position) > 7) {
                        zepetoPlayer.character.transform.position = position;
                    }

                    // Move the character to the target position. 
                    zepetoPlayer.character.MoveToPosition(position);

                    //Jump if the character state has changed to jump. 
                    if (player.characterState === CharacterState.JumpIdle || player.characterState === CharacterState.JumpMove)
                        zepetoPlayer.character.Jump();
                }
            }

            // Create GameTeamInfo instance
            const teamInfo: GameTeamInfo = {
                character: zepetoPlayer.character,
                team: state.players.get_Item(userId).team
            }

            // Set up the team based on the character name
            this.gameTeamList.set(zepetoPlayer.character.name, teamInfo);
        });
    }


    private OnCounterChange(count: number) {}
    private SendMessageCharacterState(characterState: CharacterState) {
        // Create the character state message body. 
        const message: MultiplayMessageCharacterState = {
            characterState: characterState
        }

        // Send the character state. 
        this.multiplayRoom.Send(MultiplayMessageType.CharacterState, message);
    }
    
    private *SendMessageCharacterTransformLoop(tick: number) {
        while (true) {

            // Wait For the designated amount of time (tick)
            yield new WaitForSeconds(tick);
      
            // Only run if the multiplay room instance exists and the room is connected. 
            if (this.multiplayRoom != null && this.multiplayRoom.IsConnected) {
      
                // Cache the userId. 
                const userId = WorldService.userId;
      
                // Only run if the player exists in the zepeto players map. 
                if (ZepetoPlayers.instance.HasPlayer(userId)) {
      
                    //Cache the character controller. 
                    const character = ZepetoPlayers.instance.GetPlayer(userId).character;
      
                    // Send the character transform update message if not idling. (Send when character moves/jumps)
                    if (character.CurrentState != CharacterState.Idle)
                        this.SendMessageCharacterTransform(character.transform);
                }
            }
        }
    }
    
    private SendMessageCharacterTransform(transform: Transform) {
        //Cache the local transform position. 
        const position = transform.localPosition;

        // Create the message body 
        const message: MultiplayMessageCharacterTransform = {
            positionX: position.x,
            positionY: position.y,
            positionZ: position.z
        }

        // Send the message to the server. 
        this.multiplayRoom.Send(MultiplayMessageType.CharacterTransform, message);
    }

    //Get Team ID based on the character name (Should be set to the userid)
    GetTeam(gameObjectName: string) {
        if (!this.gameTeamList.has(gameObjectName)) return 0;
        return this.gameTeamList.get(gameObjectName).team;
    }

    //Enable/Disable Character Control 
    OnOffCharacterControl(bool: boolean) {
        if (bool) {
            this.objZepetoPlayers.characterData.walkSpeed = 2;
            this.objZepetoPlayers.characterData.runSpeed = 5;
            this.objZepetoPlayers.characterData.jumpPower = 5;
        } else {
            //Disable movement by setting all values to 0. 
            this.objZepetoPlayers.characterData.walkSpeed = 0;
            this.objZepetoPlayers.characterData.runSpeed = 0;
            this.objZepetoPlayers.characterData.jumpPower = 0;
        }
    }

    ResetGame() {
        //Reset character positions to a specific point. 
          this.gameTeamList.forEach(info => {
              info.character.Teleport(new Vector3(-3.5 + (7 * (info.team - 1)), 1, 0), Quaternion.identity);
          });
          
        //Reset the ground to unoccupied. 
        GroundManager.GetInstance()?.ResetGround();
    }

}