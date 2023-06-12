package com.example.gigachatb.message;


import com.example.gigachatb.conversation.ConversationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.CrossOrigin;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.stream.Collectors;

@Controller
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
@Slf4j
public class MessageSocket {

    private final MessageService messageService;
    private final ConversationService conversationService;
    private final SimpMessagingTemplate simpMessagingTemplate;

    @SendTo("/topic/messages")
    @MessageMapping("/hello")
    public void sendMessage(MessageDTO messageDTO) {
        var userList = conversationService.getUsersUniqueIDByMessageDTO(messageDTO);
        userList = userList.stream().distinct().collect(Collectors.toList());
        messageService.saveMessage(messageDTO);
        //TODO: set id as websocket session
        try {
            for (String id : userList) {
                log.info("Sending message to user: " + id);
                simpMessagingTemplate.convertAndSend( "/topic/messages/"+id, messageDTO);
            }
        }catch (MessagingException e){
            log.error("Error sending message to user/s: " + e.getMessage());
        }
    }



}