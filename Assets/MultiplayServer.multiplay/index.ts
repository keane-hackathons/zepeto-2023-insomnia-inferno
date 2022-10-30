import { Sandbox, SandboxOptions, SandboxPlayer } from "ZEPETO.Multiplay";
import { Player, Vector3Schema } from "ZEPETO.Multiplay.Schema";

enum MultiplayMessageType {
  
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
type MultiplayMessageCharacterTransform = {
    positionX: number,
    positionY: number,
    positionZ: number,
}

//Character state data
type MultiplayMessageCharacterState = {

    //state id number for translation to enum. 
    characterState: number
}

type MultiplayMessageChangeGroundColor = {
    //Ground Color ID
    groundType: number,
    //The Team it belongs to
    team: number,
    //Triggered Ground Name. 
    groundName: string,
}
  
type MultiplayMessageWaiting = {

}

type MultiplayMessageGameReady = {

}


type MultiplayMessageGameStart = {

}


type MultiplayMessageGameFinish = {

}


type MultiplayMessageResult = {

}

enum GameState {

    //Waiting for enough users to begin the game
    Wait,

    //Enough players have been found, game is in progress.
    Game,

    //Game has finished and the results are shown. 
    Result
}  
  

export default class extends Sandbox {
    private gameState = GameState.Wait;  

    //The minimum number of players required to begin the game. 
    private readonly gameStartCount = 2;

    //To track the current connected players
    private currentPlayerCount: number = 0;
    
    //Time elapsed since game start. 
    private gameTime: number = 0;

    //When the game will finish. 
    private readonly gameDuration: number = 60 * 1000;

    //The duration that the result window will be open before restarting the game. 
    private readonly resultDuration: number = 10 * 1000;

    //The time since game start. 
    private resultTime: number = 0;

    onCreate(options: SandboxOptions) {
        // Position Sync Message
        this.onMessage(MultiplayMessageType.CharacterTransform, (client, message: MultiplayMessageCharacterTransform) => {
            // Only continue if the player exists based on the userId
            const userId = client.userId;
            if (!this.state.players.has(userId)) return;

            // Grab the player based on userId
            const player = this.state.players.get(userId);

            // Sync Position Data
            const position = new Vector3Schema();
            position.x = message.positionX;
            position.y = message.positionY;
            position.z = message.positionZ;
            player.position = position;
        });

        // Character State (Jumping, running etc) sync message
        this.onMessage(MultiplayMessageType.CharacterState, (client, message: MultiplayMessageCharacterState) => {
            const player = this.state.players.get(client.userId);
            player.characterState = message.characterState;
        });

        this.onMessage(MultiplayMessageType.ChangeGroundColor, (client, message: MultiplayMessageChangeGroundColor) => { 
            // Let the clients know the ground color has changed. 
            this.broadcast(MultiplayMessageType.ChangeGroundColorReceive, message);
        }); 
    }

    onJoin(client: SandboxPlayer) {
        const userId = client.userId;
        const player = new Player();
    
        // Apply the schema userID value to the player object. 
        player.userId = userId;
    
        // Apply the schema's position data to our copy
        player.position = new Vector3Schema();
    
        // Reset position to (0,0,0)
        player.position.x = 0;
        player.position.y = 0;
        player.position.z = 0;
    
        //Assign the player to a team 
	    player.team = this.state.players.size + 1; 

        //Cache our player to the map. 
        this.state.players.set(userId, player);
    }

    onLeave(client: SandboxPlayer, consented?: boolean) {
        // Delete the player data
        this.state.players.delete(client.userId);
    }

    //Fill in later. 
    InitializeWait()
    {
        // Elapsed Time since start
        this.gameTime = 0;

        // Send Waiting state message to clients
        this.SendMessageWaiting();
    }
    
    InitializeGame()
    {
        this.gameTime = 0;

        // Initize the counter to 60 seconds. 
        this.state.timer.value = 60;
    
        //Send a message to the clients that the game is beginning. 
        this.SendMessageGameStart();
    }

    InitializeResult()
    {
        this.resultTime = 0;
        this.SendMessageResult();
    }
    
    UpdateWait(deltaTime: number) {
        // Don't perform any actions if the game state isn't wait. 
        if (this.gameState != GameState.Wait) return;

        // cache the current player count. 
        this.currentPlayerCount = this.state.players.size;

        // Check if there are enough players to start the game. 
        if (this.currentPlayerCount == this.gameStartCount) {
            // If the game hasn't yet started, send the gameready state to the clients. 
            if (this.gameTime == 0) this.SendMessageGameReady();

            this.gameTime += deltaTime;

            // Start the game after 4 seconds (4000 milliseconds)
            if (this.gameTime >= 4000) this.SetGameState(GameState.Game);
        }
    }
    
    UpdateGame(deltaTime: number) {
        // Don't execute code if the current state is not game. 
        if (this.gameState != GameState.Game) return;

        // Count the gametime by the deltaTime. 
        this.gameTime += deltaTime;

        // timer calculation
        // (Duration - elapsed)
        // (3000 + 1000) - (101.. 1021.. 2025.. 3032..)
        // Math.floor(): drop off the decimals. 
        // The reason why we add +1000(+1second): When performing a Math.floor(), the timer will reach 0 even if we 
        // decrease 1 by 0.1 (Math.floor(0.9) == 0). We add 1000 ms to start the count from duration + 1 for this reason. 
        // Why we multiply by .001: To convert milliseconds to seconds. 
        this.state.timer.value = Math.floor(((this.gameDuration + 1000) - this.gameTime) * 0.001);

        // Check if the timer reached 0. 
        if (this.state.timer.value == 0) this.SendMessageGameFinish();

        //After sending the finish message, wait 3 seconds, and show the result. 
        if (this.gameTime >= this.gameDuration + (3 * 1000)) this.SetGameState(GameState.Result);
    }

    UpdateResult(deltaTime: number) {
        if (this.gameState != GameState.Result) return;
        this.resultTime += deltaTime;
    
        if (this.resultTime >= this.resultDuration) this.SetGameState(GameState.Wait);
    }

    onTick(deltaTime: number): void {
        this.UpdateWait(deltaTime);
        this.UpdateGame(deltaTime);
        this.UpdateResult(deltaTime);
    }

    //apply the given game state
    SetGameState(gameState: GameState) {
        this.gameState = gameState;

        //Initialize the corresponding game state. 
        switch (gameState) {
            case GameState.Wait: this.InitializeWait(); break;
            case GameState.Game: this.InitializeGame(); break;
            case GameState.Result: this.InitializeResult(); break;
        }
    }

    SendMessageWaiting() {
        const message: MultiplayMessageWaiting = {};
        this.broadcast(MultiplayMessageType.Waiting, message);
    }
    
    SendMessageGameReady() {
        const message: MultiplayMessageGameReady = {};
        this.broadcast(MultiplayMessageType.GameReady, message);
    }

    SendMessageGameStart() {
        const message: MultiplayMessageGameStart = {};
        this.broadcast(MultiplayMessageType.GameStart, message);
    }

    SendMessageGameFinish() {
        const message: MultiplayMessageGameFinish = {};
        this.broadcast(MultiplayMessageType.GameFinish, message);
    }

    SendMessageResult() {
        const message: MultiplayMessageResult = {};
        this.broadcast(MultiplayMessageType.Result, message);
    }

}