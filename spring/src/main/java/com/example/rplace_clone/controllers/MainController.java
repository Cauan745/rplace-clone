
package com.example.rplace_clone.controllers;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;

import com.example.rplace_clone.dto.PixelDTO;

@RestController
public class MainController {

  @CrossOrigin(origins = "http://localhost:8765")
  @GetMapping("/")
  public String getCanvas() {
    RestClient restClient = RestClient.create();

    String result = restClient.get().uri("http://localhost:8000").retrieve().body(String.class);

    System.out.println("canvas pegado");

    return result;
  }

  @CrossOrigin(origins = "http://localhost:8765")
  @PostMapping("/")
  public String placePixel(@RequestBody PixelDTO pixel) {

    System.out.println("Pixel Placed");

    RestClient restClient = RestClient.create();

    Map<String, Object> data = new HashMap<>();
    data.put("color", pixel.color());
    data.put("x", pixel.x());
    data.put("y", pixel.y());

    String result = restClient.post()
        .uri("http://localhost:8000")
        .contentType(MediaType.APPLICATION_JSON)
        .body(data)
        .retrieve()
        .body(String.class);
    return result;
  }

}
