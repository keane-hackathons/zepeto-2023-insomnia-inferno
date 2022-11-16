import { TextMeshProUGUI } from 'TMPro';
import { Animator, Color, GameObject, Rect, Sprite, Texture, Texture2D, Vector2 } from 'UnityEngine';
import { Image } from 'UnityEngine.UI';
import { ZepetoPlayers } from 'ZEPETO.Character.Controller';
import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import { ZepetoWorldHelper } from 'ZEPETO.World';
import ClientScript from './ClientScript';
import GroundManager from './GroundManager';

enum GroundType { None, Red, Purple }

//Then we can define a "Grounds" type.
//We will use this to keep track of the number of tile each team currently controls.
          
type Grounds = {
    Red: number,
    Purple: number
}  

export default class GameUI extends ZepetoScriptBehaviour {

    //declare static field "instance" of type GameUI        
    private static instance: GameUI;

    //GameReady Panel
    public GameReady: GameObject;

    //GameReady animator
    public GameReadyAnimator: Animator;

    //GameStart Panel
    public GameStart: GameObject;

    //GameStart animator
    public GameStartAnimator: Animator;

    //GameFinish Panel
    public GameFinish: GameObject;

    //GameFinish animator
    public GameFinishAnimator: Animator;

    //Result Panel
    public Result: GameObject;

    //Result background (we will change the color based on the winner, or leave it white if it's a draw)
    public ResultBackground: Image;

    //Result panel when there is a winner
    public ResultWin: GameObject;

    //Result panel when it is a draw
    public ResultDraw: GameObject;

    //Title for ResultWin panel
    public WinTitleText: TextMeshProUGUI;

    //Description text for ResultWin panel
    public WinDescText: TextMeshProUGUI;

    //Tiel for Result panel when it is a draw
    public DrawTitleText: TextMeshProUGUI;

    //Score board panel
    public Scoreboard: GameObject;

    //timer text
    public TimerText: TextMeshProUGUI;

    //Red team score text
    public RedTeamScore: TextMeshProUGUI;

    //Purple team score text
    public PurpleTeamScore: TextMeshProUGUI;

    //Thumbnail avatar portrait of winner
    public WinnerThumbnail: Image;

    //Avatar thumbnails of all players
    public playerThumbnails = new Map<string, Sprite>();

    //Red team color
    private redTeamColor = new Color(232 / 255, 52 / 255, 78 / 255);

    //Purple team color
    private purpleTeamColor = new Color(92 / 255, 70 / 255, 255 / 255);

    //White color
    private WhiteColor = new Color(255 / 255, 255 / 255, 255 / 255);   

    static GetInstance(): GameUI {
        //if GameUI instance doesn't exist, we find the game object called "GameUI", call GetCpmponent to get the GameUI script, and set GameUI.instance to this GameUI script
      if (!GameUI.instance) {
          const targetObj = GameObject.Find("GameUI");
          if (targetObj) GameUI.instance = targetObj.GetComponent<GameUI>();
      }
      return GameUI.instance;
    }  
    
    Start() {    

    }

    //Toggle to turn on/off GameReady panel
    OnOffGameReady(bool: boolean) {
        this.GameReady.SetActive(bool);
        this.GameStart.SetActive(!bool);
        this.GameFinish.SetActive(!bool);
    }     
    
    //Toggle to turn on/off GameStart panel
    OnOffGameStart(bool: boolean) {
        this.GameReady.SetActive(!bool);
        this.GameStart.SetActive(bool);
        this.GameFinish.SetActive(!bool);
    }
        //Toggle to turn on/off OnOffScoreboard panel      
    OnOffScoreboard(bool: boolean) {
        this.Scoreboard.SetActive(bool);
    }
            
        //Toggle to turn on/off OnOffGameFinish panel     
    OnOffGameFinish(bool: boolean) {
        this.GameReady.SetActive(!bool);
        this.GameStart.SetActive(!bool);
        this.GameFinish.SetActive(bool);
    }

    //Updates score text by counting how many tiles of each color we have
    UpdateScore() {

        const groundManager = GroundManager.GetInstance();

        const grounds: Grounds = {
            Red: 0,
            Purple: 0
        };

        groundManager.groundList.forEach((v, i) => {
            switch (v.GetType()) {
                case GroundType.Red:
                    grounds.Red += 1;
                    break;
                case GroundType.Purple:
                    grounds.Purple += 1;
                    break;
            }
        });

        //Set Score Text based on grounds.Red and grounds.Purple count
        this.RedTeamScore.text = grounds.Red.toString();
        this.PurpleTeamScore.text = grounds.Purple.toString();
    }

    ResetScoreboard() {
        this.RedTeamScore.text = '0';
        this.PurpleTeamScore.text = '0';
    }

    getWinnerUserId(winTeam: number) {
        let winnerUserId: string;
        ClientScript.GetInstance()?.gameTeamList.forEach((gameTeamInfo, userId) => {
            if (gameTeamInfo.team == winTeam) {
                winnerUserId = userId
            }
        });
        return winnerUserId;
    }  

    DisableResult() {
        //make below panels not visible
        this.ResultWin.SetActive(false);
        this.ResultDraw.SetActive(false);
        this.Result.SetActive(false);
    }   
    
    ChangeImageBackgroundColor(imageObject: Image, color: Color) {
        imageObject.color = color;
    }   
    
    SetResult() {

        //Get team scores by checking text value and converting to number
        const redTeamScore = Number(this.RedTeamScore.text);
        const purpleTeamScore = Number(this.PurpleTeamScore.text);

        // Red team victory
        if (redTeamScore > purpleTeamScore) {
            //get the userId of the player that is on the Red team
            const winnerUserId = this.getWinnerUserId(GroundType.Red);
            //get the name of the player by userId
            const winnerName = ZepetoPlayers.instance.GetPlayerWithUserId(winnerUserId).name;
            //Set the win text to "Red Team Wins!"
            this.WinTitleText.text = "Red Team Wins!";
						//Get the correct player thumbnail from the playerThumbnails map
            this.WinnerThumbnail.sprite = this.playerThumbnails.get(winnerUserId);
            //Set the Win Description text to the winner's character name.
            this.WinDescText.text = winnerName;
            //Change the background color to to red
            this.ChangeImageBackgroundColor(this.ResultBackground, this.redTeamColor);
            //Set Result to true.
            this.Result.SetActive(true);
            //Set Result Win to true
            this.ResultWin.SetActive(true);
        }
        // Purple Team Victory
        else if (purpleTeamScore > redTeamScore) {
            //get the userId of the player that is on the Red team
            const winnerUserId = this.getWinnerUserId(GroundType.Purple);
            //get the name of the player by userId
            const winnerName = ZepetoPlayers.instance.GetPlayerWithUserId(winnerUserId).name;
            //Set the win text to "Purple Team Wins!"
            this.WinTitleText.text = "Purple Team Wins!";
						//Get the correct player thumbnail from the playerThumbnails map
            this.WinnerThumbnail.sprite = this.playerThumbnails.get(winnerUserId);
            //Set the Win Description text to the winner's character name.
            this.WinDescText.text = winnerName;
            //Change the background color to to purple
            this.ChangeImageBackgroundColor(this.ResultBackground, this.purpleTeamColor);
            //Set Result to true.
            this.Result.SetActive(true);
            //Set Result Win to true
            this.ResultWin.SetActive(true);
        }
        // Draw
        else {
            //Change the background color to to white
            this.ChangeImageBackgroundColor(this.ResultBackground, this.WhiteColor);
            //Set result panel visible
            this.Result.SetActive(true);
            //Set result draw panel visible
            this.ResultDraw.SetActive(true);
        }
    }   

    GetThumbnail(userId) {
        ZepetoWorldHelper.GetProfileTexture(userId, (texture: Texture) => {
            const sprite = this.GetSprite(texture);
            this.playerThumbnails.set(userId, sprite);
        }, (error) => {
            console.log(error);
        });
    }
          
    GetSprite(texture: Texture) {
        const rect: Rect = new Rect(0, 0, texture.width, texture.height);
        return Sprite.Create(texture as Texture2D, rect, new Vector2(0.5, 0.5));
    }    

}