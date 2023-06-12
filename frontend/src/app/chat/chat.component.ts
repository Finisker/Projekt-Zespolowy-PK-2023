import {ChangeDetectorRef, Component, OnInit,ElementRef, Renderer2} from '@angular/core';
import {Router} from "@angular/router";
import {MatDialog} from "@angular/material/dialog";
import {SettingsComponent} from "../settings/settings.component";
import {CreateGroupComponent} from "../create-group/create-group.component";
import {Message} from "../_models/message";
import {WebsocketService} from "../_services/websocket.service";
import {ChatUser} from "../_models/ChatUser";
import {UserService} from "../_services/user.service";
import {BehaviorSubject, debounceTime} from "rxjs";
import {FormControl} from "@angular/forms";
import {ConversationService} from "../_services/conversation.service";
import {Conversation} from "../_models/Conversation";
import {MessageService} from "../_services/message.service";
import {AuthService} from "../_services/auth.service";

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {

  userSearchControl: FormControl<string> = new FormControl();

  filteredUsers: ChatUser[] = [];
  loggedUser?: ChatUser;
  num :BehaviorSubject<Conversation> = new BehaviorSubject<Conversation>({} as Conversation);
  currentConversation: number = 0;
  currentUser: string = '';

  newMessage: string = '';

  conversations: Conversation[] = [];


  constructor(private router: Router, private dialog: MatDialog,
              private webSocketService: WebsocketService,
              private userService: UserService,
              private changeDetectorRef: ChangeDetectorRef,
              private conversationService: ConversationService,
              private messageService: MessageService,
              private authService: AuthService,
              private elementRef:ElementRef,
              private renderer:Renderer2
  ) {
    this.userSearchControl.valueChanges.pipe(
      debounceTime(500),
    ).subscribe(searchTerm => {
      console.log(searchTerm);
      this.searchUsers(searchTerm.replace("#","%23"));
    })

  }

  ngOnInit() {
    this.num.subscribe(conversation => {
      if (conversation.id !== undefined && conversation.id !== 0  )   {
      this.messageService.getMessages(conversation.id).subscribe(messageList => {
        conversation.messages = messageList;
      });
      this.conversations.push(conversation);
      this.changeDetectorRef.detectChanges();
    }});
    this.conversationService.getConversations().subscribe(response => {

      console.log(response);

      response.map(conversation => {
        this.currentConversation = conversation.id;
        this.messageService.getMessages(conversation.id).subscribe(messageList => {
          conversation.messages = messageList;
        });
        this.conversations.push(conversation);
      })



      this.changeDetectorRef.detectChanges();

    });

    this.userService.getUsers().subscribe(response => {
      response.forEach(user => {
        if(user.id === localStorage.getItem("id")){
          this.loggedUser = user;
        }
      })
    });

    this.webSocketService.messagesSubj.subscribe(message => {
      let flag = false;
      this.conversations.forEach(conversation => {
         if ( message.get(conversation.id)) {
            conversation.messages.push(message.get(conversation.id)!);
            message.delete(conversation.id);
            let flag=true;
          }
         } );

      if(!flag){
        message.forEach((value, key) => {
          this.conversationService.getConversation(key).subscribe(
            conversation => {
              this.messageService.getMessages(conversation.id).subscribe(messageList => {
                conversation.messages = messageList;
              } );
              this.conversations.push(conversation);
              this.currentConversation = conversation.id;
            }
          )
        });
      this.changeDetectorRef.detectChanges();
    }
    });
  this.scrollToBottom();

  }

  logout() {

    this.authService.logout().subscribe(res => {
      this.router.navigate(['/login']);
    });

  }

  goToCanvas(conversationId : number) {
    this.router.navigate(['/canvas/'],{state: {conversationId: conversationId}});
  }

  selectUser(user: ChatUser) {
    this.currentUser = user.id;
    let checkConv = this.conversations.find(conversation => conversation.participants.find(participant => participant.id == user.id && participant.id != localStorage.getItem('id')));
    if (checkConv) {
      console.log("here");
      this.currentConversation = checkConv.id;
    } else {
      this.currentConversation = 0;
    }
  }
  selectConversation(conversationId: number) {
    this.currentConversation = conversationId;
    this.currentUser = '';
  }

  sendMessage(conversationId: number | null) {
    let mess: Message = {
      sender: localStorage.getItem('id')!,
      text: this.newMessage,
      receiver: conversationId ? null : this.currentUser,
      date: new Date(),
      conversation: conversationId ? conversationId : null
    }
    this.webSocketService.sendMessage(mess);
    this.newMessage='';
    this.scrollToBottom();
  }

  openToSettings() {
    const dialogRef = this.dialog.open(SettingsComponent, {
      width: '400px',
      data: {} // Możesz przekazać dane do dialogu, jeśli jest to potrzebne
    });
  }

  searchUsers(searchTerm: string) {
    if (searchTerm != null && searchTerm.length > 1)
      this.userService.getFilteredUsers(searchTerm).subscribe(response => {
          this.filteredUsers = response;
        }
      );
  }

  openCreateGroup() {
    const dialogRef = this.dialog.open(CreateGroupComponent, {
      width: '400px',
      height: '350px',
      data: {
        obsNum: this.num,
      } // Możesz przekazać dane do dialogu, jeśli jest to potrzebne
    });
  }

  readonly localStorage = localStorage;


  getMessages(): Message[] | undefined {
    return this.conversations.find(conversation => conversation.id == this.currentConversation)?.messages;
  }

  getOtherUserNameByConversation(conversation: Conversation){
    if (conversation.name==null || conversation.name=="" || conversation.name==undefined) {
      let users = conversation.participants;
      let otherUser;
      if (users && users.length == 2) {
        if (users[0].id == localStorage.getItem("id")) {
          otherUser = users[1];
        } else {
          otherUser = users[0];
        }
      }
      if (otherUser) {
        return otherUser.name;
      }
      return "error 500, no user found";
    } else {
      return conversation.name;
    }
  }

  getLoggedUserName(){

    if(this.loggedUser){
      return this.loggedUser.name;
    }

    return "error 500, no user found";
  }

  getLastMessageInSideBarByMessages(messages: Message[]){

    let lastMessage;

    if(messages){
      lastMessage = messages.at(messages.length-1);
    } else{
      return "";
    }

    if(!lastMessage)
      return "";

    if(lastMessage.text.length < 50){
      return lastMessage.text;
    } else{
      return lastMessage.text.slice(0,50) + "...";
    }

  }

  getNameById(userId: string) {

    let currentConversationObj;
    let conversations = this.conversations;

    if(conversations){
      for (let i = 0; i < this.conversations.length; i++) {
        if(this.conversations.at(i)?.id === this.currentConversation){
          currentConversationObj = this.conversations.at(i);
        }
      }
    }

    let users;
    if(currentConversationObj){
      users = currentConversationObj.participants;
    }
    if(users){
      for (let i = 0; i < users.length; i++) {
        if(userId === users[i].id){
          return users[i].name;
        }
      }
    }

    return "";
  }

  getConversationNameById():string
  {
    let conversation = this.conversations;
    if(conversation){
      for (let i = 0; i < conversation.length; i++) {
        if (conversation[i].id === this.currentConversation) {
          return conversation[i].name ? conversation[i].name : this.getOtherUserNameByConversation(conversation[i]);
        }
      }
    }
      return "Nazwa";
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.sendMessage(this.currentConversation);
    }
  }


  scrollToBottom(): void {
    const chatContainer = this.elementRef.nativeElement.querySelector('.chat-container');
    if (chatContainer) {
      this.renderer.setProperty(chatContainer, 'scrollBottom', chatContainer.scrollHeight);
    }
  }
}
