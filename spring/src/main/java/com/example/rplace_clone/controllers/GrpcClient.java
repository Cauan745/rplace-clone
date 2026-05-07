
package com.example.rplace_clone.controllers;

import org.springframework.stereotype.Service;

import com.example.rplace_clone.dto.PixelDTO;

import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import rplace_clone.CanvasServiceGrpc;
import rplace_clone.CanvasServiceGrpc.CanvasServiceBlockingStub;
import rplace_clone.Rplace.Canvas;
import rplace_clone.Rplace.GetCanvasRequest;
import rplace_clone.Rplace.Pixel;
import rplace_clone.Rplace.PlacePixelResponse;

@Service
public class GrpcClient {
  private final CanvasServiceBlockingStub blockingStub;

  public GrpcClient() {
    ManagedChannel channel = ManagedChannelBuilder.forAddress("localhost", 9001)
        .usePlaintext()
        .build();

    this.blockingStub = CanvasServiceGrpc.newBlockingStub(channel);
  }

  public Canvas getCanvas() {
    GetCanvasRequest request = GetCanvasRequest.newBuilder().build();

    Canvas canvas = blockingStub.getCanvas(request);

    return canvas;
  }

  public PlacePixelResponse placePixel(PixelDTO pixel) {
    Pixel protoPixel = Pixel.newBuilder()
        .setColor(pixel.color())
        .setX(pixel.x())
        .setY(pixel.y())
        .build();

    PlacePixelResponse response = blockingStub.placePixel(protoPixel);

    return response;

  }
}
