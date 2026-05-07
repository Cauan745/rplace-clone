
package com.example.rplace_clone.controllers;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.annotation.SubscribeMapping;
import org.springframework.stereotype.Controller;

import com.google.protobuf.InvalidProtocolBufferException;
import com.google.protobuf.util.JsonFormat;

import io.grpc.StatusRuntimeException;
import rplace_clone.Rplace.Canvas;

import com.example.rplace_clone.dto.PixelDTO;

@Controller
public class CanvasController {

  private GrpcClient grpcClient;

  public CanvasController(GrpcClient grpcClient) {
    this.grpcClient = grpcClient;
  }

  @MessageMapping("/placePixel")
  @SendTo("/topic/update")
  public PixelDTO placePixel(PixelDTO pixel) {

    System.out.println("Pixel Placed");

    try {
      grpcClient.placePixel(pixel);
      return pixel;
    } catch (StatusRuntimeException e) {
      System.out.println("Erro ao comunicar com servidor gRPC");
      return null;
    }

  }

  @SubscribeMapping("/init")
  public String sendInitialState() {

    System.out.println("Novo usuário conectado");
    try {
      Canvas result = grpcClient.getCanvas();

      System.out.println("Canvas pegado");

      String jsonString = JsonFormat.printer().print(result);
      return jsonString;

    } catch (InvalidProtocolBufferException e) {
      System.out.println("Erro ao formatar protobuf para JSON");
      return null;

    } catch (StatusRuntimeException e) {
      System.out.println("Erro ao comunicar com servidor gRPC");
      return null;
    }

  }
}
