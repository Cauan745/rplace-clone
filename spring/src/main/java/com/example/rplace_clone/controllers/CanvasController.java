
package com.example.rplace_clone.controllers;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.annotation.SubscribeMapping;
import org.springframework.stereotype.Controller;
import org.springframework.web.client.RestClient;
import com.google.protobuf.util.JsonFormat;

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

    // RestClient restClient = RestClient.create();
    //
    // Map<String, Object> data = new HashMap<>();
    // data.put("color", pixel.color());
    // data.put("x", pixel.x());
    // data.put("y", pixel.y());
    //
    // System.out.println(data);
    //
    // String result = restClient.post()
    // .uri("http://localhost:8000")
    // .contentType(MediaType.APPLICATION_JSON)
    // .body(data)
    // .retrieve()
    // .body(String.class);

    var result = grpcClient.placePixel(pixel);

    // System.out.println(result);

    return pixel;
  }

  // NEW: Triggers exactly when a client subscribes to /app/init
  @SubscribeMapping("/init")
  public String sendInitialState() {
    // RestClient restClient = RestClient.create();
    //
    // String result =
    // restClient.get().uri("http://localhost:8000").retrieve().body(String.class);

    rplace_clone.Rplace.Canvas result = grpcClient.getCanvas();

    System.out.println("canvas pegado");

    try {
      String jsonString = JsonFormat.printer().print(result);
      // System.out.println(jsonString);
      return jsonString;
    } catch (Exception e) {
      // TODO: handle exception
    }

    // System.out.println(result);

    return "";
  }
}
