package com.example.rplace_clone.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

  @Override
  public void configureMessageBroker(MessageBrokerRegistry config) {
    config.enableSimpleBroker("/topic");
    config.setApplicationDestinationPrefixes("/app");
  }

  @Override
  public void registerStompEndpoints(StompEndpointRegistry registry) {
    // registry.addEndpoint("/canvas").setAllowedOrigins("http://localhost:8765").withSockJS();
    registry.addEndpoint("/canvas") // O mesmo endpoint que você usou no SockJS no frontend
        .setAllowedOriginPatterns("*") // <--- A MÁGICA QUE RESOLVE O CORS AQUI
        .withSockJS();
  }
}
