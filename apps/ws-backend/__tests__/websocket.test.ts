import { JWT_SECRET } from "@repo/backend-common/config";
import jwt from "jsonwebtoken";
import WebSocket from "ws";

describe("WebSocket server", () => {
  let testToken1: string;
  let testToken2: string;

  beforeAll(() => {
    testToken1 = jwt.sign(
      {
        userId: "user1",
        email: "user1@test.com",
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
    testToken2 = jwt.sign(
      {
        userId: "user2",
        email: "user2@gmail.com",
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
  });
  test("should handle presence join/leave", (done) => {
    let messages: any[] = [];
    const ws1 = new WebSocket(
      `ws://localhost:8080?token=${testToken1}&roomId=test_room`
    );
    const ws2 = new WebSocket(
      `ws://localhost:8080?token=${testToken2}&roomId=test_room`
    );

    ws1.on("message", (data) => {
      const message = JSON.parse(data.toString());
      messages.push(message);
    });
    ws2.on("open", () => {
      setTimeout(() => {
        const joinMessages = messages.filter((m) => m.type === "presence.join");
        expect(joinMessages.length).toBeGreaterThan(0);

        ws1.close();
        ws2.close();
        done();
      }, 100);
    });

    ws1.on("error", (error) => {
      console.log("WS1 error:", error);
    });

    ws2.on("error", (error) => {
      console.error("WS2 error", error);
    });
  });

  test("should handle cursor updates", (done) => {
    let messages: any[] = [];
    const ws1 = new WebSocket(
      `ws://localhost:8080?token=${testToken1}&roomId=test_room`
    );
    const ws2 = new WebSocket(
      `ws://localhost:8080?token=${testToken2}&roomId=test_room`
    );

    ws1.on("message", (data) => {
      const message = JSON.parse(data.toString());
      messages.push(message);
    });
    ws2.on("open", () => {
      ws2.send(
        JSON.stringify({
          type: "cursor.update",
          x: 100,
          y: 200,
        })
      );
      setTimeout(() => {
        const cursorMessages = messages.filter(
          (m) => m.type === "cursor.update"
        );
        expect(cursorMessages.length).toBeGreaterThan(0);

        ws1.close();
        ws2.close();
        done();
      }, 100);
    });
  });
});
